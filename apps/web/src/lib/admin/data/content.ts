import 'server-only';
import { and, asc, desc, eq, like, sql } from 'drizzle-orm';
import { SITE_DEFAULTS, seedPosts, seedStores, type SiteContentKey } from '@travesia/db';
import { getDb, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { demoMedia } from '../demo-data';

export const SITE_KEYS = Object.keys(SITE_DEFAULTS) as SiteContentKey[];

export async function getSiteSections() {
  if (isDemoMode()) return SITE_KEYS.map((key) => ({ key, content: SITE_DEFAULTS[key] as unknown as Record<string, unknown>, updatedAt: null as Date | null, updatedBy: null as string | null, custom: false }));
  const db = getDb();
  const rows = await db
    .select({ key: t.siteContent.key, content: t.siteContent.content, updatedAt: t.siteContent.updatedAt, updatedBy: t.users.email })
    .from(t.siteContent)
    .leftJoin(t.users, eq(t.users.id, t.siteContent.updatedBy));
  return SITE_KEYS.map((key) => {
    const r = rows.find((x) => x.key === key);
    return { key, content: { ...(SITE_DEFAULTS[key] as unknown as Record<string, unknown>), ...(r?.content ?? {}) }, updatedAt: r?.updatedAt ?? null, updatedBy: r?.updatedBy ?? null, custom: Boolean(r) };
  });
}

export type PostRow = typeof t.blogPosts.$inferSelect;
const demoPosts = (): PostRow[] =>
  seedPosts.map((p, i) => ({ ...p, tags: [...p.tags], id: `demo-post-${i}`, status: 'published', seoTitle: null, seoDescription: null, views: 1200 - i * 230, createdAt: p.publishedAt, updatedAt: p.publishedAt }) as PostRow);

export async function listPosts(f: { q?: string; status?: string } = {}) {
  let rows: PostRow[];
  if (isDemoMode()) rows = demoPosts();
  else {
    const conds = [];
    if (f.status) conds.push(eq(t.blogPosts.status, f.status as 'draft'));
    if (f.q?.trim()) conds.push(like(t.blogPosts.title, `%${f.q.trim()}%`));
    rows = await getDb().select().from(t.blogPosts).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.blogPosts.updatedAt)).limit(300);
    return rows;
  }
  const q = f.q?.trim().toLowerCase();
  return rows.filter((p) => (!f.status || p.status === f.status) && (!q || p.title.toLowerCase().includes(q)));
}

export async function getPostRow(id: string) {
  if (isDemoMode()) return demoPosts().find((p) => p.id === id || p.slug === id) ?? null;
  const [p] = await getDb().select().from(t.blogPosts).where(eq(t.blogPosts.id, id)).limit(1);
  return p ?? null;
}

export type MediaRow = typeof t.mediaAssets.$inferSelect;
export async function listMedia(f: { q?: string; folder?: string; limit?: number } = {}) {
  if (isDemoMode()) {
    const q = f.q?.trim().toLowerCase();
    const rows = demoMedia().filter((m) => (!f.folder || m.folder === f.folder) && (!q || m.path.includes(q) || (m.alt ?? '').toLowerCase().includes(q)));
    return { rows: rows as MediaRow[], folders: [...new Set(demoMedia().map((m) => m.folder))].map((name) => ({ name, n: demoMedia().filter((m) => m.folder === name).length })) };
  }
  const db = getDb();
  const conds = [];
  if (f.folder) conds.push(eq(t.mediaAssets.folder, f.folder));
  if (f.q?.trim()) conds.push(sql`(${t.mediaAssets.path} LIKE ${`%${f.q.trim()}%`} OR ${t.mediaAssets.alt} LIKE ${`%${f.q.trim()}%`})`);
  const [rows, folders] = await Promise.all([
    db.select().from(t.mediaAssets).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.mediaAssets.createdAt)).limit(f.limit ?? 120),
    db.select({ name: t.mediaAssets.folder, n: sql<number>`COUNT(*)` }).from(t.mediaAssets).groupBy(t.mediaAssets.folder).orderBy(asc(t.mediaAssets.folder)),
  ]);
  return { rows, folders: folders.map((x) => ({ name: x.name, n: Number(x.n) })) };
}

export type StoreRow = typeof t.stores.$inferSelect;
export async function listStoresAdmin(): Promise<StoreRow[]> {
  if (isDemoMode()) return seedStores.map((s, i) => ({ ...s, hours: [...s.hours], id: `demo-store-${i}` }) as StoreRow);
  return getDb().select().from(t.stores).orderBy(asc(t.stores.sortOrder));
}
