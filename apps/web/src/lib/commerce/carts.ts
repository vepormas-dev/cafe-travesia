import 'server-only';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { formatCOP, type CartLineInput } from '@travesia/shared';
import { getDb, t } from '@/lib/db';
import { env } from '@/lib/env';
import { sendEmail, layout } from '@/lib/email';
import { notifyUser } from '@/lib/push';

/** Guarda el carrito del usuario (sincronía web ↔ app y recuperación). */
export async function saveCart(userId: string, email: string, items: CartLineInput[], subtotalCop: number) {
  await getDb()
    .insert(t.carts)
    .values({ userId, email, items, subtotalCop })
    .onDuplicateKeyUpdate({ set: { items, subtotalCop, email, remindedAt: null, recoveredOrderId: null } });
}

export async function getCart(userId: string) {
  const [c] = await getDb().select().from(t.carts).where(eq(t.carts.userId, userId)).limit(1);
  return c?.items ?? [];
}

/** Cron diario: recuerda carritos abandonados (entre 4 h y 3 días, una sola vez). */
export async function recoverAbandonedCarts() {
  const db = getDb();
  const rows = await db
    .select()
    .from(t.carts)
    .where(
      and(
        isNull(t.carts.remindedAt),
        isNull(t.carts.recoveredOrderId),
        gt(t.carts.subtotalCop, 0),
        lt(t.carts.updatedAt, new Date(Date.now() - 4 * 3600000)),
        gt(t.carts.updatedAt, new Date(Date.now() - 3 * 86400000)),
      ),
    )
    .limit(100);
  for (const c of rows) {
    if (!c.email) continue;
    await sendEmail(
      c.email,
      'Tu café te está esperando ☕',
      layout({
        title: 'Dejaste algo en tu carrito',
        body: `<p>Guardamos tu carrito por ${formatCOP(c.subtotalCop)}. Tostamos cada semana: termina tu pedido y lo despachamos recién tostado.</p>`,
        cta: { label: 'Volver a mi carrito', href: `${env.siteUrl}/tienda/carrito` },
      }),
    );
    if (c.userId) await notifyUser(c.userId, { title: 'Tu carrito te espera ☕', body: 'Termina tu pedido y te lo enviamos recién tostado.', deepLink: '/tienda/carrito' }, 'cart_reminder');
    await db.update(t.carts).set({ remindedAt: new Date(), updatedAt: sql`${t.carts.updatedAt}` }).where(eq(t.carts.id, c.id));
  }
  return rows.length;
}
