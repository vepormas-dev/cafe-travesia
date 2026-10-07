import 'server-only';
import { and, eq, lt } from 'drizzle-orm';
import { getDb, t, isDuplicateError } from '@/lib/db';
import { findTransactionByReference, getTransaction, type WompiTransaction } from '@/lib/wompi';
import { logEvent } from '@/lib/monitor';
import { markOrderFailed, markOrderPaid } from './orders';
import { applySubscriptionCharge } from './subscriptions';

/**
 * Aplica una transacción de Wompi (webhook, verificación de retorno o conciliación).
 * Referencias: "CT-…" → pedido · "SUB-<chargeId>" → cobro de suscripción.
 */
export async function applyWompiTransaction(tx: WompiTransaction, source: 'webhook' | 'return' | 'reconcile', signatureOk = true) {
  const db = getDb();
  try {
    await db.insert(t.paymentEvents).values({
      provider: 'wompi',
      event: `transaction.${source}`,
      externalId: tx.id,
      reference: tx.reference,
      status: tx.status,
      signatureOk,
      payload: tx,
    });
  } catch (e) {
    if (isDuplicateError(e)) return { duplicate: true }; // mismo evento ya aplicado
    throw e;
  }

  if (tx.reference.startsWith('SUB-')) {
    await applySubscriptionCharge(tx.reference.slice(4), tx.status, tx.id, tx.status_message ?? null);
    return { kind: 'subscription' as const };
  }
  const [order] = await db.select().from(t.orders).where(eq(t.orders.wompiReference, tx.reference)).limit(1);
  if (!order) {
    await logEvent('wompi', 'transaction.unknown_reference', 'ignored', { externalId: tx.id, message: tx.reference });
    return { kind: 'unknown' as const };
  }
  // Monto: nunca aprobar si no coincide con el total del pedido
  if (tx.status === 'APPROVED' && tx.amount_in_cents !== order.totalCop * 100) {
    await logEvent('wompi', 'transaction.amount_mismatch', 'error', { externalId: tx.id, message: `${order.number}: ${tx.amount_in_cents} ≠ ${order.totalCop * 100}` });
    return { kind: 'order' as const, error: 'amount_mismatch' };
  }
  const method = tx.payment_method_type + (tx.payment_method?.extra?.last_four ? ` ·· ${tx.payment_method.extra.last_four}` : '');
  if (tx.status === 'APPROVED') await markOrderPaid(order.id, { method, transactionId: tx.id });
  else if (tx.status === 'DECLINED' || tx.status === 'ERROR') await markOrderFailed(order.id, 'failed', tx.status_message ?? tx.status);
  else if (tx.status === 'VOIDED') await markOrderFailed(order.id, 'cancelled', 'Transacción anulada');
  return { kind: 'order' as const, orderId: order.id, status: tx.status };
}

/** Verifica una transacción contra la API de Wompi (no confía en el navegador). */
export async function verifyTransaction(transactionId: string) {
  const tx = await getTransaction(transactionId);
  if (tx.status !== 'PENDING') await applyWompiTransaction(tx, 'return');
  return tx;
}

/**
 * Cron de conciliación: pedidos pendientes con más de 15 min se consultan en Wompi
 * por si el webhook no llegó. Pendientes de más de 48 h se cancelan.
 */
export async function reconcilePendingOrders() {
  const db = getDb();
  const stale = await db
    .select({ id: t.orders.id, tx: t.orders.wompiTransactionId, reference: t.orders.wompiReference, createdAt: t.orders.createdAt })
    .from(t.orders)
    .where(and(eq(t.orders.status, 'pending'), lt(t.orders.createdAt, new Date(Date.now() - 15 * 60000))))
    .limit(50);
  let fixed = 0;
  for (const o of stale) {
    try {
      const tx = o.tx ? await getTransaction(o.tx) : await findTransactionByReference(o.reference);
      if (tx && tx.status !== 'PENDING') {
        await applyWompiTransaction(tx, 'reconcile');
        fixed++;
      }
    } catch {
      /* sigue pendiente */
    }
    if (Date.now() - o.createdAt.getTime() > 48 * 3600000) await markOrderFailed(o.id, 'cancelled', 'Sin pago en 48 h');
  }
  // Cobros de suscripción pendientes
  const charges = await db
    .select({ id: t.subscriptionCharges.id, tx: t.subscriptionCharges.wompiTransactionId })
    .from(t.subscriptionCharges)
    .where(and(eq(t.subscriptionCharges.status, 'pending'), lt(t.subscriptionCharges.createdAt, new Date(Date.now() - 15 * 60000))))
    .limit(50);
  for (const c of charges) {
    if (!c.tx) continue;
    try {
      const tx = await getTransaction(c.tx);
      if (tx.status !== 'PENDING') await applyWompiTransaction(tx, 'reconcile');
    } catch {
      /* ignore */
    }
  }
  return { stale: stale.length, fixed };
}

