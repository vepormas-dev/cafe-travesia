/**
 * Reglas de precio puras (sin I/O). El servidor es la fuente de verdad: recalcula
 * siempre con precios de la base de datos; el cliente usa lo mismo solo para mostrar.
 */
import { normalizePlace } from './colombia';

export type PricedLine = {
  kind: 'product' | 'course';
  unitPriceCop: number;
  quantity: number;
  requiresShipping: boolean;
  weightG?: number | null;
};

export type ShippingZoneRule = {
  id: string;
  name: string;
  regions: string[];
  cities: string[];
  rateCop: number;
  freeFromCop: number | null;
  etaDays: string;
  isDefault: boolean;
};

export type CouponRule = {
  code: string;
  kind: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  scope: 'all' | 'products' | 'courses';
  minSubtotalCop: number;
};

export type Totals = {
  subtotalCop: number;
  productsSubtotalCop: number;
  coursesSubtotalCop: number;
  discountCop: number;
  pointsDiscountCop: number;
  shippingCop: number;
  totalCop: number;
  requiresShipping: boolean;
  freeShippingByCoupon: boolean;
  zone: { id: string; name: string; etaDays: string; freeFromCop: number | null } | null;
  pointsToEarn: number;
};

/** 1 punto por cada $1.000 pagados en productos/cursos; 1 punto = $10 al redimir. */
export const LOYALTY = { earnPer: 1000, valueCop: 10, maxRedeemPct: 30 } as const;

export function findShippingZone(zones: ShippingZoneRule[], region?: string | null, city?: string | null) {
  const r = normalizePlace(region ?? '');
  const c = normalizePlace(city ?? '');
  const byCity = c ? zones.find((z) => z.cities.some((x) => normalizePlace(x) === c)) : undefined;
  if (byCity) return byCity;
  const byRegion = r ? zones.find((z) => z.regions.some((x) => normalizePlace(x) === r)) : undefined;
  return byRegion ?? zones.find((z) => z.isDefault) ?? null;
}

export function couponDiscount(coupon: CouponRule | null, lines: PricedLine[]) {
  if (!coupon) return { discountCop: 0, freeShipping: false, reason: null as string | null };
  const products = lines.filter((l) => l.kind === 'product').reduce((s, l) => s + l.unitPriceCop * l.quantity, 0);
  const coursesSum = lines.filter((l) => l.kind === 'course').reduce((s, l) => s + l.unitPriceCop * l.quantity, 0);
  const subtotal = products + coursesSum;
  if (subtotal < coupon.minSubtotalCop) return { discountCop: 0, freeShipping: false, reason: 'min' };
  const base = coupon.scope === 'products' ? products : coupon.scope === 'courses' ? coursesSum : subtotal;
  if (base <= 0 && coupon.kind !== 'free_shipping') return { discountCop: 0, freeShipping: false, reason: 'scope' };
  if (coupon.kind === 'free_shipping') return { discountCop: 0, freeShipping: true, reason: null };
  const raw = coupon.kind === 'percent' ? Math.round((base * Math.min(100, coupon.value)) / 100) : coupon.value;
  return { discountCop: Math.max(0, Math.min(base, raw)), freeShipping: false, reason: null };
}

export function computeTotals(input: {
  lines: PricedLine[];
  zones: ShippingZoneRule[];
  region?: string | null;
  city?: string | null;
  coupon?: CouponRule | null;
  redeemPoints?: number;
  availablePoints?: number;
}): Totals {
  const { lines } = input;
  const productsSubtotalCop = lines.filter((l) => l.kind === 'product').reduce((s, l) => s + l.unitPriceCop * l.quantity, 0);
  const coursesSubtotalCop = lines.filter((l) => l.kind === 'course').reduce((s, l) => s + l.unitPriceCop * l.quantity, 0);
  const subtotalCop = productsSubtotalCop + coursesSubtotalCop;
  const requiresShipping = lines.some((l) => l.requiresShipping);
  const c = couponDiscount(input.coupon ?? null, lines);
  const zone = requiresShipping ? findShippingZone(input.zones, input.region, input.city) : null;
  const afterDiscount = Math.max(0, subtotalCop - c.discountCop);

  // Redención de puntos (tope % del subtotal tras cupón)
  const wanted = Math.max(0, Math.min(input.redeemPoints ?? 0, input.availablePoints ?? 0));
  const maxByPct = Math.floor((afterDiscount * LOYALTY.maxRedeemPct) / 100 / LOYALTY.valueCop);
  const pointsUsed = Math.min(wanted, maxByPct);
  const pointsDiscountCop = pointsUsed * LOYALTY.valueCop;

  let shippingCop = 0;
  if (requiresShipping && zone && !c.freeShipping) {
    const free = zone.freeFromCop != null && productsSubtotalCop >= zone.freeFromCop;
    shippingCop = free ? 0 : zone.rateCop;
  }
  const discountCop = c.discountCop;
  const totalCop = Math.max(0, afterDiscount - pointsDiscountCop + shippingCop);
  return {
    subtotalCop,
    productsSubtotalCop,
    coursesSubtotalCop,
    discountCop,
    pointsDiscountCop,
    shippingCop,
    totalCop,
    requiresShipping,
    freeShippingByCoupon: c.freeShipping,
    zone: zone ? { id: zone.id, name: zone.name, etaDays: zone.etaDays, freeFromCop: zone.freeFromCop } : null,
    pointsToEarn: Math.floor((afterDiscount - pointsDiscountCop) / LOYALTY.earnPer),
  };
}

/** Ingreso recurrente mensual normalizado de una suscripción. */
export const monthlyValue = (priceCop: number, frequencyWeeks: number) => Math.round((priceCop * 52) / 12 / Math.max(1, frequencyWeeks));

/** Siguiente fecha de cobro a partir de una fecha base. */
export const addWeeks = (d: Date, weeks: number) => new Date(d.getTime() + weeks * 7 * 24 * 3600 * 1000);

/** Número de pedido legible: CT-251007-K4Q9 */
export function orderNumber(now = new Date()) {
  const y = now.getUTCFullYear().toString().slice(2);
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = now.getUTCDate().toString().padStart(2, '0');
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `CT-${y}${m}${d}-${s}`;
}
