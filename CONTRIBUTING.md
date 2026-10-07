# Cómo contribuir · Café Travesía

## Ramas

| Rama | Uso |
|---|---|
| `main` | Producción. Vercel despliega a Production. **Protegida**: solo entra por PR con la CI en verde y 1 aprobación |
| `develop` (opcional) | Integración y staging. Tiene URL estable de Preview |
| `feat/<tema>` | Funcionalidad nueva (p. ej. `feat/eliminar-cuenta`) |
| `fix/<tema>` | Corrección |
| `chore/<tema>`, `docs/<tema>` | Mantenimiento, dependencias, documentación |

Ramas cortas: nombres en minúscula, con guiones y sin tildes. Antes de abrir el PR, rebasa sobre `main` (`git pull --rebase origin main`).

## Commits (convencionales, en español)

```
<tipo>(<ámbito>): <resumen en imperativo, minúscula, sin punto final>

<cuerpo opcional: qué y por qué>
```

- **Tipos:** `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `ci`, `build`.
- **Ámbitos:** `web`, `mobile`, `shared`, `db`, `infra`, `deploy`, `ci`.
- **Ejemplos:**
  - `feat(web): agrega eliminación de cuenta en /cuenta`
  - `fix(db): fuerza utf8mb4 en migraciones importadas`
  - `docs(deploy): runbook de pasarela caída`
- Un cambio que rompe el contrato de la API (`docs/API.md`) o el protocolo de la pasarela lleva `!` (`feat(web)!: …`) y una nota `BREAKING CHANGE:` en el cuerpo.
- Nunca subas secretos: `.env*`, `config.php`, `*.p8`, JSON de cuentas de servicio, keystores. Si ocurre, **rota el secreto**; borrarlo del historial no basta.

## Pull requests

1. Título con el mismo formato que el commit principal.
2. Descripción: qué cambia, por qué, cómo probarlo, capturas si hay UI, y si toca variables de entorno, migraciones o el contrato de la API.
3. Checklist antes de pedir revisión:

```bash
npm ci
(cd packages/shared && npx tsc --noEmit) && (cd packages/db && npx tsc --noEmit)
(cd apps/web && npx tsc --noEmit) && (cd apps/mobile && npx tsc --noEmit)
npm run test -w @travesia/shared
npm run test -w @travesia/db          # si tocaste packages/db o infra/cpanel
node scripts/selftest.mjs             # si tocaste scripts/ o infra/cpanel
(cd apps/web && npx next build)       # sin variables: debe compilar en modo demo
```

4. Si agregas una variable de entorno, actualiza en el mismo PR:
   - `apps/web/src/lib/env.ts`;
   - `apps/web/.env.example`;
   - `scripts/lib/env-spec.mjs`;
   - `docs/deploy/variables.md` (`node scripts/check-env.mjs --markdown`).
5. Revisa el despliegue de Preview que Vercel comenta en el PR. Las Preview están protegidas con Vercel Authentication.
6. Merge con **squash**. El mensaje final sigue la convención.

## Migraciones

El esquema vive en `packages/db/src/schema.ts` (Drizzle, MySQL).

1. Edita `schema.ts`.
2. Genera el SQL (no necesita conexión):

```bash
npm run db:generate      # crea packages/db/migrations/000N_<nombre>.sql y actualiza meta/
```

3. **Revisa el SQL a mano:**
   - Compatible hacia atrás: agrega columnas `NULL` o con `DEFAULT`. Para renombrar o eliminar, hazlo en 2 despliegues (*expand/contract*), porque Instant Rollback de Vercel no revierte la BD.
   - Sin `DROP` accidentales.
   - Índices sobre `varchar` de 191 caracteres o menos (utf8mb4).
   - Tipos válidos en MySQL 5.7.8+ y MariaDB 10.3+.
   - Cada tabla nueva toma `utf8mb4_unicode_ci` de `migrate.ts` y de `sql-bundle.mjs`.
4. Ajusta `seed-data.ts` o `seed.ts` si hace falta. El seed debe seguir siendo idempotente (`INSERT IGNORE`).
5. Prueba: `npm run test -w @travesia/db` (aplica todas las migraciones dos veces sobre MySQL real).
6. Aplicación en producción: [docs/deploy/01-cpanel-base-de-datos.md §5](docs/deploy/01-cpanel-base-de-datos.md#5-aplicar-migraciones). Orden: respaldo → `allow_ddl=true` → `npm run db:migrate` → desplegar → `allow_ddl=false`. Para phpMyAdmin usa `node scripts/sql-bundle.mjs --from 000N`, **nunca** el `.sql` crudo de drizzle (`--> statement-breakpoint` no es SQL válido).
7. No edites una migración que ya se aplicó en algún entorno: crea otra.

## Reglas de Cache Components (Next.js 16, `cacheComponents: true`)

Lee antes `apps/web/AGENTS.md` y `node_modules/next/dist/docs/01-app/`: `01-getting-started/08-caching.md`, `09-revalidating.md`, `07-mutating-data.md` y `03-api-reference/01-directives/use-cache.md`.

- **Prohibido** `export const dynamic`, `revalidate` o `fetchCache` en segmentos: no aplican con Cache Components.
- **Datos públicos:** usa las funciones de `apps/web/src/lib/data/catalog.ts`, que ya usan `"use cache"` + `cacheTag`. No leas la BD directamente en páginas públicas.
- **Contenido dinámico por petición:** todo lo que use `cookies()`, `headers()`, `searchParams`, `getSessionUser()` o la BD sin caché va dentro de `<Suspense>` con un fallback digno (skeleton).
- **Rutas `[slug]`:** usa `generateStaticParams` desde el catálogo, o lee `params` dentro de un componente envuelto en `Suspense`.
- **Mutaciones:** Server Actions (`'use server'`) o Route Handlers. Valida con los esquemas zod de `@travesia/shared`. Después de cambiar contenido público, llama `invalidate([TAGS.x])` de `lib/data/revalidate.ts` (`'action'` en Server Actions, `'route'` en Route Handlers).
- **Modo demo:** sin BD, todo debe renderizar con `seed-data`. Las escrituras responden `demoBlocked()` o muestran `<DemoNotice/>`. **El build debe pasar sin variables de entorno.**
- **Seguridad:** filtra siempre por `user.id`. Staff con `requireStaff()` o `apiStaff()`, y lo sensible (roles, pagos, configuración) con `requireAdmin()`. Aplica `rateLimit` en los endpoints públicos que escriben.
- **Límite de Vercel:** las peticiones a funciones admiten 4,5 MB como máximo. Los archivos se suben con el ticket directo a `media.php`, no por Server Actions.

## Estilo

- TypeScript estricto, sin `any` innecesarios. Íconos `lucide-react`, gráficos `recharts`.
- Textos de la interfaz en español de Colombia. Precios con `formatCOP`.
- No agregues dependencias sin justificarlas en el PR. Web: `npm i <pkg> -w web`. App: `npx expo install <pkg>` desde `apps/mobile`.
