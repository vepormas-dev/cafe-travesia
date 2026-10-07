import 'server-only';
/**
 * Almacenamiento de archivos en cPanel (subdominio media.<dominio>) a través de la
 * pasarela PHP. Flujo de subida desde el CMS:
 *   1) el navegador pide un ticket a POST /api/media/ticket (solo staff)
 *   2) sube el archivo DIRECTO a https://gateway.<dominio>/media.php (sin límite de 4,5 MB de Vercel)
 *   3) registra el resultado con POST /api/media (guarda en media_assets)
 */
import { createHmac, randomBytes } from 'node:crypto';
import { signGatewayBody } from '@travesia/db';
import { env, isStorageConfigured } from '@/lib/env';

export function createUploadTicket(folder: string, maxBytes = 15 * 1024 * 1024, ttlSec = 600) {
  if (!isStorageConfigured()) throw new Error('Almacenamiento no configurado');
  const payload = Buffer.from(
    JSON.stringify({ folder, maxBytes, exp: Math.floor(Date.now() / 1000) + ttlSec, nonce: randomBytes(8).toString('hex') }),
  ).toString('base64url');
  const sig = createHmac('sha256', env.gatewaySecret!).update(payload).digest('hex');
  return { ticket: `${payload}.${sig}`, uploadUrl: `${env.gatewayUrl}/media.php`, expiresIn: ttlSec };
}

async function signedMediaCall<T>(body: Record<string, unknown>): Promise<T> {
  const raw = JSON.stringify(body);
  const ts = Date.now().toString();
  const res = await fetch(`${env.gatewayUrl}/media.php`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ct-timestamp': ts, 'x-ct-signature': signGatewayBody(env.gatewaySecret!, ts, raw) },
    body: raw,
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  const data = (await res.json()) as T & { ok: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error ?? `Medios respondió ${res.status}`);
  return data;
}

export type StoredFile = { path: string; url: string; mime: string; size: number; width: number | null; height: number | null };

/** Sube un archivo desde el servidor (p. ej. certificados PDF generados). */
export async function putFile(folder: string, data: Buffer, mime: string): Promise<StoredFile> {
  return signedMediaCall<StoredFile>({ op: 'put', folder, mime, dataBase64: data.toString('base64') });
}

export async function deleteFile(path: string) {
  if (!isStorageConfigured()) return false;
  const r = await signedMediaCall<{ deleted: boolean }>({ op: 'delete', path });
  return r.deleted;
}

export async function storageStats() {
  return signedMediaCall<{ bytes: number; files: number; freeBytes: number | null }>({ op: 'stats' });
}

/** Solo URLs del dominio de medios propio pueden registrarse como assets. */
export const isOwnMediaUrl = (url: string) => url.startsWith(env.mediaUrl + '/');
