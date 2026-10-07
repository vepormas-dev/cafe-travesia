/**
 * Cliente de base de datos con dos modos de conexión a la MySQL/MariaDB de cPanel:
 *
 *  DB_DRIVER=gateway (recomendado en Vercel Hobby/Pro sin IP fija)
 *    Vercel ──HTTPS + HMAC──▶ https://gateway.<dominio>/db.php ──localhost──▶ MySQL
 *    · No expone el puerto 3306 a internet.
 *    · Las conexiones viven en PHP-FPM del hosting (sin agotar max_user_connections).
 *
 *  DB_DRIVER=mysql
 *    Conexión directa con mysql2 (requiere "Remote MySQL" en cPanel; ideal con
 *    Vercel Static IPs en plan Pro para no abrir el acceso con el comodín %).
 */
import { createHmac } from 'node:crypto';
import { drizzle as drizzleProxy, type MySqlRemoteDatabase } from 'drizzle-orm/mysql-proxy';
import type { SQLWrapper } from 'drizzle-orm';
import * as schema from './schema';

export type Database = MySqlRemoteDatabase<typeof schema>;
type Method = 'all' | 'execute';
type Statement = { sql: string; params: unknown[]; method: Method };

export class DbError extends Error {
  constructor(message: string, public readonly sqlState?: string, public readonly errno?: number) {
    super(message);
    this.name = 'DbError';
  }
  get isDuplicate() {
    return this.errno === 1062 || this.sqlState === '23000';
  }
}

/** Drizzle envuelve los errores del driver (DrizzleQueryError → cause). */
export function unwrapDbError(e: unknown): DbError | null {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    if (cur instanceof DbError) return cur;
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}
export const isDuplicateError = (e: unknown) => unwrapDbError(e)?.isDuplicate ?? false;

const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined);

export function dbDriver(): 'gateway' | 'mysql' | null {
  const d = env('DB_DRIVER') ?? (env('DB_GATEWAY_URL') ? 'gateway' : env('DATABASE_URL') ? 'mysql' : '');
  if (d === 'gateway' && env('DB_GATEWAY_URL') && env('DB_GATEWAY_SECRET')) return 'gateway';
  if (d === 'mysql' && env('DATABASE_URL')) return 'mysql';
  return null;
}
export const isDbConfigured = () => dbDriver() !== null;

function normalizeParams(params: unknown[]) {
  return params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString().replace('T', ' ').replace('Z', '');
    if (typeof p === 'bigint') return p.toString();
    return p;
  });
}

// ---------------------------------------------------------------------------
// Pasarela PHP (cPanel)
// ---------------------------------------------------------------------------
export function signGatewayBody(secret: string, timestamp: string, body: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

async function gatewayCall<T>(payload: Record<string, unknown>): Promise<T> {
  const url = env('DB_GATEWAY_URL')!.replace(/\/$/, '');
  const secret = env('DB_GATEWAY_SECRET')!;
  const body = JSON.stringify(payload);
  const ts = Date.now().toString();
  const timeoutMs = Number(env('DB_GATEWAY_TIMEOUT_MS') ?? 12000);
  let lastErr: unknown;
  // Reintento único ante errores de red / 502-504 (hosting compartido)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${url}/db.php`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ct-timestamp': ts,
          'x-ct-signature': signGatewayBody(secret, ts, body),
        },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      let data: { ok: boolean; error?: string; sqlState?: string; errno?: number } & Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        throw new DbError(`Pasarela respondió ${res.status} sin JSON: ${text.slice(0, 160)}`);
      }
      if (!res.ok || !data.ok) {
        const err = new DbError(data.error ?? `Pasarela respondió ${res.status}`, data.sqlState, data.errno);
        if (res.status >= 502 && res.status <= 504 && attempt === 0) {
          lastErr = err;
          continue;
        }
        throw err;
      }
      return data as T;
    } catch (e) {
      lastErr = e;
      if (e instanceof DbError) throw e;
      if (attempt === 0) continue;
    }
  }
  throw lastErr instanceof Error ? lastErr : new DbError(String(lastErr));
}

async function gatewayQuery(sql: string, params: unknown[], method: Method) {
  const r = await gatewayCall<{ rows: unknown }>({ op: 'query', sql, params: normalizeParams(params), method });
  return { rows: r.rows as never };
}

// ---------------------------------------------------------------------------
// MySQL directo (mysql2)
// ---------------------------------------------------------------------------
type Pool = import('mysql2/promise').Pool;
let poolPromise: Promise<Pool> | null = null;
function getPool() {
  if (!poolPromise) {
    poolPromise = import('mysql2/promise').then((m) =>
      m.createPool({
        uri: env('DATABASE_URL')!,
        connectionLimit: Number(env('DB_POOL_SIZE') ?? 3),
        maxIdle: 1,
        idleTimeout: 10_000,
        enableKeepAlive: true,
        timezone: 'Z',
        dateStrings: true,
        supportBigNumbers: true,
        ssl: env('DB_SSL') === 'false' ? undefined : { rejectUnauthorized: env('DB_SSL') === 'strict' },
      }),
    );
  }
  return poolPromise;
}

function wrapMysqlError(e: unknown): never {
  const err = e as { message?: string; sqlState?: string; errno?: number };
  throw new DbError(err.message ?? String(e), err.sqlState, err.errno);
}

async function mysqlQuery(sql: string, params: unknown[], method: Method) {
  const pool = await getPool();
  try {
    if (method === 'all') {
      const [rows] = await pool.query({ sql, values: normalizeParams(params), rowsAsArray: true });
      return { rows: rows as never };
    }
    const [result] = await pool.query({ sql, values: normalizeParams(params) });
    return { rows: [result] as never };
  } catch (e) {
    wrapMysqlError(e);
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
const globalForDb = globalThis as unknown as { __travesiaDb?: Database };

export function getDb(): Database {
  if (globalForDb.__travesiaDb) return globalForDb.__travesiaDb;
  const driver = dbDriver();
  if (!driver) throw new DbError('Base de datos no configurada (DB_DRIVER / DB_GATEWAY_URL / DATABASE_URL)');
  const exec = driver === 'gateway' ? gatewayQuery : mysqlQuery;
  const db = drizzleProxy(async (sql, params, method) => exec(sql, params, method as Method), { schema });
  globalForDb.__travesiaDb = db;
  return db;
}

/**
 * Ejecuta varias sentencias en UNA transacción (todo o nada).
 * Uso: await atomic([db.insert(t).values(v), db.update(t2).set(...).where(...)])
 * Las sentencias se compilan con toSQL(); no devuelve filas.
 */
export async function atomic(queries: Array<SQLWrapper & { toSQL(): { sql: string; params: unknown[] } }>) {
  const statements: Statement[] = queries.map((q) => {
    const { sql, params } = q.toSQL();
    return { sql, params: normalizeParams(params), method: 'execute' };
  });
  if (statements.length === 0) return;
  const driver = dbDriver();
  if (driver === 'gateway') {
    await gatewayCall({ op: 'batch', statements });
    return;
  }
  if (driver === 'mysql') {
    const pool = await getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const s of statements) await conn.query({ sql: s.sql, values: s.params });
      await conn.commit();
    } catch (e) {
      await conn.rollback().catch(() => undefined);
      wrapMysqlError(e);
    } finally {
      conn.release();
    }
    return;
  }
  throw new DbError('Base de datos no configurada');
}

/** Ping de salud (latencia) para el monitor. */
export async function pingDb(): Promise<{ ok: boolean; ms: number; version?: string; error?: string }> {
  const t = Date.now();
  try {
    const driver = dbDriver();
    if (driver === 'gateway') {
      const r = await gatewayCall<{ version?: string }>({ op: 'ping' });
      return { ok: true, ms: Date.now() - t, version: r.version };
    }
    const { rows } = await mysqlQuery('SELECT VERSION()', [], 'all');
    return { ok: true, ms: Date.now() - t, version: String((rows as unknown as unknown[][])[0]?.[0] ?? '') };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }
}

/** SQL crudo (migraciones, reportes). Devuelve filas como objetos. */
export async function rawQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const driver = dbDriver();
  if (driver === 'gateway') {
    const r = await gatewayCall<{ rows: T[] }>({ op: 'query', sql, params: normalizeParams(params), method: 'objects' });
    return r.rows;
  }
  const pool = await getPool();
  try {
    const [rows] = await pool.query({ sql, values: normalizeParams(params) });
    return rows as T[];
  } catch (e) {
    wrapMysqlError(e);
  }
}

export { schema };
