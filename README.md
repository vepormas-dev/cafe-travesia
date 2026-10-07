# Café Travesía · ecosistema digital

Sitio, e-commerce, academia, CMS, app iOS/Android y servicio push de **Café Travesía**: café especial de Caicedo, Antioquia, con punto de venta en el Parque Comercial Florida (Medellín). *Cultivamos, tostamos y servimos café especial. Porque si vas a tomar café… que sea de verdad.*

## Arquitectura en resumen

- **Web y API:** Next.js 16 (Cache Components) en **Vercel**: landing, tienda, suscripciones, academia, área de cliente, CMS (`/admin`) y API REST (`/api`, `/api/v1`).
- **Datos:** MySQL/MariaDB del **cPanel** del cliente, con Drizzle ORM. Se accede por una **pasarela PHP firmada con HMAC** (`gateway.<dominio>`), sin exponer el puerto 3306. Los archivos se guardan en el disco del hosting (`media.<dominio>`) y se suben directo desde el navegador.
- **Integraciones:**
  - Firebase Auth: correo, Google y Apple.
  - Wompi: Web Checkout y cobros recurrentes.
  - SMTP del cPanel.
  - Expo Push.
  - IA con una API compatible con OpenAI (opcional, con respaldo por reglas).
- **App:** Expo SDK 57 (`apps/mobile`). Usa la misma API y el mismo Firebase.
- **Modo demo:** sin variables de entorno, todo compila y se muestra con datos de ejemplo. Las escrituras quedan bloqueadas.

Detalle: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) · Contrato de la API: [docs/API.md](docs/API.md) · Despliegue: [docs/deploy/](docs/deploy/README.md).

## Estructura del monorepo (npm workspaces)

```
apps/web           Next.js: sitio, tienda, academia, cuenta, CMS y API          (workspace "web")
apps/mobile        Expo/React Native: app iOS y Android                        (workspace "mobile")
packages/shared    marca, formatos, precios, validaciones zod y tipos DTO      (@travesia/shared)
packages/db        esquema Drizzle, cliente gateway|mysql, migraciones y seed  (@travesia/db)
infra/cpanel       pasarela PHP (db.php, media.php, health.php) y .htaccess    → infra/cpanel/README.md
scripts            secretos, validación de env, pruebas de humo y respaldos    → docs/deploy/README.md
docs               arquitectura, API, despliegue y diseño (mockups, referentes)
.github/workflows  CI
```

## Requisitos

- **Node 22** (`nvm install 22`) y **npm 10** (`packageManager: npm@10.9.3`).
- Para las pruebas de la BD: **PHP 8.1 o superior** con `pdo_mysql` y `fileinfo`, y `xz` (descomprime el MySQL de prueba). En Fedora/RHEL: `dnf -y install xz`; en Debian/Ubuntu: `apt-get install xz-utils`.
- Para la app: Expo CLI (`npx expo`) y, para builds, EAS CLI.

## Desarrollo local

```bash
npm install                      # en la raíz: instala todos los workspaces

# Web en modo demo (sin variables): catálogo de ejemplo, sin login ni pagos
npm run dev                      # http://localhost:3000  (turbo → next dev en apps/web)

# Web con servicios reales
cp apps/web/.env.example apps/web/.env.local
node scripts/check-env.mjs -f apps/web/.env.local --target development
npm run dev

# App móvil (ver apps/mobile/README.md para sus variables EXPO_PUBLIC_*)
cd apps/mobile && npx expo start
```

En `/admin`, el modo demo entra como un administrador ficticio para recorrer el CMS sin BD.

## Pruebas y verificación

```bash
npm run test -w @travesia/shared       # unitarias (precios, etc.)
npm run test -w @travesia/db           # integración: levanta MySQL real (mysql-memory-server) + pasarela PHP (php -S)
                                       # y prueba migraciones, CRUD, transacciones, firma HMAC, DDL bloqueado,
                                       # subida de medios y el driver mysql2
node scripts/selftest.mjs              # autoprueba de los scripts de despliegue contra la misma pasarela
(cd apps/web && npx tsc --noEmit)      # tipos (igual en packages/shared, packages/db y apps/mobile)
(cd apps/web && npx next build)        # build de producción en modo demo, sin variables
```

La CI (`.github/workflows/ci.yml`) ejecuta todo lo anterior en cada push y cada PR.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de la web |
| `npm run build` | Build de la web (turbo) |
| `npm run typecheck` | `tsc --noEmit` en los workspaces con script `typecheck` |
| `npm run test` | Pruebas de todos los workspaces (turbo) |
| `npm run db:generate` | Genera una migración SQL desde `packages/db/src/schema.ts` (drizzle-kit) |
| `npm run db:migrate` | Aplica las migraciones pendientes (requiere `DB_DRIVER` + credenciales; con la pasarela, `allow_ddl=true` temporal) |
| `npm run db:seed` | Carga el contenido inicial (idempotente, `INSERT IGNORE`) |
| `scripts/gen-secrets.sh` | Genera `DB_GATEWAY_SECRET`, `CRON_SECRET` y `REVALIDATE_SECRET` |
| `node scripts/check-env.mjs -f <archivo>` | Valida variables de entorno y combinaciones |
| `node scripts/gateway-smoke.mjs` | Prueba de humo de la pasarela de cPanel |
| `node scripts/smoke-prod.mjs <url>` | Prueba de humo de un despliegue |
| `node scripts/sql-bundle.mjs --out x.sql` | SQL de migraciones listo para phpMyAdmin |

## Despliegue

Orden, responsables y checklist en **[docs/deploy/README.md](docs/deploy/README.md)**:

- [00 Checklist](docs/deploy/00-checklist.md)
- [01 Base de datos](docs/deploy/01-cpanel-base-de-datos.md)
- [02 Pasarela y medios](docs/deploy/02-cpanel-pasarela-y-medios.md)
- [03 DNS y dominio](docs/deploy/03-dns-y-dominio.md)
- [04 Firebase](docs/deploy/04-firebase-auth.md)
- [05 Vercel](docs/deploy/05-vercel.md)
- [06 Cron](docs/deploy/06-cron.md)
- [07 Wompi](docs/deploy/07-wompi.md)
- [08 Correo](docs/deploy/08-correo-smtp.md)
- [09 IA y push](docs/deploy/09-ia-y-push.md)
- [10 App móvil](docs/deploy/10-app-movil.md)
- [11 Operación](docs/deploy/11-operacion.md)
- [12 Seguridad](docs/deploy/12-seguridad.md)
- [13 Traspaso](docs/deploy/13-traspaso-al-cliente.md)
- [Variables](docs/deploy/variables.md)

## Contribuir

Ramas, commits, PRs, migraciones y reglas de Cache Components: [CONTRIBUTING.md](CONTRIBUTING.md).
