import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiStaff } from '@/lib/auth';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { getDb, isDuplicateError, t } from '@/lib/db';
import { env, isDemoMode } from '@/lib/env';
import { audit, logEvent } from '@/lib/monitor';
import { isOwnMediaUrl } from '@/lib/storage';
import { listMedia } from '@/lib/admin/data/content';

const schema = z.object({
  path: z.string().trim().min(3).max(400).regex(/^[a-z0-9][a-z0-9/_.-]+$/i, 'Ruta inválida').refine((p) => !p.includes('..'), 'Ruta inválida'),
  url: z.url().max(600),
  folder: z.string().trim().max(80).default('general'),
  mime: z.string().max(80).optional().nullable(),
  size: z.number().int().min(0).max(200 * 1024 * 1024).optional().nullable(),
  width: z.number().int().min(0).max(20000).optional().nullable(),
  height: z.number().int().min(0).max(20000).optional().nullable(),
  alt: z.string().trim().max(300).optional().nullable(),
});

/** GET ?folder=&q= (staff) → { assets, folders } para la biblioteca y el MediaPicker. */
export async function GET(req: Request) {
  if (!isDemoMode() && !(await apiStaff())) return apiError('No autorizado', 401);
  const sp = new URL(req.url).searchParams;
  return handle('media.list', async () => {
    const { rows, folders } = await listMedia({ folder: sp.get('folder') ?? undefined, q: sp.get('q') ?? undefined, limit: 200 });
    return json({ assets: rows, folders });
  });
}

/** POST (staff) → registra en media_assets un archivo ya subido a la pasarela. */
export async function POST(req: Request) {
  if (isDemoMode()) return demoBlocked();
  const u = await apiStaff();
  if (!u) return apiError('No autorizado', 401);
  const [data, err] = await parseBody(req, schema);
  if (err) return err;
  if (!isOwnMediaUrl(data.url)) return apiError(`Solo se registran archivos de ${env.mediaUrl}`, 422);
  return handle('media.register', async () => {
    const db = getDb();
    const id = crypto.randomUUID();
    try {
      await db.insert(t.mediaAssets).values({ id, path: data.path, url: data.url, folder: data.folder, mime: data.mime ?? null, sizeBytes: data.size ?? null, width: data.width ?? null, height: data.height ?? null, alt: data.alt ?? null, uploadedBy: u.id });
    } catch (e) {
      if (!isDuplicateError(e)) throw e;
    }
    const [asset] = await db.select().from(t.mediaAssets).where(eq(t.mediaAssets.path, data.path)).limit(1);
    await logEvent('storage', 'upload', 'ok', { message: data.path, externalId: asset?.id });
    await audit(u.id, 'media.upload', 'media', asset?.id ?? id, { path: data.path });
    return json({ asset }, 201);
  });
}
