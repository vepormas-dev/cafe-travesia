import { apiUser } from '@/lib/auth';
import { getOrder } from '@/lib/account';
import { apiError, handle, json } from '@/lib/api';

/** GET /api/v1/orders/:id (id o número CT-…) → { order: OrderDTO } */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle('orders.get', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const order = await getOrder(user.id, id);
    if (!order) return apiError('Pedido no encontrado', 404);
    return json({ order }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
