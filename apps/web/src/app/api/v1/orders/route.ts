import { connection } from 'next/server';
import { apiUser } from '@/lib/auth';
import { listOrders } from '@/lib/account';
import { apiError, handle, json } from '@/lib/api';

/** GET /api/v1/orders → { orders: OrderDTO[] } */
export async function GET() {
  await connection();
  return handle('orders.list', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    return json({ orders: await listOrders(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
