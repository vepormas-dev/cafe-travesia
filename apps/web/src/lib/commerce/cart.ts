import 'server-only';
/**
 * Precio autoritativo del carrito (siempre con precios y stock de la BD).
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { computeTotals, type CartLineInput, type CouponRule, type PricedLine, type Totals } from '@travesia/shared';
import { getDb, isDbConfigured, t } from '@/lib/db';
import { getCourses, getProducts, getShippingZones } from '@/lib/data/catalog';

export type ResolvedLine = PricedLine & {
  key: string;
  productId: string | null;
  variantId: string | null;
  courseId: string | null;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  slug: string;
  stock: number | null;
};

export class CartError extends Error {
  constructor(message: string, public readonly code: 'not_found' | 'stock' | 'coupon' | 'invalid' = 'invalid') {
    super(message);
  }
}

/** Resuelve las líneas del carrito contra el catálogo (lanza CartError si algo no es válido). */
export async function resolveLines(items: CartLineInput[]): Promise<ResolvedLine[]> {
  const merged = new Map<string, CartLineInput>();
  for (const i of items) {
    const key = `${i.kind}:${i.id}:${i.variantId ?? ''}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: Math.min(50, prev.quantity + i.quantity) } : i);
  }
  const productIds = [...merged.values()].filter((i) => i.kind === 'product').map((i) => i.id);
  const courseIds = [...merged.values()].filter((i) => i.kind === 'course').map((i) => i.id);
  const [products, courses] = await Promise.all([
    productIds.length ? getProducts({ ids: productIds }) : Promise.resolve([]),
    courseIds.length ? getCourses() : Promise.resolve([]),
  ]);
  const out: ResolvedLine[] = [];
  for (const [key, i] of merged) {
    if (i.kind === 'product') {
      const p = products.find((x) => x.id === i.id);
      const v = p?.variants.find((x) => x.id === i.variantId) ?? (p?.variants.length === 1 ? p.variants[0] : undefined);
      if (!p || !v) throw new CartError('Uno de los productos ya no está disponible. Actualiza tu carrito.', 'not_found');
      out.push({
        key,
        kind: 'product',
        productId: p.id,
        variantId: v.id,
        courseId: null,
        name: p.name,
        variantName: v.name,
        imageUrl: p.imageUrl,
        slug: p.slug,
        unitPriceCop: v.priceCop,
        quantity: i.quantity,
        requiresShipping: p.kind !== 'experience',
        weightG: v.weightG,
        stock: v.stock,
      });
    } else {
      const c = courses.find((x) => x.id === i.id);
      if (!c) throw new CartError('Uno de los cursos ya no está disponible.', 'not_found');
      out.push({
        key,
        kind: 'course',
        productId: null,
        variantId: null,
        courseId: c.id,
        name: c.title,
        variantName: 'Curso en línea · acceso de por vida',
        imageUrl: c.coverUrl,
        slug: c.slug,
        unitPriceCop: c.isFree ? 0 : c.priceCop,
        quantity: 1,
        requiresShipping: false,
        stock: null,
      });
    }
  }
  return out;
}

/** Verifica stock en vivo (sin caché) justo antes de crear el pedido. */
export async function assertStock(lines: ResolvedLine[]) {
  if (!isDbConfigured()) return;
  const ids = lines.filter((l) => l.variantId).map((l) => l.variantId!);
  if (!ids.length) return;
  const rows = await getDb()
    .select({ id: t.productVariants.id, stock: t.productVariants.stock, isActive: t.productVariants.isActive })
    .from(t.productVariants)
    .where(inArray(t.productVariants.id, ids));
  for (const l of lines.filter((x) => x.variantId)) {
    const r = rows.find((x) => x.id === l.variantId);
    if (!r || !r.isActive) throw new CartError(`«${l.name}» ya no está disponible.`, 'not_found');
    if (r.stock < l.quantity) throw new CartError(r.stock > 0 ? `Solo quedan ${r.stock} unidades de «${l.name} · ${l.variantName}».` : `«${l.name} · ${l.variantName}» está agotado.`, 'stock');
  }
}

export type CouponCheck = { ok: true; coupon: CouponRule & { id: string; description: string | null } } | { ok: false; error: string };

export async function validateCoupon(code: string | null | undefined, email: string | null, lines: ResolvedLine[]): Promise<CouponCheck | null> {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (!isDbConfigured()) {
    const demo: Record<string, CouponRule> = {
      BIENVENIDA10: { code: 'BIENVENIDA10', kind: 'percent', value: 10, scope: 'all', minSubtotalCop: 0 },
      ENVIOGRATIS: { code: 'ENVIOGRATIS', kind: 'free_shipping', value: 0, scope: 'products', minSubtotalCop: 80000 },
      ACADEMIA20: { code: 'ACADEMIA20', kind: 'percent', value: 20, scope: 'courses', minSubtotalCop: 0 },
    };
    return demo[c] ? { ok: true, coupon: { ...demo[c], id: c, description: null } } : { ok: false, error: 'Este cupón no existe.' };
  }
  const db = getDb();
  const [row] = await db.select().from(t.coupons).where(eq(t.coupons.code, c)).limit(1);
  if (!row || !row.isActive) return { ok: false, error: 'Este cupón no existe o ya no está activo.' };
  const now = Date.now();
  if (row.startsAt && row.startsAt.getTime() > now) return { ok: false, error: 'Este cupón aún no está vigente.' };
  if (row.endsAt && row.endsAt.getTime() < now) return { ok: false, error: 'Este cupón ya venció.' };
  if (row.maxUses != null && row.uses >= row.maxUses) return { ok: false, error: 'Este cupón ya alcanzó su límite de usos.' };
  const subtotal = lines.reduce((s, l) => s + l.unitPriceCop * l.quantity, 0);
  if (subtotal < row.minSubtotalCop) return { ok: false, error: `Este cupón aplica para compras desde $${row.minSubtotalCop.toLocaleString('es-CO')}.` };
  if (row.scope === 'courses' && !lines.some((l) => l.kind === 'course')) return { ok: false, error: 'Este cupón solo aplica a cursos de la Academia.' };
  if (row.scope === 'products' && !lines.some((l) => l.kind === 'product')) return { ok: false, error: 'Este cupón solo aplica a productos de la tienda.' };
  if (email && row.maxUsesPerUser) {
    const [{ n }] = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(t.couponRedemptions)
      .where(and(eq(t.couponRedemptions.couponId, row.id), eq(t.couponRedemptions.email, email.toLowerCase())));
    if (Number(n) >= row.maxUsesPerUser) return { ok: false, error: 'Ya usaste este cupón el máximo de veces permitido.' };
  }
  return { ok: true, coupon: { id: row.id, code: row.code, kind: row.kind, value: row.value, scope: row.scope, minSubtotalCop: row.minSubtotalCop, description: row.description } };
}

export async function quote(input: {
  items: CartLineInput[];
  region?: string | null;
  city?: string | null;
  couponCode?: string | null;
  email?: string | null;
  redeemPoints?: number;
  availablePoints?: number;
}): Promise<{ lines: ResolvedLine[]; totals: Totals; coupon: CouponCheck | null }> {
  const lines = await resolveLines(input.items);
  const coupon = await validateCoupon(input.couponCode, input.email ?? null, lines);
  const zones = await getShippingZones();
  const totals = computeTotals({
    lines,
    zones,
    region: input.region,
    city: input.city,
    coupon: coupon?.ok ? coupon.coupon : null,
    redeemPoints: input.redeemPoints,
    availablePoints: input.availablePoints,
  });
  return { lines, totals, coupon };
}
