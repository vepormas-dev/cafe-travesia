import { z } from 'zod';
import { cartLineSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { quote } from '@/lib/commerce/cart';
import { handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  items: z.array(cartLineSchema).max(40),
  region: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  couponCode: z.string().max(40).optional().nullable(),
  email: z.string().max(191).optional().nullable(),
  redeemPoints: z.number().int().min(0).optional(),
});

/** POST /api/cart/quote → líneas con precio vigente, envío, cupón y puntos (no crea nada). */
export async function POST(req: Request) {
  return handle('cart.quote', async () => {
    const limited = await rateLimit(req, 'quote', 60, 60);
    if (limited) return limited;
    const [input, err] = await parseBody(req, schema);
    if (err) return err;
    if (input.items.length === 0) return json({ lines: [], totals: null, coupon: null });
    const user = await apiUser();
    const r = await quote({ ...input, email: input.email ?? user?.email ?? null, availablePoints: user?.loyaltyPoints ?? 0 });
    return json({
      lines: r.lines.map(({ key, kind, productId, variantId, courseId, name, variantName, imageUrl, slug, unitPriceCop, quantity, stock, requiresShipping }) => ({
        key, kind, productId, variantId, courseId, name, variantName, imageUrl, slug, unitPriceCop, quantity, stock, requiresShipping,
      })),
      totals: r.totals,
      coupon: r.coupon ? (r.coupon.ok ? { ok: true, code: r.coupon.coupon.code, description: r.coupon.coupon.description, kind: r.coupon.coupon.kind } : { ok: false, error: r.coupon.error }) : null,
      availablePoints: user?.loyaltyPoints ?? 0,
    });
  });
}
