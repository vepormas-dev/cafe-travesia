import { connection } from 'next/server';
import { apiUser } from '@/lib/auth';
import { getLoyalty } from '@/lib/account';
import { apiError, handle, json } from '@/lib/api';

/** GET /api/v1/loyalty → { points, ledger: { points, reason, createdAt }[] } */
export async function GET() {
  await connection();
  return handle('loyalty.get', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    return json(await getLoyalty(user.id), { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
