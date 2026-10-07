import 'server-only';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { seedCoupons, seedPlans, seedProducts, seedShippingZones, seedVariants, seedCourses } from '@travesia/db';
import { getDb, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { demoDataset, demoReviews, isPaidStatus } from '../demo-data';
import { demoStock } from '../metrics';

export type ProductRow = typeof t.products.$inferSelect;
export type VariantRow = typeof t.productVariants.$inferSelect;
export type PlanRow = typeof t.subscriptionPlans.$inferSelect;
export type CouponRow = typeof t.coupons.$inferSelect;
export type ZoneRow = typeof t.shippingZones.$inferSelect;

const epoch = new Date('2026-08-01T12:00:00Z');
export const demoProductRows = (): ProductRow[] =>
  seedProducts.map((p) => ({ ...p, isActive: true, createdAt: epoch, updatedAt: epoch }) as unknown as ProductRow);
export const demoVariantRows = (): VariantRow[] =>
  seedVariants.map((v) => ({ ...v, stock: demoStock(v.id, v.stock), createdAt: epoch, updatedAt: epoch }) as unknown as VariantRow);

export type ProductListRow = ProductRow & { variants: VariantRow[]; stock: number; priceFrom: number; sold30: number };

export async function listProducts(f: { q?: string; kind?: string; status?: string; sort?: string; dir?: string } = {}) {
  let products: ProductRow[];
  let variants: VariantRow[];
  let sold = new Map<string, number>();
  if (isDemoMode()) {
    products = demoProductRows();
    variants = demoVariantRows();
    const since = Date.now() - 30 * 86400000;
    for (const o of demoDataset().orders) {
      if (!isPaidStatus(o.status) || !o.paidAt || o.paidAt.getTime() < since) continue;
      for (const i of o.items) if (i.productId && i.itemKind === 'product') sold.set(i.productId, (sold.get(i.productId) ?? 0) + i.quantity);
    }
  } else {
    const db = getDb();
    const [p, v, s] = await Promise.all([
      db.select().from(t.products).orderBy(asc(t.products.sortOrder), asc(t.products.name)),
      db.select().from(t.productVariants).orderBy(asc(t.productVariants.sortOrder)),
      db
        .select({ pid: t.orderItems.productId, n: sql<number>`SUM(${t.orderItems.quantity})` })
        .from(t.orderItems)
        .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
        .where(sql`${t.orders.status} IN ('paid','preparing','shipped','delivered') AND ${t.orders.paidAt} >= ${new Date(Date.now() - 30 * 86400000)} AND ${t.orderItems.itemKind} = 'product'`)
        .groupBy(t.orderItems.productId),
    ]);
    products = p;
    variants = v;
    sold = new Map(s.map((r) => [r.pid ?? '', Number(r.n)]));
  }
  const q = f.q?.trim().toLowerCase();
  let rows: ProductListRow[] = products
    .filter((p) => (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q) || (p.category ?? '').toLowerCase().includes(q)) && (!f.kind || p.kind === f.kind) && (!f.status || (f.status === 'active' ? p.isActive : f.status === 'inactive' ? !p.isActive : f.status === 'featured' ? p.isFeatured : f.status === 'low' ? true : true)))
    .map((p) => {
      const vs = variants.filter((v) => v.productId === p.id);
      const active = vs.filter((v) => v.isActive);
      return { ...p, variants: vs, stock: vs.reduce((s, v) => s + v.stock, 0), priceFrom: active.length ? Math.min(...active.map((v) => v.priceCop)) : 0, sold30: sold.get(p.id) ?? 0 };
    });
  if (f.status === 'low') rows = rows.filter((r) => r.variants.some((v) => v.isActive && v.stock <= 5));
  const dir = f.dir === 'desc' ? -1 : 1;
  const key = f.sort;
  if (key === 'name') rows.sort((a, b) => a.name.localeCompare(b.name) * dir);
  else if (key === 'price') rows.sort((a, b) => (a.priceFrom - b.priceFrom) * dir);
  else if (key === 'stock') rows.sort((a, b) => (a.stock - b.stock) * dir);
  else if (key === 'sold') rows.sort((a, b) => (a.sold30 - b.sold30) * dir);
  return rows;
}

export async function getProductFull(id: string) {
  if (isDemoMode()) {
    const p = demoProductRows().find((x) => x.id === id || x.slug === id);
    if (!p) return null;
    return { product: p, variants: demoVariantRows().filter((v) => v.productId === p.id).sort((a, b) => a.sortOrder - b.sortOrder) };
  }
  const db = getDb();
  const [p] = await db.select().from(t.products).where(eq(t.products.id, id)).limit(1);
  if (!p) return null;
  const variants = await db.select().from(t.productVariants).where(eq(t.productVariants.productId, p.id)).orderBy(asc(t.productVariants.sortOrder));
  return { product: p, variants };
}

export async function listPlans(): Promise<(PlanRow & { subscribers: number })[]> {
  if (isDemoMode()) {
    const subs = demoDataset().subscriptions;
    return seedPlans.map((p) => ({ ...p, createdAt: epoch, updatedAt: epoch, subscribers: subs.filter((s) => s.planId === p.id && s.status !== 'cancelled').length }) as unknown as PlanRow & { subscribers: number });
  }
  const db = getDb();
  const [plans, counts] = await Promise.all([
    db.select().from(t.subscriptionPlans).orderBy(asc(t.subscriptionPlans.sortOrder)),
    db.select({ planId: t.subscriptions.planId, n: sql<number>`COUNT(*)` }).from(t.subscriptions).where(inArray(t.subscriptions.status, ['active', 'paused', 'past_due'])).groupBy(t.subscriptions.planId),
  ]);
  return plans.map((p) => ({ ...p, subscribers: Number(counts.find((c) => c.planId === p.id)?.n ?? 0) }));
}

export async function listZones(): Promise<ZoneRow[]> {
  if (isDemoMode()) return seedShippingZones.map((z, i) => ({ ...z, id: `demo-zone-${i}`, regions: [...z.regions], cities: [...z.cities], createdAt: epoch }));
  return getDb().select().from(t.shippingZones).orderBy(asc(t.shippingZones.sortOrder));
}

export type CouponState = 'vigente' | 'programado' | 'vencido' | 'agotado' | 'inactivo';
export function couponState(c: Pick<CouponRow, 'isActive' | 'startsAt' | 'endsAt' | 'maxUses' | 'uses'>, now = Date.now()): CouponState {
  if (!c.isActive) return 'inactivo';
  if (c.maxUses != null && c.uses >= c.maxUses) return 'agotado';
  if (c.endsAt && c.endsAt.getTime() < now) return 'vencido';
  if (c.startsAt && c.startsAt.getTime() > now) return 'programado';
  return 'vigente';
}

export async function listCoupons(): Promise<(CouponRow & { state: CouponState; discountTotal: number })[]> {
  if (isDemoMode()) {
    const orders = demoDataset().orders.filter((o) => o.couponCode && isPaidStatus(o.status));
    const now = Date.now();
    const rows: CouponRow[] = [
      ...seedCoupons.map((c, i) => ({ ...c, id: `demo-coupon-${i}`, uses: orders.filter((o) => o.couponCode === c.code).length, startsAt: null, endsAt: null, createdAt: epoch })),
      { id: 'demo-coupon-q', code: 'QUINCENA15', description: '15 % en café de origen (quincena)', kind: 'percent', value: 15, scope: 'products', minSubtotalCop: 60000, maxUses: 300, maxUsesPerUser: 1, uses: 0, startsAt: new Date(now + 6 * 86400000), endsAt: new Date(now + 9 * 86400000), isActive: true, createdAt: epoch },
      { id: 'demo-coupon-c', code: 'CAFEDAY', description: 'Día Internacional del Café', kind: 'percent', value: 15, scope: 'all', minSubtotalCop: 0, maxUses: null, maxUsesPerUser: 1, uses: 142, startsAt: new Date(now - 10 * 86400000), endsAt: new Date(now - 6 * 86400000), isActive: true, createdAt: epoch },
      { id: 'demo-coupon-f', code: 'FLORIDA50', description: 'Inauguración Florida', kind: 'fixed', value: 5000, scope: 'products', minSubtotalCop: 30000, maxUses: 50, maxUsesPerUser: 1, uses: 50, startsAt: null, endsAt: null, isActive: true, createdAt: epoch },
    ];
    return rows.map((c) => ({ ...c, state: couponState(c), discountTotal: orders.filter((o) => o.couponCode === c.code).reduce((s, o) => s + o.discountCop, 0) }));
  }
  const db = getDb();
  const [rows, sums] = await Promise.all([
    db.select().from(t.coupons).orderBy(desc(t.coupons.createdAt)),
    db.select({ couponId: t.couponRedemptions.couponId, s: sql<number>`SUM(${t.couponRedemptions.discountCop})` }).from(t.couponRedemptions).groupBy(t.couponRedemptions.couponId),
  ]);
  return rows.map((c) => ({ ...c, state: couponState(c), discountTotal: Number(sums.find((x) => x.couponId === c.id)?.s ?? 0) }));
}

export type ReviewRow = { id: string; productId: string | null; courseId: string | null; target: string; author: string; rating: number; title: string | null; body: string | null; status: 'pending' | 'approved' | 'rejected'; verified: boolean; createdAt: Date };
export async function listReviews(status?: string): Promise<ReviewRow[]> {
  if (isDemoMode()) {
    return demoReviews()
      .filter((r) => !status || r.status === status)
      .map((r) => ({ ...r, target: r.productId ? (seedProducts.find((p) => p.id === r.productId)?.name ?? '—') : String(seedCourses.find((c) => c.id === r.courseId)?.base.title ?? '—') }));
  }
  const db = getDb();
  const rows = await db
    .select({ r: t.productReviews, author: t.users.fullName, email: t.users.email, product: t.products.name, course: t.courses.title })
    .from(t.productReviews)
    .leftJoin(t.users, eq(t.users.id, t.productReviews.userId))
    .leftJoin(t.products, eq(t.products.id, t.productReviews.productId))
    .leftJoin(t.courses, eq(t.courses.id, t.productReviews.courseId))
    .where(status ? eq(t.productReviews.status, status as 'pending') : undefined)
    .orderBy(desc(t.productReviews.createdAt))
    .limit(200);
  return rows.map((x) => ({ ...x.r, target: x.product ?? x.course ?? '—', author: x.author ?? x.email ?? 'Cliente' }));
}
