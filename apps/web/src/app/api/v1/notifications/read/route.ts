import { z } from 'zod';
import { apiUser } from '@/lib/auth';
import { markNotificationsRead } from '@/lib/account';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';

const schema = z.object({ ids: z.array(z.string().min(1).max(36)).max(200).optional() });

/** POST /api/v1/notifications/read { ids? } → sin ids marca todas */
export async function POST(req: Request) {
  return handle('notifications.read', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const [input, err] = await parseBody(req, schema);
    if (err) return err;
    await markNotificationsRead(user.id, input.ids);
    return json({ ok: true });
  });
}
