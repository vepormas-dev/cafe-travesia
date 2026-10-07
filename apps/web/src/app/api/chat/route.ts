import { after } from 'next/server';
import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { chatMessageSchema, type ChatReplyDTO } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { getDb, t } from '@/lib/db';
import { apiError, handle, json, parseBody } from '@/lib/api';
import { env, isDemoMode } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmail, layout, escapeHtml } from '@/lib/email';
import { aiEnabled, type AiMessage } from '@/lib/ai';
import { botReply, wantsHuman, type ChatAction } from '@/lib/chat';

type Msg = ChatReplyDTO['messages'][number];
const iso = (d: Date) => d.toISOString();
const toMsg = (m: { id: string; role: Msg['role']; content: string; actions: ChatAction[] | null; createdAt: Date }): Msg => ({ id: m.id, role: m.role, content: m.content, actions: m.actions ?? null, createdAt: iso(m.createdAt) });

const HUMAN_NOTICE =
  'Listo, le avisé a nuestro equipo. Un asesor te escribe por aquí en horario de atención (lunes a sábado, 9:00 a. m. – 8:00 p. m.). Puedes dejar tu pregunta y tu correo o celular mientras tanto.';

/** Sesión del chat si pertenece a este usuario/visitante. */
async function findSession(sessionId: string | null | undefined, visitorId: string | null | undefined, userId: string | null) {
  if (!sessionId) return null;
  const [s] = await getDb().select().from(t.chatSessions).where(eq(t.chatSessions.id, sessionId)).limit(1);
  if (!s) return null;
  const owns = (userId && s.userId === userId) || (!s.userId && visitorId && s.visitorId === visitorId) || (userId && !s.userId && visitorId && s.visitorId === visitorId);
  return owns ? s : null;
}

/** POST: mensaje del cliente → respuesta del bot (o queda en cola si atiende un asesor). */
export async function POST(req: Request) {
  return handle('chat', async () => {
    const limited = await rateLimit(req, 'chat', 20, 60);
    if (limited) return limited;
    const [input, err] = await parseBody(req, chatMessageSchema);
    if (err) return err;
    const user = await apiUser();
    const human = wantsHuman(input.message);

    // Modo demo: sin persistencia, el bot responde igual
    if (isDemoMode()) {
      const sessionId = input.sessionId || `demo-${crypto.randomUUID()}`;
      const now = new Date();
      const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: input.message, actions: null, createdAt: iso(now) };
      if (human) {
        const sys: Msg = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `En la demo no hay asesores conectados. Escríbenos por WhatsApp y te atendemos de una.`,
          actions: [{ type: 'link', label: 'Abrir WhatsApp', href: `https://wa.me/${env.whatsapp}` }],
          createdAt: iso(now),
        };
        return json<ChatReplyDTO>({ sessionId, status: 'bot', messages: [userMsg, sys], ai: false });
      }
      const r = await botReply({ message: input.message, history: [], user, page: input.page });
      const bot: Msg = { id: crypto.randomUUID(), role: 'assistant', content: r.content, actions: r.actions, createdAt: iso(new Date()) };
      return json<ChatReplyDTO>({ sessionId, status: 'bot', messages: [userMsg, bot], ai: r.ai });
    }

    const db = getDb();
    let session = await findSession(input.sessionId, input.visitorId, user?.id ?? null);
    if (session?.status === 'closed') session = null;
    if (!session) {
      const id = crypto.randomUUID();
      await db.insert(t.chatSessions).values({ id, userId: user?.id ?? null, visitorId: input.visitorId ?? null, name: user?.fullName ?? null, email: user?.email ?? null, channel: input.channel, status: 'bot' });
      [session] = await db.select().from(t.chatSessions).where(eq(t.chatSessions.id, id)).limit(1);
    } else if (user && !session.userId) {
      await db.update(t.chatSessions).set({ userId: user.id, name: user.fullName, email: user.email }).where(eq(t.chatSessions.id, session.id));
    }
    const s = session!;

    // Historial para la IA (antes de insertar el mensaje nuevo)
    const prev = await db.select().from(t.chatMessages).where(eq(t.chatMessages.sessionId, s.id)).orderBy(desc(t.chatMessages.createdAt)).limit(10);
    const history: AiMessage[] = prev
      .reverse()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const userMsg = { id: crypto.randomUUID(), sessionId: s.id, role: 'user' as const, content: input.message, actions: null, createdAt: new Date() };
    await db.insert(t.chatMessages).values(userMsg);
    const out: Msg[] = [toMsg(userMsg)];
    let status = s.status as ChatReplyDTO['status'];
    let ai = false;

    if (status === 'human' || status === 'human_requested') {
      // Atiende (o va a atender) una persona: el bot no responde
      await db.update(t.chatSessions).set({ lastMessageAt: new Date() }).where(eq(t.chatSessions.id, s.id));
    } else if (human) {
      status = 'human_requested';
      const sys = { id: crypto.randomUUID(), sessionId: s.id, role: 'system' as const, content: HUMAN_NOTICE, actions: [{ type: 'link' as const, label: 'O escríbenos por WhatsApp', href: `https://wa.me/${env.whatsapp}` }], createdAt: new Date(Date.now() + 1) };
      await db.insert(t.chatMessages).values(sys);
      await db.update(t.chatSessions).set({ status, lastMessageAt: new Date() }).where(eq(t.chatSessions.id, s.id));
      out.push(toMsg(sys));
      const transcript = [...history.map((m) => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`), `Cliente: ${input.message}`].slice(-12);
      if (env.smtp.adminNotify) {
        after(() =>
          sendEmail(
            env.smtp.adminNotify!,
            `💬 Un cliente pide asesor en el chat${user?.fullName ? `: ${user.fullName}` : ''}`,
            layout({
              title: 'Solicitud de asesor humano',
              preheader: input.message.slice(0, 90),
              body: `<p><strong>Cliente:</strong> ${escapeHtml(user?.fullName ?? 'Visitante')} ${user?.email ? `(${escapeHtml(user.email)})` : ''}<br><strong>Canal:</strong> ${input.channel}${input.page ? ` · ${escapeHtml(input.page)}` : ''}</p><p style="background:#F8F3EA;padding:12px;border-radius:12px">${transcript.map((l) => escapeHtml(l)).join('<br>')}</p>`,
              cta: { label: 'Responder en el panel', href: `${env.siteUrl}/admin/chat?sesion=${s.id}` },
            }),
          ).then(() => undefined),
        );
      }
    } else {
      const r = await botReply({ message: input.message, history, user, page: input.page });
      ai = r.ai;
      const bot = { id: crypto.randomUUID(), sessionId: s.id, role: 'assistant' as const, content: r.content, actions: r.actions.length ? r.actions : null, createdAt: new Date(Date.now() + 1) };
      await db.insert(t.chatMessages).values(bot);
      await db.update(t.chatSessions).set({ lastMessageAt: new Date() }).where(eq(t.chatSessions.id, s.id));
      out.push(toMsg(bot));
    }
    return json<ChatReplyDTO>({ sessionId: s.id, status, messages: out, ai: ai || aiEnabled() });
  });
}

/** GET ?sessionId=&visitorId=&after=ISO: mensajes de la sesión (polling de respuestas del asesor). */
export async function GET(req: Request) {
  return handle('chat.poll', async () => {
    const u = new URL(req.url);
    const sessionId = u.searchParams.get('sessionId');
    const visitorId = u.searchParams.get('visitorId');
    if (!sessionId) return apiError('Falta sessionId', 422);
    if (isDemoMode() || sessionId.startsWith('demo-')) return json<ChatReplyDTO>({ sessionId, status: 'bot', messages: [], ai: aiEnabled() });
    const limited = await rateLimit(req, 'chat-poll', 40, 60);
    if (limited) return limited;
    const user = await apiUser();
    const s = await findSession(sessionId, visitorId, user?.id ?? null);
    if (!s) return apiError('Conversación no encontrada', 404);
    const since = u.searchParams.get('after');
    const sinceDate = since && !Number.isNaN(Date.parse(since)) ? new Date(since) : null;
    const rows = await getDb()
      .select()
      .from(t.chatMessages)
      .where(sinceDate ? and(eq(t.chatMessages.sessionId, s.id), gt(t.chatMessages.createdAt, sinceDate)) : eq(t.chatMessages.sessionId, s.id))
      .orderBy(asc(t.chatMessages.createdAt))
      .limit(100);
    return json<ChatReplyDTO>(
      { sessionId: s.id, status: s.status, messages: rows.map((m) => toMsg({ ...m, actions: m.actions ?? null })), ai: aiEnabled() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  });
}

