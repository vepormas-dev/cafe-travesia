#!/usr/bin/env node
// Une packages/db/migrations/*.sql en UN archivo apto para importar en phpMyAdmin:
//  - quita los marcadores "--> statement-breakpoint" de drizzle-kit,
//  - fuerza utf8mb4_unicode_ci en cada CREATE TABLE (igual que scripts/migrate.ts),
//  - crea `_migrations` y registra cada archivo, para que `npm run db:migrate` no lo repita.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HELP = `Uso: node scripts/sql-bundle.mjs [--from 0001] [--only 0003_x.sql] [--out archivo.sql]

Genera el SQL para phpMyAdmin (cPanel › Databases › phpMyAdmin › Importar).

Opciones:
  --from <prefijo>   Incluye solo migraciones con nombre >= prefijo (p. ej. 0001)
  --only <archivo>   Incluye solo ese archivo
  --out <ruta>       Escribe en un archivo (por defecto: salida estándar)
  -h, --help         Esta ayuda

Ejemplo:
  node scripts/sql-bundle.mjs --out .work/cafe-travesia-migraciones.sql`;

let o;
try {
  o = parseArgs({ options: { from: { type: 'string' }, only: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean', short: 'h' } } }).values;
} catch (e) {
  console.error(e.message + '\n\n' + HELP);
  process.exit(2);
}
if (o.help) {
  console.log(HELP);
  process.exit(0);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'db', 'migrations');
let files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
if (o.only) files = files.filter((f) => f === o.only);
if (o.from) files = files.filter((f) => f >= o.from);
if (!files.length) {
  console.error('No hay migraciones que coincidan.');
  process.exit(1);
}

const out = [
  `-- Café Travesía · migraciones para phpMyAdmin · ${new Date().toISOString()}`,
  `-- Archivos: ${files.join(', ')}`,
  '-- Importa con la BD seleccionada en el panel izquierdo. Formato: SQL. Juego de caracteres: utf-8.',
  'SET NAMES utf8mb4;',
  "SET time_zone = '+00:00';",
  'CREATE TABLE IF NOT EXISTS `_migrations` (`name` varchar(191) NOT NULL PRIMARY KEY, `applied_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
  '',
];
for (const f of files) {
  const statements = readFileSync(join(dir, f), 'utf8')
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  out.push(`-- ===== ${f} (${statements.length} sentencias) =====`);
  for (const st of statements) {
    const body = st.replace(/;\s*$/, '');
    out.push((/^CREATE TABLE/i.test(body) ? `${body} DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` : body) + ';');
  }
  out.push(`INSERT IGNORE INTO \`_migrations\` (name) VALUES ('${f.replace(/'/g, "''")}');`, '');
}
const sql = out.join('\n') + '\n';
if (o.out) {
  writeFileSync(o.out, sql);
  console.error(`✓ ${o.out} (${files.length} migración(es), ${(sql.length / 1024).toFixed(1)} KB)`);
} else process.stdout.write(sql);
