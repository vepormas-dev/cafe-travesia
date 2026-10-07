import 'server-only';
/**
 * Área de cliente: lecturas y mutaciones de la cuenta, SIEMPRE filtradas por user.id,
 * y mapeo a los DTO públicos de @travesia/shared (web y app móvil).
 * Sin BD (modo demo) todas las lecturas devuelven listas vacías.
 */
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { CourseDTO, MeDTO, OrderDTO, PlanDTO, SubscriptionDTO } from '@travesia/shared';
import { atomic, getDb, isDbConfigured, t, type AtomicQuery } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { getCourses } from '@/lib/data/catalog';

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function toMeDTO(u: SessionUser): MeDTO {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    role: u.role,
    loyaltyPoints: u.loyaltyPoints,
    marketingOptIn: u.marketingOptIn,
    legalIdType: u.legalIdType,
    legalId: u.legalId,
  };
}

/** Usuario fresco desde la BD (tras un PATCH). */
export async function reloadMe(userId: string): Promise<MeDTO | null> {
  const [u] = await getDb().select().from(t.users).where(eq(t.users.id, userId)).limit(1);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    role: u.role,
    loyaltyPoints: u.loyaltyPoints,
    marketingOptIn: u.marketingOptIn,
    legalIdType: u.legalIdType ?? null,
    legalId: u.legalId,
  };
}

export async function getAuthProvider(userId: string): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const [u] = await getDb().select({ provider: t.users.provider }).from(t.users).where(eq(t.users.id, userId)).limit(1);
  return u?.provider ?? null;
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
type OrderRow = typeof t.orders.$inferSelect;
type ItemRow = typeof t.orderItems.$inferSelect;

function toOrderDTO(o: OrderRow, items: ItemRow[]): OrderDTO & { pointsRedeemed: number; requiresShipping: boolean; notes: string | null } {
  const a = o.shippingAddress;
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    kind: o.kind,
    subtotalCop: o.subtotalCop,
    discountCop: o.discountCop,
    shippingCop: o.shippingCop,
    totalCop: o.totalCop,
    couponCode: o.couponCode,
    pointsEarned: o.pointsEarned,
    pointsRedeemed: o.pointsRedeemed,
    requiresShipping: o.requiresShipping,
    notes: o.notes,
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    createdAt: o.createdAt.toISOString(),
    paidAt: iso(o.paidAt),
    shippedAt: iso(o.shippedAt),
    deliveredAt: iso(o.deliveredAt),
    items: items.map((i) => ({
      id: i.id,
      itemKind: i.itemKind,
      name: i.name,
      variantName: i.variantName,
      imageUrl: i.imageUrl,
      unitPriceCop: i.unitPriceCop,
      quantity: i.quantity,
      totalCop: i.totalCop,
    })),
    shippingAddress: a ? { recipient: a.recipient, city: a.city, region: a.region, line1: a.line1 } : null,
  };
}
export type AccountOrder = ReturnType<typeof toOrderDTO>;

export async function listOrders(userId: string, limit = 50): Promise<AccountOrder[]> {
  if (!isDbConfigured()) return [];
  const db = getDb();
  const rows = await db.select().from(t.orders).where(eq(t.orders.userId, userId)).orderBy(desc(t.orders.createdAt)).limit(limit);
  if (!rows.length) return [];
  const items = await db.select().from(t.orderItems).where(inArray(t.orderItems.orderId, rows.map((r) => r.id)));
  return rows.map((r) => toOrderDTO(r, items.filter((i) => i.orderId === r.id)));
}

export async function getOrder(userId: string, idOrNumber: string): Promise<AccountOrder | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();
  const col = /^CT-/i.test(idOrNumber) ? t.orders.number : t.orders.id;
  const [o] = await db.select().from(t.orders).where(and(eq(col, idOrNumber), eq(t.orders.userId, userId))).limit(1);
  if (!o) return null;
  const items = await db.select().from(t.orderItems).where(eq(t.orderItems.orderId, o.id));
  return toOrderDTO(o, items);
}

// ---------------------------------------------------------------------------
// Suscripciones
// ---------------------------------------------------------------------------
type PlanRow = typeof t.subscriptionPlans.$inferSelect;
const planDTO = (p: PlanRow): PlanDTO => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  tagline: p.tagline,
  description: p.description,
  audience: p.audience,
  frequencyWeeks: p.frequencyWeeks,
  bagsPerDelivery: p.bagsPerDelivery,
  bagWeightG: p.bagWeightG,
  priceCop: p.priceCop,
  compareAtCop: p.compareAtCop,
  includesAcademy: p.includesAcademy,
  benefits: p.benefits ?? [],
  imageUrl: p.imageUrl,
  isHighlighted: p.isHighlighted,
});

export async function listSubscriptions(userId: string, onlyId?: string): Promise<SubscriptionDTO[]> {
  if (!isDbConfigured()) return [];
  const db = getDb();
  const conds = [eq(t.subscriptions.userId, userId)];
  if (onlyId) conds.push(eq(t.subscriptions.id, onlyId));
  const subs = await db.select().from(t.subscriptions).where(and(...conds)).orderBy(desc(t.subscriptions.createdAt));
  if (!subs.length) return [];
  const planIds = [...new Set(subs.map((s) => s.planId))];
  const productIds = [...new Set(subs.map((s) => s.productId).filter(Boolean) as string[])];
  const [plans, products] = await Promise.all([
    db.select().from(t.subscriptionPlans).where(inArray(t.subscriptionPlans.id, planIds)),
    productIds.length
      ? db.select({ id: t.products.id, name: t.products.name, slug: t.products.slug, imageUrl: t.products.imageUrl }).from(t.products).where(inArray(t.products.id, productIds))
      : Promise.resolve([] as { id: string; name: string; slug: string; imageUrl: string | null }[]),
  ]);
  const out: SubscriptionDTO[] = [];
  for (const s of subs) {
    const plan = plans.find((p) => p.id === s.planId);
    if (!plan) continue;
    const a = s.address;
    out.push({
      id: s.id,
      status: s.status,
      plan: planDTO(plan),
      product: products.find((p) => p.id === s.productId) ?? null,
      grind: s.grind,
      priceCop: s.priceCop,
      cardBrand: s.cardBrand,
      cardLast4: s.cardLast4,
      nextBillingAt: iso(s.nextBillingAt),
      pausedUntil: iso(s.pausedUntil),
      startedAt: iso(s.startedAt),
      address: a ? { recipient: a.recipient, city: a.city, region: a.region, line1: a.line1, phone: a.phone } : null,
    });
  }
  return out;
}

export async function getSubscriptionDTO(userId: string, id: string) {
  return (await listSubscriptions(userId, id))[0] ?? null;
}

export type ChargeRow = { id: string; subscriptionId: string; amountCop: number; status: string; attempt: number; error: string | null; createdAt: string; orderId: string | null };
export async function listCharges(userId: string, subscriptionIds: string[]): Promise<ChargeRow[]> {
  if (!isDbConfigured() || !subscriptionIds.length) return [];
  const db = getDb();
  // Garantiza que las suscripciones son del usuario
  const own = await db
    .select({ id: t.subscriptions.id })
    .from(t.subscriptions)
    .where(and(eq(t.subscriptions.userId, userId), inArray(t.subscriptions.id, subscriptionIds)));
  if (!own.length) return [];
  const rows = await db
    .select()
    .from(t.subscriptionCharges)
    .where(inArray(t.subscriptionCharges.subscriptionId, own.map((o) => o.id)))
    .orderBy(desc(t.subscriptionCharges.createdAt))
    .limit(36);
  return rows.map((r) => ({ id: r.id, subscriptionId: r.subscriptionId, amountCop: r.amountCop, status: r.status, attempt: r.attempt, error: r.error, createdAt: r.createdAt.toISOString(), orderId: r.orderId }));
}

// ---------------------------------------------------------------------------
// Direcciones
// ---------------------------------------------------------------------------
export type AddressDTO = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  region: string;
  city: string;
  line1: string;
  line2: string | null;
  notes: string | null;
  isDefault: boolean;
};

export async function listAddresses(userId: string): Promise<AddressDTO[]> {
  if (!isDbConfigured()) return [];
  const rows = await getDb()
    .select()
    .from(t.addresses)
    .where(eq(t.addresses.userId, userId))
    .orderBy(desc(t.addresses.isDefault), desc(t.addresses.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    recipient: r.recipient,
    phone: r.phone,
    region: r.region,
    city: r.city,
    line1: r.line1,
    line2: r.line2,
    notes: r.notes,
    isDefault: r.isDefault,
  }));
}

export async function saveAddress(
  userId: string,
  data: Omit<AddressDTO, 'id' | 'label' | 'isDefault' | 'line2' | 'notes'> & { line2?: string | null; notes?: string | null; label?: string; isDefault?: boolean },
  id?: string,
) {
  const db = getDb();
  const existing = await db.select({ id: t.addresses.id }).from(t.addresses).where(eq(t.addresses.userId, userId));
  if (id && !existing.some((e) => e.id === id)) return null;
  const isDefault = data.isDefault ?? existing.length === 0;
  const values = {
    recipient: data.recipient,
    phone: data.phone,
    region: data.region,
    city: data.city,
    line1: data.line1,
    line2: data.line2 ?? null,
    notes: data.notes ?? null,
    label: data.label?.trim() || 'Casa',
    isDefault,
  };
  const newId = id ?? crypto.randomUUID();
  const ops: AtomicQuery[] = [];
  if (isDefault) ops.push(db.update(t.addresses).set({ isDefault: false }).where(eq(t.addresses.userId, userId)));
  ops.push(id ? db.update(t.addresses).set(values).where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId))) : db.insert(t.addresses).values({ id: newId, userId, ...values }));
  await atomic(ops);
  return newId;
}

export async function patchAddress(userId: string, id: string, patch: Partial<Omit<AddressDTO, 'id'>>) {
  const db = getDb();
  const [row] = await db.select().from(t.addresses).where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId))).limit(1);
  if (!row) return false;
  const ops: AtomicQuery[] = [];
  if (patch.isDefault) ops.push(db.update(t.addresses).set({ isDefault: false }).where(eq(t.addresses.userId, userId)));
  const set: Record<string, unknown> = {};
  for (const k of ['label', 'recipient', 'phone', 'region', 'city', 'line1', 'line2', 'notes', 'isDefault'] as const) if (patch[k] !== undefined) set[k] = patch[k];
  if (Object.keys(set).length) ops.push(db.update(t.addresses).set(set).where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId))));
  if (ops.length) await atomic(ops);
  return true;
}

export async function deleteAddress(userId: string, id: string) {
  const db = getDb();
  const [row] = await db.select().from(t.addresses).where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId))).limit(1);
  if (!row) return false;
  await db.delete(t.addresses).where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId)));
  if (row.isDefault) {
    const [next] = await db.select({ id: t.addresses.id }).from(t.addresses).where(eq(t.addresses.userId, userId)).orderBy(desc(t.addresses.updatedAt)).limit(1);
    if (next) await db.update(t.addresses).set({ isDefault: true }).where(eq(t.addresses.id, next.id));
  }
  return true;
}

// ---------------------------------------------------------------------------
// Puntos y notificaciones
// ---------------------------------------------------------------------------
export async function getLoyalty(userId: string) {
  if (!isDbConfigured()) return { points: 0, ledger: [] as { points: number; reason: string; createdAt: string }[] };
  const db = getDb();
  const [[u], rows] = await Promise.all([
    db.select({ points: t.users.loyaltyPoints }).from(t.users).where(eq(t.users.id, userId)).limit(1),
    db.select().from(t.loyaltyLedger).where(eq(t.loyaltyLedger.userId, userId)).orderBy(desc(t.loyaltyLedger.createdAt)).limit(100),
  ]);
  return { points: u?.points ?? 0, ledger: rows.map((r) => ({ points: r.points, reason: r.reason, createdAt: r.createdAt.toISOString() })) };
}

export type NotificationDTO = { id: string; title: string; body: string; deepLink: string | null; kind: string; readAt: string | null; createdAt: string };
export async function listNotifications(userId: string, limit = 60): Promise<{ notifications: NotificationDTO[]; unread: number }> {
  if (!isDbConfigured()) return { notifications: [], unread: 0 };
  const db = getDb();
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(t.notifications).where(eq(t.notifications.userId, userId)).orderBy(desc(t.notifications.createdAt)).limit(limit),
    db.select({ n: sql<number>`COUNT(*)` }).from(t.notifications).where(and(eq(t.notifications.userId, userId), isNull(t.notifications.readAt))),
  ]);
  return {
    notifications: rows.map((r) => ({ id: r.id, title: r.title, body: r.body, deepLink: r.deepLink, kind: r.kind, readAt: iso(r.readAt), createdAt: r.createdAt.toISOString() })),
    unread: Number(n),
  };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const conds = [eq(t.notifications.userId, userId), isNull(t.notifications.readAt)];
  if (ids?.length) conds.push(inArray(t.notifications.id, ids));
  await getDb().update(t.notifications).set({ readAt: new Date() }).where(and(...conds));
}

// ---------------------------------------------------------------------------
// Academia (solo lectura para el resumen de la cuenta)
// ---------------------------------------------------------------------------
export async function currentEnrollment(userId: string): Promise<{ course: CourseDTO; progressPct: number; lastLessonId: string | null } | null> {
  if (!isDbConfigured()) return null;
  const rows = await getDb()
    .select()
    .from(t.enrollments)
    .where(and(eq(t.enrollments.userId, userId), eq(t.enrollments.status, 'active')))
    .orderBy(desc(t.enrollments.updatedAt))
    .limit(5);
  if (!rows.length) return null;
  const courses = await getCourses();
  for (const r of rows) {
    const c = courses.find((x) => x.id === r.courseId);
    if (c) return { course: c, progressPct: r.progressPct, lastLessonId: r.lastLessonId };
  }
  return null;
}

/** ¿El usuario compró (pedido pagado) este producto? → reseña verificada. */
export async function hasPurchasedProduct(userId: string, productId: string) {
  const [r] = await getDb()
    .select({ id: t.orderItems.id })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .where(and(eq(t.orders.userId, userId), eq(t.orderItems.productId, productId), inArray(t.orders.status, ['paid', 'preparing', 'shipped', 'delivered'])))
    .limit(1);
  return Boolean(r);
}
export async function isEnrolled(userId: string, courseId: string) {
  const [r] = await getDb()
    .select({ id: t.enrollments.id })
    .from(t.enrollments)
    .where(and(eq(t.enrollments.userId, userId), eq(t.enrollments.courseId, courseId)))
    .limit(1);
  return Boolean(r);
}
