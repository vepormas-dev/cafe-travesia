import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { env } from '@/lib/env';
import { TAGS } from '@/lib/data/tags';
import { getCourses, getPlans, getPosts, getProducts } from '@/lib/data/catalog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  // Sin esto el sitemap queda congelado con los datos del build; así se renueva con el catálogo
  cacheLife('hours');
  cacheTag(TAGS.products, TAGS.courses, TAGS.plans, TAGS.posts);
  const base = env.siteUrl;
  const [products, courses, plans, posts] = await Promise.all([getProducts(), getCourses(), getPlans(), getPosts()]);
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly') => ({ url: `${base}${path}`, changeFrequency, priority });
  return [
    page('/', 1, 'daily'),
    page('/tienda', 0.9, 'daily'),
    page('/suscripciones', 0.9),
    page('/academia', 0.9),
    page('/academia/cursos', 0.8),
    page('/blog', 0.8, 'daily'),
    page('/nosotros', 0.6, 'monthly'),
    page('/impacto', 0.6, 'monthly'),
    page('/tiendas', 0.7, 'monthly'),
    page('/empresas', 0.7, 'monthly'),
    page('/contacto', 0.5, 'monthly'),
    page('/preguntas-frecuentes', 0.5, 'monthly'),
    page('/envios-y-devoluciones', 0.4, 'monthly'),
    page('/terminos', 0.2, 'yearly'),
    page('/privacidad', 0.2, 'yearly'),
    ...products.map((p) => ({ ...page(`/tienda/${p.slug}`, p.isFeatured ? 0.8 : 0.7), images: p.imageUrl ? [p.imageUrl.startsWith('http') ? p.imageUrl : `${base}${p.imageUrl}`] : undefined })),
    ...courses.map((c) => page(`/academia/cursos/${c.slug}`, 0.7)),
    ...plans.filter((p) => p.audience === 'personal').map((p) => page(`/suscripciones/${p.slug}`, 0.7)),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.publishedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
