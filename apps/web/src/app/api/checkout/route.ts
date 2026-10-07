import { checkoutSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { createOrder } from '@/lib/commerce/orders';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode, isWompiConfigured } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/checkout → crea el pedido y devuelve los datos del Web Checkout de Wompi. */
export async function POST(req: Request) {
  return handle('checkout', async () => {
    const limited = await rateLimit(req, 'checkout', 10, 60);
    if (limited) return limited;
    if (isDemoMode()) return demoBlocked();
    const [input, err] = await parseBody(req, checkoutSchema);
    if (err) return err;
    const user = await apiUser();
    const result = await createOrder(input, user);
    if (!result.paid && !result.wompi && !isWompiConfigured()) return apiError('Los pagos aún no están configurados. Escríbenos para completar tu pedido.', 503);
    return json(result, 201);
  });
}
