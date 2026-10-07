import { SITE_DEFAULTS, type SiteContentKey } from '@travesia/db';
import { getSiteContent } from '@/lib/data/catalog';
import { apiError, json } from '@/lib/api';

/** GET /api/v1/content/home.hero → contenido editable del CMS (app y web). */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!(key in SITE_DEFAULTS)) return apiError('Sección no encontrada', 404);
  return json({ key, content: await getSiteContent(key as SiteContentKey) });
}
