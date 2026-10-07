/** Tags de caché. El CMS llama invalidate(...) tras cada cambio. */
export const TAGS = {
  products: 'products',
  product: (slug: string) => `product:${slug}`,
  plans: 'plans',
  courses: 'courses',
  course: (slug: string) => `course:${slug}`,
  posts: 'posts',
  post: (slug: string) => `post:${slug}`,
  site: 'site',
  siteKey: (key: string) => `site:${key}`,
  stores: 'stores',
  shipping: 'shipping',
} as const;
