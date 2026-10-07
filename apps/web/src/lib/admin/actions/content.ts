'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, t } from '@/lib/db';
import { audit } from '@/lib/monitor';
import { aiEnabled, generateBlogDraft, generateSeo, generateSiteCopy, type BlogDraft } from '@/lib/ai';
import { invalidate, TAGS } from '@/lib/data/revalidate';
import { deleteFile } from '@/lib/storage';
import { readingMinutes } from '@travesia/shared';
import { ActionError, bogotaLocalToDate, ok, parsePayload, runAction, zs } from '../guard';
import { SITE_SCHEMAS, type SiteKey } from '../site-schemas';

// ---------------------------------------------------------------------------
// Páginas del sitio (site_content)
// ---------------------------------------------------------------------------
const keySchema = z.enum(Object.keys(SITE_SCHEMAS) as [SiteKey, ...SiteKey[]]);

export async function saveSiteSection(key: string, content: unknown) {
  return runAction({}, async ({ user }) => {
    const k = keySchema.parse(key);
    const data = SITE_SCHEMAS[k].parse(content) as Record<string, unknown>;
    await getDb()
      .insert(t.siteContent)
      .values({ key: k, content: data, updatedBy: user.id })
      .onDuplicateKeyUpdate({ set: { content: data, updatedBy: user.id } });
    await audit(user.id, 'site.update', 'site_content', k);
    invalidate([TAGS.site, TAGS.siteKey(k)]);
    revalidatePath('/admin/contenido');
    return ok('Publicado: el sitio y la app ya muestran el cambio');
  });
}

export async function resetSiteSection(key: string) {
  return runAction({}, async ({ user }) => {
    const k = keySchema.parse(key);
    await getDb().delete(t.siteContent).where(eq(t.siteContent.key, k));
    await audit(user.id, 'site.reset', 'site_content', k);
    invalidate([TAGS.site, TAGS.siteKey(k)]);
    revalidatePath('/admin/contenido');
    return ok('Sección restablecida a los valores por defecto');
  });
}

export async function aiImproveSection(key: string, current: unknown, instructions: string) {
  return runAction<Record<string, unknown>>({ allowDemo: true }, async () => {
    const k = keySchema.parse(key);
    if (!aiEnabled()) throw new ActionError('La IA no está configurada (OPENAI_API_KEY).');
    const r = await generateSiteCopy(k, current, z.string().max(500).parse(instructions ?? ''));
    if (!r) throw new ActionError('La IA no respondió. Inténtalo de nuevo.');
    const parsed = SITE_SCHEMAS[k].safeParse(r);
    if (!parsed.success) throw new ActionError('La propuesta de la IA no respetó la estructura; inténtalo otra vez.');
    return ok('Propuesta lista: revísala y aplícala', parsed.data as Record<string, unknown>);
  });
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------
const postSchema = z
  .object({
    id: z.string().max(36).optional().nullable(),
    slug: zs.slug(),
    title: zs.req('El título', 220),
    excerpt: zs.opt(400),
    content: zs.opt(200000),
    coverUrl: zs.url(),
    category: zs.opt(80),
    tags: zs.list(12),
    authorName: zs.opt(120),
    status: z.enum(['draft', 'scheduled', 'published']),
    publishedAt: zs.opt(20),
    isFeatured: z.boolean(),
    seoTitle: zs.opt(200),
    seoDescription: zs.opt(320),
  })
  .superRefine((p, ctx) => {
    if (p.status === 'scheduled' && !p.publishedAt) ctx.addIssue({ code: 'custom', path: ['publishedAt'], message: 'Elige la fecha de publicación' });
    if (p.status !== 'draft' && !p.content) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Escribe el contenido antes de publicar' });
  });
export type PostInput = z.infer<typeof postSchema>;

export async function savePost(_prev: unknown, fd: FormData) {
  return runAction<{ id: string }>({}, async ({ user }) => {
    const { id, publishedAt, ...p } = parsePayload(postSchema, fd);
    const db = getDb();
    let when = bogotaLocalToDate(publishedAt);
    if (p.status === 'published' && !when) when = new Date();
    const status = p.status === 'scheduled' && when && when <= new Date() ? 'published' : p.status;
    const row = { ...p, status, publishedAt: when, readingMin: readingMinutes(p.content ?? '') };
    const pid = id || crypto.randomUUID();
    let oldSlug: string | null = null;
    if (id) {
      const [cur] = await db.select({ slug: t.blogPosts.slug }).from(t.blogPosts).where(eq(t.blogPosts.id, id)).limit(1);
      oldSlug = cur?.slug ?? null;
      await db.update(t.blogPosts).set(row).where(eq(t.blogPosts.id, id));
    } else await db.insert(t.blogPosts).values({ id: pid, ...row });
    await audit(user.id, status === 'published' ? 'post.publish' : 'post.save', 'blog_post', p.slug, { status });
    invalidate([TAGS.posts, TAGS.post(p.slug), ...(oldSlug && oldSlug !== p.slug ? [TAGS.post(oldSlug)] : [])]);
    revalidatePath('/admin/blog');
    return ok(status === 'published' ? 'Publicado en el blog' : status === 'scheduled' ? 'Programado' : 'Borrador guardado', { id: pid });
  });
}

export async function deletePost(id: string) {
  return runAction({}, async ({ user }) => {
    const db = getDb();
    const [p] = await db.select({ slug: t.blogPosts.slug }).from(t.blogPosts).where(eq(t.blogPosts.id, id)).limit(1);
    await db.delete(t.blogPosts).where(eq(t.blogPosts.id, id));
    await audit(user.id, 'post.delete', 'blog_post', p?.slug ?? id);
    invalidate([TAGS.posts, ...(p ? [TAGS.post(p.slug)] : [])]);
    revalidatePath('/admin/blog');
    return ok('Artículo eliminado');
  });
}

export async function aiBlogDraft(topic: string, category: string, keywords: string) {
  return runAction<BlogDraft>({ allowDemo: true }, async () => {
    if (!aiEnabled()) throw new ActionError('La IA no está configurada (OPENAI_API_KEY).');
    const tp = z.string().trim().min(4, 'Describe el tema (mín. 4 caracteres)').max(300).parse(topic);
    const r = await generateBlogDraft({ topic: tp, category: category || undefined, keywords: keywords || undefined });
    if (!r) throw new ActionError('La IA no respondió. Inténtalo de nuevo.');
    return ok('Borrador generado', r);
  });
}

export async function aiSeo(title: string, content: string) {
  return runAction<{ seoTitle: string; seoDescription: string }>({ allowDemo: true }, async () => {
    if (!aiEnabled()) throw new ActionError('La IA no está configurada (OPENAI_API_KEY).');
    const r = await generateSeo({ title, content });
    if (!r) throw new ActionError('La IA no respondió.');
    return ok('SEO sugerido', r);
  });
}

// ---------------------------------------------------------------------------
// Medios
// ---------------------------------------------------------------------------
export async function updateMediaAlt(id: string, alt: string) {
  return runAction({}, async ({ user }) => {
    const v = z.string().trim().max(300).parse(alt);
    await getDb().update(t.mediaAssets).set({ alt: v || null }).where(eq(t.mediaAssets.id, id));
    await audit(user.id, 'media.alt', 'media', id);
    return ok('Texto alternativo guardado');
  });
}

export async function deleteMedia(id: string) {
  return runAction({}, async ({ user }) => {
    const db = getDb();
    const [m] = await db.select().from(t.mediaAssets).where(eq(t.mediaAssets.id, id)).limit(1);
    if (!m) throw new ActionError('El archivo ya no existe');
    await deleteFile(m.path);
    await db.delete(t.mediaAssets).where(eq(t.mediaAssets.id, id));
    await audit(user.id, 'media.delete', 'media', id, { path: m.path });
    revalidatePath('/admin/medios');
    return ok('Archivo eliminado del hosting');
  });
}

// ---------------------------------------------------------------------------
// Puntos físicos
// ---------------------------------------------------------------------------
const storeSchema = z.object({
  id: z.string().max(36).optional().nullable(),
  slug: zs.slug(),
  name: zs.req('El nombre', 160),
  kind: z.enum(['cafe', 'finca', 'aliado']),
  address: zs.req('La dirección', 300),
  city: zs.req('La ciudad', 120),
  hours: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  phone: zs.opt(40),
  mapUrl: zs.url(),
  menuUrl: zs.url(),
  imageUrl: zs.url(),
  description: zs.opt(2000),
  lat: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(-90).max(90).nullable()),
  lng: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(-180).max(180).nullable()),
  isActive: z.boolean(),
  sortOrder: zs.int(-1000, 100000),
});
export type StoreInput = z.infer<typeof storeSchema>;

export async function saveStore(_prev: unknown, fd: FormData) {
  return runAction({}, async ({ user }) => {
    const { id, ...s } = parsePayload(storeSchema, fd);
    const db = getDb();
    if (id) await db.update(t.stores).set(s).where(eq(t.stores.id, id));
    else await db.insert(t.stores).values({ id: crypto.randomUUID(), ...s });
    await audit(user.id, id ? 'store.update' : 'store.create', 'store', s.slug);
    invalidate([TAGS.stores]);
    revalidatePath('/admin/puntos');
    return ok('Punto guardado');
  });
}

export async function deleteStore(id: string) {
  return runAction({}, async ({ user }) => {
    await getDb().delete(t.stores).where(eq(t.stores.id, id));
    await audit(user.id, 'store.delete', 'store', id);
    invalidate([TAGS.stores]);
    revalidatePath('/admin/puntos');
    return ok('Punto eliminado');
  });
}
