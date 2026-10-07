#!/usr/bin/env node
// Valida las variables de entorno de apps/web contra el catálogo de scripts/lib/env-spec.mjs
// y advierte combinaciones inválidas (las mismas reglas que aplican env.ts y packages/db).
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { GROUPS, VARS, SYSTEM_VARS, byName } from './lib/env-spec.mjs';
import { resolveEnv, val } from './lib/dotenv.mjs';

const HELP = `Uso: node scripts/check-env.mjs [opciones]

Valida un archivo .env (o el entorno actual) para apps/web.

Opciones:
  -f, --file <ruta>     Archivo .env a validar (por defecto: variables del entorno actual)
      --merge           Combina el archivo con el entorno actual (el archivo gana)
  -t, --target <ent>    production | preview | development  (por defecto: production)
      --strict          Las advertencias también hacen fallar (exit 1)
      --markdown        Imprime la tabla maestra de variables en Markdown y sale
      --quiet           Solo muestra errores y advertencias
  -h, --help            Muestra esta ayuda

Ejemplos:
  node scripts/check-env.mjs --file apps/web/.env.production
  vercel env pull .work/.env.vercel --environment=production && node scripts/check-env.mjs -f .work/.env.vercel
  node scripts/check-env.mjs --target preview --file .env.preview

Códigos de salida: 0 = OK, 1 = errores (o advertencias con --strict), 2 = uso incorrecto.`;

let opts;
try {
  opts = parseArgs({
    options: {
      file: { type: 'string', short: 'f' },
      merge: { type: 'boolean', default: false },
      target: { type: 'string', short: 't', default: 'production' },
      strict: { type: 'boolean', default: false },
      markdown: { type: 'boolean', default: false },
      quiet: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }).values;
} catch (e) {
  console.error(e.message + '\n\n' + HELP);
  process.exit(2);
}
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}

if (opts.markdown) {
  const req = { prod: 'Sí', cond: 'Condicional', opt: 'No' };
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  for (const [g, title] of Object.entries(GROUPS)) {
    const rows = VARS.filter((v) => v.group === g);
    if (!rows.length) continue;
    console.log(`\n### ${title}\n`);
    console.log('| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |');
    console.log('|---|---|---|---|---|---|');
    for (const v of rows) {
      const def = v.default ? ` Por defecto: \`${esc(v.default)}\`.` : '';
      console.log(`| \`${v.name}\`${v.secret ? ' 🔒' : ''} | \`${esc(v.example)}\` | ${req[v.required]} | ${esc(v.envs)} | ${esc(v.desc)}${def} | ${esc(v.source)} |`);
    }
  }
  process.exit(0);
}

const target = opts.target;
if (!['production', 'preview', 'development'].includes(target)) {
  console.error(`--target inválido: ${target}`);
  process.exit(2);
}
if (opts.file && !existsSync(opts.file)) {
  console.error(`No existe el archivo: ${opts.file}`);
  process.exit(2);
}

const env = resolveEnv(opts.file, { merge: opts.merge });
const get = (k) => val(env, k);
const errors = [];
const warns = [];
const infos = [];
const ok = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const info = (m) => infos.push(m);
const isProd = target === 'production';
const isPlaceholder = (s) => /CAMBIAR|XXXX|EJEMPLO|<[^>@]*>|changeme|example\.com/i.test(s);

// 1) Formato de cada variable conocida
for (const v of VARS) {
  const x = get(v.name);
  if (x === undefined) continue;
  if (isPlaceholder(x)) err(`${v.name} tiene un valor de ejemplo/plantilla ("${x.slice(0, 40)}"). Reemplázalo.`);
  else if (v.pattern && !v.pattern.test(x)) err(`${v.name} con formato inválido${v.hint ? ` (esperado: ${v.hint})` : ''}.`);
}

// 2) Variables con nombre parecido a las conocidas (errores de tipeo) y secretos públicos
const known = new Set([...VARS.map((v) => v.name), ...SYSTEM_VARS]);
if (opts.file) {
  for (const k of Object.keys(env)) {
    if (known.has(k)) continue;
    if (/^(NEXT_PUBLIC_|DB_|WOMPI_|FIREBASE_|SMTP_|MAIL_|OPENAI_|EXPO_|CRON_|ADMIN_|MEDIA_)/.test(k)) warn(`${k} no la usa el código (¿error de tipeo?).`);
  }
}
for (const k of Object.keys(env)) {
  if (/^NEXT_PUBLIC_.*(SECRET|PRIVATE|PASS|TOKEN)/.test(k)) err(`${k}: un secreto con prefijo NEXT_PUBLIC_ se expone en el navegador. Quita el prefijo.`);
}

// 3) Base de datos — misma lógica que packages/db/src/client.ts → dbDriver()
const drvRaw = get('DB_DRIVER') ?? (get('DB_GATEWAY_URL') ? 'gateway' : get('DATABASE_URL') ? 'mysql' : '');
let driver = null;
if (drvRaw === 'gateway' && get('DB_GATEWAY_URL') && get('DB_GATEWAY_SECRET')) driver = 'gateway';
if (drvRaw === 'mysql' && get('DATABASE_URL')) driver = 'mysql';
if (!driver) {
  const why =
    drvRaw === 'gateway'
      ? 'DB_DRIVER=gateway pero falta DB_GATEWAY_URL o DB_GATEWAY_SECRET'
      : drvRaw === 'mysql'
        ? 'DB_DRIVER=mysql pero falta DATABASE_URL'
        : 'sin DB_DRIVER/DB_GATEWAY_URL/DATABASE_URL';
  (target === 'development' ? info : err)(`Base de datos NO configurada (${why}) → el sitio queda en MODO DEMO (sin pagos, sin login, sin escrituras).`);
} else {
  ok.push(`Base de datos: driver ${driver}`);
  if (!get('DB_DRIVER')) warn('Define DB_DRIVER explícitamente (gateway o mysql) para evitar inferencias.');
  if (driver === 'mysql') {
    warn('DB_DRIVER=mysql: requiere Remote Database Access abierto a las IP de Vercel. En Hobby no hay IP fija (habría que abrir "%"): usa gateway salvo que tengas Vercel Pro + Static IPs.');
    if (get('DB_SSL') === 'false') warn('DB_SSL=false: la conexión a MySQL viaja sin cifrar por internet.');
  }
}
const gw = get('DB_GATEWAY_URL');
if (gw) {
  if (/\/$/.test(gw)) err('DB_GATEWAY_URL termina en "/": storage.ts arma `${url}/media.php` y quedaría "//media.php". Quita la barra final.');
  if (/\.php$/i.test(gw)) err('DB_GATEWAY_URL debe ser la URL BASE (sin /db.php).');
  if (!/^https:\/\//.test(gw) && !/^http:\/\/(127\.0\.0\.1|localhost)/.test(gw)) err('DB_GATEWAY_URL debe usar https:// (la firma no cifra el contenido).');
}
const mgw = get('MEDIA_GATEWAY_URL');
if (mgw && /\/$/.test(mgw)) err('MEDIA_GATEWAY_URL termina en "/". Quita la barra final.');
if (get('DB_GATEWAY_SECRET') && /['"\\$\s]/.test(get('DB_GATEWAY_SECRET'))) err('DB_GATEWAY_SECRET contiene comillas, "\\", "$" o espacios: se corrompe al copiarlo a config.php. Usa scripts/gen-secrets.sh (hex).');
if (driver && !(mgw ?? gw)) warn('Sin DB_GATEWAY_URL/MEDIA_GATEWAY_URL: la subida de medios del CMS queda deshabilitada.');
if (driver === 'mysql' && !gw && !mgw) info('Con DB_DRIVER=mysql igual necesitas MEDIA_GATEWAY_URL + DB_GATEWAY_SECRET para el almacenamiento de medios.');

// 4) URLs del sitio
const site = get('NEXT_PUBLIC_SITE_URL');
if (!site && isProd) warn('NEXT_PUBLIC_SITE_URL vacía: se usará https://cafetravesia.co.');
if (site && isProd && !site.startsWith('https://')) err('NEXT_PUBLIC_SITE_URL debe ser https:// en producción.');
if (site && isProd && /vercel\.app/.test(site)) warn('NEXT_PUBLIC_SITE_URL apunta a *.vercel.app en producción: usa el dominio final.');
const media = get('NEXT_PUBLIC_MEDIA_URL');
if (!media && isProd) warn('NEXT_PUBLIC_MEDIA_URL vacía: se usará https://media.cafetravesia.co.');
if (get('NEXT_PUBLIC_WHATSAPP') === '573000000000' || (!get('NEXT_PUBLIC_WHATSAPP') && isProd)) warn('NEXT_PUBLIC_WHATSAPP sin definir o con el número ficticio 573000000000.');

// 5) Firebase
const fbClient = ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'];
const fbClientSet = fbClient.filter((k) => get(k));
if (fbClientSet.length && fbClientSet.length < 3) err(`Firebase web incompleto: faltan ${fbClient.filter((k) => !get(k)).join(', ')}.`);
if (!fbClientSet.length && target !== 'development') err('Firebase web sin configurar: no habrá inicio de sesión en el sitio.');
if (fbClientSet.length === 3 && !get('NEXT_PUBLIC_FIREBASE_APP_ID')) warn('Falta NEXT_PUBLIC_FIREBASE_APP_ID (recomendada).');
let saProject = null;
const b64 = get('FIREBASE_SERVICE_ACCOUNT_BASE64');
if (b64) {
  try {
    const j = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    for (const f of ['project_id', 'client_email', 'private_key']) if (!j[f]) err(`FIREBASE_SERVICE_ACCOUNT_BASE64 no contiene "${f}".`);
    if (j.type && j.type !== 'service_account') err('FIREBASE_SERVICE_ACCOUNT_BASE64 no es una cuenta de servicio (type != service_account).');
    saProject = j.project_id ?? null;
    if (saProject) ok.push(`Firebase Admin: cuenta de servicio de ${saProject}`);
  } catch {
    err('FIREBASE_SERVICE_ACCOUNT_BASE64 no es base64 de un JSON válido (genera con: base64 -w0 cuenta.json).');
  }
} else {
  const trio = ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const pid = get('FIREBASE_PROJECT_ID') ?? get('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (trio.every((k) => get(k)) && pid) {
    saProject = pid;
    if (!get('FIREBASE_PRIVATE_KEY').includes('BEGIN PRIVATE KEY')) err('FIREBASE_PRIVATE_KEY no parece una clave PEM.');
  } else if (trio.some((k) => get(k))) err('Firebase Admin incompleto: usa FIREBASE_SERVICE_ACCOUNT_BASE64 o las 3 variables FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY.');
  else if (target !== 'development') err('Firebase Admin sin configurar: /api/auth/session responde 503 y nadie puede iniciar sesión.');
}
if (saProject && get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') && saProject !== get('NEXT_PUBLIC_FIREBASE_PROJECT_ID'))
  err(`La cuenta de servicio es del proyecto "${saProject}" pero NEXT_PUBLIC_FIREBASE_PROJECT_ID="${get('NEXT_PUBLIC_FIREBASE_PROJECT_ID')}": los tokens no validarán.`);
if (!get('ADMIN_EMAILS') && isProd) warn('ADMIN_EMAILS vacía: nadie obtendrá rol admin automáticamente (habría que editar la tabla users a mano).');

// 6) Wompi
const wEnv = get('WOMPI_ENV') ?? 'sandbox';
const wKeys = ['NEXT_PUBLIC_WOMPI_PUBLIC_KEY', 'WOMPI_PRIVATE_KEY', 'WOMPI_INTEGRITY_SECRET'];
const wSet = wKeys.filter((k) => get(k));
if (wSet.length && wSet.length < 3) err(`Wompi incompleto: faltan ${wKeys.filter((k) => !get(k)).join(', ')} (isWompiConfigured() exige las 3).`);
if (!wSet.length && target !== 'development') err('Wompi sin llaves: el checkout responde 503 ("pagos aún no configurados").');
if (wSet.length === 3) {
  ok.push(`Wompi: ${wEnv}`);
  const expect = wEnv === 'production' ? { pub: 'pub_prod_', prv: 'prv_prod_', int: 'prod_integrity_', evt: 'prod_events_' } : { pub: 'pub_test_', prv: 'prv_test_', int: 'test_integrity_', evt: 'test_events_' };
  const chk = (k, p) => get(k) && !get(k).startsWith(p) && err(`${k} no corresponde a WOMPI_ENV=${wEnv} (debe empezar por ${p}).`);
  chk('NEXT_PUBLIC_WOMPI_PUBLIC_KEY', expect.pub);
  chk('WOMPI_PRIVATE_KEY', expect.prv);
  chk('WOMPI_INTEGRITY_SECRET', expect.int);
  chk('WOMPI_EVENTS_SECRET', expect.evt);
  if (!get('WOMPI_EVENTS_SECRET')) err('Falta WOMPI_EVENTS_SECRET: el webhook rechazará TODOS los eventos (401) y los pagos solo se confirmarán por conciliación.');
  if (isProd && wEnv !== 'production') warn('WOMPI_ENV=sandbox en Production: los pagos son de prueba.');
  if (target === 'preview' && wEnv === 'production') warn('WOMPI_ENV=production en Preview: cobros REALES desde despliegues de prueba.');
}
if (get('WOMPI_ENV') === undefined && wSet.length) warn('WOMPI_ENV sin definir → sandbox.');

// 7) SMTP
const sKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const sSet = sKeys.filter((k) => get(k));
if (sSet.length && sSet.length < 3) err(`SMTP incompleto: faltan ${sKeys.filter((k) => !get(k)).join(', ')}.`);
if (!sSet.length && target !== 'development') warn('SMTP sin configurar: no se envían correos (confirmaciones, certificados, avisos).');
if (sSet.length === 3) {
  ok.push(`SMTP: ${get('SMTP_HOST')}:${get('SMTP_PORT') ?? 465}`);
  const port = Number(get('SMTP_PORT') ?? 465);
  if (port === 25) warn('SMTP_PORT=25 suele estar bloqueado y no cifra: usa 465.');
  const fromAddr = (get('MAIL_FROM') ?? 'Café Travesía <hola@cafetravesia.co>').match(/<([^>]+)>/)?.[1] ?? get('MAIL_FROM');
  const userDom = get('SMTP_USER').split('@')[1]?.toLowerCase();
  const fromDom = fromAddr?.split('@')[1]?.toLowerCase();
  if (userDom && fromDom && userDom !== fromDom) warn(`MAIL_FROM (${fromAddr}) y SMTP_USER (${get('SMTP_USER')}) son de dominios distintos: DMARC puede rechazar.`);
  if (fromAddr && get('SMTP_USER') && fromAddr.toLowerCase() !== get('SMTP_USER').toLowerCase())
    info(`MAIL_FROM (${fromAddr}) ≠ SMTP_USER: Exim de cPanel puede reescribir o rechazar el remitente si no es el mismo buzón o un alias/forwarder propio.`);
}

// 8) IA, cron, push
if (get('OPENAI_API_KEY')) ok.push(`IA: ${get('OPENAI_MODEL') ?? 'gpt-4.1-mini'} @ ${get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'}`);
else info('Sin OPENAI_API_KEY: IA por reglas (válido).');
if (get('OPENAI_BASE_URL') && /\/$/.test(get('OPENAI_BASE_URL'))) info('OPENAI_BASE_URL con "/" final (el código lo recorta).');
if (!get('CRON_SECRET') && target !== 'development') err('Falta CRON_SECRET: /api/cron responde 401 siempre y no corren cobros, conciliación ni push programados.');
if (get('CRON_SECRET') && /[^A-Za-z0-9_-]/.test(get('CRON_SECRET'))) warn('CRON_SECRET con caracteres especiales: complica el curl del cron de cPanel. Usa hex.');
if (!get('EXPO_ACCESS_TOKEN')) info('Sin EXPO_ACCESS_TOKEN: válido mientras NO actives "Enhanced push security" en EAS.');
if (get('REVALIDATE_SECRET')) info('REVALIDATE_SECRET está definida pero ninguna ruta la usa todavía.');
if (get('SKIP_TYPECHECK') === '1') warn('SKIP_TYPECHECK=1: no la definas en Vercel/CI.');
if (get('NEXT_DIST_DIR')) warn('NEXT_DIST_DIR definida: en Vercel debe quedar vacía (Vercel espera .next).');

// 9) Requeridas faltantes (resumen)
if (target !== 'development') {
  const missing = VARS.filter((v) => v.required === 'prod' && !get(v.name) && !(v.name === 'FIREBASE_SERVICE_ACCOUNT_BASE64' && get('FIREBASE_PRIVATE_KEY'))).map((v) => v.name);
  if (missing.length) info(`Obligatorias de producción sin definir: ${missing.join(', ')}`);
}

// Salida
const src = opts.file ? opts.file + (opts.merge ? ' + entorno' : '') : 'entorno actual';
console.log(`check-env · ${src} · objetivo: ${target}`);
if (!opts.quiet) for (const m of ok) console.log(`  ✓ ${m}`);
for (const m of errors) console.log(`  ✗ ${m}`);
for (const m of warns) console.log(`  ! ${m}`);
if (!opts.quiet) for (const m of infos) console.log(`  · ${m}`);
console.log(`\n${errors.length} ${errors.length === 1 ? 'error' : 'errores'}, ${warns.length} ${warns.length === 1 ? 'advertencia' : 'advertencias'}.`);
void byName;
process.exit(errors.length || (opts.strict && warns.length) ? 1 : 0);
