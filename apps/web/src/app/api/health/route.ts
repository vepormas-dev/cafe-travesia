import { connection } from 'next/server';
import { isDbConfigured, pingDb } from '@/lib/db';

/**
 * GET /api/health → chequeo público para monitores externos (UptimeRobot, Better Stack…).
 * 200 si el sitio y la base de datos responden; 503 si la base de datos falla.
 * No expone versiones, errores ni datos internos (el detalle está en /admin/monitor).
 */
export async function GET() {
  await connection();
  const t0 = Date.now();
  const db = isDbConfigured() ? await pingDb() : { ok: false, ms: 0 };
  const body = { ok: db.ok, db: db.ok ? 'ok' : 'error', dbMs: db.ms, ms: Date.now() - t0, ts: new Date().toISOString() };
  return Response.json(body, { status: db.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

