'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { atomic, getDb, t, type AtomicQuery } from '@/lib/db';
import { audit } from '@/lib/monitor';
import { aiEnabled, generateProductCopy } from '@/lib/ai';
import { invalidate, TAGS } from '@/lib/data/revalidate';
import { ActionError, bogotaLocalToDate, ok, parsePayload, runAction, zs } from '../guard';
import { PRODUCT_KINDS } from '../labels';

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
const lvl = z.coerce.number().int().min(1).max(10);
const variantSchema = z.object({
  id: z.string().max(36).optional().nullable(),
  name: zs.req('El nombre de la variante', 120),
  weightG: zs.intN(0, 100000),
  grind: zs.opt(40),
  priceCop: zs.int(0, 100_000_000),
  compareAtCop: zs.intN(0, 100_000_000),
  stock: zs.int(0, 1_000_000),
  sku: zs.opt(80),
  eventAt: zs.opt(20),
  isActive: z.boolean().default(true),
});
export type VariantInput = z.infer<typeof variantSchema>;

const productSchema = z
  .object({
    id: z.string().max(36).optional().nullable(),
    slug: zs.slug(),
    name: zs.req('El nombre', 160),
    subtitle: zs.opt(240),
    kind: z.enum(PRODUCT_KINDS),
    category: zs.opt(80),
    description: zs.opt(60000),
    story: zs.opt(60000),
    originRegion: zs.opt(120),
    originFarm: zs.opt(120),
    producer: zs.opt(160),
    altitudeM: zs.intN(0, 6000),
    variety: zs.opt(120),
    process: zs.opt(80),
    roastLevel: zs.opt(40),
    profile: z.object({ tueste: lvl, acidez: lvl, cuerpo: lvl, dulzor: lvl, amargor: lvl, complejidad: lvl }).nullable(),
    tastingNotes: zs.list(12),
    brewMethods: zs.list(12),
    themeColor: zs.color(),
    accentColor: zs.color(),
    imageUrl: zs.url(),
    gallery: z.array(z.string().max(600)).max(20).default([]),
    badges: zs.list(8),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isSeasonal: z.boolean(),
    subscriptionEligible: z.boolean(),
    sortOrder: zs.int(-1000, 100000),
    seoTitle: zs.opt(200),
    seoDescription: zs.opt(320),
    variants: z.array(variantSchema).min(1, 'Agrega al menos una variante con precio').max(40),
  })
  .superRefine((p, ctx) => {
    const skus = p.variants.map((v) => v.sku).filter(Boolean);
    if (new Set(skus).size !== skus.length) ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Hay SKU repetidos entre variantes' });
    p.variants.forEach((v, i) => {
      if (v.compareAtCop != null && v.compareAtCop <= v.priceCop) ctx.addIssue({ code: 'custom', path: ['variants', i, 'compareAtCop'], message: 'Debe ser mayor que el precio' });
    });
  });
export type ProductInput = z.infer<typeof productSchema>;

export async function saveProduct(_prev: unknown, fd: FormData) {
  const r = await runAction<{ id: string }>({}, async ({ user }) => {
    const p = parsePayload(productSchema, fd);
    const db = getDb();
    const { variants, id: maybeId, ...fields } = p;
    const id = maybeId || crypto.randomUUID();
    const ops: AtomicQuery[] = [];
    let oldSlug: string | null = null;
    if (maybeId) {
      const [cur] = await db.select({ slug: t.products.slug }).from(t.products).where(eq(t.products.id, id)).limit(1);
      if (!cur) throw new ActionError('El producto ya no existe');
      oldSlug = cur.slug;
      ops.push(db.update(t.products).set(fields).where(eq(t.products.id, id)));
      const existing = await db.select({ id: t.productVariants.id }).from(t.productVariants).where(eq(t.productVariants.productId, id));
      const keep = new Set(variants.map((v) => v.id).filter(Boolean) as string[]);
      const removed = existing.map((e) => e.id).filter((x) => !keep.has(x));
      if (removed.length) {
        const used = await db.selectDistinct({ id: t.orderItems.variantId }).from(t.orderItems).where(inArray(t.orderItems.variantId, removed));
        const usedIds = new Set(used.map((u) => u.id));
        const del = removed.filter((x) => !usedIds.has(x));
        const off = removed.filter((x) => usedIds.has(x));
        if (del.length) ops.push(db.delete(t.productVariants).where(inArray(t.productVariants.id, del)) as unknown as AtomicQuery);
        if (off.length) ops.push(db.update(t.productVariants).set({ isActive: false }).where(inArray(t.productVariants.id, off)));
      }
    } else {
      ops.push(db.insert(t.products).values({ id, ...fields }));
    }
    variants.forEach((v, i) => {
      const row = { name: v.name, weightG: v.weightG, grind: v.grind, priceCop: v.priceCop, compareAtCop: v.compareAtCop, stock: v.stock, sku: v.sku, eventAt: bogotaLocalToDate(v.eventAt), isActive: v.isActive, sortOrder: i };
      if (v.id && maybeId) ops.push(db.update(t.productVariants).set(row).where(and(eq(t.productVariants.id, v.id), eq(t.productVariants.productId, id))));
      else ops.push(db.insert(t.productVariants).values({ id: crypto.randomUUID(), productId: id, ...row }));
    });
    await atomic(ops);
    await audit(user.id, maybeId ? 'product.update' : 'product.create', 'product', id, { slug: p.slug, variants: variants.length });
    invalidate([TAGS.products, TAGS.product(p.slug), ...(oldSlug && oldSlug !== p.slug ? [TAGS.product(oldSlug)] : [])]);
    revalidatePath('/admin/productos');
    return ok(maybeId ? 'Producto guardado y publicado en el sitio' : 'Producto creado', { id });
  });
  if (r.ok && r.data && !(fd.get('payload') as string)?.includes('"id":"')) redirect(`/admin/productos/${r.data.id}?creado=1`);
  return r;
}

export async function duplicateProduct(id: string) {
  const r = await runAction<{ id: string }>({}, async ({ user }) => {
    const db = getDb();
    const [p] = await db.select().from(t.products).where(eq(t.products.id, id)).limit(1);
    if (!p) throw new ActionError('Producto no encontrado');
    const variants = await db.select().from(t.productVariants).where(eq(t.productVariants.productId, id));
    const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(t.products).where(sql`${t.products.slug} LIKE ${`${p.slug}-copia%`}`);
    const suffix = Number(n) ? `-copia-${Number(n) + 1}` : '-copia';
    const newId = crypto.randomUUID();
    const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = p;
    await atomic([
      db.insert(t.products).values({ ...rest, id: newId, slug: `${p.slug}${suffix}`.slice(0, 160), name: `${p.name} (copia)`.slice(0, 160), isActive: false, isFeatured: false, ratingAvg: 0, ratingCount: 0 }),
      ...variants.map(({ id: _v, createdAt: _vc, updatedAt: _vu, ...v }) => db.insert(t.productVariants).values({ ...v, id: crypto.randomUUID(), productId: newId, sku: v.sku ? `${v.sku}${suffix.toUpperCase()}`.slice(0, 80) : null })),
    ]);
    await audit(user.id, 'product.duplicate', 'product', newId, { from: id });
    revalidatePath('/admin/productos');
    return ok('Producto duplicado (inactivo)', { id: newId });
  });
  if (r.ok && r.data) redirect(`/admin/productos/${r.data.id}`);
  return r;
}

export async function setProductsActive(ids: string[], active: boolean) {
  return runAction({}, async ({ user }) => {
    const list = z.array(z.string().min(1)).min(1, 'Selecciona productos').max(500).parse(ids);
    const db = getDb();
    await db.update(t.products).set({ isActive: active }).where(inArray(t.products.id, list));
    const slugs = await db.select({ slug: t.products.slug }).from(t.products).where(inArray(t.products.id, list));
    await audit(user.id, active ? 'product.activate' : 'product.deactivate', 'product', null, { ids: list });
    invalidate([TAGS.products, ...slugs.map((s) => TAGS.product(s.slug))]);
    revalidatePath('/admin/productos');
    return ok(`${list.length} producto(s) ${active ? 'activados' : 'desactivados'}`);
  });
}

export async function updateVariantStock(variantId: string, stock: number) {
  return runAction({}, async ({ user }) => {
    const v = zs.int(0, 1_000_000).parse(stock);
    const db = getDb();
    const [row] = await db.select({ productId: t.productVariants.productId, stock: t.productVariants.stock }).from(t.productVariants).where(eq(t.productVariants.id, variantId)).limit(1);
    if (!row) throw new ActionError('Variante no encontrada');
    await db.update(t.productVariants).set({ stock: v }).where(eq(t.productVariants.id, variantId));
    const [p] = await db.select({ slug: t.products.slug }).from(t.products).where(eq(t.products.id, row.productId)).limit(1);
    await audit(user.id, 'variant.stock', 'product_variant', variantId, { from: row.stock, to: v });
    invalidate([TAGS.products, ...(p ? [TAGS.product(p.slug)] : [])]);
    return ok(`Stock actualizado a ${v}`);
  });
}

export async function deleteProduct(id: string) {
  const r = await runAction({ admin: true }, async ({ user }) => {
    const db = getDb();
    const [p] = await db.select({ slug: t.products.slug }).from(t.products).where(eq(t.products.id, id)).limit(1);
    if (!p) throw new ActionError('Producto no encontrado');
    const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(t.orderItems).where(eq(t.orderItems.productId, id));
    if (Number(n) > 0) {
      await db.update(t.products).set({ isActive: false }).where(eq(t.products.id, id));
      await audit(user.id, 'product.deactivate', 'product', id, { reason: 'tiene pedidos' });
      invalidate([TAGS.products, TAGS.product(p.slug)]);
      return ok('El producto tiene pedidos: se desactivó en lugar de eliminarse');
    }
    await atomic([db.delete(t.productVariants).where(eq(t.productVariants.productId, id)) as unknown as AtomicQuery, db.delete(t.products).where(eq(t.products.id, id)) as unknown as AtomicQuery]);
    await audit(user.id, 'product.delete', 'product', id, { slug: p.slug });
    invalidate([TAGS.products, TAGS.product(p.slug)]);
    return ok('Producto eliminado');
  });
  if (r.ok) redirect('/admin/productos');
  return r;
}

export async function aiProductCopy(input: Record<string, unknown>) {
  return runAction<Awaited<ReturnType<typeof generateProductCopy>>>({ allowDemo: true }, async () => {
    if (!aiEnabled()) throw new ActionError('La IA no está configurada (OPENAI_API_KEY). Mientras tanto puedes redactar a mano.');
    const r = await generateProductCopy(input);
    if (!r) throw new ActionError('La IA no respondió. Inténtalo de nuevo.');
    return ok('Borrador listo: revisa y aplica', r);
  });
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------
const planSchema = z.object({
  id: z.string().max(36).optional().nullable(),
  slug: zs.slug(),
  name: zs.req('El nombre', 120),
  tagline: zs.opt(200),
  description: zs.opt(5000),
  audience: z.enum(['personal', 'empresa']),
  frequencyWeeks: zs.int(1, 52),
  bagsPerDelivery: zs.int(1, 100),
  bagWeightG: zs.int(50, 20000),
  priceCop: zs.int(1000, 100_000_000),
  compareAtCop: zs.intN(0, 100_000_000),
  includesAcademy: z.boolean(),
  benefits: zs.list(12),
  imageUrl: zs.url(),
  isHighlighted: z.boolean(),
  isActive: z.boolean(),
  sortOrder: zs.int(-1000, 100000),
});
export type PlanInput = z.infer<typeof planSchema>;

export async function savePlan(_prev: unknown, fd: FormData) {
  return runAction({}, async ({ user }) => {
    const { id, ...p } = parsePayload(planSchema, fd);
    const db = getDb();
    if (id) await db.update(t.subscriptionPlans).set(p).where(eq(t.subscriptionPlans.id, id));
    else await db.insert(t.subscriptionPlans).values({ id: crypto.randomUUID(), ...p });
    await audit(user.id, id ? 'plan.update' : 'plan.create', 'plan', id ?? p.slug, { price: p.priceCop });
    invalidate([TAGS.plans]);
    revalidatePath('/admin/planes');
    return ok(id ? 'Plan actualizado (los suscriptores actuales conservan su precio)' : 'Plan creado');
  });
}

// ---------------------------------------------------------------------------
// Zonas de envío
// ---------------------------------------------------------------------------
const zoneSchema = z.object({
  id: z.string().max(36).optional().nullable(),
  name: zs.req('El nombre', 120),
  regions: zs.list(40),
  cities: z.array(z.string().trim().min(1).max(80)).max(300).default([]),
  rateCop: zs.int(0, 10_000_000),
  freeFromCop: zs.intN(0, 100_000_000),
  etaDays: zs.req('El tiempo de entrega', 40),
  isDefault: z.boolean(),
  sortOrder: zs.int(-1000, 100000),
});
export type ZoneInput = z.infer<typeof zoneSchema>;

export async function saveZone(_prev: unknown, fd: FormData) {
  return runAction({}, async ({ user }) => {
    const { id, ...z0 } = parsePayload(zoneSchema, fd);
    const db = getDb();
    const zid = id || crypto.randomUUID();
    const ops: AtomicQuery[] = [];
    if (z0.isDefault) ops.push(db.update(t.shippingZones).set({ isDefault: false }).where(sql`${t.shippingZones.id} <> ${zid}`));
    ops.push(id ? db.update(t.shippingZones).set(z0).where(eq(t.shippingZones.id, id)) : db.insert(t.shippingZones).values({ id: zid, ...z0 }));
    await atomic(ops);
    await audit(user.id, id ? 'zone.update' : 'zone.create', 'shipping_zone', zid, { rate: z0.rateCop });
    invalidate([TAGS.shipping]);
    revalidatePath('/admin/envios');
    return ok('Zona guardada');
  });
}

export async function deleteZone(id: string) {
  return runAction({}, async ({ user }) => {
    await getDb().delete(t.shippingZones).where(eq(t.shippingZones.id, id));
    await audit(user.id, 'zone.delete', 'shipping_zone', id);
    invalidate([TAGS.shipping]);
    revalidatePath('/admin/envios');
    return ok('Zona eliminada');
  });
}

// ---------------------------------------------------------------------------
// Reseñas
// ---------------------------------------------------------------------------
export async function moderateReview(id: string, status: 'approved' | 'rejected' | 'pending') {
  return runAction({}, async ({ user }) => {
    z.enum(['approved', 'rejected', 'pending']).parse(status);
    const db = getDb();
    const [r] = await db.select().from(t.productReviews).where(eq(t.productReviews.id, id)).limit(1);
    if (!r) throw new ActionError('Reseña no encontrada');
    await db.update(t.productReviews).set({ status }).where(eq(t.productReviews.id, id));
    await recalcRating(r.productId, r.courseId);
    await audit(user.id, `review.${status}`, 'review', id);
    revalidatePath('/admin/resenas');
    return ok(status === 'approved' ? 'Reseña aprobada y publicada' : status === 'rejected' ? 'Reseña rechazada' : 'Reseña en revisión');
  });
}

async function recalcRating(productId: string | null, courseId: string | null) {
  const db = getDb();
  if (productId) {
    const [a] = await db.select({ avg: sql<number>`COALESCE(AVG(${t.productReviews.rating}),0)`, n: sql<number>`COUNT(*)` }).from(t.productReviews).where(and(eq(t.productReviews.productId, productId), eq(t.productReviews.status, 'approved')));
    await db.update(t.products).set({ ratingAvg: Math.round(Number(a?.avg ?? 0) * 10) / 10, ratingCount: Number(a?.n ?? 0) }).where(eq(t.products.id, productId));
    const [p] = await db.select({ slug: t.products.slug }).from(t.products).where(eq(t.products.id, productId)).limit(1);
    invalidate([TAGS.products, ...(p ? [TAGS.product(p.slug)] : [])]);
  }
  if (courseId) {
    const [a] = await db.select({ avg: sql<number>`COALESCE(AVG(${t.productReviews.rating}),0)`, n: sql<number>`COUNT(*)` }).from(t.productReviews).where(and(eq(t.productReviews.courseId, courseId), eq(t.productReviews.status, 'approved')));
    await db.update(t.courses).set({ ratingAvg: Math.round(Number(a?.avg ?? 0) * 10) / 10, ratingCount: Number(a?.n ?? 0) }).where(eq(t.courses.id, courseId));
    const [c] = await db.select({ slug: t.courses.slug }).from(t.courses).where(eq(t.courses.id, courseId)).limit(1);
    invalidate([TAGS.courses, ...(c ? [TAGS.course(c.slug)] : [])]);
  }
}

export async function recalcAllRatings() {
  return runAction({}, async ({ user }) => {
    const db = getDb();
    const prods = await db.selectDistinct({ id: t.productReviews.productId }).from(t.productReviews).where(sql`${t.productReviews.productId} IS NOT NULL`);
    const crs = await db.selectDistinct({ id: t.productReviews.courseId }).from(t.productReviews).where(sql`${t.productReviews.courseId} IS NOT NULL`);
    for (const p of prods) await recalcRating(p.id, null);
    for (const c of crs) await recalcRating(null, c.id);
    await audit(user.id, 'review.recalc', 'review', null, { products: prods.length, courses: crs.length });
    return ok(`Calificaciones recalculadas (${prods.length} productos, ${crs.length} cursos)`);
  });
}

// ---------------------------------------------------------------------------
// Cupones (solo admin)
// ---------------------------------------------------------------------------
const couponSchema = z
  .object({
    id: z.string().max(36).optional().nullable(),
    code: z.string().trim().toUpperCase().min(3, 'Mínimo 3 caracteres').max(40).regex(/^[A-Z0-9_-]+$/, 'Solo letras, números, guion y guion bajo'),
    description: zs.opt(240),
    kind: z.enum(['percent', 'fixed', 'free_shipping']),
    value: zs.int(0, 100_000_000),
    scope: z.enum(['all', 'products', 'courses']),
    minSubtotalCop: zs.int(0, 100_000_000),
    maxUses: zs.intN(1, 10_000_000),
    maxUsesPerUser: zs.intN(1, 1000),
    startsAt: zs.opt(20),
    endsAt: zs.opt(20),
    isActive: z.boolean(),
  })
  .superRefine((c, ctx) => {
    if (c.kind === 'percent' && (c.value < 1 || c.value > 100)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Entre 1 y 100 %' });
    if (c.kind === 'fixed' && c.value < 1000) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Mínimo $1.000' });
    if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Debe ser posterior al inicio' });
  });
export type CouponInput = z.infer<typeof couponSchema>;

export async function saveCoupon(_prev: unknown, fd: FormData) {
  return runAction({ admin: true }, async ({ user }) => {
    const { id, startsAt, endsAt, ...c } = parsePayload(couponSchema, fd);
    const db = getDb();
    const row = { ...c, value: c.kind === 'free_shipping' ? 0 : c.value, startsAt: bogotaLocalToDate(startsAt), endsAt: bogotaLocalToDate(endsAt) };
    if (id) await db.update(t.coupons).set(row).where(eq(t.coupons.id, id));
    else await db.insert(t.coupons).values({ id: crypto.randomUUID(), ...row });
    await audit(user.id, id ? 'coupon.update' : 'coupon.create', 'coupon', c.code, { kind: c.kind, value: c.value });
    revalidatePath('/admin/cupones');
    return ok(id ? 'Cupón actualizado' : `Cupón ${c.code} creado`);
  });
}

export async function deleteCoupon(id: string) {
  return runAction({ admin: true }, async ({ user }) => {
    const db = getDb();
    const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(t.couponRedemptions).where(eq(t.couponRedemptions.couponId, id));
    if (Number(n) > 0) {
      await db.update(t.coupons).set({ isActive: false }).where(eq(t.coupons.id, id));
      await audit(user.id, 'coupon.deactivate', 'coupon', id);
      revalidatePath('/admin/cupones');
      return ok('El cupón ya se usó: se desactivó para conservar el historial');
    }
    await db.delete(t.coupons).where(eq(t.coupons.id, id));
    await audit(user.id, 'coupon.delete', 'coupon', id);
    revalidatePath('/admin/cupones');
    return ok('Cupón eliminado');
  });
}
