/**
 * Lecturas públicas del catálogo y contenido, cacheadas con Cache Components.
 * La BD de cPanel solo se consulta cuando el CMS invalida un tag (ver lib/data/tags.ts).
 * Sin BD (modo demo) devuelven el contenido de ejemplo de @travesia/db/seed-data.
 */
import { cacheLife, cacheTag } from 'next/cache';
import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import type { CourseDTO, ModuleDTO, PlanDTO, ProductDTO } from '@travesia/shared';
import {
  childId,
  seedCourses,
  seedPlans,
  seedPosts,
  seedProducts,
  seedShippingZones,
  seedStores,
  seedVariants,
  SITE_DEFAULTS,
  type SiteContentKey,
} from '@travesia/db';
import { getDb, isDbConfigured, t } from '@/lib/db';
import { publicPhone, publicWhatsapp } from '@/lib/public-contact';
import { TAGS } from './tags';

type ProductRow = typeof t.products.$inferSelect;
type VariantRow = typeof t.productVariants.$inferSelect;

function toProductDTO(p: ProductRow, variants: VariantRow[]): ProductDTO {
  const active = variants.filter((v) => v.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const cheapest = active.reduce<VariantRow | null>((m, v) => (!m || v.priceCop < m.priceCop ? v : m), null);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    kind: p.kind,
    category: p.category,
    description: p.description,
    story: p.story,
    originRegion: p.originRegion,
    originFarm: p.originFarm,
    producer: p.producer,
    altitudeM: p.altitudeM,
    variety: p.variety,
    process: p.process,
    roastLevel: p.roastLevel,
    profile: p.profile ?? null,
    tastingNotes: p.tastingNotes ?? [],
    brewMethods: p.brewMethods ?? [],
    themeColor: p.themeColor,
    accentColor: p.accentColor,
    imageUrl: p.imageUrl,
    gallery: p.gallery ?? [],
    badges: p.badges ?? [],
    isFeatured: p.isFeatured,
    isSeasonal: p.isSeasonal,
    subscriptionEligible: p.subscriptionEligible,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    priceFromCop: cheapest?.priceCop ?? 0,
    compareAtCop: cheapest?.compareAtCop ?? null,
    variants: active.map((v) => ({
      id: v.id,
      name: v.name,
      weightG: v.weightG,
      grind: v.grind,
      priceCop: v.priceCop,
      compareAtCop: v.compareAtCop,
      inStock: v.stock > 0,
      stock: v.stock,
      eventAt: v.eventAt ? v.eventAt.toISOString() : null,
    })),
  };
}

const now = () => new Date();
const demoProducts = (): ProductDTO[] =>
  seedProducts.map((p) =>
    toProductDTO(
      { ...p, isActive: true, createdAt: now(), updatedAt: now() } as unknown as ProductRow,
      seedVariants.filter((v) => v.productId === p.id).map((v) => ({ ...v, createdAt: now(), updatedAt: now() })) as unknown as VariantRow[],
    ),
  );

export type ProductFilter = { kind?: ProductDTO['kind']; featured?: boolean; seasonal?: boolean; ids?: string[]; limit?: number };

export async function getProducts(filter: ProductFilter = {}): Promise<ProductDTO[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.products);
  let list: ProductDTO[];
  if (!isDbConfigured()) list = demoProducts();
  else {
    const db = getDb();
    const conds = [eq(t.products.isActive, true)];
    if (filter.kind) conds.push(eq(t.products.kind, filter.kind));
    if (filter.featured) conds.push(eq(t.products.isFeatured, true));
    if (filter.seasonal) conds.push(eq(t.products.isSeasonal, true));
    if (filter.ids?.length) conds.push(inArray(t.products.id, filter.ids));
    const rows = await db.select().from(t.products).where(and(...conds)).orderBy(asc(t.products.sortOrder), asc(t.products.name));
    const vars = rows.length ? await db.select().from(t.productVariants).where(inArray(t.productVariants.productId, rows.map((r) => r.id))) : [];
    list = rows.map((r) => toProductDTO(r, vars.filter((v) => v.productId === r.id)));
  }
  if (!isDbConfigured()) {
    if (filter.kind) list = list.filter((p) => p.kind === filter.kind);
    if (filter.featured) list = list.filter((p) => p.isFeatured);
    if (filter.seasonal) list = list.filter((p) => p.isSeasonal);
    if (filter.ids?.length) list = list.filter((p) => filter.ids!.includes(p.id));
  }
  return filter.limit ? list.slice(0, filter.limit) : list;
}

export async function getProduct(slug: string): Promise<ProductDTO | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.products, TAGS.product(slug));
  if (!isDbConfigured()) return demoProducts().find((p) => p.slug === slug) ?? null;
  const db = getDb();
  const [row] = await db.select().from(t.products).where(and(eq(t.products.slug, slug), eq(t.products.isActive, true))).limit(1);
  if (!row) return null;
  const vars = await db.select().from(t.productVariants).where(eq(t.productVariants.productId, row.id));
  return toProductDTO(row, vars);
}

// ---------------------------------------------------------------------------
// Planes de suscripción
// ---------------------------------------------------------------------------
type PlanRow = typeof t.subscriptionPlans.$inferSelect;
const toPlanDTO = (p: PlanRow): PlanDTO => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  tagline: p.tagline,
  description: p.description,
  audience: p.audience,
  frequencyWeeks: p.frequencyWeeks,
  bagsPerDelivery: p.bagsPerDelivery,
  bagWeightG: p.bagWeightG,
  priceCop: p.priceCop,
  compareAtCop: p.compareAtCop,
  includesAcademy: p.includesAcademy,
  benefits: p.benefits ?? [],
  imageUrl: p.imageUrl,
  isHighlighted: p.isHighlighted,
});

export async function getPlans(audience?: 'personal' | 'empresa'): Promise<PlanDTO[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.plans);
  const rows: PlanRow[] = isDbConfigured()
    ? await getDb().select().from(t.subscriptionPlans).where(eq(t.subscriptionPlans.isActive, true)).orderBy(asc(t.subscriptionPlans.sortOrder))
    : (seedPlans as unknown as PlanRow[]);
  return rows.filter((p) => !audience || p.audience === audience).map(toPlanDTO);
}

export async function getPlan(slugOrId: string): Promise<PlanDTO | null> {
  const plans = await getPlans();
  return plans.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
}

// ---------------------------------------------------------------------------
// Academia (catálogo público; el contenido de lecciones se sirve en lib/academy.ts)
// ---------------------------------------------------------------------------
type CourseRow = typeof t.courses.$inferSelect;

function toCourseDTO(c: CourseRow, extra: { lessonsCount: number; studentsCount: number; modules?: ModuleDTO[] }): CourseDTO {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    coverUrl: c.coverUrl,
    trailerUrl: c.trailerUrl,
    level: c.level,
    category: c.category,
    instructorName: c.instructorName,
    instructorTitle: c.instructorTitle,
    instructorBio: c.instructorBio,
    instructorAvatarUrl: c.instructorAvatarUrl,
    priceCop: c.priceCop,
    compareAtCop: c.compareAtCop,
    isFree: c.isFree,
    includedInSubscription: c.includedInSubscription,
    whatYouLearn: c.whatYouLearn ?? [],
    requirements: c.requirements ?? [],
    durationMin: c.durationMin,
    lessonsCount: extra.lessonsCount,
    ratingAvg: c.ratingAvg,
    ratingCount: c.ratingCount,
    studentsCount: extra.studentsCount,
    isFeatured: c.isFeatured,
    ...(extra.modules ? { modules: extra.modules } : {}),
  };
}

function demoCourse(c: (typeof seedCourses)[number], withModules: boolean): CourseDTO {
  const modules: ModuleDTO[] = c.modules.map((m, mi) => ({
    id: childId(c.id, 2, mi),
    title: m.title,
    position: mi,
    quizId: m.quiz ? childId(c.id, 4, mi) : null,
    lessons: m.lessons.map((l, li) => ({ id: childId(c.id, 3, mi, li), title: l.title, durationS: l.durationS, isPreview: Boolean(l.isPreview), position: li })),
  }));
  const row = { id: c.id, compareAtCop: null, trailerUrl: null, instructorAvatarUrl: null, instructorBio: null, ...c.base } as unknown as CourseRow;
  return toCourseDTO(row, { lessonsCount: modules.reduce((n, m) => n + m.lessons.length, 0), studentsCount: c.base.ratingCount as number, modules: withModules ? modules : undefined });
}

export async function getCourses(filter: { featured?: boolean; limit?: number } = {}): Promise<CourseDTO[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.courses);
  let list: CourseDTO[];
  if (!isDbConfigured()) list = seedCourses.map((c) => demoCourse(c, false));
  else {
    const db = getDb();
    const rows = await db.select().from(t.courses).where(eq(t.courses.isPublished, true)).orderBy(asc(t.courses.sortOrder));
    const ids = rows.map((r) => r.id);
    const lessonCounts = ids.length
      ? await db.select({ courseId: t.lessons.courseId, n: sql<number>`COUNT(*)` }).from(t.lessons).where(inArray(t.lessons.courseId, ids)).groupBy(t.lessons.courseId)
      : [];
    const students = ids.length
      ? await db.select({ courseId: t.enrollments.courseId, n: sql<number>`COUNT(*)` }).from(t.enrollments).where(inArray(t.enrollments.courseId, ids)).groupBy(t.enrollments.courseId)
      : [];
    list = rows.map((r) =>
      toCourseDTO(r, {
        lessonsCount: Number(lessonCounts.find((x) => x.courseId === r.id)?.n ?? 0),
        studentsCount: Number(students.find((x) => x.courseId === r.id)?.n ?? 0),
      }),
    );
  }
  if (filter.featured) list = list.filter((c) => c.isFeatured);
  return filter.limit ? list.slice(0, filter.limit) : list;
}

export async function getCourse(slug: string): Promise<CourseDTO | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.courses, TAGS.course(slug));
  if (!isDbConfigured()) {
    const c = seedCourses.find((x) => x.base.slug === slug);
    return c ? demoCourse(c, true) : null;
  }
  const db = getDb();
  const [row] = await db.select().from(t.courses).where(and(eq(t.courses.slug, slug), eq(t.courses.isPublished, true))).limit(1);
  if (!row) return null;
  const [mods, less, qz, [{ n: studentsCount }]] = await Promise.all([
    db.select().from(t.courseModules).where(eq(t.courseModules.courseId, row.id)).orderBy(asc(t.courseModules.position)),
    db
      .select({ id: t.lessons.id, moduleId: t.lessons.moduleId, title: t.lessons.title, durationS: t.lessons.durationS, isPreview: t.lessons.isPreview, position: t.lessons.position })
      .from(t.lessons)
      .where(eq(t.lessons.courseId, row.id))
      .orderBy(asc(t.lessons.position)),
    db.select({ id: t.quizzes.id, moduleId: t.quizzes.moduleId }).from(t.quizzes).where(eq(t.quizzes.courseId, row.id)),
    db.select({ n: sql<number>`COUNT(*)` }).from(t.enrollments).where(eq(t.enrollments.courseId, row.id)),
  ]);
  const modules: ModuleDTO[] = mods.map((m) => ({
    id: m.id,
    title: m.title,
    position: m.position,
    quizId: qz.find((q) => q.moduleId === m.id)?.id ?? null,
    lessons: less.filter((l) => l.moduleId === m.id).map(({ moduleId: _m, ...l }) => l),
  }));
  return toCourseDTO(row, { lessonsCount: less.length, studentsCount: Number(studentsCount), modules });
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------
export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  category: string | null;
  tags: string[];
  authorName: string | null;
  readingMin: number;
  publishedAt: string;
  isFeatured: boolean;
};
export type Post = PostSummary & { content: string; seoTitle: string | null; seoDescription: string | null };

export async function getPosts(filter: { category?: string; limit?: number } = {}): Promise<PostSummary[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.posts);
  let list: PostSummary[];
  if (!isDbConfigured()) {
    list = seedPosts
      .map((p) => ({ ...p, tags: [...p.tags], publishedAt: p.publishedAt.toISOString() }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } else {
    const rows = await getDb()
      .select({
        slug: t.blogPosts.slug,
        title: t.blogPosts.title,
        excerpt: t.blogPosts.excerpt,
        coverUrl: t.blogPosts.coverUrl,
        category: t.blogPosts.category,
        tags: t.blogPosts.tags,
        authorName: t.blogPosts.authorName,
        readingMin: t.blogPosts.readingMin,
        publishedAt: t.blogPosts.publishedAt,
        isFeatured: t.blogPosts.isFeatured,
      })
      .from(t.blogPosts)
      .where(and(eq(t.blogPosts.status, 'published'), lte(t.blogPosts.publishedAt, new Date())))
      .orderBy(desc(t.blogPosts.publishedAt))
      .limit(200);
    list = rows.map((r) => ({ ...r, tags: r.tags ?? [], publishedAt: (r.publishedAt ?? new Date()).toISOString() }));
  }
  if (filter.category) list = list.filter((p) => p.category === filter.category);
  return filter.limit ? list.slice(0, filter.limit) : list;
}

export async function getPost(slug: string): Promise<Post | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.posts, TAGS.post(slug));
  if (!isDbConfigured()) {
    const p = seedPosts.find((x) => x.slug === slug);
    return p ? { ...p, tags: [...p.tags], publishedAt: p.publishedAt.toISOString(), seoTitle: null, seoDescription: null } : null;
  }
  const [r] = await getDb()
    .select()
    .from(t.blogPosts)
    .where(and(eq(t.blogPosts.slug, slug), eq(t.blogPosts.status, 'published')))
    .limit(1);
  if (!r) return null;
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverUrl: r.coverUrl,
    category: r.category,
    tags: r.tags ?? [],
    authorName: r.authorName,
    readingMin: r.readingMin,
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
    isFeatured: r.isFeatured,
    content: r.content ?? '',
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
  };
}

// ---------------------------------------------------------------------------
// CMS: contenido del sitio, puntos físicos, zonas de envío
// ---------------------------------------------------------------------------
export type SiteContent<K extends SiteContentKey> = (typeof SITE_DEFAULTS)[K];

function publishSiteContent<K extends SiteContentKey>(key: K, content: SiteContent<K>): SiteContent<K> {
  if (key !== 'contact') return content;
  const contact = content as SiteContent<'contact'>;
  return { ...contact, phone: publicPhone(contact.phone), whatsapp: publicWhatsapp(contact.whatsapp) } as SiteContent<K>;
}

export async function getSiteContent<K extends SiteContentKey>(key: K): Promise<SiteContent<K>> {
  'use cache';
  cacheLife('days');
  cacheTag(TAGS.site, TAGS.siteKey(key));
  const fallback = SITE_DEFAULTS[key];
  if (!isDbConfigured()) return publishSiteContent(key, fallback);
  try {
    const [row] = await getDb().select().from(t.siteContent).where(eq(t.siteContent.key, key)).limit(1);
    // Mezcla superficial con los valores por defecto: nuevas claves nunca rompen la página
    const merged = row?.content ? ({ ...fallback, ...row.content } as SiteContent<K>) : fallback;
    return publishSiteContent(key, merged);
  } catch {
    return publishSiteContent(key, fallback);
  }
}

export type StoreLocation = (typeof seedStores)[number];
function publishStore<T extends { phone: string | null }>(store: T): T {
  return { ...store, phone: publicPhone(store.phone) || null };
}

export async function getStores(): Promise<StoreLocation[]> {
  'use cache';
  cacheLife('days');
  cacheTag(TAGS.stores);
  if (!isDbConfigured()) return seedStores.map(publishStore) as StoreLocation[];
  const rows = await getDb().select().from(t.stores).where(eq(t.stores.isActive, true)).orderBy(asc(t.stores.sortOrder));
  return rows.map((r) => publishStore({ ...r, hours: r.hours ?? [] })) as StoreLocation[];
}

export async function getShippingZones() {
  'use cache';
  cacheLife('days');
  cacheTag(TAGS.shipping);
  if (!isDbConfigured()) return seedShippingZones.map((z, i) => ({ ...z, id: `demo-zone-${i}` }));
  const rows = await getDb().select().from(t.shippingZones).orderBy(asc(t.shippingZones.sortOrder));
  return rows.map((z) => ({ id: z.id, name: z.name, regions: z.regions ?? [], cities: z.cities ?? [], rateCop: z.rateCop, freeFromCop: z.freeFromCop, etaDays: z.etaDays, isDefault: z.isDefault }));
}
