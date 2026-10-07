/**
 * Aplica las migraciones SQL de ./migrations en orden (idempotente).
 * Funciona con DB_DRIVER=gateway (pasarela PHP en cPanel) o DB_DRIVER=mysql.
 *
 *   DB_DRIVER=gateway DB_GATEWAY_URL=https://gateway.cafetravesia.co DB_GATEWAY_SECRET=... npm run db:migrate
 *
 * Alternativa manual (phpMyAdmin): `node scripts/sql-bundle.mjs --out cafe-travesia.sql` en la raíz del
 * repo genera un único SQL importable (los archivos de migrations/ no se importan directo).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawQuery, isDbConfigured } from '../src/client';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export async function migrate(log = console.log) {
  if (!isDbConfigured()) throw new Error('Configura DB_DRIVER y sus credenciales antes de migrar.');
  const [exists] = await rawQuery<{ n: number }>(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_migrations'",
  );
  if (!Number(exists?.n)) await rawQuery(
    'CREATE TABLE IF NOT EXISTS `_migrations` (`name` varchar(191) NOT NULL PRIMARY KEY, `applied_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  );
  const applied = new Set((await rawQuery<{ name: string }>('SELECT name FROM `_migrations`')).map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const statements = readFileSync(join(dir, file), 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    log(`→ ${file} (${statements.length} sentencias)`);
    for (const st of statements) {
      // Todas las tablas en utf8mb4 (emojis, tildes) aunque la BD de cPanel tenga otro default
      const sql = /^CREATE TABLE/i.test(st) ? st.replace(/;\s*$/, '') + ' DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : st;
      await rawQuery(sql);
    }
    await rawQuery('INSERT INTO `_migrations` (name) VALUES (?)', [file]);
  }
  log('✓ Migraciones al día');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
