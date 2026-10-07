import { z } from 'zod';
import { apiStaff } from '@/lib/auth';
import { apiError, demoBlocked, json, parseBody } from '@/lib/api';
import { isDemoMode, isStorageConfigured } from '@/lib/env';
import { createUploadTicket } from '@/lib/storage';

const schema = z.object({ folder: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9/_-]{0,59}$/, 'Carpeta inválida').default('general') });

/** POST { folder } (staff) → { ticket, uploadUrl, expiresIn } para subir directo a la pasarela cPanel. */
export async function POST(req: Request) {
  if (isDemoMode()) return demoBlocked();
  const u = await apiStaff();
  if (!u) return apiError('No autorizado', 401);
  if (!isStorageConfigured()) return apiError('El almacenamiento de medios no está configurado (MEDIA_GATEWAY_URL / DB_GATEWAY_SECRET).', 503);
  const [data, err] = await parseBody(req, schema);
  if (err) return err;
  return json(createUploadTicket(data.folder.replace(/\.\./g, '')));
}
