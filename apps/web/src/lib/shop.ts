/**
 * Lecturas públicas adicionales de la tienda (cacheadas): SEO de producto y reseñas aprobadas.
 * Se invalidan con los mismos tags del catálogo (TAGS.products / TAGS.product(slug)).
 */
import { cacheLife, cacheTag } from 'next/cache';
import { and, desc, eq } from 'drizzle-orm';
import { seedProducts } from '@travesia/db';
import { getDb, isDbConfigured, t } from '@/lib/db';
import { TAGS } from '@/lib/data/tags';

export async function getProductSeo(slug: string): Promise<{ title: string | null; description: string | null }> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.products, TAGS.product(slug));
  if (!isDbConfigured()) {
    const p = seedProducts.find((x) => x.slug === slug);
    return { title: p?.seoTitle ?? null, description: p?.seoDescription ?? null };
  }
  const [r] = await getDb().select({ title: t.products.seoTitle, description: t.products.seoDescription }).from(t.products).where(eq(t.products.slug, slug)).limit(1);
  return { title: r?.title ?? null, description: r?.description ?? null };
}

export type PublicReview = { id: string; rating: number; title: string | null; body: string | null; author: string; verified: boolean; createdAt: string };

export async function getApprovedReviews(productId: string, slug: string): Promise<PublicReview[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.products, TAGS.product(slug), `reviews:${productId}`);
  if (!isDbConfigured()) return [];
  try {
    const rows = await getDb()
      .select({
        id: t.productReviews.id,
        rating: t.productReviews.rating,
        title: t.productReviews.title,
        body: t.productReviews.body,
        verified: t.productReviews.verified,
        createdAt: t.productReviews.createdAt,
        fullName: t.users.fullName,
      })
      .from(t.productReviews)
      .innerJoin(t.users, eq(t.users.id, t.productReviews.userId))
      .where(and(eq(t.productReviews.productId, productId), eq(t.productReviews.status, 'approved')))
      .orderBy(desc(t.productReviews.createdAt))
      .limit(30);
    return rows.map((r) => {
      const parts = (r.fullName ?? 'Cliente Travesía').trim().split(/\s+/);
      return {
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: r.verified,
        createdAt: r.createdAt.toISOString(),
        author: parts.length > 1 ? `${parts[0]} ${parts[1]![0]}.` : parts[0]!,
      };
    });
  } catch {
    return [];
  }
}
