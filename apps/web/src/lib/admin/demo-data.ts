import 'server-only';
/**
 * Datos de ejemplo del panel en MODO DEMO (sin base de datos).
 * Deterministas (PRNG con semilla fija): ~200 días de pedidos con estacionalidad semanal,
 * picos de quincena, crecimiento sostenido, suscripciones con altas/bajas, academia,
 * tráfico propio (page_views), push, CRM y chat. Se generan una vez por día y se memorizan.
 */
import { findShippingZone, monthlyValue, type ShippingZoneRule } from '@travesia/shared';
import { childId, seedCourses, seedIds, seedPlans, seedProducts, seedShippingZones, seedVariants } from '@travesia/db';
import { addDays, dayOf, startOfDay, weekOf } from './range';

// ---------------------------------------------------------------------------
// Utilidades deterministas
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const pick = <T,>(r: Rng, arr: readonly T[]) => arr[Math.floor(r() * arr.length)]!;
function weighted<T>(r: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1]![0];
}
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = (r: Rng, n: number) => Array.from({ length: n }, () => ALPHA[Math.floor(r() * ALPHA.length)]).join('');
const pad = (n: number, l = 4) => n.toString().padStart(l, '0');
const demoUuid = (prefix: string, n: number) => `de300000-${prefix.padEnd(4, '0').slice(0, 4)}-4000-8000-${n.toString(16).padStart(12, '0')}`;

// ---------------------------------------------------------------------------
// Catálogos base
// ---------------------------------------------------------------------------
const FIRST = ['Valentina', 'Santiago', 'Mariana', 'Sebastián', 'Isabella', 'Juan José', 'Daniela', 'Mateo', 'Camila', 'Samuel', 'Laura', 'Alejandro', 'Sara', 'Andrés', 'Manuela', 'Felipe', 'Paula', 'Tomás', 'Natalia', 'Esteban', 'Juliana', 'Simón', 'Carolina', 'David', 'Antonia', 'Nicolás', 'María José', 'Miguel', 'Luisa', 'Jerónimo', 'Catalina', 'Emilio'];
const LAST = ['Restrepo', 'Gómez', 'Ochoa', 'Echeverri', 'Arango', 'Londoño', 'Zapata', 'Vélez', 'Mejía', 'Jaramillo', 'Correa', 'Montoya', 'Cardona', 'Uribe', 'Henao', 'Giraldo', 'Ramírez', 'Castaño', 'Botero', 'Duque', 'Rojas', 'Pérez', 'Rincón', 'Salazar', 'Toro', 'Ospina'];
const DOMAINS = ['gmail.com', 'gmail.com', 'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'une.net.co'];
const CITIES = [
  ['Medellín', 'Antioquia', 34],
  ['Envigado', 'Antioquia', 8],
  ['Bogotá', 'Bogotá D.C.', 18],
  ['Itagüí', 'Antioquia', 4],
  ['Sabaneta', 'Antioquia', 4],
  ['Bello', 'Antioquia', 4],
  ['Rionegro', 'Antioquia', 4],
  ['Cali', 'Valle del Cauca', 7],
  ['Barranquilla', 'Atlántico', 4],
  ['Bucaramanga', 'Santander', 3],
  ['Pereira', 'Risaralda', 3],
  ['Manizales', 'Caldas', 2],
  ['Cartagena', 'Bolívar', 2],
  ['Armenia', 'Quindío', 2],
  ['Caicedo', 'Antioquia', 1],
] as const;
const STREETS = ['Cra. 43A', 'Calle 10', 'Cra. 70', 'Calle 33', 'Av. El Poblado', 'Cra. 15', 'Calle 85', 'Transversal 39', 'Cra. 80', 'Calle 50'];
const HOURS = [0.2, 0.1, 0.05, 0.05, 0.05, 0.2, 0.6, 1.4, 1.8, 1.5, 1.2, 1.3, 1.6, 1.4, 1.0, 0.9, 1.0, 1.2, 1.6, 2.0, 2.2, 1.8, 1.0, 0.5];
const WEEKDAY = [1.05, 0.95, 0.93, 1.0, 1.12, 1.22, 1.28]; // lunes..domingo
const PAYMENT = [['CARD', 52], ['PSE', 22], ['NEQUI', 16], ['BANCOLOMBIA_TRANSFER', 7], ['DAVIPLATA', 3]] as const;
const PRODUCT_WEIGHTS: Record<string, number> = {
  [seedIds.caicedo]: 30, [seedIds.casa]: 18, [seedIds.cima]: 12, [seedIds.honey]: 8, [seedIds.descafe]: 6, [seedIds.v60]: 5,
  [seedIds.prensa]: 4, [seedIds.mug]: 6, [seedIds.kit]: 5, [seedIds.gorra]: 3, [seedIds.cata]: 2, [seedIds.tour]: 1,
};
const COURSE_WEIGHTS = [[seedIds.cFund, 0], [seedIds.cEspresso, 50], [seedIds.cFiltrados, 32], [seedIds.cTueste, 18]] as const;
const PLAN_WEIGHTS = [[seedIds.pExplorador, 38], [seedIds.pMaestro, 24], [seedIds.pDuo, 22], [seedIds.pOficina, 10], [seedIds.pEquipo, 6]] as const;
const ZONES: ShippingZoneRule[] = seedShippingZones.map((z, i) => ({ ...z, id: `demo-zone-${i}`, regions: [...z.regions], cities: [...z.cities] }));

const PAID = new Set(['paid', 'preparing', 'shipped', 'delivered']);
export const isPaidStatus = (s: string) => PAID.has(s);

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------
export type DemoItem = { id: string; itemKind: 'product' | 'course' | 'plan'; productId: string | null; variantId: string | null; courseId: string | null; planId: string | null; name: string; variantName: string | null; imageUrl: string | null; unitPriceCop: number; quantity: number; totalCop: number };
export type DemoOrder = {
  id: string; number: string; userId: string | null; email: string; customerName: string; phone: string; legalIdType: string; legalId: string;
  kind: 'store' | 'course' | 'subscription' | 'mixed'; channel: 'web' | 'app' | 'admin' | 'pos';
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed';
  subtotalCop: number; discountCop: number; shippingCop: number; totalCop: number; couponCode: string | null; pointsRedeemed: number; pointsEarned: number;
  requiresShipping: boolean; shippingAddress: { recipient: string; phone: string; region: string; city: string; line1: string; line2?: string | null; notes?: string | null } | null;
  paymentMethod: string | null; wompiReference: string; wompiTransactionId: string | null; subscriptionId: string | null;
  paidAt: Date | null; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; shippedAt: Date | null; deliveredAt: Date | null; cancelledAt: Date | null;
  notes: string | null; internalNotes: string | null; createdAt: Date; updatedAt: Date; items: DemoItem[];
};
export type DemoCustomer = { id: string; email: string; fullName: string; phone: string; city: string; region: string; createdAt: Date; lastSeenAt: Date; loyaltyPoints: number; role: 'customer' | 'editor' | 'admin'; provider: string; marketingOptIn: boolean };
export type DemoSubscription = { id: string; userId: string; planId: string; productId: string | null; grind: string; status: 'pending' | 'active' | 'paused' | 'past_due' | 'cancelled'; priceCop: number; startedAt: Date; cancelledAt: Date | null; cancelReason: string | null; nextBillingAt: Date | null; pausedUntil: Date | null; failedAttempts: number; cardBrand: string; cardLast4: string; createdAt: Date; address: DemoOrder['shippingAddress'] };
export type DemoCharge = { id: string; subscriptionId: string; orderId: string | null; amountCop: number; status: 'approved' | 'declined' | 'error' | 'pending'; attempt: number; error: string | null; wompiTransactionId: string | null; createdAt: Date };
export type DemoEnrollment = { id: string; userId: string; courseId: string; source: 'purchase' | 'subscription' | 'admin' | 'free'; status: 'active' | 'completed' | 'revoked'; progressPct: number; createdAt: Date; updatedAt: Date; completedAt: Date | null };
export type DemoDataset = {
  today: string;
  customers: DemoCustomer[];
  orders: DemoOrder[]; // más reciente primero
  subscriptions: DemoSubscription[];
  charges: DemoCharge[];
  enrollments: DemoEnrollment[];
  certificates: { id: string; code: string; userId: string; courseId: string; holderName: string; courseTitle: string; hours: number; issuedAt: Date; revokedAt: Date | null }[];
  pageViews: { day: string; views: number; carts: number }[];
  lessonViews: Record<string, number>;
};

const variantsOf = (pid: string) => seedVariants.filter((v) => v.productId === pid);
const productById = (id: string) => seedProducts.find((p) => p.id === id)!;
const planById = (id: string) => seedPlans.find((p) => p.id === id)!;
const courseById = (id: string) => seedCourses.find((c) => c.id === id)!;

const DAYS_BACK = 200;
const cache = new Map<string, DemoDataset>();

export function demoDataset(now = new Date()): DemoDataset {
  const today = dayOf(now);
  const hit = cache.get(today);
  if (hit) return hit;
  const ds = build(today, now);
  cache.clear();
  cache.set(today, ds);
  return ds;
}

function build(today: string, now: Date): DemoDataset {
  const r = mulberry32(20261007);
  const customers: DemoCustomer[] = [];
  const orders: DemoOrder[] = [];
  const subscriptions: DemoSubscription[] = [];
  const charges: DemoCharge[] = [];
  const enrollments: DemoEnrollment[] = [];
  const certificates: DemoDataset['certificates'] = [];
  const pageViews: DemoDataset['pageViews'] = [];
  const lessonViews: Record<string, number> = {};
  const enrolled = new Set<string>();
  let orderSeq = 0;

  const newCustomer = (at: Date): DemoCustomer => {
    const first = pick(r, FIRST);
    const last = `${pick(r, LAST)} ${pick(r, LAST)}`;
    const [city, region] = weighted(r, CITIES.map((c) => [[c[0], c[1]] as const, c[2]] as const));
    const n = customers.length + 1;
    const email = `${first.split(' ')[0]!.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${last.split(' ')[0]!.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}${n % 7 === 0 ? n : ''}@${pick(r, DOMAINS)}`;
    const c: DemoCustomer = {
      id: demoUuid('cus', n),
      email,
      fullName: `${first} ${last}`,
      phone: `+57 3${Math.floor(r() * 3) + 0}${Math.floor(r() * 10)} ${pad(Math.floor(r() * 1000), 3)} ${pad(Math.floor(r() * 10000))}`,
      city,
      region,
      createdAt: at,
      lastSeenAt: at,
      loyaltyPoints: 0,
      role: 'customer',
      provider: r() < 0.55 ? 'google.com' : r() < 0.2 ? 'apple.com' : 'password',
      marketingOptIn: r() < 0.78,
    };
    customers.push(c);
    return c;
  };
  const anyCustomerBefore = (at: Date) => {
    // Favorece clientes recientes (recompra más probable en los primeros meses)
    for (let k = 0; k < 6; k++) {
      const c = customers[Math.floor(customers.length * (1 - Math.pow(r(), 1.6)))];
      if (c && c.createdAt < at) return c;
    }
    return null;
  };
  const address = (c: DemoCustomer) => ({ recipient: c.fullName, phone: c.phone, region: c.region, city: c.city, line1: `${pick(r, STREETS)} # ${Math.floor(r() * 90) + 1}-${Math.floor(r() * 90) + 10}`, line2: r() < 0.4 ? `Apto ${Math.floor(r() * 1500) + 100}` : null, notes: r() < 0.15 ? 'Dejar en portería' : null });

  const statusFor = (ageDays: number): DemoOrder['status'] => {
    const x = r();
    if (x < 0.025) return 'failed';
    if (x < 0.04) return 'cancelled';
    if (ageDays === 0) return weighted(r, [['pending', 8], ['paid', 52], ['preparing', 28], ['shipped', 12]] as const);
    if (ageDays <= 2) return weighted(r, [['paid', 14], ['preparing', 30], ['shipped', 56]] as const);
    if (ageDays <= 5) return weighted(r, [['shipped', 40], ['delivered', 60]] as const);
    return x > 0.995 ? 'refunded' : 'delivered';
  };

  const pushOrder = (o: Omit<DemoOrder, 'id' | 'number' | 'wompiReference' | 'updatedAt'> & { day: string }) => {
    orderSeq++;
    const { day, ...rest } = o;
    const number = `CT-${day.slice(2, 4)}${day.slice(5, 7)}${day.slice(8, 10)}-${code(r, 5)}`;
    const order: DemoOrder = { ...rest, id: demoUuid('ord', orderSeq), number, wompiReference: `${number}-${code(r, 6)}`, updatedAt: rest.paidAt ?? rest.createdAt };
    orders.push(order);
    return order;
  };

  const fulfil = (o: DemoOrder, ageDays: number) => {
    if (['shipped', 'delivered'].includes(o.status) && o.requiresShipping && o.paidAt) {
      const carrier = o.shippingAddress && ['Medellín', 'Envigado', 'Itagüí', 'Sabaneta', 'Bello'].includes(o.shippingAddress.city) ? weighted(r, [['Mensajería propia', 55], ['Interrapidísimo', 45]] as const) : weighted(r, [['Servientrega', 40], ['Coordinadora', 30], ['Interrapidísimo', 20], ['Envía', 10]] as const);
      o.carrier = carrier;
      o.trackingNumber = carrier === 'Mensajería propia' ? null : `${Math.floor(r() * 9e9) + 1e9}`;
      o.trackingUrl = o.trackingNumber ? `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${o.trackingNumber}` : null;
      o.shippedAt = new Date(o.paidAt.getTime() + (12 + r() * 30) * 3600000);
      if (o.status === 'delivered') o.deliveredAt = new Date(o.shippedAt.getTime() + (1 + r() * 3) * 86400000);
    }
    if (o.status === 'cancelled') o.cancelledAt = new Date(o.createdAt.getTime() + 3600000 * 5);
    if (o.status === 'pending' || o.status === 'failed') o.paidAt = null;
    void ageDays;
  };

  // ---------------- Suscripciones (altas a lo largo del periodo) ----------------
  const startDay = addDays(today, -DAYS_BACK);
  let subSeq = 0;
  for (let i = 0; i <= DAYS_BACK; i++) {
    const day = addDays(startDay, i);
    const growth = 0.7 + 0.6 * (i / DAYS_BACK);
    const dom = Number(day.slice(8, 10));
    const quincena = dom === 15 || dom === 16 || dom >= 30 || dom === 1 ? 1.6 : 1;
    const expected = 0.95 * growth * quincena;
    const n = Math.floor(expected + r());
    for (let k = 0; k < n; k++) {
      subSeq++;
      const startedAt = new Date(startOfDay(day).getTime() + (8 + r() * 13) * 3600000);
      const c = r() < 0.45 ? (anyCustomerBefore(startedAt) ?? newCustomer(new Date(startedAt.getTime() - 3600000))) : newCustomer(new Date(startedAt.getTime() - 3600000 * (1 + r() * 48)));
      const planId = weighted(r, PLAN_WEIGHTS);
      const plan = planById(planId);
      const coffee = weighted(r, [[seedIds.caicedo, 45], [seedIds.casa, 25], [seedIds.cima, 15], [seedIds.honey, 10], [seedIds.descafe, 5]] as const);
      const lifetime = r() < 0.34 ? 18 + r() * 140 : Infinity;
      const cancelAt = lifetime === Infinity ? null : new Date(startedAt.getTime() + lifetime * 86400000);
      const cancelled = cancelAt && cancelAt < now ? cancelAt : null;
      const sub: DemoSubscription = {
        id: demoUuid('sub', subSeq),
        userId: c.id,
        planId,
        productId: coffee,
        grind: weighted(r, [['grano', 50], ['media', 35], ['fina', 10], ['gruesa', 5]] as const),
        status: cancelled ? 'cancelled' : weighted(r, [['active', 90], ['paused', 6], ['past_due', 4]] as const),
        priceCop: plan.priceCop,
        startedAt,
        cancelledAt: cancelled,
        cancelReason: cancelled ? weighted(r, [['Tengo mucho café en casa', 30], ['Precio', 22], ['Me mudé de ciudad', 10], ['Prefiero comprar en la tienda', 18], ['Cobro rechazado 3 veces', 20]] as const) : null,
        nextBillingAt: null,
        pausedUntil: null,
        failedAttempts: 0,
        cardBrand: weighted(r, [['VISA', 55], ['MASTERCARD', 38], ['AMEX', 7]] as const),
        cardLast4: pad(Math.floor(r() * 10000)),
        createdAt: startedAt,
        address: address(c),
      };
      subscriptions.push(sub);
      // Cobros cada frequencyWeeks hasta la cancelación / hoy
      const end = (cancelled ?? now).getTime();
      let t = startedAt.getTime();
      let attempt = 0;
      while (t <= end) {
        const declined = r() < 0.06;
        attempt++;
        const chargeId = demoUuid('chg', charges.length + 1);
        if (declined) {
          charges.push({ id: chargeId, subscriptionId: sub.id, orderId: null, amountCop: sub.priceCop, status: 'declined', attempt: 1, error: weighted(r, [['Fondos insuficientes', 50], ['Tarjeta vencida', 20], ['Transacción rechazada por el banco', 30]] as const), wompiTransactionId: `${Math.floor(r() * 9e5)}-${Math.floor(r() * 9e9)}`, createdAt: new Date(t) });
          t += 2 * 86400000; // reintento
          if (r() < 0.25) break; // no se recuperó
          continue;
        }
        const d = dayOf(t);
        const ageDays = Math.round((startOfDay(today).getTime() - startOfDay(d).getTime()) / 86400000);
        const status = ageDays === 0 ? 'paid' : ageDays <= 2 ? 'preparing' : ageDays <= 5 ? 'shipped' : 'delivered';
        const p = productById(sub.productId!);
        const o = pushOrder({
          day: d,
          userId: c.id, email: c.email, customerName: c.fullName, phone: c.phone, legalIdType: 'CC', legalId: `${Math.floor(r() * 9e9) + 1e9}`,
          kind: 'subscription', channel: r() < 0.3 ? 'app' : 'web', status,
          subtotalCop: sub.priceCop, discountCop: 0, shippingCop: 0, totalCop: sub.priceCop, couponCode: null, pointsRedeemed: 0, pointsEarned: 0,
          requiresShipping: true, shippingAddress: sub.address, paymentMethod: 'CARD (recurrente)', wompiTransactionId: `${Math.floor(r() * 9e5)}-${Math.floor(r() * 9e9)}`,
          subscriptionId: sub.id, paidAt: new Date(t), carrier: null, trackingNumber: null, trackingUrl: null, shippedAt: null, deliveredAt: null, cancelledAt: null,
          notes: null, internalNotes: null, createdAt: new Date(t - 60000),
          items: [{ id: demoUuid('itm', orderSeq * 10 + 1), itemKind: 'plan', productId: sub.productId, variantId: null, courseId: null, planId, name: `Suscripción ${plan.name}`, variantName: `${plan.bagsPerDelivery} × ${plan.bagWeightG} g · ${p.name} · ${sub.grind}`, imageUrl: p.imageUrl, unitPriceCop: sub.priceCop, quantity: 1, totalCop: sub.priceCop }],
        });
        fulfil(o, ageDays);
        charges.push({ id: chargeId, subscriptionId: sub.id, orderId: o.id, amountCop: sub.priceCop, status: 'approved', attempt: attempt > 1 && charges[charges.length - 1]?.status === 'declined' ? 2 : 1, error: null, wompiTransactionId: o.wompiTransactionId, createdAt: new Date(t) });
        attempt = 0;
        t += plan.frequencyWeeks * 7 * 86400000;
      }
      if (!cancelled) {
        sub.nextBillingAt = new Date(t);
        if (sub.status === 'paused') sub.pausedUntil = new Date(now.getTime() + (5 + r() * 25) * 86400000);
        if (sub.status === 'past_due') {
          sub.failedAttempts = 1 + Math.floor(r() * 2);
          sub.nextBillingAt = new Date(now.getTime() + (1 + r() * 2) * 86400000);
          charges.push({ id: demoUuid('chg', charges.length + 1), subscriptionId: sub.id, orderId: null, amountCop: sub.priceCop, status: 'declined', attempt: sub.failedAttempts, error: 'Fondos insuficientes', wompiTransactionId: null, createdAt: new Date(now.getTime() - r() * 3 * 86400000) });
        }
      }
    }
  }

  // ---------------- Pedidos de tienda y cursos ----------------
  for (let i = 0; i <= DAYS_BACK; i++) {
    const day = addDays(startDay, i);
    const ageDays = DAYS_BACK - i;
    const dow = (new Date(startOfDay(day).getTime() - 5 * 3600000).getUTCDay() + 6) % 7;
    const dom = Number(day.slice(8, 10));
    const growth = 0.72 + 0.56 * (i / DAYS_BACK);
    const quincena = dom === 15 || dom === 16 || dom >= 30 || dom === 1 ? 1.55 : dom === 14 || dom === 2 || dom === 17 ? 1.2 : 1;
    const special = day.slice(5) === '10-01' ? 1.3 : 1; // Día Internacional del Café
    const expected = 15 * growth * WEEKDAY[dow]! * quincena * special * (0.85 + r() * 0.3);
    const count = ageDays === 0 ? Math.round(expected * Math.min(1, (now.getTime() - startOfDay(day).getTime()) / 86400000 + 0.15)) : Math.round(expected);
    let dayOrders = 0;
    for (let k = 0; k < count; k++) {
      const hour = weighted(r, HOURS.map((w, h) => [h, w] as const));
      let at = new Date(startOfDay(day).getTime() + hour * 3600000 + Math.floor(r() * 60) * 60000);
      if (at > now) at = new Date(now.getTime() - Math.floor(r() * 50 + 5) * 60000);
      const returning = r() < 0.38 ? anyCustomerBefore(at) : null;
      const c = returning ?? newCustomer(new Date(at.getTime() - 60000 * (5 + r() * 60 * 24 * (r() < 0.3 ? 20 : 0.5))));
      const isCourse = r() < 0.1;
      const items: DemoItem[] = [];
      let requiresShipping = true;
      if (isCourse) {
        const cid = weighted(r, COURSE_WEIGHTS);
        const course = courseById(cid);
        const price = Number(course.base.priceCop);
        items.push({ id: demoUuid('itm', orderSeq * 10 + 1), itemKind: 'course', productId: null, variantId: null, courseId: cid, planId: null, name: String(course.base.title), variantName: null, imageUrl: String(course.base.coverUrl), unitPriceCop: price, quantity: 1, totalCop: price });
        requiresShipping = false;
      } else {
        const lines = weighted(r, [[1, 55], [2, 32], [3, 13]] as const);
        const used = new Set<string>();
        for (let l = 0; l < lines; l++) {
          const pid = weighted(r, Object.entries(PRODUCT_WEIGHTS));
          if (used.has(pid)) continue;
          used.add(pid);
          const p = productById(pid);
          const vs = variantsOf(pid);
          const v = vs[Math.floor(Math.pow(r(), 1.5) * vs.length)]!;
          const qty = p.kind === 'coffee' ? weighted(r, [[1, 70], [2, 24], [3, 6]] as const) : 1;
          items.push({ id: demoUuid('itm', orderSeq * 10 + l + 1), itemKind: 'product', productId: pid, variantId: v.id, courseId: null, planId: null, name: p.name, variantName: v.name, imageUrl: p.imageUrl, unitPriceCop: v.priceCop, quantity: qty, totalCop: v.priceCop * qty });
        }
        requiresShipping = items.some((it) => productById(it.productId!).kind !== 'experience');
      }
      const subtotal = items.reduce((s, it) => s + it.totalCop, 0);
      const firstOrder = !returning;
      const coupon = firstOrder && r() < 0.22 ? 'BIENVENIDA10' : isCourse && r() < 0.15 ? 'ACADEMIA20' : !isCourse && subtotal >= 80000 && r() < 0.06 ? 'ENVIOGRATIS' : null;
      const discount = coupon === 'BIENVENIDA10' ? Math.round(subtotal * 0.1) : coupon === 'ACADEMIA20' ? Math.round(subtotal * 0.2) : 0;
      const zone = requiresShipping ? findShippingZone(ZONES, c.region, c.city) : null;
      const shipping = !requiresShipping || coupon === 'ENVIOGRATIS' || !zone ? 0 : zone.freeFromCop != null && subtotal >= zone.freeFromCop ? 0 : zone.rateCop;
      const total = subtotal - discount + shipping;
      const status = statusFor(ageDays);
      const o = pushOrder({
        day,
        userId: c.id, email: c.email, customerName: c.fullName, phone: c.phone, legalIdType: 'CC', legalId: `${Math.floor(r() * 9e9) + 1e9}`,
        kind: isCourse ? 'course' : 'store', channel: r() < 0.32 ? 'app' : r() < 0.015 ? 'pos' : 'web', status,
        subtotalCop: subtotal, discountCop: discount, shippingCop: shipping, totalCop: total, couponCode: coupon, pointsRedeemed: 0, pointsEarned: Math.floor((subtotal - discount) / 1000),
        requiresShipping, shippingAddress: requiresShipping ? address(c) : null, paymentMethod: weighted(r, PAYMENT), wompiTransactionId: `${Math.floor(r() * 9e5) + 1e5}-${Math.floor(r() * 9e9) + 1e9}-${Math.floor(r() * 9e4) + 1e4}`,
        subscriptionId: null, paidAt: at, carrier: null, trackingNumber: null, trackingUrl: null, shippedAt: null, deliveredAt: null, cancelledAt: null,
        notes: r() < 0.08 ? 'Por favor timbrar en la portería, gracias ☕' : null, internalNotes: null, createdAt: new Date(at.getTime() - 60000 * (2 + r() * 6)), items,
      });
      fulfil(o, ageDays);
      if (isPaidStatus(o.status)) {
        c.loyaltyPoints += o.pointsEarned;
        if (c.lastSeenAt < at) c.lastSeenAt = at;
      }
      dayOrders++;
      // Inscripción a curso comprado
      if (isCourse && isPaidStatus(o.status)) addEnrollment(c, items[0]!.courseId!, 'purchase', at);
    }
    // Inscripciones gratuitas / por suscripción
    const freeN = Math.floor((3.2 * growth + r() * 2) * (dow >= 5 ? 1.2 : 1));
    for (let k = 0; k < freeN; k++) {
      const at = new Date(startOfDay(day).getTime() + (7 + r() * 15) * 3600000);
      if (at > now) continue;
      const c = anyCustomerBefore(at) ?? newCustomer(at);
      addEnrollment(c, r() < 0.7 ? seedIds.cFund : weighted(r, COURSE_WEIGHTS), r() < 0.7 ? 'free' : 'subscription', at);
    }
    // Registros sin compra (cuentas creadas en la app/web)
    const signups = Math.floor(2 + r() * 4 * growth);
    for (let k = 0; k < signups; k++) {
      const at = new Date(startOfDay(day).getTime() + (6 + r() * 17) * 3600000);
      if (at < now) newCustomer(at);
    }
    // Tráfico
    const conv = 0.017 + r() * 0.006;
    const views = Math.round((dayOrders / conv) * (0.92 + r() * 0.16));
    pageViews.push({ day, views, carts: Math.round(views * (0.055 + r() * 0.015)) });
  }

  function addEnrollment(c: DemoCustomer, courseId: string, source: DemoEnrollment['source'], at: Date) {
    const key = `${c.id}:${courseId}`;
    if (enrolled.has(key)) return;
    enrolled.add(key);
    const age = (now.getTime() - at.getTime()) / 86400000;
    const progress = Math.min(100, Math.round(Math.min(1, age / (20 + r() * 40)) * (40 + r() * 70)));
    const completed = progress >= 100;
    const completedAt = completed ? new Date(at.getTime() + Math.min(age, 10 + r() * 30) * 86400000) : null;
    const e: DemoEnrollment = { id: demoUuid('enr', enrollments.length + 1), userId: c.id, courseId, source, status: completed ? 'completed' : 'active', progressPct: progress, createdAt: at, updatedAt: new Date(Math.min(now.getTime(), at.getTime() + age * r() * 86400000)), completedAt };
    enrollments.push(e);
    lessonViews[courseId] = (lessonViews[courseId] ?? 0) + Math.round(progress / 12) + 1;
    if (completed && completedAt && completedAt < now) {
      const course = courseById(courseId);
      certificates.push({ id: demoUuid('crt', certificates.length + 1), code: `TRV-${code(r, 4)}-${code(r, 4)}`, userId: c.id, courseId, holderName: c.fullName, courseTitle: String(course.base.title), hours: Math.ceil(Number(course.base.durationMin) / 60), issuedAt: completedAt, revokedAt: null });
    }
  }

  orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  // Personal del panel
  customers.unshift(
    { id: 'demo-admin', email: 'demo@cafetravesia.co', fullName: 'Equipo Café Travesía', phone: '+57 300 000 0000', city: 'Medellín', region: 'Antioquia', createdAt: new Date(startOfDay(startDay).getTime()), lastSeenAt: now, loyaltyPoints: 0, role: 'admin', provider: 'google.com', marketingOptIn: false },
    { id: demoUuid('stf', 1), email: 'gabo@cafetravesia.co', fullName: 'Gabriel “Gabo” Travesía', phone: '+57 300 000 0001', city: 'Caicedo', region: 'Antioquia', createdAt: new Date(startOfDay(startDay).getTime()), lastSeenAt: new Date(now.getTime() - 3600000 * 3), loyaltyPoints: 0, role: 'admin', provider: 'google.com', marketingOptIn: false },
    { id: demoUuid('stf', 2), email: 'alex@cafetravesia.co', fullName: 'Alex Travesía', phone: '+57 300 000 0002', city: 'Medellín', region: 'Antioquia', createdAt: new Date(startOfDay(startDay).getTime()), lastSeenAt: new Date(now.getTime() - 3600000 * 26), loyaltyPoints: 0, role: 'editor', provider: 'password', marketingOptIn: false },
  );
  return { today, customers, orders, subscriptions, charges, enrollments, certificates, pageViews, lessonViews };
}

// ---------------------------------------------------------------------------
// Datos fijos de ejemplo para CRM, chat, push, monitor, medios…
// ---------------------------------------------------------------------------
const ago = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60000);

export function demoLeads(now = new Date()) {
  const rows = [
    ['Laura Restrepo', 'compras@cowork-laureles.co', 'Cowork Laureles', 'empresas', 'Plan Oficina', 'Somos un cowork de 60 puestos y queremos café de especialidad mensual con factura electrónica.', 'new', null, 40],
    ['Andrés Mejía', 'andres@hotelelcastillo.com', 'Hotel El Castillo', 'horeca', 'Café para restaurante', 'Buscamos proveedor de café en grano para el restaurante del hotel, unos 15 kg al mes.', 'new', null, 180],
    ['Paula Echeverri', 'paula.e@gmail.com', null, 'contacto', 'Regalos corporativos', '¿Hacen kits de regalo para diciembre? Necesitamos 80 cajas personalizadas.', 'contacted', 72, 1500],
    ['Felipe Arango', 'felipe@arangoeventos.co', 'Arango Eventos', 'empresas', 'Barra de café para evento', 'Boda de 150 invitados en Llanogrande, queremos barra de café con barista.', 'qualified', 84, 2900],
    ['Natalia Uribe', 'natalia@clinicaelsol.co', 'Clínica El Sol', 'empresas', 'Plan Oficina', 'Cafetería para el personal médico, 3 sedes.', 'qualified', 77, 4200],
    ['Esteban Giraldo', 'esteban@tiendagourmet.co', 'Tienda Gourmet Rionegro', 'distribuidor', 'Distribución', 'Queremos vender su café en nuestra tienda de Rionegro.', 'won', 91, 9000],
    ['Mariana Toro', 'mariana.toro@outlook.com', null, 'academia', 'Curso para empresa', 'Capacitación de barismo para 8 personas de mi equipo.', 'contacted', 65, 3100],
    ['Camilo Ospina', 'camilo@startupmed.io', 'StartupMed', 'empresas', 'Plan Equipo grande', 'Equipo de 45 personas, actualmente compramos café en el supermercado.', 'new', null, 25],
    ['Sara Vélez', 'sara.velez@gmail.com', null, 'contacto', 'Tour a Caicedo', '¿Tienen tour para grupo de 12 personas en enero?', 'lost', 40, 7000],
    ['Juan Pablo Henao', 'jp@cafeteriaelparque.co', 'Cafetería El Parque', 'horeca', 'Café para cafetería', 'Abrimos cafetería en Envigado y buscamos tostador aliado.', 'new', null, 300],
  ] as const;
  return rows.map(([name, email, company, source, interest, message, status, score, mins], i) => ({
    id: demoUuid('led', i + 1), name, email, phone: `+57 31${i} 555 ${pad(1200 + i * 37)}`, company, source, interest, message, status, score, notes: status === 'won' ? 'Primer pedido de 12 kg despachado. Revisar recompra en 30 días.' : null,
    createdAt: ago(now, mins), updatedAt: ago(now, Math.max(5, mins - 30)),
  }));
}

export function demoChats(now = new Date()) {
  const sessions = [
    { name: 'Daniela Gómez', email: 'daniela.gomez@gmail.com', status: 'human_requested', mins: 3, channel: 'web', msgs: [['user', 'Hola! Hice un pedido ayer y no me ha llegado el correo de confirmación'], ['assistant', '¡Hola, Daniela! Con gusto te ayudo. ¿Me compartes el número de pedido (empieza por CT-)?'], ['user', 'CT-251006-K4Q9P, pagué con PSE'], ['assistant', 'Gracias. Voy a pasarte con un asesor para revisar el pago en Wompi. Un momento ☕'], ['system', 'El cliente solicitó hablar con un asesor']] },
    { name: 'Visitante', email: null, status: 'human_requested', mins: 9, channel: 'app', msgs: [['user', '¿Puedo cambiar el café de mi suscripción por Cima del Viento?'], ['assistant', 'Sí, desde Mi cuenta → Suscripción puedes cambiar el café. ¿Quieres que te pase con un asesor para hacerlo por ti?'], ['user', 'Sí porfa']] },
    { name: 'Santiago Correa', email: 'scorrea@hotmail.com', status: 'human', mins: 22, channel: 'web', msgs: [['user', 'Necesito 20 bolsas para regalos de empresa'], ['assistant', 'Para pedidos corporativos tenemos precios especiales. Te paso con un asesor.'], ['agent', 'Hola Santiago, soy Alex de Café Travesía. ¿Para qué fecha los necesitas y a qué ciudad?'], ['user', 'Para el 15 de diciembre, en Bogotá']] },
    { name: 'Manuela Arango', email: 'manu.arango@gmail.com', status: 'bot', mins: 41, channel: 'web', msgs: [['user', '¿Qué café me recomiendas para V60?'], ['assistant', 'Para V60 te encantará **Cima del Viento**: floral, cítrico y con final a caramelo. Si prefieres algo más dulce, **Honey de la Vereda**.']] },
    { name: 'Visitante', email: null, status: 'closed', mins: 300, channel: 'web', msgs: [['user', '¿Abren los domingos en Florida?'], ['assistant', 'Sí: domingos y festivos de 10:00 a. m. a 7:00 p. m. ¡Te esperamos!']] },
  ] as const;
  return sessions.map((s, i) => ({
    id: demoUuid('cht', i + 1), userId: s.email ? demoUuid('cus', 10 + i) : null, visitorId: `v-${i}`, name: s.name, email: s.email, channel: s.channel, status: s.status, assignedTo: null, summary: null,
    lastMessageAt: ago(now, s.mins), createdAt: ago(now, s.mins + 12),
    messages: s.msgs.map(([role, content], j) => ({ id: demoUuid('msg', i * 20 + j), sessionId: demoUuid('cht', i + 1), role, content, actions: null, createdAt: ago(now, s.mins + (s.msgs.length - j) * 2) })),
  }));
}

export function demoCampaigns(now = new Date()) {
  const rows = [
    ['Cima del Viento ya llegó 🌬️', 'Microlote de temporada: jazmín, mandarina y caramelo. Pocas bolsas.', '/tienda/cima-del-viento', 'all', 'sent', 950, 931, 19, 284, 60 * 26],
    ['Tu travesía te espera ☕', 'Retoma tu curso donde lo dejaste y gana tu certificado.', '/cuenta/cursos', 'students', 'sent', 412, 409, 3, 151, 60 * 24 * 4],
    ['Quincena cafetera: envío gratis', 'Hoy y mañana envío gratis en compras desde $80.000.', '/tienda', 'customers', 'sent', 730, 716, 14, 198, 60 * 24 * 9],
    ['Día Internacional del Café', 'Celebra con 15 % en todos los cafés de origen. Solo hoy.', '/tienda', 'all', 'sent', 905, 889, 16, 342, 60 * 24 * 6],
    ['Nueva cata en Florida', 'Sábado 7 de nov · 10:00 a. m. Cupos limitados.', '/tienda/cata-guiada-florida', 'all', 'scheduled', 0, 0, 0, 0, -60 * 30],
  ] as const;
  return rows.map(([title, body, deepLink, audience, status, target, sent, errors, opens, mins], i) => ({
    id: demoUuid('cmp', i + 1), title, body, deepLink, imageUrl: null, audience, platform: 'all' as const, status, scheduledAt: status === 'scheduled' ? ago(now, mins) : null,
    targetCount: target, sentCount: sent, errorCount: errors, openCount: opens, createdBy: 'demo-admin', sentAt: status === 'sent' ? ago(now, mins) : null, createdAt: ago(now, Math.max(mins, 0) + 20),
  }));
}

export function demoPushStats() {
  return { ios: 418, android: 547, web: 0, disabled: 37 };
}

export function demoEvents(now = new Date()) {
  const r = mulberry32(42);
  const tpl = [
    ['wompi', 'webhook.transaction.updated', 'ok', 'APPROVED · CT-251007-HX7QK'],
    ['wompi', 'order.paid', 'ok', '$ 96.800'],
    ['push', 'campaign', 'ok', '931 enviados, 19 errores'],
    ['push', 'order_shipped', 'ok', '1 enviados, 0 errores'],
    ['email', 'send', 'ok', 'Pedido confirmado'],
    ['cron', 'run', 'ok', 'billing, reconcile, push, reminders, carts, cleanup · 2.4 s'],
    ['ai', 'chat', 'ok', ''],
    ['wompi', 'subscription.charge', 'error', 'Fondos insuficientes'],
    ['gateway', 'db.query', 'ok', '182 ms'],
    ['email', 'send', 'error', 'SMTP timeout (cPanel)'],
    ['storage', 'upload', 'ok', 'productos/cima-del-viento.webp'],
    ['auth', 'session.create', 'ok', ''],
    ['wompi', 'webhook.transaction.updated', 'ignored', 'Evento duplicado'],
  ] as const;
  return Array.from({ length: 48 }, (_, i) => {
    const [source, event, status, message] = tpl[Math.floor(r() * tpl.length)]!;
    return { id: demoUuid('evt', i + 1), source, event, status, externalId: source === 'wompi' ? `${Math.floor(r() * 9e5)}-${Math.floor(r() * 9e9)}` : null, message, durationMs: Math.round(80 + r() * 900), payload: null, createdAt: ago(now, i * 37 + Math.floor(r() * 30)) };
  });
}

export function demoAudit(now = new Date()) {
  const rows = [
    ['order.status', 'order', 'CT-251007-HX7QK', { to: 'shipped', carrier: 'Servientrega' }],
    ['product.update', 'product', seedIds.cima, { fields: ['description', 'variants'] }],
    ['site.update', 'site_content', 'home.hero', null],
    ['push.send', 'push_campaign', 'Cima del Viento ya llegó', { audience: 'all' }],
    ['coupon.create', 'coupon', 'QUINCENA15', null],
    ['user.role', 'user', 'alex@cafetravesia.co', { from: 'customer', to: 'editor' }],
    ['post.publish', 'blog_post', 'como-preparar-chemex', null],
    ['loyalty.adjust', 'user', 'valentina.restrepo@gmail.com', { points: 200, reason: 'Compensación por demora' }],
  ] as const;
  return rows.map(([action, entity, entityId, meta], i) => ({ id: demoUuid('aud', i + 1), userId: i % 3 === 0 ? demoUuid('stf', 1) : 'demo-admin', userEmail: i % 3 === 0 ? 'gabo@cafetravesia.co' : 'demo@cafetravesia.co', action, entity, entityId, meta, createdAt: ago(now, i * 190 + 12) }));
}

export function demoMedia(now = new Date()) {
  const files = [
    ['fotos', 'manos-cafe-caicedo', 'Manos sosteniendo granos de café en Caicedo'],
    ['fotos', 'latte-travesia', 'Latte con arte en taza Café Travesía'],
    ['fotos', 'taza-frase', 'Taza con frase de la marca'],
    ['fotos', 'barra-travesia', 'Barra de Café Travesía en Florida'],
    ['fotos', 'aromatica-frutos', 'Aromática de frutos rojos'],
    ['fotos', 'soda-frutos', 'Soda de frutos'],
    ['fotos', 'frappe-caramelo', 'Frappé de caramelo'],
    ['fotos', 'florida-te-esperamos', 'Local de Florida: te esperamos'],
    ['fotos', 'florida-lugar-diferente', 'Local de Florida: un lugar diferente'],
  ] as const;
  return files.map(([folder, name, alt], i) => ({ id: demoUuid('med', i + 1), path: `brand/${folder}/${name}.webp`, url: `/brand/${folder}/${name}.webp`, folder: i < 4 ? 'productos' : i < 7 ? 'blog' : 'sitio', alt, mime: 'image/webp', sizeBytes: 180000 + i * 23111, width: 1080, height: 1920, uploadedBy: 'demo-admin', createdAt: ago(now, i * 600) }));
}

export function demoReviews(now = new Date()) {
  const rows = [
    [seedIds.caicedo, null, 5, 'El de todos los días', 'Dulce, chocolatoso y rinde muchísimo en la greca. Ya vamos por la quinta bolsa.', 'pending', 'Juliana Montoya'],
    [seedIds.cima, null, 5, 'Floral increíble', 'En V60 sale una taza brillante, con mandarina clarita. Vale cada peso.', 'pending', 'Tomás Rincón'],
    [null, seedIds.cEspresso, 4, 'Muy práctico', 'Alex explica súper claro. Me faltó un poco más de latte art avanzado.', 'pending', 'Sebastián Duque'],
    [seedIds.v60, null, 2, 'Llegó el filtro roto', 'El kit llegó con la jarra despicada, ya escribí al chat.', 'pending', 'Paula Zapata'],
    [seedIds.honey, null, 5, 'Mi favorito', 'Notas de durazno y miel, delicioso frío.', 'approved', 'Carolina Botero'],
    [seedIds.casa, null, 4, 'Buen precio', 'Para la oficina es perfecto.', 'approved', 'David Londoño'],
    [null, seedIds.cFund, 5, 'Gratis y buenísimo', 'Entendí por fin qué es un café especial.', 'approved', 'Antonia Gómez'],
    [seedIds.mug, null, 1, 'Spam', 'Visita mi página www…', 'rejected', 'Anónimo'],
  ] as const;
  return rows.map(([productId, courseId, rating, title, body, status, author], i) => ({ id: demoUuid('rev', i + 1), productId, courseId, userId: demoUuid('cus', 30 + i), author, rating, title, body, status, verified: i % 2 === 0, createdAt: ago(now, i * 300 + 45) }));
}

export function demoNewsletter(now = new Date()) {
  const r = mulberry32(7);
  return Array.from({ length: 64 }, (_, i) => ({ email: `${pick(r, FIRST).split(' ')[0]!.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${pick(r, LAST).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}${i}@${pick(r, DOMAINS)}`, source: pick(r, ['footer', 'footer', 'blog', 'popup', 'checkout', 'app']), createdAt: ago(now, i * 260 + Math.floor(r() * 200)), unsubscribedAt: i % 17 === 5 ? ago(now, i * 100) : null }));
}

/** Datos de cursos de la semilla en forma de filas de BD (módulos, lecciones, quizzes). */
export function demoCourseTree(courseId: string) {
  const c = seedCourses.find((x) => x.id === courseId);
  if (!c) return null;
  return {
    modules: c.modules.map((m, mi) => ({
      id: childId(c.id, 2, mi),
      title: m.title,
      position: mi,
      lessons: m.lessons.map((l, li) => ({ id: childId(c.id, 3, mi, li), title: l.title, summary: l.summary, content: l.content ?? '', videoUrl: '', videoProvider: 'mp4' as const, durationS: l.durationS, isPreview: Boolean(l.isPreview), resources: [] as { label: string; url: string }[], position: li })),
      quiz: m.quiz ? { id: childId(c.id, 4, mi), title: m.quiz.title, passScore: 70, questions: m.quiz.questions.map((q, qi) => ({ id: childId(c.id, 5, mi, qi), prompt: q.prompt, options: [...q.options], correctIndex: q.correctIndex, explanation: q.explanation })) } : null,
    })),
  };
}

export { weekOf, monthlyValue };
