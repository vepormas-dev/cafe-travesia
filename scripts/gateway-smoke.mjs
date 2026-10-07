#!/usr/bin/env node
// Prueba de humo de la pasarela PHP de cPanel (infra/cpanel/gateway) desde fuera.
// Usa exactamente el algoritmo de packages/db/src/client.ts → signGatewayBody():
//   X-CT-Signature = hex(HMAC-SHA256(secret, `${timestamp}.${body}`)), X-CT-Timestamp = ms epoch
import { createHmac } from 'node:crypto';
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { resolveEnv, val } from './lib/dotenv.mjs';

const HELP = `Uso: node scripts/gateway-smoke.mjs [opciones]

Comprueba la pasarela de cPanel: health, firma, consulta, anti-replay, archivos protegidos,
bloqueo de DDL, charset de la BD, reloj y (opcional) medios.

Toma DB_GATEWAY_URL y DB_GATEWAY_SECRET del entorno, de --env-file o de --url/--secret.

Opciones:
      --url <url>         URL base de la pasarela (p. ej. https://gateway.cafetravesia.co)
      --secret <s>        Secreto compartido (mejor por variable de entorno, no queda en el historial)
  -e, --env-file <ruta>   Archivo .env del que leer DB_GATEWAY_URL / DB_GATEWAY_SECRET
      --media             Además pide estadísticas de medios (op: stats, firmado)
      --media-write       Sube un PNG de 1×1 con op:put firmado, lo descarga desde la URL pública y lo borra
      --expect-ddl <s>    blocked (por defecto) | allowed — estado esperado de allow_ddl
      --timeout <ms>      Tiempo máximo por petición (por defecto 15000)
      --no-apache         Servidor sin Apache/.htaccess (php -S local): las fugas de archivos solo advierten
      --json              Salida JSON (para CI/monitoreo)
  -h, --help              Esta ayuda

Ejemplos:
  DB_GATEWAY_URL=https://gateway.cafetravesia.co DB_GATEWAY_SECRET=... node scripts/gateway-smoke.mjs
  node scripts/gateway-smoke.mjs -e apps/web/.env.local --media
  node scripts/gateway-smoke.mjs -e .work/.env.prod --expect-ddl allowed   # durante una migración

Salida: 0 si todo pasa, 1 si alguna prueba falla, 2 por uso incorrecto.`;

let o;
try {
  o = parseArgs({
    options: {
      url: { type: 'string' },
      secret: { type: 'string' },
      'env-file': { type: 'string', short: 'e' },
      media: { type: 'boolean', default: false },
      'media-write': { type: 'boolean', default: false },
      'expect-ddl': { type: 'string', default: 'blocked' },
      timeout: { type: 'string', default: '15000' },
      json: { type: 'boolean', default: false },
      'no-apache': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }).values;
} catch (e) {
  console.error(e.message + '\n\n' + HELP);
  process.exit(2);
}
if (o.help) {
  console.log(HELP);
  process.exit(0);
}
if (o['env-file'] && !existsSync(o['env-file'])) {
  console.error(`No existe ${o['env-file']}`);
  process.exit(2);
}
const env = resolveEnv(o['env-file'], { merge: true });
const base = (o.url ?? val(env, 'DB_GATEWAY_URL') ?? '').replace(/\/+$/, '');
const secret = o.secret ?? val(env, 'DB_GATEWAY_SECRET') ?? '';
const timeout = Number(o.timeout);
if (!base || !secret) {
  console.error('Faltan DB_GATEWAY_URL y/o DB_GATEWAY_SECRET.\n\n' + HELP);
  process.exit(2);
}
if (!['blocked', 'allowed'].includes(o['expect-ddl'])) {
  console.error('--expect-ddl debe ser blocked o allowed');
  process.exit(2);
}

export function signGatewayBody(s, timestamp, body) {
  return createHmac('sha256', s).update(`${timestamp}.${body}`).digest('hex');
}

const results = [];
const log = (status, name, detail = '') => {
  results.push({ status, name, detail });
  if (!o.json) console.log(`  ${status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function req(path, { method = 'GET', body, headers = {} } = {}) {
  const t0 = Date.now();
  const res = await fetch(`${base}${path}`, { method, body, headers, redirect: 'manual', signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, ms: Date.now() - t0, headers: res.headers };
}

async function signed(path, payload, { ts = Date.now().toString(), sig } = {}) {
  const body = JSON.stringify(payload);
  return req(path, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', 'x-ct-timestamp': ts, 'x-ct-signature': sig ?? signGatewayBody(secret, ts, body) },
  });
}

const cmpVer = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    log('fail', name, e?.name === 'TimeoutError' ? `sin respuesta en ${timeout} ms` : (e?.cause?.code ?? e?.message ?? String(e)));
  }
}

if (!o.json) console.log(`gateway-smoke · ${base}`);
if (!/^https:\/\//.test(base) && !/^http:\/\/(127\.0\.0\.1|localhost)/.test(base)) log('warn', 'HTTPS', 'la URL no usa https://');

// 1. health.php (público)
await step('health.php', async () => {
  const r = await req('/health.php');
  if (r.status === 200 && r.json?.ok) {
    log('ok', 'health.php 200', `${r.ms} ms, v${r.json.version}`);
    const skew = Math.abs(Date.parse(r.json.time) - Date.now());
    if (!Number.isNaN(skew)) log(skew > 30_000 ? 'fail' : skew > 5_000 ? 'warn' : 'ok', 'reloj del servidor', `desfase ≈ ${Math.round(skew / 1000)} s (la firma tolera 90 s)`);
  } else if (r.status === 503) log('fail', 'health.php', '503: PHP responde pero NO conecta a MySQL (revisa config.php → db)');
  else if (r.status === 500 && /config\.php/.test(r.text)) log('fail', 'health.php', '500: falta config.php en la carpeta de la pasarela');
  else log('fail', 'health.php', `HTTP ${r.status}: ${r.text.slice(0, 120)}`);
});

// 2. ping firmado
let version = '';
await step('ping firmado', async () => {
  const r = await signed('/db.php', { op: 'ping' });
  if (r.status === 200 && r.json?.ok) {
    version = String(r.json.version ?? '');
    log('ok', 'ping firmado 200', `${r.ms} ms · BD ${version} · PHP ${r.json.php} · pasarela ${r.json.gateway}`);
    const php = String(r.json.php ?? '0');
    log(cmpVer(php, '8.1.0') >= 0 ? 'ok' : 'fail', 'PHP ≥ 8.1', php);
    const maria = /mariadb/i.test(version);
    const num = version.match(/\d+\.\d+\.\d+/)?.[0] ?? '0.0.0';
    const min = maria ? '10.3.0' : '5.7.8';
    log(cmpVer(num, min) >= 0 ? 'ok' : 'fail', `${maria ? 'MariaDB ≥ 10.3' : 'MySQL ≥ 5.7.8'}`, version);
  } else if (r.status === 401) log('fail', 'ping firmado', `401 ${r.json?.error ?? ''} → el secreto de Vercel y config.php no coinciden, o el reloj está desfasado`);
  else if (r.status === 403 || r.status === 406 || (r.status >= 400 && !r.json)) log('fail', 'ping firmado', `HTTP ${r.status} sin JSON de la pasarela → posible ModSecurity/WAF bloqueando (ver 02-cpanel-pasarela-y-medios.md)`);
  else log('fail', 'ping firmado', `HTTP ${r.status}: ${r.text.slice(0, 160)}`);
});

// 3. SELECT 1 (method all → filas como arreglos, igual que drizzle)
await step('SELECT 1', async () => {
  const r = await signed('/db.php', { op: 'query', sql: 'SELECT 1 AS uno', params: [], method: 'all' });
  if (r.status === 200 && r.json?.ok && JSON.stringify(r.json.rows) === '[[1]]') log('ok', 'consulta SELECT 1', `${r.ms} ms`);
  else log('fail', 'consulta SELECT 1', `HTTP ${r.status}: ${r.text.slice(0, 160)}`);
});

// 4. Consulta con SQL "peligroso" en JSON (lo que ModSecurity suele bloquear) — solo lectura
await step('consulta con parámetros', async () => {
  const r = await signed('/db.php', {
    op: 'query',
    sql: "SELECT ? AS a, CONCAT('x', ?) AS b FROM DUAL WHERE 1 = 1 UNION SELECT 'u', 'v' FROM DUAL WHERE 1 = 0",
    params: ["O'Reilly -- ☕", 'ñ'],
    method: 'objects',
  });
  if (r.status === 200 && r.json?.ok && r.json.rows?.[0]?.a === "O'Reilly -- ☕") log('ok', 'parámetros + UNION/comillas/emoji', 'el WAF no bloquea y utf8mb4 viaja bien');
  else if (r.status === 403 && !r.json) log('fail', 'parámetros + UNION/comillas', '403 sin JSON → ModSecurity bloquea db.php; crea la excepción');
  else log('fail', 'parámetros + UNION/comillas', `HTTP ${r.status}: ${r.text.slice(0, 160)}`);
});

// 5. Charset/colación y tablas
await step('charset de la BD', async () => {
  const r = await signed('/db.php', {
    op: 'query',
    sql: "SELECT @@character_set_database AS cs, @@collation_database AS co, DATABASE() AS db, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()) AS tablas, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_migrations') AS mig",
    params: [],
    method: 'objects',
  });
  const row = r.json?.rows?.[0];
  if (!row) return log('fail', 'charset de la BD', `HTTP ${r.status}: ${r.text.slice(0, 160)}`);
  log(row.cs === 'utf8mb4' ? 'ok' : 'warn', 'charset de la BD', `${row.db}: ${row.cs} / ${row.co}${row.cs === 'utf8mb4' ? '' : ' → ejecuta ALTER DATABASE … utf8mb4 (01-cpanel-base-de-datos.md)'}`);
  log(Number(row.tablas) >= 43 ? 'ok' : 'warn', 'tablas', `${row.tablas} tablas${Number(row.mig) ? '' : ' · sin _migrations (aún no migrada)'}`);
  if (Number(row.mig)) {
    const m = await signed('/db.php', { op: 'query', sql: 'SELECT name FROM `_migrations` ORDER BY name', params: [], method: 'objects' });
    log('ok', 'migraciones aplicadas', (m.json?.rows ?? []).map((x) => x.name).join(', ') || '(ninguna)');
  }
});

// 6. DDL bloqueado (inofensivo aunque se ejecute)
await step('DDL', async () => {
  const r = await signed('/db.php', { op: 'query', sql: 'DROP TABLE IF EXISTS `__ct_smoke_no_existe`', params: [], method: 'execute' });
  const blocked = r.status === 403 && /DDL/.test(r.json?.error ?? '');
  if (o['expect-ddl'] === 'blocked') log(blocked ? 'ok' : 'fail', 'DDL bloqueado (allow_ddl=false)', blocked ? '' : `HTTP ${r.status} → allow_ddl sigue en true: ponlo en false tras migrar`);
  else log(!blocked && r.status === 200 ? 'ok' : 'fail', 'DDL permitido (allow_ddl=true)', blocked ? 'allow_ddl=false: actívalo solo durante la migración' : `HTTP ${r.status}`);
});

// 7. Sentencias prohibidas siempre
await step('INTO OUTFILE', async () => {
  const r = await signed('/db.php', { op: 'query', sql: "SELECT 1 INTO OUTFILE '/tmp/x'", params: [], method: 'execute' });
  log(r.status === 403 ? 'ok' : 'fail', 'INTO OUTFILE/LOAD_FILE prohibidos', r.status === 403 ? '' : `HTTP ${r.status}`);
});

// 8. Firma inválida y vencida
await step('firma inválida', async () => {
  const r = await signed('/db.php', { op: 'ping' }, { sig: 'deadbeef'.repeat(8) });
  log(r.status === 401 ? 'ok' : 'fail', 'firma inválida rechazada (401)', r.status === 401 ? '' : `HTTP ${r.status}`);
});
await step('replay', async () => {
  const old = String(Date.now() - 10 * 60_000);
  const r = await signed('/db.php', { op: 'ping' }, { ts: old });
  log(r.status === 401 ? 'ok' : 'fail', 'firma vencida (anti-replay 90 s) rechazada', r.status === 401 ? '' : `HTTP ${r.status}`);
});
await step('sin firma', async () => {
  const r = await req('/db.php', { method: 'POST', body: '{"op":"ping"}', headers: { 'content-type': 'application/json' } });
  log(r.status === 401 ? 'ok' : 'fail', 'petición sin firma rechazada (401)', r.status === 401 ? '' : `HTTP ${r.status}`);
});
await step('GET db.php', async () => {
  const r = await req('/db.php');
  log(r.status === 405 ? 'ok' : 'warn', 'GET db.php → 405', r.status === 405 ? '' : `HTTP ${r.status}`);
});

// 9. Archivos que nunca deben servirse (dependen del .htaccess de Apache)
for (const f of ['/config.php', '/config.sample.php', '/lib.php', '/.htaccess']) {
  await step(f, async () => {
    const r = await req(f);
    const leaked = r.status === 200 && r.text.length > 0;
    log(leaked ? (o['no-apache'] ? 'warn' : 'fail') : 'ok', `${f} no accesible`, `HTTP ${r.status}${leaked && o['no-apache'] ? ' (sin Apache/.htaccess: esperado en local)' : ''}`);
  });
}
await step('listado', async () => {
  const r = await req('/');
  const listing = r.status === 200 && /Index of|<title>Index/i.test(r.text);
  log(listing ? 'fail' : 'ok', 'sin listado de directorio', `HTTP ${r.status}`);
});

// 10. Medios
if (o.media || o['media-write']) {
  await step('media stats', async () => {
    const r = await signed('/media.php', { op: 'stats' });
    if (r.status === 200 && r.json?.ok) log('ok', 'medios: stats', `${r.json.files} archivos, ${(r.json.bytes / 1e6).toFixed(1)} MB${r.json.freeBytes ? `, libre ${(r.json.freeBytes / 1e9).toFixed(1)} GB` : ''}`);
    else log('fail', 'medios: stats', `HTTP ${r.status}: ${r.text.slice(0, 160)}`);
  });
}
if (o['media-write']) {
  await step('media put/get/delete', async () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const r = await signed('/media.php', { op: 'put', folder: 'smoke', name: 'x.png', mime: 'image/png', dataBase64: png });
    if (!(r.status === 200 && r.json?.ok)) return log('fail', 'medios: put', `HTTP ${r.status}: ${r.text.slice(0, 160)}`);
    log('ok', 'medios: put', r.json.url);
    const g = await fetch(r.json.url, { signal: AbortSignal.timeout(timeout) });
    const cc = g.headers.get('cache-control') ?? '';
    log(g.status === 200 ? 'ok' : 'fail', 'medios: URL pública', `HTTP ${g.status} · ${g.headers.get('content-type')} · cache-control: ${cc || '—'}`);
    if (g.status === 200 && !/immutable/.test(cc)) log('warn', 'medios: caché', 'sin "immutable": ¿copiaste infra/cpanel/media/.htaccess y mod_headers está activo?');
    const d = await signed('/media.php', { op: 'delete', path: r.json.path });
    log(d.json?.deleted ? 'ok' : 'fail', 'medios: delete', d.json?.deleted ? '' : `HTTP ${d.status}: ${d.text.slice(0, 120)}`);
  });
}

const failed = results.filter((r) => r.status === 'fail').length;
const warned = results.filter((r) => r.status === 'warn').length;
if (o.json) console.log(JSON.stringify({ base, ok: failed === 0, failed, warned, results }, null, 2));
else console.log(`\n${failed ? `✗ ${failed} prueba(s) fallaron` : '✓ Pasarela OK'}${warned ? ` · ${warned} advertencia(s)` : ''}`);
process.exit(failed ? 1 : 0);
