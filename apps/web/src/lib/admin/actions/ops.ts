'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { atomic, getDb, t } from '@/lib/db';
import { audit } from '@/lib/monitor';
import { chargeSubscription, updateSubscription } from '@/lib/commerce/subscriptions';
import { notifyUser } from '@/lib/push';
import { adminAuth } from '@/lib/firebase/admin';
import { isFirebaseAdminConfigured } from '@/lib/env';
import { aiEnabled, summarizeChat } from '@/lib/ai';
import { ActionError, ok, runAction, zs } from '../guard';
import { getChatMessages } from '../data/ops';

// ---------------------------------------------------------------------------
// Suscripciones
// ---------------------------------------------------------------------------
const subAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('pause'), until: z.iso.date().optional() }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('skip') }),
  z.object({ action: z.literal('cancel'), reason: z.string().trim().max(300).optional() }),
]);

export async function subscriptionAction(id: string, input: z.input<typeof subAction>) {
  return runAction({}, async ({ user }) => {
    const a = subAction.parse(input);
    await updateSubscription(id, null, a);
    await audit(user.id, `subscription.${a.action}`, 'subscription', id, a);
    revalidatePath(`/admin/suscripciones/${id}`);
    revalidatePath('/admin/suscripciones');
    return ok({ pause: 'Suscripción pausada', resume: 'Suscripción reanudada', skip: 'Se saltó el próximo envío', cancel: 'Suscripción cancelada y tarjeta desvinculada' }[a.action]);
  });
}

export async function chargeSubscriptionNow(id: string) {
  return runAction({ admin: true }, async ({ user }) => {
    const r = await chargeSubscription(id, { force: true });
    if (!r) throw new ActionError('No se puede cobrar: la suscripción está cancelada, pausada o sin tarjeta.');
    await audit(user.id, 'subscription.charge_now', 'subscription', id, r);
    revalidatePath(`/admin/suscripciones/${id}`);
    return ok(r.status === 'APPROVED' ? 'Cobro aprobado: se creó el pedido de despacho' : r.status === 'PENDING' ? 'Cobro enviado a Wompi: el resultado llega por webhook' : `Cobro ${String(r.status).toLowerCase()}: se programó el reintento`);
  });
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export async function adjustPoints(userId: string, points: number, reason: string) {
  return runAction({}, async ({ user }) => {
    const p = z.number().int().min(-100000).max(100000).refine((x) => x !== 0, 'Escribe una cantidad distinta de 0').parse(points);
    const r = z.string().trim().min(3, 'Escribe el motivo').max(140).parse(reason);
    const db = getDb();
    await atomic([
      db.insert(t.loyaltyLedger).values({ userId, points: p, reason: `Ajuste: ${r}`.slice(0, 160) }),
      db.update(t.users).set({ loyaltyPoints: sql`GREATEST(${t.users.loyaltyPoints} + ${p}, 0)` }).where(eq(t.users.id, userId)),
    ]);
    await audit(user.id, 'loyalty.adjust', 'user', userId, { points: p, reason: r });
    if (p > 0) void notifyUser(userId, { title: '¡Sumaste puntos Travesía! ⭐', body: `Te abonamos ${p} puntos: ${r}.`, deepLink: '/cuenta/puntos' }, 'loyalty');
    revalidatePath(`/admin/clientes/${userId}`);
    return ok(`${p > 0 ? '+' : ''}${p} puntos aplicados`);
  });
}

export async function pushToUser(userId: string, title: string, body: string, deepLink: string) {
  return runAction({}, async ({ user }) => {
    const ti = zs.req('El título', 65).parse(title);
    const bo = zs.req('El mensaje', 240).parse(body);
    const dl = z.string().trim().max(300).refine((v) => !v || v.startsWith('/'), 'Ruta inválida').parse(deepLink || '/');
    const r = await notifyUser(userId, { title: ti, body: bo, deepLink: dl }, 'manual');
    await audit(user.id, 'push.user', 'user', userId, { title: ti });
    return ok(r.sent ? `Enviada a ${r.sent} dispositivo(s) y a su bandeja` : 'Guardada en su bandeja (no tiene dispositivos con la app)');
  });
}

// ---------------------------------------------------------------------------
// Usuarios y roles (solo admin)
// ---------------------------------------------------------------------------
export async function setUserRole(userId: string, role: 'customer' | 'editor' | 'admin') {
  return runAction({ admin: true }, async ({ user }) => {
    const r = z.enum(['customer', 'editor', 'admin']).parse(role);
    if (userId === user.id && r !== 'admin') throw new ActionError('No puedes quitarte tu propio rol de administrador.');
    const db = getDb();
    const [target] = await db.select().from(t.users).where(eq(t.users.id, userId)).limit(1);
    if (!target) throw new ActionError('Usuario no encontrado');
    if (target.role === 'admin' && r !== 'admin') {
      const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(t.users).where(eq(t.users.role, 'admin'));
      if (Number(n) <= 1) throw new ActionError('Debe quedar al menos un administrador.');
    }
    await db.update(t.users).set({ role: r }).where(eq(t.users.id, userId));
    let claim = 'ok';
    if (isFirebaseAdminConfigured()) {
      try {
        await adminAuth().setCustomUserClaims(target.firebaseUid, { role: r });
        await adminAuth().revokeRefreshTokens(target.firebaseUid);
      } catch (e) {
        claim = e instanceof Error ? e.message : 'error';
      }
    }
    await audit(user.id, 'user.role', 'user', target.email, { from: target.role, to: r, claim });
    revalidatePath('/admin/usuarios');
    return ok(`${target.email} ahora es ${r === 'admin' ? 'administrador' : r === 'editor' ? 'editor' : 'cliente'}${claim === 'ok' ? '' : ' (no se pudo replicar el claim en Firebase)'}`);
  });
}

// ---------------------------------------------------------------------------
// Chat en vivo
// ---------------------------------------------------------------------------
export async function replyChat(sessionId: string, text: string) {
  return runAction({}, async ({ user }) => {
    const content = z.string().trim().min(1, 'Escribe un mensaje').max(1500).parse(text);
    const db = getDb();
    const [s] = await db.select().from(t.chatSessions).where(eq(t.chatSessions.id, sessionId)).limit(1);
    if (!s) throw new ActionError('Conversación no encontrada');
    const now = new Date();
    await atomic([
      db.insert(t.chatMessages).values({ sessionId, role: 'agent', content }),
      db.update(t.chatSessions).set({ status: 'human', assignedTo: user.id, lastMessageAt: now }).where(eq(t.chatSessions.id, sessionId)),
    ]);
    if (s.userId) void notifyUser(s.userId, { title: 'Te respondió un asesor 💬', body: content.slice(0, 140), deepLink: '/chat' }, 'chat_agent');
    await audit(user.id, 'chat.reply', 'chat', sessionId);
    return ok('Mensaje enviado');
  });
}

export async function setChatStatus(sessionId: string, status: 'bot' | 'closed' | 'human') {
  return runAction({}, async ({ user }) => {
    const st = z.enum(['bot', 'closed', 'human']).parse(status);
    const db = getDb();
    await db.update(t.chatSessions).set({ status: st, assignedTo: st === 'human' ? user.id : null }).where(eq(t.chatSessions.id, sessionId));
    if (st !== 'human') await db.insert(t.chatMessages).values({ sessionId, role: 'system', content: st === 'closed' ? 'El asesor cerró la conversación.' : 'La conversación volvió al asistente de IA.' });
    await audit(user.id, `chat.${st}`, 'chat', sessionId);
    return ok(st === 'closed' ? 'Conversación cerrada' : st === 'bot' ? 'Devuelta al asistente de IA' : 'Tomaste la conversación');
  });
}

export async function chatCopilot(sessionId: string) {
  return runAction<{ summary: string; intent: string; sentiment: string; suggestedReply: string }>({ allowDemo: true }, async ({ user, demo }) => {
    const msgs = await getChatMessages(sessionId);
    if (!msgs.length) throw new ActionError('Conversación vacía');
    const transcript = msgs.map((m) => `${m.role === 'user' ? 'Cliente' : m.role === 'agent' ? 'Asesor' : m.role === 'assistant' ? 'IA' : 'Sistema'}: ${m.content}`).join('\n');
    const r = aiEnabled() ? await summarizeChat(transcript) : null;
    const out = r ?? fallbackSummary(msgs);
    if (!demo && r?.summary) await getDb().update(t.chatSessions).set({ summary: r.summary.slice(0, 2000) }).where(eq(t.chatSessions.id, sessionId));
    void user;
    return ok(r ? 'Resumen listo' : 'Resumen por reglas (IA sin configurar)', out);
  });
}

function fallbackSummary(msgs: { role: string; content: string }[]) {
  const userMsgs = msgs.filter((m) => m.role === 'user').map((m) => m.content);
  const last = userMsgs.at(-1) ?? '';
  const txt = userMsgs.join(' ').toLowerCase();
  const intent = /pedido|ct-|llegó|envío|guía/.test(txt) ? 'Estado de pedido' : /suscrip/.test(txt) ? 'Gestión de suscripción' : /curso|academia/.test(txt) ? 'Academia' : /empresa|bolsas|regalo|mayor/.test(txt) ? 'Venta corporativa' : 'Consulta general';
  const negative = /no me ha|reclamo|mal|roto|tarde|nunca/.test(txt);
  return {
    summary: `El cliente escribió ${userMsgs.length} mensaje(s). Último: «${last.slice(0, 160)}».`,
    intent,
    sentiment: negative ? 'negativo' : 'neutral',
    suggestedReply: intent === 'Estado de pedido' ? '¡Hola! Ya reviso tu pedido en este momento. ¿Me confirmas el número (CT-…) y el correo con el que compraste? Te cuento enseguida en qué va ☕' : intent === 'Venta corporativa' ? '¡Qué alegría! Para pedidos corporativos tenemos precios especiales y empaque personalizado. ¿Para qué fecha y a qué ciudad lo necesitas?' : '¡Hola! Con gusto te ayudo. Cuéntame un poco más y lo resolvemos ya mismo.',
  };
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------
export async function unsubscribeNewsletter(email: string) {
  return runAction({}, async ({ user }) => {
    await getDb().update(t.newsletterSubscribers).set({ unsubscribedAt: new Date() }).where(and(eq(t.newsletterSubscribers.email, email), sql`${t.newsletterSubscribers.unsubscribedAt} IS NULL`));
    await audit(user.id, 'newsletter.unsubscribe', 'newsletter', email);
    revalidatePath('/admin/newsletter');
    return ok('Correo dado de baja');
  });
}
