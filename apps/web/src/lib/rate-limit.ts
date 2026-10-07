import 'server-only';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { getDb, t } from '@/lib/db';
import { isDbConfigured } from '@/lib/env';

const memory = new Map<string, { n: number; reset: number }>();

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '0.0.0.0').trim();
}

/**
 * Límite de peticiones por IP. Usa memoria del proceso (rápido) y respaldo en BD
 * para que funcione entre instancias serverless. Devuelve una respuesta 429 o null.
 */
export async function rateLimit(req: Request, bucket: string, max: number, windowSec: number): Promise<NextResponse | null> {
  const key = `${bucket}:${createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 24)}`;
  const now = Date.now();
  const m = memory.get(key);
  if (!m || m.reset < now) memory.set(key, { n: 1, reset: now + windowSec * 1000 });
  else if (++m.n > max) return tooMany(m.reset - now);

  if (!isDbConfigured()) return null;
  try {
    const db = getDb();
    const resetAt = new Date(now + windowSec * 1000);
    await db
      .insert(t.rateLimits)
      .values({ key, count: 1, resetAt })
      .onDuplicateKeyUpdate({
        set: {
          count: sql`IF(${t.rateLimits.resetAt} < UTC_TIMESTAMP(3), 1, ${t.rateLimits.count} + 1)`,
          resetAt: sql`IF(${t.rateLimits.resetAt} < UTC_TIMESTAMP(3), ${resetAt}, ${t.rateLimits.resetAt})`,
        },
      });
    const [row] = await db.select().from(t.rateLimits).where(sql`${t.rateLimits.key} = ${key}`).limit(1);
    if (row && row.count > max) return tooMany(row.resetAt.getTime() - now);
  } catch {
    /* si la BD falla, no bloquear al usuario */
  }
  return null;
}

function tooMany(ms: number) {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil(ms / 1000))) } },
  );
}
