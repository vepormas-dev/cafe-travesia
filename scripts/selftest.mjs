#!/usr/bin/env node
// Autoprueba local de los scripts de despliegue contra una pasarela REAL:
//   MySQL (mysql-memory-server) ◀── infra/cpanel/gateway (php -S) ◀── scripts/*.mjs
// Requisitos: Node 22, PHP ≥ 8.1 con pdo_mysql y fileinfo, xz (para descomprimir MySQL),
// dependencias instaladas (npm ci). Uso: node scripts/selftest.mjs [--keep] [--verbose]
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.log(`Uso: node scripts/selftest.mjs [--keep] [--verbose]

Prueba gen-secrets.sh, check-env.mjs, sql-bundle.mjs (importación estilo phpMyAdmin),
gateway-smoke.mjs (con DDL permitido y bloqueado, secreto incorrecto, medios) y backup-mysql.sh
contra MySQL real + pasarela PHP local. --keep conserva la carpeta temporal.`);
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = join(root, 'scripts');
const require = createRequire(join(root, 'packages', 'db', 'package.json'));
const { createDB } = await import(pathToFileURL(require.resolve('mysql-memory-server')).href);

let failures = 0;
const check = (cond, name, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};
const run = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 120_000 });

// 1. gen-secrets.sh
const gs = run('bash', [join(scripts, 'gen-secrets.sh')]);
const secrets = Object.fromEntries([...gs.stdout.matchAll(/^([A-Z_]+)=([0-9a-f]+)$/gm)].map((m) => [m[1], m[2]]));
check(gs.status === 0 && secrets.DB_GATEWAY_SECRET?.length === 96 && secrets.CRON_SECRET?.length === 64 && secrets.REVALIDATE_SECRET?.length === 64, 'gen-secrets.sh genera 3 secretos hex (96/64/64)');
const gsj = run('bash', [join(scripts, 'gen-secrets.sh'), '--format', 'json', '--only', 'CRON_SECRET']);
check(gsj.status === 0 && /^\{"CRON_SECRET":"[0-9a-f]{64}"\}$/.test(gsj.stdout.trim()), 'gen-secrets.sh --format json --only');
check(run('bash', [join(scripts, 'gen-secrets.sh'), '--nope']).status === 2, 'gen-secrets.sh rechaza opciones desconocidas (exit 2)');

// 2. check-env.mjs
const work = mkdtempSync(join(tmpdir(), 'ct-selftest-'));
const sa = Buffer.from(JSON.stringify({ type: 'service_account', project_id: 'cafe-travesia-test', client_email: 'sdk@cafe-travesia-test.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nAAA\n-----END PRIVATE KEY-----\n' })).toString('base64');
const goodEnv = `NEXT_PUBLIC_SITE_URL=https://cafetravesia.co
NEXT_PUBLIC_MEDIA_URL=https://media.cafetravesia.co
NEXT_PUBLIC_WHATSAPP=573001112233
DB_DRIVER=gateway
DB_GATEWAY_URL=https://gateway.cafetravesia.co
DB_GATEWAY_SECRET=${secrets.DB_GATEWAY_SECRET}
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA0000000000000000000000000000000
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cafe-travesia-test.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cafe-travesia-test
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef0123456789
FIREBASE_SERVICE_ACCOUNT_BASE64=${sa}
ADMIN_EMAILS=gabo@cafetravesia.co
WOMPI_ENV=production
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_abc123
WOMPI_PRIVATE_KEY=prv_prod_abc123
WOMPI_INTEGRITY_SECRET=prod_integrity_abc123
WOMPI_EVENTS_SECRET=prod_events_abc123
SMTP_HOST=mail.cafetravesia.co
SMTP_PORT=465
SMTP_USER=pedidos@cafetravesia.co
SMTP_PASS="clave segura"
MAIL_FROM="Café Travesía <pedidos@cafetravesia.co>"
CRON_SECRET=${secrets.CRON_SECRET}
`;
writeFileSync(join(work, 'good.env'), goodEnv);
const ce1 = run('node', [join(scripts, 'check-env.mjs'), '-f', join(work, 'good.env')]);
check(ce1.status === 0 && /0 errores/.test(ce1.stdout), 'check-env: .env de producción válido → 0 errores', ce1.status ? ce1.stdout : '');
const bad = goodEnv
  .replace('WOMPI_ENV=production', 'WOMPI_ENV=sandbox')
  .replace(/^WOMPI_EVENTS_SECRET=.*$/m, '')
  .replace('DB_GATEWAY_URL=https://gateway.cafetravesia.co', 'DB_GATEWAY_URL=https://gateway.cafetravesia.co/')
  .replace('NEXT_PUBLIC_FIREBASE_PROJECT_ID=cafe-travesia-test', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID=otro-proyecto')
  .concat('NEXT_PUBLIC_WOMPI_PRIVATE_KEY=prv_prod_x\nWOMPI_EVENT_SECRET=typo\n');
writeFileSync(join(work, 'bad.env'), bad);
const ce2 = run('node', [join(scripts, 'check-env.mjs'), '-f', join(work, 'bad.env')]);
const expected = ['no corresponde a WOMPI_ENV=sandbox', 'Falta WOMPI_EVENTS_SECRET', 'termina en "/"', 'los tokens no validarán', 'se expone en el navegador', 'WOMPI_EVENT_SECRET no la usa'];
check(ce2.status === 1 && expected.every((e) => ce2.stdout.includes(e)), 'check-env: detecta combinaciones inválidas', expected.filter((e) => !ce2.stdout.includes(e)).join(' | '));
const ce3 = run('node', [join(scripts, 'check-env.mjs'), '-f', join(root, 'apps', 'web', '.env.example'), '--target', 'development']);
check(ce3.status === 0, 'check-env: apps/web/.env.example (development) sin errores', ce3.status ? ce3.stdout.split('\n').filter((l) => l.includes('✗')).join(' | ') : '');
const ce4 = run('node', [join(scripts, 'check-env.mjs'), '-f', join(work, 'empty.env')]);
check(ce4.status === 2, 'check-env: archivo inexistente → exit 2');

// 3. MySQL + pasarela
console.log('• Iniciando MySQL…');
const mysql = await createDB({ version: process.env.TEST_MYSQL_VERSION ?? '8.4.x', dbName: 'cafe_travesia', logLevel: 'ERROR' });
const mediaDir = join(work, 'media');
const cfg = join(work, 'config.php');
const portGw = 19080 + Math.floor(Math.random() * 500);
const portMedia = portGw + 600;
const secret = secrets.DB_GATEWAY_SECRET;
const writeCfg = (allowDdl) =>
  writeFileSync(
    cfg,
    `<?php return ['secret' => '${secret}', 'db' => ['host' => '127.0.0.1', 'port' => ${mysql.port}, 'name' => '${mysql.dbName}', 'user' => '${mysql.username}', 'pass' => ''], 'allow_ddl' => ${allowDdl}, 'max_skew' => 90, 'media' => ['dir' => '${mediaDir}', 'base_url' => 'http://127.0.0.1:${portMedia}', 'max_bytes' => 5000000, 'allowed_mime' => ['image/png', 'image/jpeg', 'application/pdf']], 'cors_origins' => ['https://cafetravesia.co']];\n`,
  );
writeCfg(true);
spawnSync('mkdir', ['-p', mediaDir]);
const gwDir = join(root, 'infra', 'cpanel', 'gateway');
const php = spawn('php', ['-S', `127.0.0.1:${portGw}`, '-t', gwDir], { env: { ...process.env, CT_GATEWAY_CONFIG: cfg }, stdio: 'ignore' });
const phpMedia = spawn('php', ['-S', `127.0.0.1:${portMedia}`, '-t', mediaDir], { stdio: 'ignore' });
const base = `http://127.0.0.1:${portGw}`;
const gwEnv = { DB_GATEWAY_URL: base, DB_GATEWAY_SECRET: secret };
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/health.php`)).status < 500) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  // 3a. Importación estilo phpMyAdmin del archivo de sql-bundle.mjs
  const bundle = join(work, 'bundle.sql');
  const sb = run('node', [join(scripts, 'sql-bundle.mjs'), '--out', bundle]);
  check(sb.status === 0 && existsSync(bundle), 'sql-bundle.mjs genera el SQL único');
  const imp = run('php', [
    '-r',
    `$p=new PDO('mysql:host=127.0.0.1;port=${mysql.port};dbname=${mysql.dbName};charset=utf8mb4','${mysql.username}','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::MYSQL_ATTR_MULTI_STATEMENTS=>true]);$s=$p->prepare(file_get_contents('${bundle}'));$s->execute();do{}while($s->nextRowset());echo "ok";`,
  ]);
  check(imp.status === 0 && imp.stdout.includes('ok'), 'importación del SQL único (como phpMyAdmin) sin errores', imp.stderr.slice(0, 300));

  // 3b. db:migrate reconoce lo importado (no repite)
  const mig = run('npx', ['tsx', join(root, 'packages', 'db', 'scripts', 'migrate.ts')], { DB_DRIVER: 'gateway', ...gwEnv });
  check(mig.status === 0 && /al día/.test(mig.stdout) && !/→/.test(mig.stdout), 'npm run db:migrate tras importar: nada pendiente', (mig.stdout + mig.stderr).slice(0, 300));

  // 3c. gateway-smoke con DDL permitido + medios
  const s1 = run('node', [join(scripts, 'gateway-smoke.mjs'), '--no-apache', '--expect-ddl', 'allowed', '--media-write'], gwEnv);
  check(s1.status === 0, 'gateway-smoke (allow_ddl=true, --media-write) pasa', s1.status ? s1.stdout : '');
  if (process.argv.includes('--verbose')) console.log(s1.stdout);
  check(/charset de la BD — cafe_travesia: utf8mb4/.test(s1.stdout) || /charset de la BD/.test(s1.stdout), 'gateway-smoke informa charset/tablas');

  // 3d. DDL bloqueado
  writeCfg(false);
  const s2 = run('node', [join(scripts, 'gateway-smoke.mjs'), '--no-apache', '--json'], gwEnv);
  let j2 = {};
  try {
    j2 = JSON.parse(s2.stdout);
  } catch {}
  check(s2.status === 0 && j2.ok === true, 'gateway-smoke (allow_ddl=false) pasa en modo --json');
  const s2b = run('node', [join(scripts, 'gateway-smoke.mjs'), '--no-apache', '--expect-ddl', 'allowed'], gwEnv);
  check(s2b.status === 1 && /allow_ddl=false/.test(s2b.stdout), 'gateway-smoke detecta allow_ddl distinto al esperado');
  const mig2 = run('npx', ['tsx', join(root, 'packages', 'db', 'scripts', 'migrate.ts')], { DB_DRIVER: 'gateway', ...gwEnv });
  check(mig2.status !== 0 && /DDL deshabilitado/.test(mig2.stdout + mig2.stderr), 'db:migrate con allow_ddl=false falla (requiere activarlo aunque no haya pendientes)');

  // 3e. Secreto incorrecto
  const s3 = run('node', [join(scripts, 'gateway-smoke.mjs'), '--no-apache'], { ...gwEnv, DB_GATEWAY_SECRET: 'x'.repeat(96) });
  check(s3.status === 1 && /no coinciden/.test(s3.stdout), 'gateway-smoke con secreto incorrecto falla y lo explica');

  // 3f. Uso incorrecto
  check(run('node', [join(scripts, 'gateway-smoke.mjs')], { DB_GATEWAY_URL: '', DB_GATEWAY_SECRET: '' }).status === 2, 'gateway-smoke sin URL/secreto → exit 2');

  // 4. backup-mysql.sh con el mysqldump de los binarios descargados
  const binRoot = join(tmpdir(), 'mysqlmsn', 'binaries');
  let dumpBin = null;
  if (existsSync(binRoot)) {
    const walk = (d, depth = 0) => {
      if (dumpBin || depth > 4) return;
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (e === 'mysqldump' && statSync(p).isFile()) dumpBin = p;
        else if (statSync(p).isDirectory()) walk(p, depth + 1);
      }
    };
    walk(binRoot);
  }
  if (dumpBin) {
    const cnf = join(work, 'my.cnf');
    writeFileSync(cnf, `[client]\nuser=${mysql.username}\nhost=127.0.0.1\nport=${mysql.port}\n`);
    const bk = run('bash', [join(scripts, 'backup-mysql.sh'), '--db', mysql.dbName, '--dir', join(work, 'backups'), '--defaults-file', cnf], { PATH: `${dirname(dumpBin)}:${process.env.PATH}` });
    check(bk.status === 0 && /OK .*\.sql\.gz/.test(bk.stdout), 'backup-mysql.sh crea y valida el .sql.gz', (bk.stdout + bk.stderr).slice(0, 300));
  } else console.log('! backup-mysql.sh no probado (no se encontró mysqldump en los binarios descargados)');
} finally {
  php.kill();
  phpMedia.kill();
  await mysql.stop();
  if (!process.argv.includes('--keep')) rmSync(work, { recursive: true, force: true });
  else console.log(`(carpeta conservada: ${work})`);
}

console.log(failures ? `\n✗ ${failures} comprobación(es) fallaron` : '\n✓ Scripts de despliegue OK');
process.exit(failures ? 1 : 0);
