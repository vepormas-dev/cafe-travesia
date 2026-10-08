import 'server-only';
/**
 * Pedidos: creación, confirmación de pago (idempotente) y cambios de estado.
 * La confirmación llega por el webhook de Wompi (fuente de verdad) y, como respaldo,
 * por la verificación de la página de resultado y el cron de conciliación.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { formatCOP, orderNumber, ORDER_STATUS_LABEL, type CheckoutInput, type CheckoutResultDTO } from '@travesia/shared';
import { atomic, getDb, t, type AtomicQuery } from '@/lib/db';
import { env } from '@/lib/env';
import type { SessionUser } from '@/lib/auth';
import { checkoutData } from '@/lib/wompi';
import { sendEmail, layout, itemsTable, escapeHtml } from '@/lib/email';
import { notifyUser } from '@/lib/push';
import { logEvent } from '@/lib/monitor';
import { assertStock, CartError, quote } from './cart';

const affected = (r: unknown) => (r as [{ affectedRows: number }])[0]?.affectedRows ?? 0;

export async function createOrder(input: CheckoutInput, user: SessionUser | null): Promise<CheckoutResultDTO> {
  const db = getDb();
  const email = input.customer.email.toLowerCase();
  const { lines, totals, coupon } = await quote({
    items: input.items,
    region: input.address?.region,
    city: input.address?.city,
    couponCode: input.couponCode,
    email,
    redeemPoints: user ? input.redeemPoints : 0,
    availablePoints: user?.loyaltyPoints ?? 0,
  });
  if (input.channel === 'app' && lines.some((l) => l.kind === 'course')) {
    throw new CartError('Los cursos se compran en cafetravesia.com. Ábrelos en el navegador.', 'invalid');
  }
  if (coupon && !coupon.ok) throw new CartError(coupon.error, 'coupon');
  if (totals.requiresShipping && !input.address) throw new CartError('Agrega la dirección de envío.', 'invalid');
  if (totals.requiresShipping && !totals.zone) throw new CartError('Aún no hacemos envíos a esa ciudad. Escríbenos.', 'invalid');
  await assertStock(lines);

  // Cursos ya comprados por el usuario → evitar doble cobro
  if (user && lines.some((l) => l.kind === 'course')) {
    const owned = await db
      .select({ courseId: t.enrollments.courseId })
      .from(t.enrollments)
      .where(and(eq(t.enrollments.userId, user.id), inArray(t.enrollments.courseId, lines.filter((l) => l.courseId).map((l) => l.courseId!))));
    if (owned.length) throw new CartError('Ya tienes acceso a uno de los cursos del carrito. Quítalo para continuar.', 'invalid');
  }

  const id = crypto.randomUUID();
  const number = orderNumber();
  const reference = `${number}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const kinds = new Set(lines.map((l) => l.kind));
  const kind = kinds.size > 1 ? 'mixed' : kinds.has('course') ? 'course' : 'store';
  const pointsRedeemed = totals.pointsDiscountCop / 10;

  await atomic([
    db.insert(t.orders).values({
      id,
      number,
      userId: user?.id ?? null,
      email,
      customerName: input.customer.fullName,
      phone: input.customer.phone,
      legalIdType: input.customer.legalIdType,
      legalId: input.customer.legalId,
      kind,
      channel: input.channel,
      status: 'pending',
      subtotalCop: totals.subtotalCop,
      discountCop: totals.discountCop + totals.pointsDiscountCop,
      shippingCop: totals.shippingCop,
      totalCop: totals.totalCop,
      couponCode: coupon?.ok ? coupon.coupon.code : null,
      pointsRedeemed,
      pointsEarned: totals.pointsToEarn,
      requiresShipping: totals.requiresShipping,
      shippingAddress: input.address ?? null,
      wompiReference: reference,
      notes: input.notes ?? null,
      utm: input.utm ?? null,
    }),
    db.insert(t.orderItems).values(
      lines.map((l) => ({
        orderId: id,
        itemKind: l.kind,
        productId: l.productId,
        variantId: l.variantId,
        courseId: l.courseId,
        name: l.name,
        variantName: l.variantName,
        imageUrl: l.imageUrl,
        unitPriceCop: l.unitPriceCop,
        quantity: l.quantity,
        totalCop: l.unitPriceCop * l.quantity,
      })),
    ),
  ]);

  if (totals.totalCop === 0) {
    await markOrderPaid(id, { method: 'GRATIS', transactionId: null });
    return { orderId: id, number, totalCop: 0, wompi: null, paid: true };
  }
  const wompi = checkoutData(reference, totals.totalCop, `/tienda/pago?pedido=${id}`, { email, fullName: input.customer.fullName, phone: input.customer.phone });
  return { orderId: id, number, totalCop: totals.totalCop, wompi, paid: false };
}

/**
 * Marca un pedido como pagado y aplica TODOS sus efectos una sola vez:
 * stock, inscripciones a cursos, cupón, puntos, carrito, correos y push.
 */
export async function markOrderPaid(orderId: string, payment: { method: string | null; transactionId: string | null }) {
  const db = getDb();
  const lock = await db
    .update(t.orders)
    .set({ status: 'paid', paidAt: new Date(), paymentMethod: payment.method, wompiTransactionId: payment.transactionId })
    .where(and(eq(t.orders.id, orderId), inArray(t.orders.status, ['pending', 'failed'])));
  if (affected(lock) === 0) return false; // ya procesado (webhook duplicado / reintento)

  const [order] = await db.select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1);
  const items = await db.select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId));
  if (!order) return false;

  // Usuario: el de la sesión o uno existente con el mismo correo (compra como invitado)
  let userId = order.userId;
  if (!userId) {
    const [u] = await db.select({ id: t.users.id }).from(t.users).where(eq(t.users.email, order.email)).limit(1);
    if (u) {
      userId = u.id;
      await db.update(t.orders).set({ userId }).where(eq(t.orders.id, orderId));
    }
  }

  const effects: AtomicQuery[] = [
    ...items
      .filter((i) => i.variantId)
      .map((i) => db.update(t.productVariants).set({ stock: sql`GREATEST(${t.productVariants.stock} - ${i.quantity}, 0)` }).where(eq(t.productVariants.id, i.variantId!))),
  ];
  if (order.couponCode) {
    const [c] = await db.select({ id: t.coupons.id }).from(t.coupons).where(eq(t.coupons.code, order.couponCode)).limit(1);
    if (c) {
      effects.push(db.update(t.coupons).set({ uses: sql`${t.coupons.uses} + 1` }).where(eq(t.coupons.id, c.id)));
      effects.push(db.insert(t.couponRedemptions).ignore().values({ couponId: c.id, orderId, userId, email: order.email, discountCop: order.discountCop }));
    }
  }
  if (userId) {
    for (const i of items.filter((x) => x.courseId)) {
      effects.push(
        db
          .insert(t.enrollments)
          .values({ userId, courseId: i.courseId!, source: 'purchase', orderId })
          .onDuplicateKeyUpdate({ set: { status: 'active', orderId } }),
      );
    }
    const delta = order.pointsEarned - order.pointsRedeemed;
    if (order.pointsEarned) effects.push(db.insert(t.loyaltyLedger).ignore().values({ userId, points: order.pointsEarned, reason: 'Compra', orderId }));
    if (order.pointsRedeemed) effects.push(db.insert(t.loyaltyLedger).ignore().values({ userId, points: -order.pointsRedeemed, reason: 'Redención', orderId }));
    if (delta) effects.push(db.update(t.users).set({ loyaltyPoints: sql`GREATEST(${t.users.loyaltyPoints} + ${delta}, 0)` }).where(eq(t.users.id, userId)));
    effects.push(db.update(t.carts).set({ items: [], subtotalCop: 0, recoveredOrderId: orderId }).where(eq(t.carts.userId, userId)));
  }
  if (effects.length) {
    try {
      await atomic(effects);
    } catch (e) {
      // El pago quedó registrado; los efectos se pueden re-aplicar desde el panel
      await logEvent('system', 'order.effects', 'error', { externalId: order.number, message: e instanceof Error ? e.message : String(e) });
    }
  }

  await logEvent('wompi', 'order.paid', 'ok', { externalId: order.number, message: formatCOP(order.totalCop) });

  // Comunicaciones (no bloquean)
  const hasCourses = items.some((i) => i.courseId);
  const body = `<p>¡Gracias, ${escapeHtml(order.customerName.split(' ')[0] ?? '')}! Recibimos tu pago del pedido <strong>${order.number}</strong>.</p>
${order.requiresShipping ? '<p>Tostamos y despachamos en máximo 48 horas. Te avisaremos cuando salga con su número de guía.</p>' : ''}
${hasCourses ? `<p>Tus cursos ya están activos en la Academia${userId ? '' : ': crea tu cuenta con este mismo correo para acceder'}.</p>` : ''}
${itemsTable(items, [
  { label: 'Subtotal', value: order.subtotalCop },
  ...(order.discountCop ? [{ label: 'Descuentos', value: -order.discountCop }] : []),
  ...(order.requiresShipping ? [{ label: 'Envío', value: order.shippingCop }] : []),
  { label: 'Total', value: order.totalCop, strong: true },
])}`;
  void sendEmail(order.email, `Pedido ${order.number} confirmado ☕`, layout({ title: 'Tu pedido está confirmado', preheader: `Pedido ${order.number}`, body, cta: { label: hasCourses ? 'Ir a mis cursos' : 'Ver mi pedido', href: `${env.siteUrl}${hasCourses ? '/cuenta/cursos' : `/cuenta/pedidos/${order.id}`}` } }));
  if (env.smtp.adminNotify) void sendEmail(env.smtp.adminNotify, `Nuevo pedido ${order.number} · ${formatCOP(order.totalCop)}`, layout({ title: `Nuevo pedido ${order.number}`, body: `<p>${escapeHtml(order.customerName)} · ${escapeHtml(order.email)}</p>${itemsTable(items, [{ label: 'Total', value: order.totalCop, strong: true }])}`, cta: { label: 'Abrir en el panel', href: `${env.siteUrl}/admin/pedidos/${order.id}` } }));
  if (userId) void notifyUser(userId, { title: 'Pago confirmado ✅', body: `Tu pedido ${order.number} está confirmado.`, deepLink: `/cuenta/pedidos/${order.id}` }, 'order_paid');
  return true;
}

export async function markOrderFailed(orderId: string, status: 'failed' | 'cancelled', reason?: string) {
  const db = getDb();
  await db
    .update(t.orders)
    .set({ status, internalNotes: reason ? sql`CONCAT(COALESCE(${t.orders.internalNotes}, ''), ${`\n[pago] ${reason}`})` : undefined })
    .where(and(eq(t.orders.id, orderId), eq(t.orders.status, 'pending')));
}

/** Cambios de estado operativos desde el panel (preparación, envío, entrega, cancelación). */
export async function updateOrderStatus(
  orderId: string,
  next: 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded',
  data: { carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; internalNotes?: string | null } = {},
) {
  const db = getDb();
  const [order] = await db.select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1);
  if (!order) throw new Error('Pedido no encontrado');
  const now = new Date();
  await db
    .update(t.orders)
    .set({
      status: next,
      carrier: data.carrier ?? order.carrier,
      trackingNumber: data.trackingNumber ?? order.trackingNumber,
      trackingUrl: data.trackingUrl ?? order.trackingUrl,
      internalNotes: data.internalNotes ?? order.internalNotes,
      shippedAt: next === 'shipped' ? now : order.shippedAt,
      deliveredAt: next === 'delivered' ? now : order.deliveredAt,
      cancelledAt: next === 'cancelled' ? now : order.cancelledAt,
    })
    .where(eq(t.orders.id, orderId));
  // Devolver stock si se cancela un pedido ya pagado
  if ((next === 'cancelled' || next === 'refunded') && ['paid', 'preparing'].includes(order.status)) {
    const items = await db.select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId));
    const ops = items.filter((i) => i.variantId).map((i) => db.update(t.productVariants).set({ stock: sql`${t.productVariants.stock} + ${i.quantity}` }).where(eq(t.productVariants.id, i.variantId!)));
    if (ops.length) await atomic(ops);
  }
  if (next === 'shipped' || next === 'delivered') {
    const tracking = data.trackingNumber ?? order.trackingNumber;
    const carrier = data.carrier ?? order.carrier;
    const url = data.trackingUrl ?? order.trackingUrl;
    const title = next === 'shipped' ? 'Tu café va en camino 🚚' : 'Tu pedido fue entregado ☕';
    const text = next === 'shipped' ? `Tu pedido ${order.number} salió${carrier ? ` con ${carrier}` : ''}${tracking ? ` · guía ${tracking}` : ''}.` : `Tu pedido ${order.number} fue entregado. ¡Que lo disfrutes!`;
    void sendEmail(order.email, `${ORDER_STATUS_LABEL[next]} · ${order.number}`, layout({ title, body: `<p>${escapeHtml(text)}</p>${url ? `<p><a href="${url}">Rastrear envío</a></p>` : ''}`, cta: { label: 'Ver mi pedido', href: `${env.siteUrl}/cuenta/pedidos/${order.id}` } }));
    if (order.userId) void notifyUser(order.userId, { title, body: text, deepLink: `/cuenta/pedidos/${order.id}` }, next === 'shipped' ? 'order_shipped' : 'order_delivered');
  }
}
