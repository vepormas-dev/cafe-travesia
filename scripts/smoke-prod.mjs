#!/usr/bin/env node
// Prueba de humo del sitio desplegado (Vercel). Solo lectura salvo --cron (llama tasks=noop).
import { parseArgs } from 'node:util';

const HELP = `Uso: node scripts/smoke-prod.mjs [URL] [opciones]

Comprueba un despliegue: páginas públicas 200, API pública, sitemap/robots, cabeceras de
seguridad, redirecciones heredadas del WordPress, protecciones de /api/cron y del webhook,
HTTPS/www y latencia.

Argumentos:
  URL                     Base del sitio (por defecto NEXT_PUBLIC_SITE_URL o https://cafetravesia.com)

Opciones:
      --cron              Llama /api/cron?tasks=noop con "Authorization: Bearer $CRON_SECRET" y espera 200
                          (no ejecuta tareas: solo valida el secreto y registra la ejecución)
      --sitemap <n>       Además visita las primeras n URLs del sitemap (por defecto 0)
      --paths <lista>     Rutas extra separadas por coma (p. ej. /blog,/academia/cursos/barismo)
      --max-ms <ms>       Umbral de latencia para advertir (por defecto 1500)
      --demo-ok           No falla si el sitio responde en modo demo (útil en Preview sin BD)
      --no-domain         No prueba http→https ni www↔apex (p. ej. contra *.vercel.app)
      --json              Salida JSON
  -h, --help              Esta ayuda

Variables: CRON_SECRET (para --cron), NEXT_PUBLIC_SITE_URL.

Ejemplos:
  node scripts/smoke-prod.mjs https://cafetravesia.com
  CRON_SECRET=... node scripts/smoke-prod.mjs https://cafetravesia.com --cron --sitemap 20
  node scripts/smoke-prod.mjs https://cafe-travesia-git-develop-equipo.vercel.app --no-domain --demo-ok

Salida: 0 si todo pasa, 1 si algo falla, 2 por uso incorrecto.`;

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      cron: { type: 'boolean', default: false },
      sitemap: { type: 'string', default: '0' },
      paths: { type: 'string', default: '' },
      'max-ms': { type: 'string', default: '1500' },
      'demo-ok': { type: 'boolean', default: false },
      'no-domain': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
} catch (e) {
  console.error(e.message + '\n\n' + HELP);
  process.exit(2);
}
const o = parsed.values;
if (o.help) {
  console.log(HELP);
  process.exit(0);
}
const base = (parsed.positionals[0] ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cafetravesia.com').replace(/\/+$/, '');
let baseUrl;
try {
  baseUrl = new URL(base);
} catch {
  console.error(`URL inválida: ${base}`);
  process.exit(2);
}
const maxMs = Number(o['max-ms']);

const PUBLIC_PATHS = [
  '/',
  '/tienda',
  '/suscripciones',
  '/academia',
  '/academia/cursos',
  '/nosotros',
  '/impacto',
  '/empresas',
  '/contacto',
  '/preguntas-frecuentes',
  '/envios-y-devoluciones',
  '/privacidad',
  '/terminos',
  '/blog',
  '/ingresar',
  '/acceso',
  ...o.paths.split(',').map((s) => s.trim()).filter(Boolean),
];

const results = [];
const timings = [];
const log = (status, name, detail = '') => {
  results.push({ status, name, detail });
  if (!o.json) console.log(`  ${status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function hit(path, init = {}) {
  const url = path.startsWith('http') ? path : base + path;
  const t0 = Date.now();
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'cafe-travesia-smoke/1.0', ...(init.headers ?? {}) }, ...init });
  const ms = Date.now() - t0;
  const text = await res.text();
  return { res, ms, text };
}

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    log('fail', name, e?.name === 'TimeoutError' ? 'sin respuesta en 30 s' : (e?.cause?.code ?? e?.message ?? String(e)));
  }
}

if (!o.json) console.log(`smoke-prod · ${base}`);

// 1. Páginas públicas
for (const p of PUBLIC_PATHS) {
  await step(p, async () => {
    const { res, ms, text } = await hit(p);
    timings.push({ path: p, ms });
    const loc = res.headers.get('location');
    if (res.status === 200) {
      const cache = res.headers.get('x-vercel-cache') ?? '—';
      log(ms > maxMs ? 'warn' : 'ok', `GET ${p} 200`, `${ms} ms · cache ${cache}${/<title>[^<]*<\/title>/.test(text) ? '' : ' · sin <title>'}`);
    } else if ((p === '/acceso' || p === '/ingresar') && res.status >= 300 && res.status < 400) log('ok', `GET ${p} ${res.status}`, `→ ${loc}`);
    else log('fail', `GET ${p}`, `HTTP ${res.status}${loc ? ` → ${loc}` : ''}`);
  });
}

// 2. API pública
let demo = false;
await step('/api/v1/products', async () => {
  const { res, ms, text } = await hit('/api/v1/products');
  timings.push({ path: '/api/v1/products', ms });
  let j = null;
  try {
    j = JSON.parse(text);
  } catch {}
  if (res.status === 200 && Array.isArray(j?.products) && j.products.length > 0) log('ok', 'GET /api/v1/products 200', `${j.products.length} productos · ${ms} ms`);
  else log('fail', 'GET /api/v1/products', `HTTP ${res.status}: ${text.slice(0, 120)}`);
});

// 3. sitemap y robots
let sitemapUrls = [];
await step('/sitemap.xml', async () => {
  const { res, text } = await hit('/sitemap.xml');
  sitemapUrls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (res.status === 200 && /<urlset/.test(text)) {
    log('ok', 'GET /sitemap.xml 200', `${sitemapUrls.length} URLs`);
    const foreign = sitemapUrls.filter((u) => !u.startsWith(baseUrl.origin));
    if (foreign.length) log('warn', 'sitemap: dominio', `${foreign.length} URLs no empiezan por ${baseUrl.origin} (p. ej. ${foreign[0]}) → revisa NEXT_PUBLIC_SITE_URL`);
  } else log('fail', 'GET /sitemap.xml', `HTTP ${res.status}`);
});
await step('/robots.txt', async () => {
  const { res, text } = await hit('/robots.txt');
  if (res.status === 200 && /user-agent/i.test(text)) {
    log('ok', 'GET /robots.txt 200', /sitemap:/i.test(text) ? 'incluye Sitemap:' : 'sin línea Sitemap:');
    if (/Disallow:\s*\/\s*$/m.test(text) && /User-agent:\s*\*/i.test(text) && !/Allow:/i.test(text)) log('warn', 'robots.txt', 'bloquea todo el sitio (¿Preview?)');
  } else log('fail', 'GET /robots.txt', `HTTP ${res.status}`);
});
const n = Number(o.sitemap);
for (const u of sitemapUrls.slice(0, n > 0 ? n : 0)) {
  await step(u, async () => {
    const target = u.startsWith(baseUrl.origin) ? u : base + new URL(u).pathname;
    const { res, ms } = await hit(target);
    timings.push({ path: new URL(target).pathname, ms });
    log(res.status === 200 ? (ms > maxMs ? 'warn' : 'ok') : 'fail', `sitemap ${new URL(target).pathname}`, `HTTP ${res.status} · ${ms} ms`);
  });
}

// 4. Cabeceras de seguridad (next.config.ts)
await step('cabeceras', async () => {
  const { res } = await hit('/');
  const h = (k) => res.headers.get(k);
  const want = {
    'x-content-type-options': /nosniff/i,
    'referrer-policy': /strict-origin-when-cross-origin/i,
    'x-frame-options': /sameorigin/i,
    'permissions-policy': /camera=\(\)/i,
    'strict-transport-security': /max-age=\d+/i,
  };
  for (const [k, re] of Object.entries(want)) log(re.test(h(k) ?? '') ? 'ok' : 'fail', `cabecera ${k}`, h(k) ?? 'ausente');
  log(h('x-powered-by') ? 'fail' : 'ok', 'sin x-powered-by', h('x-powered-by') ?? '');
});

// 5. Redirecciones del WordPress anterior (next.config.ts → redirects)
const REDIRECTS = [
  ['/producto/cafe-ejemplo', '/tienda/cafe-ejemplo', 308],
  ['/suscripcion', '/suscripciones', 308],
  ['/carrito', '/tienda/carrito', 308],
  ['/mi-cuenta', '/cuenta', 308],
  ['/category/noticias', '/blog', 308],
  ['/wp-login.php', '/acceso', 307],
  ['/wp-admin', '/acceso', 307],
];
for (const [from, to, code] of REDIRECTS) {
  await step(from, async () => {
    const { res } = await hit(from);
    const loc = res.headers.get('location') ?? '';
    const okLoc = loc === to || loc.endsWith(to);
    log(res.status === code && okLoc ? 'ok' : 'fail', `redirect ${from} → ${to}`, `HTTP ${res.status} ${loc}`);
  });
}

// 6. Protecciones
await step('/api/cron sin token', async () => {
  const { res } = await hit('/api/cron?tasks=noop');
  log(res.status === 401 ? 'ok' : 'fail', '/api/cron sin token → 401', `HTTP ${res.status}`);
});
await step('/api/cron token falso', async () => {
  const { res } = await hit('/api/cron?tasks=noop', { headers: { authorization: 'Bearer token-falso-de-prueba' } });
  log(res.status === 401 ? 'ok' : 'fail', '/api/cron Bearer falso → 401', `HTTP ${res.status}`);
});
if (o.cron) {
  await step('/api/cron con CRON_SECRET', async () => {
    const s = process.env.CRON_SECRET;
    if (!s) return log('fail', '/api/cron con token', 'define CRON_SECRET en el entorno');
    const { res, text, ms } = await hit('/api/cron?tasks=noop', { headers: { authorization: `Bearer ${s}` } });
    if (res.status === 200) log('ok', '/api/cron Bearer → 200', `${ms} ms`);
    else if (res.status === 503) {
      demo = true;
      log(o['demo-ok'] ? 'warn' : 'fail', '/api/cron Bearer', '503 sin base de datos (modo demo)');
    } else log('fail', '/api/cron Bearer', `HTTP ${res.status}: ${text.slice(0, 120)} → CRON_SECRET distinto al de Vercel`);
  });
}
await step('webhook firma falsa', async () => {
  const fake = {
    event: 'transaction.updated',
    data: { transaction: { id: 'smoke-1', status: 'APPROVED', amount_in_cents: 100, reference: 'SMOKE' } },
    environment: 'prod',
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '0'.repeat(64) },
    timestamp: Math.floor(Date.now() / 1000),
    sent_at: new Date().toISOString(),
  };
  const { res } = await hit('/api/webhooks/wompi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fake) });
  if (res.status === 401) log('ok', 'webhook Wompi con firma falsa → 401');
  else if (res.status === 503) {
    demo = true;
    log(o['demo-ok'] ? 'warn' : 'fail', 'webhook Wompi', '503: sitio en MODO DEMO (sin base de datos)');
  } else log('fail', 'webhook Wompi con firma falsa', `HTTP ${res.status} (debía ser 401)`);
});
await step('sesión sin token', async () => {
  const { res } = await hit('/api/auth/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (res.status === 400) log('ok', 'POST /api/auth/session sin token → 400');
  else if (res.status === 503) {
    demo = true;
    log(o['demo-ok'] ? 'warn' : 'fail', 'POST /api/auth/session', '503: Firebase Admin o BD sin configurar');
  } else log(res.status === 429 ? 'warn' : 'fail', 'POST /api/auth/session sin token', `HTTP ${res.status}`);
});

// 7. Dominio: http→https y www↔apex
if (!o['no-domain'] && !/vercel\.app$/.test(baseUrl.hostname)) {
  await step('http→https', async () => {
    const { res } = await hit(`http://${baseUrl.host}/`);
    const loc = res.headers.get('location') ?? '';
    log(res.status >= 301 && res.status <= 308 && loc.startsWith('https://') ? 'ok' : 'fail', 'http:// redirige a https://', `HTTP ${res.status} ${loc}`);
  });
  const alt = baseUrl.hostname.startsWith('www.') ? baseUrl.hostname.slice(4) : `www.${baseUrl.hostname}`;
  await step('www/apex', async () => {
    const { res } = await hit(`https://${alt}/`);
    const loc = res.headers.get('location') ?? '';
    log(res.status >= 301 && res.status <= 308 && loc.includes(baseUrl.hostname) ? 'ok' : 'fail', `${alt} redirige a ${baseUrl.hostname}`, `HTTP ${res.status} ${loc}`);
  });
}

// Resumen de latencia
if (timings.length) {
  const sorted = timings.map((t) => t.ms).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const slow = timings.reduce((a, b) => (b.ms > a.ms ? b : a));
  log(p95 > maxMs ? 'warn' : 'ok', 'latencia', `p50 ${p50} ms · p95 ${p95} ms · máx ${slow.ms} ms (${slow.path})`);
}

const failed = results.filter((r) => r.status === 'fail').length;
const warned = results.filter((r) => r.status === 'warn').length;
if (o.json) console.log(JSON.stringify({ base, ok: failed === 0, demo, failed, warned, results }, null, 2));
else console.log(`\n${failed ? `✗ ${failed} comprobación(es) fallaron` : '✓ Despliegue OK'}${warned ? ` · ${warned} advertencia(s)` : ''}${demo ? ' · MODO DEMO' : ''}`);
process.exit(failed ? 1 : 0);
