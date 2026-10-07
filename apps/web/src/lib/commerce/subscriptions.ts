import 'server-only';
/**
 * Suscripciones de café con cobro recurrente (fuente de pago Wompi).
 * Ciclo: alta → 1er cobro → (webhook APPROVED) activa + pedido de despacho → cron cobra
 * en next_billing_at → reintentos (día 2 y 5) → past_due → cancelación tras 3 fallos.
 */
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { addWeeks, FREQUENCY_LABEL, formatCOP, formatDate, orderNumber, type SubscribeInput } from '@travesia/shared';
import { atomic, getDb, t } from '@/lib/db';
import { env } from '@/lib/env';
import type { SessionUser } from '@/lib/auth';
import { chargePaymentSource, createPaymentSource, voidPaymentSource } from '@/lib/wompi';
import { sendEmail, layout, escapeHtml } from '@/lib/email';
import { notifyUser } from '@/lib/push';
import { logEvent } from '@/lib/monitor';

const RETRY_DAYS = [2, 3]; // tras el 1er fallo +2 días, tras el 2º +3 días; al 3º se cancela
const DAY = 86400000;

export async function createSubscription(input: SubscribeInput, user: SessionUser) {
  const db = getDb();
  const [plan] = await db.select().from(t.subscriptionPlans).where(and(eq(t.subscriptionPlans.id, input.planId), eq(t.subscriptionPlans.isActive, true))).limit(1);
  if (!plan) throw new Error('El plan ya no está disponible.');
  const [active] = await db
    .select({ id: t.subscriptions.id })
    .from(t.subscriptions)
    .where(and(eq(t.subscriptions.userId, user.id), eq(t.subscriptions.planId, plan.id), inArray(t.subscriptions.status, ['active', 'paused', 'past_due', 'pending'])))
    .limit(1);
  if (active) throw new Error('Ya tienes una suscripción a este plan. Adminístrala desde tu cuenta.');

  const source = await createPaymentSource({
    cardToken: input.cardToken,
    email: user.email,
    acceptanceToken: input.acceptanceToken,
    personalAuthToken: input.personalAuthToken,
  });
  if (source.status !== 'AVAILABLE') throw new Error('La tarjeta no pudo registrarse. Verifica los datos o usa otra tarjeta.');

  const id = crypto.randomUUID();
  await db.insert(t.subscriptions).values({
    id,
    userId: user.id,
    planId: plan.id,
    productId: input.productId ?? null,
    grind: input.grind,
    status: 'pending',
    priceCop: plan.priceCop,
    address: input.address,
    wompiPaymentSourceId: String(source.id),
    cardBrand: source.public_data?.brand ?? null,
    cardLast4: source.public_data?.last_four ?? null,
    nextBillingAt: new Date(),
  });
  // Datos del cliente para facturación
  await db
    .update(t.users)
    .set({ fullName: input.customer.fullName, phone: input.customer.phone, legalIdType: input.customer.legalIdType, legalId: input.customer.legalId })
    .where(eq(t.users.id, user.id));
  const charge = await chargeSubscription(id);
  return { subscriptionId: id, chargeStatus: charge?.status ?? 'pending' };
}

/** Cobra un ciclo. El resultado definitivo llega por webhook (applySubscriptionCharge). */
export async function chargeSubscription(subscriptionId: string) {
  const db = getDb();
  const [sub] = await db.select().from(t.subscriptions).where(eq(t.subscriptions.id, subscriptionId)).limit(1);
  if (!sub || !sub.wompiPaymentSourceId || sub.status === 'cancelled' || sub.status === 'paused') return null;
  const [user] = await db.select().from(t.users).where(eq(t.users.id, sub.userId)).limit(1);
  const chargeId = crypto.randomUUID();
  const reference = `SUB-${chargeId}`;
  await db.insert(t.subscriptionCharges).values({ id: chargeId, subscriptionId, amountCop: sub.priceCop, status: 'pending', attempt: sub.failedAttempts + 1 });
  // Evitar doble cobro si el cron corre en paralelo: mover next_billing_at a futuro de inmediato
  await db.update(t.subscriptions).set({ nextBillingAt: new Date(Date.now() + DAY) }).where(eq(t.subscriptions.id, subscriptionId));
  try {
    const tx = await chargePaymentSource({ paymentSourceId: sub.wompiPaymentSourceId, amountCop: sub.priceCop, reference, email: user!.email });
    await db.update(t.subscriptionCharges).set({ wompiTransactionId: tx.id }).where(eq(t.subscriptionCharges.id, chargeId));
    if (tx.status !== 'PENDING') await applySubscriptionCharge(chargeId, tx.status, tx.id, tx.status_message ?? null);
    return { chargeId, status: tx.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await applySubscriptionCharge(chargeId, 'ERROR', null, msg);
    return { chargeId, status: 'ERROR' as const };
  }
}

/** Aplica el resultado de un cobro de suscripción (idempotente). */
export async function applySubscriptionCharge(chargeId: string, status: string, transactionId: string | null, message: string | null) {
  const db = getDb();
  const final = status === 'APPROVED' ? 'approved' : status === 'DECLINED' || status === 'VOIDED' ? 'declined' : status === 'ERROR' ? 'error' : null;
  if (!final) return;
  const lock = await db
    .update(t.subscriptionCharges)
    .set({ status: final, wompiTransactionId: transactionId ?? undefined, error: message?.slice(0, 500) ?? null })
    .where(and(eq(t.subscriptionCharges.id, chargeId), eq(t.subscriptionCharges.status, 'pending')));
  if ((lock as unknown as [{ affectedRows: number }])[0]?.affectedRows === 0) return;
  const [charge] = await db.select().from(t.subscriptionCharges).where(eq(t.subscriptionCharges.id, chargeId)).limit(1);
  const [sub] = await db.select().from(t.subscriptions).where(eq(t.subscriptions.id, charge!.subscriptionId)).limit(1);
  const [plan] = await db.select().from(t.subscriptionPlans).where(eq(t.subscriptionPlans.id, sub!.planId)).limit(1);
  const [user] = await db.select().from(t.users).where(eq(t.users.id, sub!.userId)).limit(1);
  if (!sub || !plan || !user) return;

  if (final === 'approved') {
    const next = addWeeks(new Date(), plan.frequencyWeeks);
    const orderId = crypto.randomUUID();
    const number = orderNumber();
    const [product] = sub.productId ? await db.select().from(t.products).where(eq(t.products.id, sub.productId)).limit(1) : [];
    const ops = [
      db.update(t.subscriptions).set({ status: 'active', failedAttempts: 0, nextBillingAt: next, startedAt: sub.startedAt ?? new Date() }).where(eq(t.subscriptions.id, sub.id)),
      db.insert(t.orders).values({
        id: orderId,
        number,
        userId: user.id,
        email: user.email,
        customerName: user.fullName ?? user.email,
        phone: user.phone,
        legalIdType: user.legalIdType,
        legalId: user.legalId,
        kind: 'subscription',
        channel: 'web',
        status: 'paid',
        subtotalCop: charge!.amountCop,
        totalCop: charge!.amountCop,
        requiresShipping: true,
        shippingAddress: sub.address,
        paymentMethod: 'CARD (recurrente)',
        wompiReference: `SUB-${chargeId}`,
        wompiTransactionId: transactionId,
        subscriptionId: sub.id,
        paidAt: new Date(),
      }),
      db.insert(t.orderItems).values({
        orderId,
        itemKind: 'plan',
        planId: plan.id,
        productId: sub.productId,
        name: `Suscripción ${plan.name}`,
        variantName: `${plan.bagsPerDelivery} × ${plan.bagWeightG} g · ${product?.name ?? 'Selección del tostador'} · ${sub.grind}`,
        imageUrl: product?.imageUrl ?? plan.imageUrl,
        unitPriceCop: charge!.amountCop,
        quantity: 1,
        totalCop: charge!.amountCop,
      }),
      db.update(t.subscriptionCharges).set({ orderId }).where(eq(t.subscriptionCharges.id, chargeId)),
    ];
    await atomic(ops);
    if (plan.includesAcademy) await enrollSubscriberInCourses(user.id);
    void sendEmail(
      user.email,
      `Suscripción ${plan.name}: cobro aprobado`,
      layout({
        title: sub.startedAt ? 'Renovamos tu suscripción ☕' : '¡Bienvenido a tu suscripción!',
        body: `<p>Cobramos ${formatCOP(charge!.amountCop)} de tu plan <strong>${escapeHtml(plan.name)}</strong> (${FREQUENCY_LABEL(plan.frequencyWeeks).toLowerCase()}). Tu café se tuesta y despacha en máximo 48 horas.</p><p>Próximo cobro: <strong>${formatDate(next)}</strong>. Puedes pausar, saltar un envío o cancelar cuando quieras.</p>`,
        cta: { label: 'Gestionar mi suscripción', href: `${env.siteUrl}/cuenta/suscripcion` },
      }),
    );
    void notifyUser(user.id, { title: 'Suscripción renovada ☕', body: `Tu café del plan ${plan.name} ya se está tostando.`, deepLink: '/cuenta/suscripcion' }, 'subscription');
    await logEvent('wompi', 'subscription.charge', 'ok', { externalId: sub.id, message: formatCOP(charge!.amountCop) });
  } else {
    const attempts = sub.failedAttempts + 1;
    const cancel = attempts > RETRY_DAYS.length;
    const retryAt = cancel ? null : new Date(Date.now() + RETRY_DAYS[attempts - 1]! * DAY);
    await db
      .update(t.subscriptions)
      .set({
        status: cancel ? 'cancelled' : sub.status === 'pending' ? 'pending' : 'past_due',
        failedAttempts: attempts,
        nextBillingAt: retryAt,
        cancelledAt: cancel ? new Date() : null,
        cancelReason: cancel ? 'Cobro rechazado 3 veces' : sub.cancelReason,
      })
      .where(eq(t.subscriptions.id, sub.id));
    void sendEmail(
      user.email,
      cancel ? 'Tu suscripción fue cancelada' : 'No pudimos cobrar tu suscripción',
      layout({
        title: cancel ? 'Cancelamos tu suscripción' : 'Hubo un problema con tu tarjeta',
        body: cancel
          ? '<p>Intentamos cobrar tu suscripción 3 veces sin éxito, así que la cancelamos. Puedes volver a suscribirte cuando quieras.</p>'
          : `<p>Tu banco rechazó el cobro (${escapeHtml(message ?? 'sin detalle')}). Lo intentaremos de nuevo el <strong>${formatDate(retryAt!)}</strong>. Si quieres, actualiza tu tarjeta.</p>`,
        cta: { label: cancel ? 'Ver planes' : 'Actualizar mi tarjeta', href: `${env.siteUrl}${cancel ? '/suscripciones' : '/cuenta/suscripcion'}` },
      }),
    );
    void notifyUser(user.id, { title: cancel ? 'Suscripción cancelada' : 'Revisa tu medio de pago', body: cancel ? 'No pudimos cobrar tu plan.' : 'Tu banco rechazó el cobro de tu suscripción.', deepLink: '/cuenta/suscripcion' }, 'subscription');
    await logEvent('wompi', 'subscription.charge', 'error', { externalId: sub.id, message: message ?? status });
  }
}

/** Inscribe al suscriptor (plan con Academia) en todos los cursos incluidos. */
export async function enrollSubscriberInCourses(userId: string) {
  const db = getDb();
  const courses = await db.select({ id: t.courses.id }).from(t.courses).where(and(eq(t.courses.includedInSubscription, true), eq(t.courses.isPublished, true)));
  if (!courses.length) return;
  await db
    .insert(t.enrollments)
    .values(courses.map((c) => ({ userId, courseId: c.id, source: 'subscription' as const })))
    .onDuplicateKeyUpdate({ set: { status: sql`IF(${t.enrollments.status} = 'revoked', 'active', ${t.enrollments.status})` } });
}

/** Cron: cobra suscripciones vencidas y reactiva las pausas cumplidas. */
export async function runSubscriptionBilling() {
  const db = getDb();
  const now = new Date();
  await db
    .update(t.subscriptions)
    .set({ status: 'active', pausedUntil: null })
    .where(and(eq(t.subscriptions.status, 'paused'), lte(t.subscriptions.pausedUntil, now)));
  const due = await db
    .select({ id: t.subscriptions.id })
    .from(t.subscriptions)
    .where(and(inArray(t.subscriptions.status, ['active', 'past_due']), lte(t.subscriptions.nextBillingAt, now)))
    .limit(100);
  let charged = 0;
  for (const s of due) {
    const r = await chargeSubscription(s.id);
    if (r) charged++;
  }
  return { due: due.length, charged };
}

export type SubscriptionAction =
  | { action: 'pause'; until?: string }
  | { action: 'resume' }
  | { action: 'skip' }
  | { action: 'cancel'; reason?: string }
  | { action: 'change_plan'; planId: string }
  | { action: 'change_coffee'; productId: string; grind?: string }
  | { action: 'change_address'; address: Record<string, unknown> };

/** Acciones del cliente (o del admin) sobre una suscripción. */
export async function updateSubscription(subscriptionId: string, userId: string | null, a: SubscriptionAction) {
  const db = getDb();
  const [sub] = await db.select().from(t.subscriptions).where(eq(t.subscriptions.id, subscriptionId)).limit(1);
  if (!sub || (userId && sub.userId !== userId)) throw new Error('Suscripción no encontrada');
  if (sub.status === 'cancelled') throw new Error('Esta suscripción ya fue cancelada.');
  const [plan] = await db.select().from(t.subscriptionPlans).where(eq(t.subscriptionPlans.id, sub.planId)).limit(1);
  switch (a.action) {
    case 'pause': {
      const until = a.until ? new Date(`${a.until}T12:00:00Z`) : new Date(Date.now() + 30 * DAY);
      await db.update(t.subscriptions).set({ status: 'paused', pausedUntil: until, nextBillingAt: until }).where(eq(t.subscriptions.id, sub.id));
      break;
    }
    case 'resume':
      await db.update(t.subscriptions).set({ status: 'active', pausedUntil: null, nextBillingAt: sub.nextBillingAt && sub.nextBillingAt > new Date() ? sub.nextBillingAt : new Date(Date.now() + DAY) }).where(eq(t.subscriptions.id, sub.id));
      break;
    case 'skip': {
      const base = sub.nextBillingAt && sub.nextBillingAt > new Date() ? sub.nextBillingAt : new Date();
      await db.update(t.subscriptions).set({ nextBillingAt: addWeeks(base, plan?.frequencyWeeks ?? 4) }).where(eq(t.subscriptions.id, sub.id));
      break;
    }
    case 'cancel':
      await db.update(t.subscriptions).set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: a.reason ?? 'Cancelada por el cliente', nextBillingAt: null }).where(eq(t.subscriptions.id, sub.id));
      if (sub.wompiPaymentSourceId) await voidPaymentSource(sub.wompiPaymentSourceId).catch((e) => logEvent('wompi', 'payment_source.void', 'error', { message: String(e) }));
      break;
    case 'change_plan': {
      const [np] = await db.select().from(t.subscriptionPlans).where(and(eq(t.subscriptionPlans.id, a.planId), eq(t.subscriptionPlans.isActive, true))).limit(1);
      if (!np) throw new Error('Plan no disponible');
      await db.update(t.subscriptions).set({ planId: np.id, priceCop: np.priceCop }).where(eq(t.subscriptions.id, sub.id));
      if (np.includesAcademy) await enrollSubscriberInCourses(sub.userId);
      break;
    }
    case 'change_coffee':
      await db.update(t.subscriptions).set({ productId: a.productId, grind: a.grind ?? sub.grind }).where(eq(t.subscriptions.id, sub.id));
      break;
    case 'change_address':
      await db.update(t.subscriptions).set({ address: a.address as never }).where(eq(t.subscriptions.id, sub.id));
      break;
  }
  await logEvent('system', `subscription.${a.action}`, 'ok', { externalId: sub.id });
}
