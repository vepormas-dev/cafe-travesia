import { eq } from 'drizzle-orm';
import { pushRegisterSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { getDb, t } from '@/lib/db';
import { demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';

/** POST: registra/actualiza el token Expo del dispositivo (con o sin sesión). */
export async function POST(req: Request) {
  return handle('push.register', async () => {
    const limited = await rateLimit(req, 'push-register', 20, 60);
    if (limited) return limited;
    if (isDemoMode()) return demoBlocked();
    const [input, err] = await parseBody(req, pushRegisterSchema);
    if (err) return err;
    const user = await apiUser();
    await getDb()
      .insert(t.pushTokens)
      .values({ token: input.token, userId: user?.id ?? null, platform: input.platform, appVersion: input.appVersion ?? null, enabled: true })
      .onDuplicateKeyUpdate({ set: { userId: user?.id ?? null, platform: input.platform, appVersion: input.appVersion ?? null, enabled: true, lastError: null } });
    return json({ ok: true });
  });
}

/** DELETE: el usuario desactivó las notificaciones en la app. */
export async function DELETE(req: Request) {
  return handle('push.unregister', async () => {
    if (isDemoMode()) return demoBlocked();
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    if (body.token) await getDb().update(t.pushTokens).set({ enabled: false }).where(eq(t.pushTokens.token, body.token));
    return json({ ok: true });
  });
}
