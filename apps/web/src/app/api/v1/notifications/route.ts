import { connection } from 'next/server';
import { apiUser } from '@/lib/auth';
import { listNotifications } from '@/lib/account';
import { apiError, handle, json } from '@/lib/api';

/** GET /api/v1/notifications → { notifications, unread } */
export async function GET() {
  await connection();
  return handle('notifications.list', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    return json(await listNotifications(user.id), { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
