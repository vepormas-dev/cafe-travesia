import { subscribeSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { createSubscription } from '@/lib/commerce/subscriptions';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode, isWompiConfigured } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { logEvent } from '@/lib/monitor';

/** POST /api/subscriptions (sesión) → SubscribeInput → 201 { subscriptionId, chargeStatus } */
export async function POST(req: Request) {
  return handle('subscriptions.create', async () => {
    const limited = await rateLimit(req, 'subscribe', 6, 60);
    if (limited) return limited;
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión para suscribirte', 401);
    if (!isWompiConfigured()) return apiError('Los pagos con tarjeta aún no están configurados. Escríbenos para activar tu suscripción.', 503);
    const [input, err] = await parseBody(req, subscribeSchema);
    if (err) return err;
    try {
      const r = await createSubscription(input, user);
      return json(r, 201);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos crear tu suscripción';
      await logEvent('wompi', 'subscription.create', 'error', { message: msg });
      return apiError(msg, /Ya tienes/.test(msg) ? 409 : 422);
    }
  });
}
