import 'server-only';
/** Lecturas de marketing, soporte, suscripciones y sistema para el panel. */
import { and, asc, desc, eq, gte, inArray, like, or, sql, count } from 'drizzle-orm';
import { seedPlans, seedProducts } from '@travesia/db';
import { getDb, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { demoAudit, demoCampaigns, demoChats, demoDataset, demoEvents, demoLeads, demoNewsletter, demoPushStats } from '../demo-data';

// ------------------------------- Suscripciones -------------------------------
export async function listSubscriptions(f: { q?: string; status?: string; plan?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = 25;
  if (isDemoMode()) {
    const ds = demoDataset();
    const q = f.q?.trim().toLowerCase();
    const rows = ds.subscriptions
      .map((s) => {
        const u = ds.customers.find((c) => c.id === s.userId)!;
        return { id: s.id, userId: s.userId, name: u.fullName, email: u.email, planId: s.planId, plan: seedPlans.find((p) => p.id === s.planId)?.name ?? '—', product: seedProducts.find((p) => p.id === s.productId)?.name ?? null, grind: s.grind, status: s.status, priceCop: s.priceCop, nextBillingAt: s.nextBillingAt, startedAt: s.startedAt, failedAttempts: s.failedAttempts, cardBrand: s.cardBrand, cardLast4: s.cardLast4, createdAt: s.createdAt };
      })
      .filter((r) => (!f.status || r.status === f.status) && (!f.plan || r.planId === f.plan) && (!q || r.email.includes(q) || r.name.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const counts: Record<string, number> = {};
    for (const s of ds.subscriptions) counts[s.status] = (counts[s.status] ?? 0) + 1;
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, counts };
  }
  const db = getDb();
  const conds = [];
  if (f.status) conds.push(eq(t.subscriptions.status, f.status as 'active'));
  if (f.plan) conds.push(eq(t.subscriptions.planId, f.plan));
  if (f.q?.trim()) conds.push(or(like(t.users.email, `%${f.q.trim()}%`), like(t.users.fullName, `%${f.q.trim()}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }], countRows] = await Promise.all([
    db
      .select({ s: t.subscriptions, name: t.users.fullName, email: t.users.email, plan: t.subscriptionPlans.name, product: t.products.name })
      .from(t.subscriptions)
      .leftJoin(t.users, eq(t.users.id, t.subscriptions.userId))
      .leftJoin(t.subscriptionPlans, eq(t.subscriptionPlans.id, t.subscriptions.planId))
      .leftJoin(t.products, eq(t.products.id, t.subscriptions.productId))
      .where(where)
      .orderBy(desc(t.subscriptions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(t.subscriptions).leftJoin(t.users, eq(t.users.id, t.subscriptions.userId)).where(where),
    db.select({ status: t.subscriptions.status, n: count() }).from(t.subscriptions).groupBy(t.subscriptions.status),
  ]);
  return {
    rows: rows.map((r) => ({ ...r.s, name: r.name ?? r.email ?? '', email: r.email ?? '', plan: r.plan ?? '—', product: r.product })),
    total: Number(n),
    page,
    pageSize,
    counts: Object.fromEntries(countRows.map((c) => [c.status, Number(c.n)])) as Record<string, number>,
  };
}

export async function getSubscription(id: string) {
  if (isDemoMode()) {
    const ds = demoDataset();
    const s = ds.subscriptions.find((x) => x.id === id);
    if (!s) return null;
    const u = ds.customers.find((c) => c.id === s.userId)!;
    const plan = seedPlans.find((p) => p.id === s.planId)!;
    return {
      sub: { ...s, wompiPaymentSourceId: '48213', updatedAt: s.createdAt },
      user: { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone },
      plan: { id: plan.id, name: plan.name, frequencyWeeks: plan.frequencyWeeks, priceCop: plan.priceCop, bagsPerDelivery: plan.bagsPerDelivery, bagWeightG: plan.bagWeightG, includesAcademy: plan.includesAcademy },
      product: seedProducts.find((p) => p.id === s.productId)?.name ?? null,
      charges: ds.charges.filter((c) => c.subscriptionId === id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      orders: ds.orders.filter((o) => o.subscriptionId === id).map((o) => ({ id: o.id, number: o.number, status: o.status, totalCop: o.totalCop, createdAt: o.createdAt })),
    };
  }
  const db = getDb();
  const [s] = await db.select().from(t.subscriptions).where(eq(t.subscriptions.id, id)).limit(1);
  if (!s) return null;
  const [u, plan, product, charges, orders] = await Promise.all([
    db.select({ id: t.users.id, fullName: t.users.fullName, email: t.users.email, phone: t.users.phone }).from(t.users).where(eq(t.users.id, s.userId)).limit(1),
    db.select().from(t.subscriptionPlans).where(eq(t.subscriptionPlans.id, s.planId)).limit(1),
    s.productId ? db.select({ name: t.products.name }).from(t.products).where(eq(t.products.id, s.productId)).limit(1) : Promise.resolve([]),
    db.select().from(t.subscriptionCharges).where(eq(t.subscriptionCharges.subscriptionId, id)).orderBy(desc(t.subscriptionCharges.createdAt)).limit(60),
    db.select({ id: t.orders.id, number: t.orders.number, status: t.orders.status, totalCop: t.orders.totalCop, createdAt: t.orders.createdAt }).from(t.orders).where(eq(t.orders.subscriptionId, id)).orderBy(desc(t.orders.createdAt)).limit(60),
  ]);
  return { sub: s, user: u[0] ?? { id: s.userId, fullName: null, email: '—', phone: null }, plan: plan[0] ?? null, product: product[0]?.name ?? null, charges, orders };
}

// ------------------------------- Push -------------------------------
export async function getPushOverview() {
  if (isDemoMode()) {
    const now = new Date();
    const st = demoPushStats();
    const campaigns = demoCampaigns(now);
    return {
      campaigns,
      devices: { ios: st.ios, android: st.android, web: st.web, disabled: st.disabled, withUser: Math.round((st.ios + st.android) * 0.72) },
      deliveries: campaigns.slice(0, 3).flatMap((c, i) => Array.from({ length: 4 }, (_, j) => ({ id: `${c.id}-${j}`, title: c.title, trigger: 'campaign', status: (j === 3 && i === 0 ? 'error' : 'ok') as 'ok' | 'error', error: j === 3 && i === 0 ? 'DeviceNotRegistered' : null, createdAt: c.sentAt ?? now, platform: j % 2 ? 'ios' : 'android' }))),
      byTrigger: [
        { trigger: 'campaign', ok: 2945, error: 52 },
        { trigger: 'order_paid', ok: 318, error: 4 },
        { trigger: 'order_shipped', ok: 274, error: 2 },
        { trigger: 'subscription', ok: 121, error: 1 },
        { trigger: 'lesson_reminder', ok: 96, error: 0 },
      ],
    };
  }
  const db = getDb();
  const since = new Date(Date.now() - 7 * 86400000);
  const [campaigns, devices, deliveries, byTrigger] = await Promise.all([
    db.select().from(t.pushCampaigns).orderBy(desc(t.pushCampaigns.createdAt)).limit(50),
    db.select({ platform: t.pushTokens.platform, enabled: t.pushTokens.enabled, n: count(), withUser: sql<number>`SUM(${t.pushTokens.userId} IS NOT NULL)` }).from(t.pushTokens).groupBy(t.pushTokens.platform, t.pushTokens.enabled),
    db
      .select({ id: t.pushDeliveries.id, title: t.pushDeliveries.title, trigger: t.pushDeliveries.trigger, status: t.pushDeliveries.status, error: t.pushDeliveries.error, createdAt: t.pushDeliveries.createdAt, platform: t.pushTokens.platform })
      .from(t.pushDeliveries)
      .leftJoin(t.pushTokens, eq(t.pushTokens.token, t.pushDeliveries.token))
      .orderBy(desc(t.pushDeliveries.createdAt))
      .limit(40),
    db.select({ trigger: t.pushDeliveries.trigger, ok: sql<number>`SUM(${t.pushDeliveries.status} = 'ok')`, error: sql<number>`SUM(${t.pushDeliveries.status} = 'error')` }).from(t.pushDeliveries).where(gte(t.pushDeliveries.createdAt, since)).groupBy(t.pushDeliveries.trigger),
  ]);
  const dv = { ios: 0, android: 0, web: 0, disabled: 0, withUser: 0 };
  for (const d of devices) {
    if (!d.enabled) dv.disabled += Number(d.n);
    else {
      dv[d.platform] += Number(d.n);
      dv.withUser += Number(d.withUser);
    }
  }
  return { campaigns, devices: dv, deliveries: deliveries.map((d) => ({ ...d, platform: d.platform ?? '—' })), byTrigger: byTrigger.map((b) => ({ trigger: b.trigger, ok: Number(b.ok), error: Number(b.error) })) };
}

// ------------------------------- CRM -------------------------------
export type LeadRow = typeof t.leads.$inferSelect;
export async function listLeads(f: { q?: string; status?: string } = {}): Promise<LeadRow[]> {
  if (isDemoMode()) {
    const q = f.q?.trim().toLowerCase();
    return demoLeads().filter((l) => (!f.status || l.status === f.status) && (!q || l.name.toLowerCase().includes(q) || l.email.includes(q) || (l.company ?? '').toLowerCase().includes(q))) as LeadRow[];
  }
  const conds = [];
  if (f.status) conds.push(eq(t.leads.status, f.status as 'new'));
  if (f.q?.trim()) conds.push(or(like(t.leads.name, `%${f.q.trim()}%`), like(t.leads.email, `%${f.q.trim()}%`), like(t.leads.company, `%${f.q.trim()}%`))!);
  return getDb().select().from(t.leads).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.leads.createdAt)).limit(500);
}

export async function listNewsletter(f: { q?: string; status?: string } = {}) {
  if (isDemoMode()) {
    const q = f.q?.trim().toLowerCase();
    return demoNewsletter().filter((s) => (!q || s.email.includes(q)) && (!f.status || (f.status === 'unsub' ? s.unsubscribedAt : !s.unsubscribedAt)));
  }
  const conds = [];
  if (f.q?.trim()) conds.push(like(t.newsletterSubscribers.email, `%${f.q.trim()}%`));
  if (f.status === 'unsub') conds.push(sql`${t.newsletterSubscribers.unsubscribedAt} IS NOT NULL`);
  if (f.status === 'active') conds.push(sql`${t.newsletterSubscribers.unsubscribedAt} IS NULL`);
  return getDb().select().from(t.newsletterSubscribers).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.newsletterSubscribers.createdAt)).limit(5000);
}

// ------------------------------- Chat -------------------------------
export type ChatSummary = { id: string; name: string | null; email: string | null; userId: string | null; channel: string; status: string; lastMessageAt: string; preview: string; summary: string | null };
export async function listChats(status?: string): Promise<ChatSummary[]> {
  if (isDemoMode()) {
    return demoChats()
      .filter((c) => (status === 'all' ? true : status ? c.status === status : c.status !== 'closed'))
      .map((c) => ({ id: c.id, name: c.name, email: c.email, userId: c.userId, channel: c.channel, status: c.status, lastMessageAt: c.lastMessageAt.toISOString(), preview: c.messages.at(-1)?.content ?? '', summary: null }));
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(t.chatSessions)
    .where(status === 'all' ? undefined : status ? eq(t.chatSessions.status, status as 'bot') : sql`${t.chatSessions.status} <> 'closed'`)
    .orderBy(sql`FIELD(${t.chatSessions.status}, 'human_requested', 'human', 'bot', 'closed')`, desc(t.chatSessions.lastMessageAt))
    .limit(80);
  const ids = rows.map((r) => r.id);
  const last = ids.length
    ? await db
        .select({ sessionId: t.chatMessages.sessionId, content: t.chatMessages.content, createdAt: t.chatMessages.createdAt })
        .from(t.chatMessages)
        .where(and(inArray(t.chatMessages.sessionId, ids), sql`${t.chatMessages.createdAt} = (SELECT MAX(m2.created_at) FROM chat_messages m2 WHERE m2.session_id = ${t.chatMessages.sessionId})`))
    : [];
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, userId: r.userId, channel: r.channel, status: r.status, lastMessageAt: r.lastMessageAt.toISOString(), preview: last.find((m) => m.sessionId === r.id)?.content ?? '', summary: r.summary }));
}

export async function getChatMessages(id: string) {
  if (isDemoMode()) {
    const c = demoChats().find((x) => x.id === id);
    return c ? c.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() })) : [];
  }
  const rows = await getDb().select().from(t.chatMessages).where(eq(t.chatMessages.sessionId, id)).orderBy(asc(t.chatMessages.createdAt)).limit(300);
  return rows.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() }));
}

// ------------------------------- Sistema -------------------------------
export async function listUsersAdmin(f: { q?: string; role?: string }) {
  if (isDemoMode()) {
    const q = f.q?.trim().toLowerCase();
    const all = demoDataset().customers;
    const rows = all.filter((c) => (!f.role ? (q ? true : c.role !== 'customer') : c.role === f.role) && (!q || c.email.includes(q) || c.fullName.toLowerCase().includes(q))).slice(0, 50);
    return { rows: rows.map((c) => ({ id: c.id, email: c.email, fullName: c.fullName, role: c.role, provider: c.provider, lastSeenAt: c.lastSeenAt, createdAt: c.createdAt, firebaseUid: `demo-${c.id.slice(-6)}` })), admins: all.filter((c) => c.role === 'admin').length };
  }
  const db = getDb();
  const conds = [];
  if (f.role) conds.push(eq(t.users.role, f.role as 'admin'));
  else if (!f.q?.trim()) conds.push(inArray(t.users.role, ['admin', 'editor']));
  if (f.q?.trim()) conds.push(or(like(t.users.email, `%${f.q.trim()}%`), like(t.users.fullName, `%${f.q.trim()}%`))!);
  const [rows, [{ n }]] = await Promise.all([
    db.select({ id: t.users.id, email: t.users.email, fullName: t.users.fullName, role: t.users.role, provider: t.users.provider, lastSeenAt: t.users.lastSeenAt, createdAt: t.users.createdAt, firebaseUid: t.users.firebaseUid }).from(t.users).where(and(...conds)).orderBy(desc(t.users.lastSeenAt)).limit(50),
    db.select({ n: count() }).from(t.users).where(eq(t.users.role, 'admin')),
  ]);
  return { rows, admins: Number(n) };
}

export async function listEvents(f: { source?: string; status?: string; q?: string; limit?: number }) {
  if (isDemoMode()) {
    const q = f.q?.trim().toLowerCase();
    return demoEvents().filter((e) => (!f.source || e.source === f.source) && (!f.status || e.status === f.status) && (!q || e.event.includes(q) || (e.message ?? '').toLowerCase().includes(q)));
  }
  const conds = [];
  if (f.source) conds.push(eq(t.integrationEvents.source, f.source));
  if (f.status) conds.push(eq(t.integrationEvents.status, f.status as 'ok'));
  if (f.q?.trim()) conds.push(or(like(t.integrationEvents.event, `%${f.q.trim()}%`), like(t.integrationEvents.message, `%${f.q.trim()}%`), like(t.integrationEvents.externalId, `%${f.q.trim()}%`))!);
  return getDb().select().from(t.integrationEvents).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.integrationEvents.createdAt)).limit(f.limit ?? 100);
}

export async function eventStats24h() {
  if (isDemoMode()) {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, ok: 8 + ((i * 7) % 11), error: i % 9 === 3 ? 2 : i % 7 === 0 ? 1 : 0 }));
    return { hours, wompi: { ok: 46, error: 1, ignored: 3 }, bySource: [{ source: 'wompi', ok: 46, error: 1 }, { source: 'push', ok: 31, error: 0 }, { source: 'email', ok: 58, error: 2 }, { source: 'cron', ok: 96, error: 0 }, { source: 'ai', ok: 120, error: 0 }] };
  }
  const since = new Date(Date.now() - 86400000);
  const db = getDb();
  const [byHour, bySource] = await Promise.all([
    db
      .select({ h: sql<number>`HOUR(CONVERT_TZ(${t.integrationEvents.createdAt},'+00:00','-05:00'))`, ok: sql<number>`SUM(${t.integrationEvents.status} = 'ok')`, error: sql<number>`SUM(${t.integrationEvents.status} = 'error')` })
      .from(t.integrationEvents)
      .where(gte(t.integrationEvents.createdAt, since))
      .groupBy(sql`1`),
    db
      .select({ source: t.integrationEvents.source, ok: sql<number>`SUM(${t.integrationEvents.status} = 'ok')`, error: sql<number>`SUM(${t.integrationEvents.status} = 'error')`, ignored: sql<number>`SUM(${t.integrationEvents.status} = 'ignored')` })
      .from(t.integrationEvents)
      .where(gte(t.integrationEvents.createdAt, since))
      .groupBy(t.integrationEvents.source),
  ]);
  const w = bySource.find((s) => s.source === 'wompi');
  return {
    hours: Array.from({ length: 24 }, (_, i) => {
      const r = byHour.find((x) => Number(x.h) === i);
      return { hour: i, ok: Number(r?.ok ?? 0), error: Number(r?.error ?? 0) };
    }),
    wompi: { ok: Number(w?.ok ?? 0), error: Number(w?.error ?? 0), ignored: Number(w?.ignored ?? 0) },
    bySource: bySource.map((s) => ({ source: s.source, ok: Number(s.ok), error: Number(s.error) })),
  };
}

export async function listAudit(f: { q?: string; entity?: string; page?: number }) {
  if (isDemoMode()) return demoAudit().filter((a) => !f.entity || a.entity === f.entity);
  const conds = [];
  if (f.entity) conds.push(eq(t.auditLog.entity, f.entity));
  if (f.q?.trim()) conds.push(or(like(t.auditLog.action, `%${f.q.trim()}%`), like(t.auditLog.entityId, `%${f.q.trim()}%`), like(t.users.email, `%${f.q.trim()}%`))!);
  const rows = await getDb()
    .select({ id: t.auditLog.id, userId: t.auditLog.userId, userEmail: t.users.email, action: t.auditLog.action, entity: t.auditLog.entity, entityId: t.auditLog.entityId, meta: t.auditLog.meta, createdAt: t.auditLog.createdAt })
    .from(t.auditLog)
    .leftJoin(t.users, eq(t.users.id, t.auditLog.userId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(t.auditLog.createdAt))
    .limit(200);
  return rows;
}
