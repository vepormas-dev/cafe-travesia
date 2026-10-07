import { connection } from 'next/server';
import { z } from 'zod';
import { cartLineSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { resolveLines } from '@/lib/commerce/cart';
import { getCart, saveCart } from '@/lib/commerce/carts';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';

/** GET /api/cart → carrito guardado de la cuenta (web ↔ app). */
export async function GET() {
  await connection();
  return handle('cart.get', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión para sincronizar tu carrito', 401);
    return json({ items: await getCart(user.id) });
  });
}

const putSchema = z.object({ items: z.array(cartLineSchema).max(40) });

/** PUT /api/cart { items } → reemplaza el carrito guardado. */
export async function PUT(req: Request) {
  return handle('cart.put', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión para sincronizar tu carrito', 401);
    const [input, err] = await parseBody(req, putSchema);
    if (err) return err;
    const items = input.items.map(({ kind, id, variantId, quantity }) => ({ kind, id, variantId: variantId ?? null, quantity }));
    let subtotal = 0;
    try {
      subtotal = (await resolveLines(items)).reduce((s, l) => s + l.unitPriceCop * l.quantity, 0);
    } catch {
      subtotal = 0; // alguna línea ya no existe: se guarda igual y el cliente la depura al cotizar
    }
    await saveCart(user.id, user.email, items, subtotal);
    return json({ items });
  });
}
