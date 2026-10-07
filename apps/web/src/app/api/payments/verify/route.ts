import { eq } from 'drizzle-orm';
import { verifyTransaction } from '@/lib/commerce/payments';
import { apiError, handle, json } from '@/lib/api';
import { getDb, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';

/**
 * GET /api/payments/verify?id=<transactionId>&pedido=<orderId>
 * Usado por la página de resultado (Wompi redirige con ?id=). Consulta Wompi en el
 * servidor y devuelve el estado del pedido; nunca confía en datos del navegador.
 */
export async function GET(req: Request) {
  return handle('payments.verify', async () => {
    if (isDemoMode()) return apiError('Modo demo', 503);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const orderId = url.searchParams.get('pedido');
    let txStatus: string | null = null;
    if (id) {
      try {
        txStatus = (await verifyTransaction(id)).status;
      } catch {
        txStatus = null;
      }
    }
    if (!orderId) return json({ transactionStatus: txStatus });
    const [o] = await getDb()
      .select({ id: t.orders.id, number: t.orders.number, status: t.orders.status, totalCop: t.orders.totalCop, email: t.orders.email, kind: t.orders.kind })
      .from(t.orders)
      .where(eq(t.orders.id, orderId))
      .limit(1);
    if (!o) return apiError('Pedido no encontrado', 404);
    return json({ transactionStatus: txStatus, order: { id: o.id, number: o.number, status: o.status, totalCop: o.totalCop, kind: o.kind, emailHint: o.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') } });
  });
}
