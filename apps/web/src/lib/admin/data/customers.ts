import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { seedCourses, seedPlans } from '@travesia/db';
import { getDb, rawQuery, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { demoChats, demoDataset, isPaidStatus } from '../demo-data';

export type CustomerRow = { id: string; fullName: string | null; email: string; createdAt: string; lastSeenAt: string | null; loyaltyPoints: number; orders: number; ltv: number; lastOrderAt: string | null; subs: number; courses: number; role: string };
export type CustomerFilters = { q?: string; seg?: string; sort?: string; dir?: string; page?: number };

const PAID = `('paid','preparing','shipped','delivered')`;
const SORT_SQL: Record<string, string> = { ltv: 'ltv', orders: 'orders', created: 'u.created_at', seen: 'u.last_seen_at', points: 'u.loyalty_points', name: 'u.full_name' };

export async function listCustomers(f: CustomerFilters, opts: { all?: boolean } = {}) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = opts.all ? 10000 : 25;
  const sort = SORT_SQL[f.sort ?? 'ltv'] ? (f.sort ?? 'ltv') : 'ltv';
  const asc_ = f.dir === 'asc';
  if (isDemoMode()) {
    const ds = demoDataset();
    const agg = new Map<string, { orders: number; ltv: number; last: Date | null }>();
    for (const o of ds.orders) {
      if (!o.userId || !isPaidStatus(o.status)) continue;
      const e = agg.get(o.userId) ?? { orders: 0, ltv: 0, last: null };
      e.orders++;
      e.ltv += o.totalCop;
      if (!e.last || (o.paidAt && o.paidAt > e.last)) e.last = o.paidAt;
      agg.set(o.userId, e);
    }
    const subs = new Map<string, number>();
    for (const s of ds.subscriptions) if (s.status !== 'cancelled') subs.set(s.userId, (subs.get(s.userId) ?? 0) + 1);
    const courses = new Map<string, number>();
    for (const e of ds.enrollments) courses.set(e.userId, (courses.get(e.userId) ?? 0) + 1);
    const q = f.q?.trim().toLowerCase();
    let rows: CustomerRow[] = ds.customers
      .filter((c) => !q || c.email.includes(q) || c.fullName.toLowerCase().includes(q))
      .map((c) => {
        const a = agg.get(c.id);
        return { id: c.id, fullName: c.fullName, email: c.email, createdAt: c.createdAt.toISOString(), lastSeenAt: c.lastSeenAt.toISOString(), loyaltyPoints: c.loyaltyPoints, orders: a?.orders ?? 0, ltv: a?.ltv ?? 0, lastOrderAt: a?.last?.toISOString() ?? null, subs: subs.get(c.id) ?? 0, courses: courses.get(c.id) ?? 0, role: c.role };
      });
    if (f.seg === 'subs') rows = rows.filter((r) => r.subs > 0);
    if (f.seg === 'students') rows = rows.filter((r) => r.courses > 0);
    if (f.seg === 'vip') rows = rows.filter((r) => r.ltv >= 400000);
    if (f.seg === 'sin-compras') rows = rows.filter((r) => r.orders === 0);
    const key = ({ ltv: 'ltv', orders: 'orders', created: 'createdAt', seen: 'lastSeenAt', points: 'loyaltyPoints', name: 'fullName' } as const)[sort as 'ltv'];
    rows.sort((a, b) => ((a[key] ?? '') > (b[key] ?? '') ? 1 : (a[key] ?? '') < (b[key] ?? '') ? -1 : 0) * (asc_ ? 1 : -1));
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  }
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.q?.trim()) {
    where.push('(u.email LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)');
    const s = `%${f.q.trim()}%`;
    params.push(s, s, s);
  }
  if (f.seg === 'subs') where.push(`EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status IN ('active','paused','past_due'))`);
  if (f.seg === 'students') where.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = u.id AND e.status <> 'revoked')`);
  if (f.seg === 'vip') where.push('COALESCE(o.s,0) >= 400000');
  if (f.seg === 'sin-compras') where.push('o.n IS NULL');
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = `FROM users u LEFT JOIN (SELECT user_id, COUNT(*) n, SUM(total_cop) s, MAX(paid_at) last_at FROM orders WHERE status IN ${PAID} AND user_id IS NOT NULL GROUP BY user_id) o ON o.user_id = u.id ${w}`;
  const [rows, total] = await Promise.all([
    rawQuery<Record<string, unknown>>(
      `SELECT u.id, u.full_name, u.email, u.role, u.created_at, u.last_seen_at, u.loyalty_points, COALESCE(o.n,0) orders, COALESCE(o.s,0) ltv, o.last_at,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.id AND s.status IN ('active','paused','past_due')) subs,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status <> 'revoked') courses
       ${from} ORDER BY ${SORT_SQL[sort]} ${asc_ ? 'ASC' : 'DESC'} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params,
    ),
    rawQuery<Record<string, unknown>>(`SELECT COUNT(*) n ${from}`, params),
  ]);
  const iso = (v: unknown) => (v ? new Date(`${String(v).replace(' ', 'T')}Z`).toISOString() : null);
  return {
    rows: rows.map((r) => ({ id: String(r.id), fullName: (r.full_name as string) ?? null, email: String(r.email), role: String(r.role), createdAt: iso(r.created_at)!, lastSeenAt: iso(r.last_seen_at), loyaltyPoints: Number(r.loyalty_points ?? 0), orders: Number(r.orders), ltv: Number(r.ltv), lastOrderAt: iso(r.last_at), subs: Number(r.subs), courses: Number(r.courses) })),
    total: Number(total[0]?.n ?? 0),
    page,
    pageSize,
  };
}

export async function getCustomer(id: string) {
  if (isDemoMode()) {
    const ds = demoDataset();
    const c = ds.customers.find((x) => x.id === id);
    if (!c) return null;
    const orders = ds.orders.filter((o) => o.userId === id);
    const subs = ds.subscriptions.filter((s) => s.userId === id);
    const enr = ds.enrollments.filter((e) => e.userId === id);
    const certs = ds.certificates.filter((x) => x.userId === id);
    const paid = orders.filter((o) => isPaidStatus(o.status));
    return {
      user: { id: c.id, fullName: c.fullName, email: c.email, phone: c.phone, role: c.role, loyaltyPoints: c.loyaltyPoints, createdAt: c.createdAt, lastSeenAt: c.lastSeenAt, provider: c.provider, marketingOptIn: c.marketingOptIn, legalIdType: 'CC', legalId: '1036' + c.id.slice(-6).replace(/\D/g, '0'), avatarUrl: null as string | null, disabledAt: null as Date | null },
      addresses: [{ id: `${c.id}-a`, label: 'Casa', recipient: c.fullName, phone: c.phone, region: c.region, city: c.city, line1: orders[0]?.shippingAddress?.line1 ?? 'Cra. 43A # 1-50', line2: null, isDefault: true }],
      orders: orders.slice(0, 30).map((o) => ({ id: o.id, number: o.number, status: o.status, kind: o.kind, totalCop: o.totalCop, createdAt: o.createdAt })),
      subscriptions: subs.map((s) => ({ id: s.id, status: s.status, priceCop: s.priceCop, planName: seedPlans.find((p) => p.id === s.planId)?.name ?? '—', nextBillingAt: s.nextBillingAt, startedAt: s.startedAt })),
      enrollments: enr.map((e) => ({ id: e.id, courseId: e.courseId, title: String(seedCourses.find((x) => x.id === e.courseId)?.base.title ?? ''), progressPct: e.progressPct, status: e.status, source: e.source, createdAt: e.createdAt })),
      certificates: certs.map((x) => ({ code: x.code, courseTitle: x.courseTitle, issuedAt: x.issuedAt, revokedAt: x.revokedAt })),
      ledger: paid.slice(0, 12).map((o) => ({ points: o.pointsEarned, reason: 'Compra', createdAt: o.paidAt!, orderId: o.id })),
      devices: c.provider === 'google.com' ? [{ platform: 'android', appVersion: '1.2.0', enabled: true, updatedAt: c.lastSeenAt }] : [],
      chats: demoChats().filter((x) => x.email === c.email).map((x) => ({ id: x.id, status: x.status, lastMessageAt: x.lastMessageAt })),
      stats: { orders: paid.length, ltv: paid.reduce((s, o) => s + o.totalCop, 0), aov: paid.length ? Math.round(paid.reduce((s, o) => s + o.totalCop, 0) / paid.length) : 0, firstOrderAt: paid.at(-1)?.paidAt ?? null },
    };
  }
  const db = getDb();
  const [u] = await db.select().from(t.users).where(eq(t.users.id, id)).limit(1);
  if (!u) return null;
  const [addresses, orders, subs, enr, certs, ledger, devices, chats] = await Promise.all([
    db.select().from(t.addresses).where(eq(t.addresses.userId, id)),
    db.select({ id: t.orders.id, number: t.orders.number, status: t.orders.status, kind: t.orders.kind, totalCop: t.orders.totalCop, createdAt: t.orders.createdAt, paidAt: t.orders.paidAt }).from(t.orders).where(eq(t.orders.userId, id)).orderBy(desc(t.orders.createdAt)).limit(200),
    db.select({ id: t.subscriptions.id, status: t.subscriptions.status, priceCop: t.subscriptions.priceCop, planName: t.subscriptionPlans.name, nextBillingAt: t.subscriptions.nextBillingAt, startedAt: t.subscriptions.startedAt }).from(t.subscriptions).leftJoin(t.subscriptionPlans, eq(t.subscriptionPlans.id, t.subscriptions.planId)).where(eq(t.subscriptions.userId, id)),
    db.select({ id: t.enrollments.id, courseId: t.enrollments.courseId, title: t.courses.title, progressPct: t.enrollments.progressPct, status: t.enrollments.status, source: t.enrollments.source, createdAt: t.enrollments.createdAt }).from(t.enrollments).leftJoin(t.courses, eq(t.courses.id, t.enrollments.courseId)).where(eq(t.enrollments.userId, id)),
    db.select({ code: t.certificates.code, courseTitle: t.certificates.courseTitle, issuedAt: t.certificates.issuedAt, revokedAt: t.certificates.revokedAt }).from(t.certificates).where(eq(t.certificates.userId, id)),
    db.select().from(t.loyaltyLedger).where(eq(t.loyaltyLedger.userId, id)).orderBy(desc(t.loyaltyLedger.createdAt)).limit(30),
    db.select({ platform: t.pushTokens.platform, appVersion: t.pushTokens.appVersion, enabled: t.pushTokens.enabled, updatedAt: t.pushTokens.updatedAt }).from(t.pushTokens).where(eq(t.pushTokens.userId, id)),
    db.select({ id: t.chatSessions.id, status: t.chatSessions.status, lastMessageAt: t.chatSessions.lastMessageAt }).from(t.chatSessions).where(eq(t.chatSessions.userId, id)).orderBy(desc(t.chatSessions.lastMessageAt)).limit(10),
  ]);
  const paid = orders.filter((o) => isPaidStatus(o.status));
  const ltv = paid.reduce((s, o) => s + o.totalCop, 0);
  return {
    user: u,
    addresses,
    orders: orders.slice(0, 30),
    subscriptions: subs.map((s) => ({ ...s, planName: s.planName ?? '—' })),
    enrollments: enr.map((e) => ({ ...e, title: e.title ?? '' })),
    certificates: certs,
    ledger,
    devices,
    chats,
    stats: { orders: paid.length, ltv, aov: paid.length ? Math.round(ltv / paid.length) : 0, firstOrderAt: paid.at(-1)?.paidAt ?? null },
  };
}

export async function findUserByEmail(email: string) {
  if (isDemoMode()) return demoDataset().customers.find((c) => c.email === email.toLowerCase()) ?? null;
  const [u] = await getDb().select({ id: t.users.id, email: t.users.email, fullName: t.users.fullName }).from(t.users).where(eq(t.users.email, email.toLowerCase())).limit(1);
  return u ?? null;
}

export { and, inArray };
