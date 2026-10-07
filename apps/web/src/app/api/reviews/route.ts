import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { reviewSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { hasPurchasedProduct, isEnrolled } from '@/lib/account';
import { getDb, t } from '@/lib/db';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { getCourses, getProducts } from '@/lib/data/catalog';

const schema = reviewSchema
  .extend({ productId: z.string().min(1).max(36).optional(), courseId: z.string().min(1).max(36).optional() })
  .refine((v) => Boolean(v.productId) !== Boolean(v.courseId), { message: 'Indica el producto o el curso', path: ['productId'] });

/** POST /api/reviews → reseña en moderación (status pending); verified si compró el producto o está inscrito. */
export async function POST(req: Request) {
  return handle('reviews.create', async () => {
    const limited = await rateLimit(req, 'review', 5, 300);
    if (limited) return limited;
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión para dejar tu reseña', 401);
    const [input, err] = await parseBody(req, schema);
    if (err) return err;
    if (input.productId && !(await getProducts({ ids: [input.productId] })).length) return apiError('Producto no encontrado', 404);
    if (input.courseId && !(await getCourses()).some((c) => c.id === input.courseId)) return apiError('Curso no encontrado', 404);
    const db = getDb();
    const target = input.productId ? eq(t.productReviews.productId, input.productId) : eq(t.productReviews.courseId, input.courseId!);
    const [dup] = await db.select({ id: t.productReviews.id }).from(t.productReviews).where(and(target, eq(t.productReviews.userId, user.id))).limit(1);
    if (dup) return apiError('Ya dejaste una reseña aquí. ¡Gracias!', 409);
    const verified = input.productId ? await hasPurchasedProduct(user.id, input.productId) : await isEnrolled(user.id, input.courseId!);
    const id = crypto.randomUUID();
    await db.insert(t.productReviews).values({
      id,
      productId: input.productId ?? null,
      courseId: input.courseId ?? null,
      userId: user.id,
      rating: input.rating,
      title: input.title || null,
      body: input.body,
      status: 'pending',
      verified,
    });
    return json({ ok: true, id, status: 'pending', verified }, 201);
  });
}
