import { z } from 'zod';
import { cartLineSchema, couponDiscount } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { resolveLines, validateCoupon } from '@/lib/commerce/cart';
import { handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  code: z.string().trim().min(2, 'Escribe el código del cupón').max(40),
  items: z.array(cartLineSchema).min(1, 'Tu carrito está vacío').max(40),
  email: z.string().max(191).optional().nullable(),
});

/** POST /api/coupons/validate { code, items } → { ok, code, description, discountCop, freeShipping } | { ok:false, error } */
export async function POST(req: Request) {
  return handle('coupons.validate', async () => {
    const limited = await rateLimit(req, 'coupon', 20, 60);
    if (limited) return limited;
    const [input, err] = await parseBody(req, schema);
    if (err) return err;
    const user = await apiUser();
    const lines = await resolveLines(input.items);
    const check = await validateCoupon(input.code, user?.email ?? input.email ?? null, lines);
    if (!check || !check.ok) return json({ ok: false, error: check && !check.ok ? check.error : 'Este cupón no existe.' });
    const d = couponDiscount(check.coupon, lines);
    if (d.reason === 'min') return json({ ok: false, error: `Este cupón aplica para compras desde $${check.coupon.minSubtotalCop.toLocaleString('es-CO')}.` });
    if (d.reason === 'scope') return json({ ok: false, error: check.coupon.scope === 'courses' ? 'Este cupón solo aplica a cursos de la Academia.' : 'Este cupón solo aplica a productos de la tienda.' });
    return json({ ok: true, code: check.coupon.code, description: check.coupon.description, discountCop: d.discountCop, freeShipping: d.freeShipping });
  });
}
