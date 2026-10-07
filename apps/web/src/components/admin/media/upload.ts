'use client';
/**
 * Subida directa a la pasarela cPanel (sin pasar por Vercel):
 *  1) POST /api/media/ticket {folder} → { ticket, uploadUrl }
 *  2) POST multipart al uploadUrl con ticket + file (progreso por XHR)
 *  3) POST /api/media para registrar el archivo en media_assets
 */
export type MediaAsset = { id: string; path: string; url: string; folder: string; alt: string | null; mime: string | null; sizeBytes: number | null; width: number | null; height: number | null; createdAt: string | Date };

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'application/pdf', 'video/mp4'];
export const ACCEPT_ATTR = ACCEPT.join(',');

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data;
}

export async function uploadToGateway(file: File, folder: string, onProgress?: (pct: number) => void): Promise<MediaAsset> {
  if (!ACCEPT.includes(file.type)) throw new Error(`Formato no permitido (${file.type || 'desconocido'})`);
  if (file.size > 15 * 1024 * 1024) throw new Error('El archivo supera 15 MB');
  const { ticket, uploadUrl } = await jsonOrThrow<{ ticket: string; uploadUrl: string }>(
    await fetch('/api/media/ticket', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ folder }) }),
  );
  const stored = await new Promise<{ ok: boolean; path: string; url: string; mime: string; size: number; width: number | null; height: number | null; error?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && d.ok) resolve(d);
        else reject(new Error(d.error ?? `La pasarela respondió ${xhr.status}`));
      } catch {
        reject(new Error(`Respuesta inválida de la pasarela (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('No se pudo conectar con la pasarela de medios (revisa CORS / dominio)'));
    const fd = new FormData();
    fd.append('ticket', ticket);
    fd.append('file', file);
    xhr.send(fd);
  });
  const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 200);
  const { asset } = await jsonOrThrow<{ asset: MediaAsset }>(
    await fetch('/api/media', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: stored.path, url: stored.url, folder, mime: stored.mime, size: stored.size, width: stored.width, height: stored.height, alt }) }),
  );
  return asset;
}

export async function fetchMedia(folder?: string, q?: string) {
  const sp = new URLSearchParams();
  if (folder) sp.set('folder', folder);
  if (q) sp.set('q', q);
  return jsonOrThrow<{ assets: MediaAsset[]; folders: { name: string; n: number }[] }>(await fetch(`/api/media?${sp}`, { cache: 'no-store' }));
}
