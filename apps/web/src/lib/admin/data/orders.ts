import 'server-only';
import { and, asc, desc, eq, gte, inArray, like, lt, or, sql, count, type SQL } from 'drizzle-orm';
import { getDb, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { demoDataset, isPaidStatus, type DemoOrder } from '../demo-data';
import { startOfDay, addDays } from '../range';

export type OrderFilters = { q?: string; status?: string; kind?: string; channel?: string; from?: string; to?: string; sort?: string; dir?: string; page?: number; pageSize?: number };
export type OrderRow = { id: string; number: string; createdAt: string; paidAt: string | null; customerName: string; email: string; kind: string; channel: string; status: string; totalCop: number; items: number; city: string | null; paymentMethod: string | null; couponCode: string | null };

const STATUSES = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'] as const;
const SORTS = { date: 'createdAt', total: 'totalCop', number: 'number', customer: 'customerName', status: 'status' } as const;

const toRow = (o: DemoOrder | (typeof t.orders.$inferSelect & { items?: number })): OrderRow => ({
  id: o.id,
  number: o.number,
  createdAt: o.createdAt.toISOString(),
  paidAt: o.paidAt?.toISOString() ?? null,
  customerName: o.customerName,
  email: o.email,
  kind: o.kind,
  channel: o.channel,
  status: o.status,
  totalCop: o.totalCop,
  items: Array.isArray((o as DemoOrder).items) ? (o as DemoOrder).items.reduce((s, i) => s + i.quantity, 0) : Number((o as { items?: number }).items ?? 0),
  city: o.shippingAddress?.city ?? null,
  paymentMethod: o.paymentMethod,
  couponCode: o.couponCode,
});

export async function listOrders(f: OrderFilters, opts: { all?: boolean } = {}) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = opts.all ? 5000 : (f.pageSize ?? 25);
  const sortKey = SORTS[(f.sort ?? 'date') as keyof typeof SORTS] ?? 'createdAt';
  const asc_ = f.dir === 'asc';
  const fromD = f.from ? startOfDay(f.from) : null;
  const toD = f.to ? startOfDay(addDays(f.to, 1)) : null;

  if (isDemoMode()) {
    const ds = demoDataset();
    const q = f.q?.trim().toLowerCase();
    let list = ds.orders.filter(
      (o) =>
        (!f.status || o.status === f.status) &&
        (!f.kind || o.kind === f.kind) &&
        (!f.channel || o.channel === f.channel) &&
        (!fromD || o.createdAt >= fromD) &&
        (!toD || o.createdAt < toD) &&
        (!q || o.number.toLowerCase().includes(q) || o.email.includes(q) || o.customerName.toLowerCase().includes(q)),
    );
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const o of ds.orders) counts[o.status]!++;
    list = [...list].sort((a, b) => {
      const va = a[sortKey as keyof DemoOrder] as never;
      const vb = b[sortKey as keyof DemoOrder] as never;
      return (va > vb ? 1 : va < vb ? -1 : 0) * (asc_ ? 1 : -1);
    });
    return { rows: list.slice((page - 1) * pageSize, page * pageSize).map(toRow), total: list.length, counts, page, pageSize };
  }

  const db = getDb();
  const conds: SQL[] = [];
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) conds.push(eq(t.orders.status, f.status as (typeof STATUSES)[number]));
  if (f.kind) conds.push(eq(t.orders.kind, f.kind as 'store'));
  if (f.channel) conds.push(eq(t.orders.channel, f.channel as 'web'));
  if (fromD) conds.push(gte(t.orders.createdAt, fromD));
  if (toD) conds.push(lt(t.orders.createdAt, toD));
  if (f.q?.trim()) {
    const s = `%${f.q.trim()}%`;
    conds.push(or(like(t.orders.number, s), like(t.orders.email, s), like(t.orders.customerName, s))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const col = t.orders[sortKey as 'createdAt'];
  const itemsSub = sql<number>`(SELECT COALESCE(SUM(${t.orderItems.quantity}),0) FROM ${t.orderItems} WHERE ${t.orderItems.orderId} = ${t.orders.id})`;
  const [rows, [{ n }], countRows] = await Promise.all([
    db
      .select({ o: t.orders, items: itemsSub })
      .from(t.orders)
      .where(where)
      .orderBy(asc_ ? asc(col) : desc(col))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(t.orders).where(where),
    db.select({ status: t.orders.status, n: count() }).from(t.orders).groupBy(t.orders.status),
  ]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, Number(countRows.find((c) => c.status === s)?.n ?? 0)]));
  return { rows: rows.map((r) => toRow({ ...r.o, items: Number(r.items) })), total: Number(n), counts, page, pageSize };
}

export type OrderDetail = Awaited<ReturnType<typeof getOrder>>;

export async function getOrder(id: string) {
  if (isDemoMode()) {
    const ds = demoDataset();
    const o = ds.orders.find((x) => x.id === id || x.number === id);
    if (!o) return null;
    const history = ds.orders.filter((x) => x.email === o.email && isPaidStatus(x.status));
    const customer = ds.customers.find((c) => c.id === o.userId) ?? null;
    return {
      order: { ...o, items: undefined, utm: null as Record<string, string> | null },
      items: o.items,
      customer: customer ? { id: customer.id, fullName: customer.fullName, email: customer.email, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints, createdAt: customer.createdAt } : null,
      stats: { orders: history.length, ltv: history.reduce((s, x) => s + x.totalCop, 0) },
      paymentEvents: o.paidAt ? [{ id: `${o.id}-pe`, event: 'transaction.updated', status: 'APPROVED', externalId: o.wompiTransactionId ?? '', signatureOk: true, createdAt: o.paidAt }] : [],
      audit: [] as { action: string; meta: unknown; createdAt: Date; userEmail: string | null }[],
      subscription: o.subscriptionId ? ds.subscriptions.find((s) => s.id === o.subscriptionId) ?? null : null,
    };
  }
  const db = getDb();
  const [o] = await db.select().from(t.orders).where(or(eq(t.orders.id, id), eq(t.orders.number, id))).limit(1);
  if (!o) return null;
  const [items, events, audits, customer, stats, sub] = await Promise.all([
    db.select().from(t.orderItems).where(eq(t.orderItems.orderId, o.id)),
    db.select().from(t.paymentEvents).where(eq(t.paymentEvents.reference, o.wompiReference)).orderBy(asc(t.paymentEvents.createdAt)),
    db
      .select({ id: t.auditLog.id, action: t.auditLog.action, meta: t.auditLog.meta, createdAt: t.auditLog.createdAt, userEmail: t.users.email })
      .from(t.auditLog)
      .leftJoin(t.users, eq(t.users.id, t.auditLog.userId))
      .where(and(eq(t.auditLog.entity, 'order'), inArray(t.auditLog.entityId, [o.id, o.number])))
      .orderBy(asc(t.auditLog.createdAt)),
    o.userId ? db.select({ id: t.users.id, fullName: t.users.fullName, email: t.users.email, phone: t.users.phone, loyaltyPoints: t.users.loyaltyPoints, createdAt: t.users.createdAt }).from(t.users).where(eq(t.users.id, o.userId)).limit(1) : Promise.resolve([]),
    db
      .select({ n: count(), s: sql<number>`COALESCE(SUM(${t.orders.totalCop}),0)` })
      .from(t.orders)
      .where(and(eq(t.orders.email, o.email), inArray(t.orders.status, ['paid', 'preparing', 'shipped', 'delivered']))),
    o.subscriptionId ? db.select().from(t.subscriptions).where(eq(t.subscriptions.id, o.subscriptionId)).limit(1) : Promise.resolve([]),
  ]);
  return {
    order: o,
    items,
    customer: customer[0] ?? null,
    stats: { orders: Number(stats[0]?.n ?? 0), ltv: Number(stats[0]?.s ?? 0) },
    paymentEvents: events.map((e) => ({ id: e.id, event: e.event, status: e.status, externalId: e.externalId, signatureOk: e.signatureOk, createdAt: e.createdAt })),
    audit: audits.map((a) => ({ id: a.id, action: a.action, meta: a.meta, createdAt: a.createdAt, userEmail: a.userEmail })),
    subscription: sub[0] ?? null,
  };
}
