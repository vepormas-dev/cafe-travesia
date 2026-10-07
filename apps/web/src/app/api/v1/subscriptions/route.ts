import { connection } from 'next/server';
import { apiUser } from '@/lib/auth';
import { listSubscriptions } from '@/lib/account';
import { apiError, handle, json } from '@/lib/api';

/** GET /api/v1/subscriptions → { subscriptions: SubscriptionDTO[] } */
export async function GET() {
  await connection();
  return handle('subscriptions.list', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    return json({ subscriptions: await listSubscriptions(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
