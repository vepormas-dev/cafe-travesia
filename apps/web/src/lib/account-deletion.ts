import 'server-only';
/**
 * Eliminación de cuenta (requisito de App Store / Google Play y derecho de supresión, Ley 1581 de 2012).
 *  - Borra datos personales no necesarios: direcciones, dispositivos, carrito, notas, notificaciones, reseñas pendientes.
 *  - Cancela suscripciones y anula la tarjeta guardada en Wompi.
 *  - Los PEDIDOS se conservan por obligación contable/tributaria (soporte de ventas), pero se
 *    desvinculan de la cuenta; los certificados emitidos se revocan.
 *  - El usuario de MySQL se anonimiza y la identidad de Firebase se elimina.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { atomic, getDb, t } from '@/lib/db';
import { adminAuth } from '@/lib/firebase/admin';
import { voidPaymentSource } from '@/lib/wompi';
import { audit, logEvent } from '@/lib/monitor';
import { sendEmail, layout } from '@/lib/email';

export async function deleteAccount(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(t.users).where(eq(t.users.id, userId)).limit(1);
  if (!user) return;
  const subs = await db
    .select({ id: t.subscriptions.id, source: t.subscriptions.wompiPaymentSourceId })
    .from(t.subscriptions)
    .where(and(eq(t.subscriptions.userId, userId), inArray(t.subscriptions.status, ['pending', 'active', 'paused', 'past_due'])));
  for (const s of subs) if (s.source) await voidPaymentSource(s.source).catch(() => undefined);

  const now = new Date();
  await atomic([
    db.update(t.subscriptions).set({ status: 'cancelled', cancelledAt: now, cancelReason: 'Cuenta eliminada', nextBillingAt: null, wompiPaymentSourceId: null, address: null }).where(eq(t.subscriptions.userId, userId)),
    db.delete(t.addresses).where(eq(t.addresses.userId, userId)),
    db.delete(t.pushTokens).where(eq(t.pushTokens.userId, userId)),
    db.delete(t.carts).where(eq(t.carts.userId, userId)),
    db.delete(t.lessonNotes).where(eq(t.lessonNotes.userId, userId)),
    db.delete(t.notifications).where(eq(t.notifications.userId, userId)),
    db.delete(t.productReviews).where(and(eq(t.productReviews.userId, userId), eq(t.productReviews.status, 'pending'))),
    db.update(t.certificates).set({ revokedAt: now, holderName: 'Titular eliminado' }).where(eq(t.certificates.userId, userId)),
    db.update(t.enrollments).set({ status: 'revoked' }).where(eq(t.enrollments.userId, userId)),
    db.update(t.orders).set({ userId: null }).where(eq(t.orders.userId, userId)),
    db.update(t.chatSessions).set({ userId: null, email: null, name: null }).where(eq(t.chatSessions.userId, userId)),
    db
      .update(t.users)
      .set({
        firebaseUid: `deleted-${userId}`,
        email: `deleted-${userId}@cuenta-eliminada.invalid`,
        fullName: null,
        phone: null,
        avatarUrl: null,
        legalId: null,
        legalIdType: null,
        marketingOptIn: false,
        loyaltyPoints: 0,
        role: 'customer',
        disabledAt: now,
      })
      .where(eq(t.users.id, userId)),
  ]);
  await adminAuth()
    .deleteUser(user.firebaseUid)
    .catch((e) => logEvent('auth', 'account.delete.firebase', 'error', { message: String(e) }));
  await db.insert(t.newsletterSubscribers).ignore().values({ email: user.email, source: 'baja' }).catch(() => undefined);
  await db.update(t.newsletterSubscribers).set({ unsubscribedAt: now }).where(eq(t.newsletterSubscribers.email, user.email));
  await audit(userId, 'account.delete', 'users', userId);
  await logEvent('auth', 'account.delete', 'ok', { externalId: userId });
  void sendEmail(
    user.email,
    'Eliminamos tu cuenta de Café Travesía',
    layout({
      title: 'Tu cuenta fue eliminada',
      body: '<p>Eliminamos tu cuenta y tus datos personales, cancelamos tus suscripciones y anulamos tus tarjetas guardadas. Conservamos solo el registro de tus compras, como exige la ley contable colombiana.</p><p>Si no fuiste tú, responde este correo de inmediato.</p>',
    }),
  );
}
