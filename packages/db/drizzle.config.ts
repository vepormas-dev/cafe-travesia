import { defineConfig } from 'drizzle-kit';

// Solo se usa para GENERAR los archivos SQL de migración (no necesita conexión).
// Las migraciones se aplican con `npm run db:migrate` (vía pasarela o MySQL directo)
// o importando en phpMyAdmin el SQL único que genera `node scripts/sql-bundle.mjs`.
export default defineConfig({
  dialect: 'mysql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'mysql://user:pass@localhost:3306/cafe_travesia' },
});
