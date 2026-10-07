import { subscriptionUpdateSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { updateSubscription } from '@/lib/commerce/subscriptions';
import { getProducts } from '@/lib/data/catalog';
import { getSubscriptionDTO } from '@/lib/account';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';

/** PATCH /api/subscriptions/:id → pause | resume | skip | cancel | change_plan | change_coffee | change_address */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('subscriptions.update', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const { id } = await params;
    const [input, err] = await parseBody(req, subscriptionUpdateSchema);
    if (err) return err;
    if (input.action === 'pause' && input.until) {
      const until = new Date(`${input.until}T12:00:00Z`).getTime();
      if (until < Date.now() || until > Date.now() + 180 * 86400000) return apiError('Elige una fecha entre mañana y los próximos 6 meses.', 422, { until: ['Fecha fuera de rango'] });
    }
    if (input.action === 'change_coffee') {
      const [p] = await getProducts({ ids: [input.productId] });
      if (!p || !p.subscriptionEligible) return apiError('Ese café no está disponible para suscripción.', 422);
    }
    try {
      await updateSubscription(id, user.id, input);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos actualizar tu suscripción';
      return apiError(msg, /no encontrada/i.test(msg) ? 404 : 409);
    }
    const subscription = await getSubscriptionDTO(user.id, id);
    if (!subscription) return apiError('Suscripción no encontrada', 404);
    return json({ subscription });
  });
}
