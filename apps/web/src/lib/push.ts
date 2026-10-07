import 'server-only';
/**
 * Servicio push (Expo Push API → APNs/FCM) + bandeja de notificaciones en la BD.
 *  - notifyUser(): automáticas (pago, envío, certificado, asesor, recordatorios)
 *  - createCampaign() / sendCampaign(): campañas segmentadas desde el CMS
 */
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { getDb, t } from '@/lib/db';
import { env, isDbConfigured } from '@/lib/env';
import { logEvent } from '@/lib/monitor';

type ExpoMessage = { to: string; title: string; body: string; data?: Record<string, unknown>; sound?: 'default'; channelId?: string; richContent?: { image: string } };
type ExpoTicket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

export type PushPayload = { title: string; body: string; deepLink?: string | null; imageUrl?: string | null };

async function sendToExpo(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
  const tickets: ExpoTicket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'accept-encoding': 'gzip, deflate',
          ...(env.expoAccessToken ? { authorization: `Bearer ${env.expoAccessToken}` } : {}),
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(20000),
      });
      const data = (await res.json()) as { data?: ExpoTicket[]; errors?: { message: string }[] };
      if (!res.ok || !data.data) throw new Error(data.errors?.[0]?.message ?? `Expo respondió ${res.status}`);
      tickets.push(...data.data);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      tickets.push(...chunk.map(() => ({ status: 'error' as const, message })));
    }
  }
  return tickets;
}

type Target = { token: string; userId: string | null };

async function deliver(targets: Target[], payload: PushPayload, trigger: string, campaignId: string | null) {
  if (targets.length === 0) return { sent: 0, errors: 0 };
  const db = getDb();
  const messages: ExpoMessage[] = targets.map((x) => ({
    to: x.token,
    title: payload.title,
    body: payload.body,
    sound: 'default',
    channelId: 'default',
    data: { url: payload.deepLink ?? '/', campaignId },
    ...(payload.imageUrl ? { richContent: { image: payload.imageUrl } } : {}),
  }));
  const tickets = await sendToExpo(messages);
  let sent = 0;
  let errors = 0;
  const dead: string[] = [];
  const rows = tickets.map((tk, i) => {
    const target = targets[i]!;
    if (tk.status === 'ok') sent++;
    else {
      errors++;
      if (tk.details?.error === 'DeviceNotRegistered') dead.push(target.token);
    }
    return {
      campaignId,
      userId: target.userId,
      token: target.token,
      trigger,
      title: payload.title.slice(0, 120),
      status: tk.status === 'ok' ? ('ok' as const) : ('error' as const),
      ticketId: tk.status === 'ok' ? tk.id : null,
      error: tk.status === 'error' ? tk.message.slice(0, 300) : null,
    };
  });
  for (let i = 0; i < rows.length; i += 200) await db.insert(t.pushDeliveries).values(rows.slice(i, i + 200));
  if (dead.length) await db.update(t.pushTokens).set({ enabled: false, lastError: 'DeviceNotRegistered' }).where(inArray(t.pushTokens.token, dead));
  await logEvent('push', trigger, errors && !sent ? 'error' : 'ok', { message: `${sent} enviados, ${errors} errores`, externalId: campaignId ?? undefined });
  return { sent, errors };
}

/** Notificación a un usuario: bandeja (web + app) y push a sus dispositivos. */
export async function notifyUser(userId: string, payload: PushPayload, trigger = 'manual') {
  if (!isDbConfigured()) return { sent: 0, errors: 0 };
  try {
    const db = getDb();
    await db.insert(t.notifications).values({ userId, title: payload.title.slice(0, 120), body: payload.body.slice(0, 400), deepLink: payload.deepLink ?? null, kind: trigger });
    const tokens = await db
      .select({ token: t.pushTokens.token, userId: t.pushTokens.userId })
      .from(t.pushTokens)
      .where(and(eq(t.pushTokens.userId, userId), eq(t.pushTokens.enabled, true)));
    return await deliver(tokens, payload, trigger, null);
  } catch (e) {
    await logEvent('push', trigger, 'error', { message: e instanceof Error ? e.message : String(e) });
    return { sent: 0, errors: 1 };
  }
}

/** Resuelve la audiencia de una campaña a tokens activos. */
export async function resolveAudience(audience: string, platform: 'all' | 'ios' | 'android' = 'all'): Promise<Target[]> {
  const db = getDb();
  const conds = [eq(t.pushTokens.enabled, true), inArray(t.pushTokens.platform, platform === 'all' ? ['ios', 'android'] : [platform])];
  const base = () => db.select({ token: t.pushTokens.token, userId: t.pushTokens.userId }).from(t.pushTokens);
  if (audience === 'all') return base().where(and(...conds));
  if (audience === 'inactive') return base().where(and(...conds, lt(t.pushTokens.updatedAt, new Date(Date.now() - 30 * 86400000))));
  if (audience.startsWith('user:')) return base().where(and(...conds, eq(t.pushTokens.userId, audience.slice(5))));
  let userIds: string[] = [];
  if (audience === 'subscribers') {
    userIds = (await db.selectDistinct({ id: t.subscriptions.userId }).from(t.subscriptions).where(eq(t.subscriptions.status, 'active'))).map((r) => r.id);
  } else if (audience === 'students') {
    userIds = (await db.selectDistinct({ id: t.enrollments.userId }).from(t.enrollments).where(eq(t.enrollments.status, 'active'))).map((r) => r.id);
  } else if (audience === 'customers') {
    userIds = (
      await db
        .selectDistinct({ id: t.orders.userId })
        .from(t.orders)
        .where(and(inArray(t.orders.status, ['paid', 'preparing', 'shipped', 'delivered']), sql`${t.orders.userId} IS NOT NULL`))
    ).map((r) => r.id!);
  } else if (audience.startsWith('course:')) {
    userIds = (await db.selectDistinct({ id: t.enrollments.userId }).from(t.enrollments).where(eq(t.enrollments.courseId, audience.slice(7)))).map((r) => r.id);
  }
  if (userIds.length === 0) return [];
  const out: Target[] = [];
  for (let i = 0; i < userIds.length; i += 500) out.push(...(await base().where(and(...conds, inArray(t.pushTokens.userId, userIds.slice(i, i + 500))))));
  return out;
}

export type CampaignInput = PushPayload & { audience: string; platform: 'all' | 'ios' | 'android'; scheduledAt?: Date | null };

export async function createCampaign(input: CampaignInput, createdBy: string | null) {
  const db = getDb();
  const id = crypto.randomUUID();
  const scheduled = input.scheduledAt && input.scheduledAt.getTime() > Date.now() + 60_000;
  await db.insert(t.pushCampaigns).values({
    id,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink ?? null,
    imageUrl: input.imageUrl ?? null,
    audience: input.audience,
    platform: input.platform,
    status: scheduled ? 'scheduled' : 'draft',
    scheduledAt: scheduled ? input.scheduledAt! : null,
    createdBy: createdBy === 'demo-admin' ? null : createdBy,
  });
  if (!scheduled) await sendCampaign(id);
  return id;
}

export async function sendCampaign(id: string) {
  const db = getDb();
  // Bloqueo optimista: solo una ejecución pasa de draft/scheduled a sending
  const lock = await db
    .update(t.pushCampaigns)
    .set({ status: 'sending' })
    .where(and(eq(t.pushCampaigns.id, id), inArray(t.pushCampaigns.status, ['draft', 'scheduled'])));
  if ((lock as unknown as [{ affectedRows: number }])[0]?.affectedRows === 0) return null;
  const [c] = await db.select().from(t.pushCampaigns).where(eq(t.pushCampaigns.id, id)).limit(1);
  try {
    const targets = await resolveAudience(c!.audience, c!.platform);
    const r = await deliver(targets, { title: c!.title, body: c!.body, deepLink: c!.deepLink, imageUrl: c!.imageUrl }, 'campaign', id);
    await db
      .update(t.pushCampaigns)
      .set({ status: r.sent === 0 && targets.length > 0 ? 'failed' : 'sent', targetCount: targets.length, sentCount: r.sent, errorCount: r.errors, sentAt: new Date() })
      .where(eq(t.pushCampaigns.id, id));
    return r;
  } catch (e) {
    await db.update(t.pushCampaigns).set({ status: 'failed' }).where(eq(t.pushCampaigns.id, id));
    await logEvent('push', 'campaign', 'error', { externalId: id, message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

/** Cron: envía campañas programadas vencidas. */
export async function sendDueCampaigns() {
  const db = getDb();
  const due = await db
    .select({ id: t.pushCampaigns.id })
    .from(t.pushCampaigns)
    .where(and(eq(t.pushCampaigns.status, 'scheduled'), lt(t.pushCampaigns.scheduledAt, new Date())));
  for (const c of due) await sendCampaign(c.id);
  return due.length;
}

/** Cron: recordatorio a estudiantes con cursos sin avanzar en 5 días (máx. 1 por semana). */
export async function sendLessonReminders() {
  const db = getDb();
  const stale = await db
    .select({ userId: t.enrollments.userId, courseId: t.enrollments.courseId, title: t.courses.title, slug: t.courses.slug })
    .from(t.enrollments)
    .innerJoin(t.courses, eq(t.courses.id, t.enrollments.courseId))
    .where(and(eq(t.enrollments.status, 'active'), lt(t.enrollments.updatedAt, new Date(Date.now() - 5 * 86400000)), gte(t.enrollments.updatedAt, new Date(Date.now() - 30 * 86400000))))
    .limit(200);
  let n = 0;
  for (const s of stale) {
    const [recent] = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(t.notifications)
      .where(and(eq(t.notifications.userId, s.userId), eq(t.notifications.kind, 'lesson_reminder'), gte(t.notifications.createdAt, new Date(Date.now() - 7 * 86400000))));
    if (Number(recent?.n ?? 0) > 0) continue;
    await notifyUser(s.userId, { title: 'Tu travesía te espera ☕', body: `Retoma «${s.title}» donde la dejaste.`, deepLink: `/academia/cursos/${s.slug}` }, 'lesson_reminder');
    n++;
  }
  return n;
}
