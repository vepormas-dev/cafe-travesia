# Variables de entorno · tabla maestra

Fuente de verdad del código: `apps/web/src/lib/env.ts`, `packages/db/src/client.ts`, `apps/web/next.config.ts` y `apps/web/src/lib/firebase/client.ts`. La tabla se genera con `node scripts/check-env.mjs --markdown` desde `scripts/lib/env-spec.mjs`. Si agregas una variable al código, agrégala también a ese catálogo y a `apps/web/.env.example`, y vuelve a generar esta tabla.

- **Obligatoria = Sí**: sin ella, una función queda apagada o el sitio cae en modo demo.
- **Condicional**: obligatoria según el driver o la integración que elijas.
- 🔒 = secreto. En Vercel márcala como *Sensitive*. Nunca la pongas con prefijo `NEXT_PUBLIC_`.
- **Entornos**: P = Production, V = Preview. Las `NEXT_PUBLIC_*` se incrustan al compilar, así que si las cambias debes **volver a desplegar**.
- La app móvil tiene sus propias variables `EXPO_PUBLIC_*`: ver `apps/mobile/README.md`.

Valida un archivo antes de cargarlo en Vercel:

```bash
node scripts/check-env.mjs -f .work/.env.production --target production
node scripts/check-env.mjs -f .work/.env.preview --target preview
```

### Sitio

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://cafetravesia.co` | Sí | P, V | URL canónica del sitio, sin "/" final. Se usa en correos, redirect-url de Wompi, sitemap y metadatos. Por defecto: `https://cafetravesia.co`. | Dominio final (03-dns-y-dominio.md). En Preview: la URL estable de la rama. |
| `NEXT_PUBLIC_WHATSAPP` | `573001234567` | Sí | P, V | Número de WhatsApp en formato internacional sin "+" ni espacios. Por defecto: `573000000000 (ficticio)`. | Cliente (13-traspaso-al-cliente.md). |

### Base de datos (cPanel)

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `DB_DRIVER` | `gateway` | Sí | P, V | "gateway" (pasarela PHP en cPanel, recomendado en Vercel) o "mysql" (conexión directa con mysql2). Por defecto: `se infiere: gateway si hay DB_GATEWAY_URL; mysql si hay DATABASE_URL`. | Decisión de arquitectura: gateway en Hobby; mysql solo con Vercel Pro + Static IPs. |
| `DB_GATEWAY_URL` | `https://gateway.cafetravesia.co` | Condicional | P, V | URL base de la pasarela (sin /db.php y sin "/" final). También es la URL de subida de medios. | Subdominio gateway.<dominio> (02-cpanel-pasarela-y-medios.md). |
| `DB_GATEWAY_SECRET` 🔒 | `<96 caracteres hex de scripts/gen-secrets.sh>` | Condicional | P, V (distinto si Preview usa otra BD) | Secreto HMAC compartido con config.php de la pasarela (firma BD, medios y tickets de subida). | scripts/gen-secrets.sh; el MISMO valor va en config.php → secret. |
| `DB_GATEWAY_TIMEOUT_MS` | `12000` | No | P, V | Tiempo máximo por llamada a la pasarela (ms). Hay 1 reintento ante red/502-504. Por defecto: `12000`. | Ajuste fino. |
| `DATABASE_URL` 🔒 | `mysql://usuario_ctapp:CLAVE@servidor.hosting.com:3306/usuario_cafetravesia` | Condicional | P, V | Solo con DB_DRIVER=mysql. Requiere "Remote Database Access" en cPanel. | cPanel › Manage My Databases + Remote Database Access. |
| `DB_POOL_SIZE` | `3` | No | P, V | Conexiones por instancia con DB_DRIVER=mysql (cuida max_user_connections del hosting). Por defecto: `3`. | Ajuste fino. |
| `DB_SSL` | `strict` | No | P, V | Solo mysql: "false" sin TLS, "strict" TLS verificando el certificado; cualquier otro valor/ausente: TLS sin verificar. Por defecto: `TLS sin verificar certificado`. | Según el servidor MySQL del hosting. |

### Medios (cPanel)

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_MEDIA_URL` | `https://media.cafetravesia.co` | Sí | P, V | URL pública de la carpeta de medios. Su host se autoriza en next/image (next.config.ts) en tiempo de BUILD. Por defecto: `https://media.cafetravesia.co`. | Subdominio media.<dominio> (02-cpanel-pasarela-y-medios.md). |
| `MEDIA_GATEWAY_URL` | `https://gateway.cafetravesia.co` | No | P, V | Solo si media.php vive en otra URL distinta a la pasarela de BD. Usa el mismo DB_GATEWAY_SECRET. Por defecto: `DB_GATEWAY_URL`. | Normalmente vacío. |

### Firebase Auth

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyA-EJEMPLO-no-real-000000000000` | Sí | P, V | Configuración web de Firebase (pública). | Firebase › Configuración del proyecto › General › Tus apps › App web. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `cafe-travesia.firebaseapp.com` | Sí | P, V | Dominio de autenticación (popup de Google/Apple). | Igual que arriba. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `cafe-travesia` | Sí | P, V | ID del proyecto (también sirve al Admin SDK si falta FIREBASE_PROJECT_ID). | Igual que arriba. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456789012:web:abcdef0123456789abcdef` | Sí | P, V | ID de la app web. | Igual que arriba. |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` 🔒 | `<JSON de la cuenta de servicio en base64, una línea>` | Sí | P, V | Credencial del Admin SDK (verifica tokens, crea la cookie de sesión, custom claims). Alternativa: las 3 variables siguientes. | Firebase › Configuración › Cuentas de servicio › Generar nueva clave privada; `base64 -w0 archivo.json`. |
| `FIREBASE_PROJECT_ID` | `cafe-travesia` | No | P, V | Alternativa a la base64 (junto con CLIENT_EMAIL y PRIVATE_KEY). | project_id del JSON. |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@cafe-travesia.iam.gserviceaccount.com` | No | P, V | Alternativa a la base64. | client_email del JSON. |
| `FIREBASE_PRIVATE_KEY` 🔒 | `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"` | No | P, V | Alternativa a la base64. Los "\n" literales se convierten en saltos de línea. | private_key del JSON. |
| `ADMIN_EMAILS` | `gabo@cafetravesia.co,admin@cafetravesia.co` | Sí | P, V | Correos que reciben rol admin al iniciar sesión (arranque del primer administrador). Separados por coma. | Cliente. |

### Pagos Wompi

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `WOMPI_ENV` | `production` | Sí | P, V | "sandbox" o "production". Define la URL del API y el ambiente esperado en los eventos (test/prod). Por defecto: `sandbox`. | production en Production; sandbox en Preview. |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | `pub_prod_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Sí | P (prod), V (test) | Llave pública del comercio (Web Checkout, tokenización). | comercios.wompi.co › Desarrolladores (activa «modo de pruebas» para ver las de sandbox). |
| `WOMPI_PRIVATE_KEY` 🔒 | `prv_prod_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Sí | P (prod), V (test) | Llave privada (fuentes de pago, cobros recurrentes, conciliación). | Igual que arriba. |
| `WOMPI_INTEGRITY_SECRET` 🔒 | `prod_integrity_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Sí | P (prod), V (test) | Secreto de integridad (firma del checkout y de cada cobro). | comercios.wompi.co › Desarrolladores › secretos de integración. |
| `WOMPI_EVENTS_SECRET` 🔒 | `prod_events_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Sí | P (prod), V (test) | Secreto de eventos (verifica el checksum del webhook). Sin él TODO webhook responde 401. | Igual que arriba. |

### Correo SMTP

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `SMTP_HOST` | `mail.cafetravesia.co` | Sí | P, V | Servidor SMTP (cuenta de correo del cPanel). Debe tener certificado TLS válido para ese nombre. | cPanel › Email Accounts › Connect Devices › Mail Client Manual Settings. |
| `SMTP_PORT` | `465` | No | P, V | 465 = TLS implícito (secure). 587 = STARTTLS. Por defecto: `465`. | Igual que arriba. |
| `SMTP_USER` | `pedidos@cafetravesia.co` | Sí | P, V | Usuario SMTP = dirección completa del buzón. | Igual que arriba. |
| `SMTP_PASS` 🔒 | `<contraseña del buzón>` | Sí | P, V | Contraseña del buzón. | cPanel › Email Accounts (al crear o cambiar contraseña). |
| `MAIL_FROM` | `Café Travesía <pedidos@cafetravesia.co>` | No | P, V | Remitente. Usa el MISMO buzón de SMTP_USER (o un alias del mismo dominio) para pasar SPF/DKIM/DMARC. Por defecto: `Café Travesía <hola@cafetravesia.co>`. | Decisión del cliente. |
| `MAIL_REPLY_TO` | `hola@cafetravesia.co` | No | P, V | Dirección de respuesta. | Cliente. |
| `ADMIN_NOTIFY_EMAIL` | `pedidos@cafetravesia.co` | No | P, V | Buzón interno que recibe avisos (pedidos nuevos, leads, asesor humano). | Cliente. |

### IA (API compatible con OpenAI)

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `OPENAI_API_KEY` 🔒 | `sk-proj-XXXXXXXXXXXXXXXX` | No | P (V opcional) | Clave de la API de IA. Sin clave: chatbot, búsqueda y tutor responden por reglas. | platform.openai.com › API keys (o el proveedor compatible). |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | No | P, V | URL base de una API compatible con OpenAI (sin "/" final). Por defecto: `https://api.openai.com/v1`. | Proveedor. |
| `OPENAI_MODEL` | `gpt-4.1-mini` | No | P, V | Modelo de chat. Por defecto: `gpt-4.1-mini`. | Proveedor. |
| `OPENAI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | No | P, V | Modelo de respaldo si el principal responde 429/5xx o no contesta. | Proveedor. |
| `OPENAI_REASONING_EFFORT` | `low` | No | P, V | Solo modelos de razonamiento (Gemini 2.5+/3, o-series): none, low, medium o high. | Proveedor. |

### Operación

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `CRON_SECRET` 🔒 | `<64 caracteres hex de scripts/gen-secrets.sh>` | Sí | P (V con otro valor) | Protege /api/cron. Vercel Cron lo envía solo como "Authorization: Bearer"; el cron de cPanel usa el mismo valor. | scripts/gen-secrets.sh. |
| `REVALIDATE_SECRET` 🔒 | `<64 caracteres hex>` | No | P, V | Reservada (env.ts la lee, pero ninguna ruta la usa todavía). | scripts/gen-secrets.sh. |
| `APPLE_TEAM_ID` | `ABCDE12345` | No | P | Team ID de Apple Developer; publica /.well-known/apple-app-site-association para Universal Links de la app iOS. | developer.apple.com › Membership details. |
| `ANDROID_SHA256_FINGERPRINTS` | `AB:CD:…:EF` | No | P | Huellas SHA-256 del certificado de firma Android (separadas por coma) para /.well-known/assetlinks.json (App Links). | eas credentials › Android, o Play Console › Integridad de la app. |
| `EXPO_ACCESS_TOKEN` 🔒 | `<token de expo.dev>` | No | P | Solo si activas "Enhanced push security" en EAS: entonces es OBLIGATORIO o los push fallan con UNAUTHORIZED. | expo.dev › Account settings › Access tokens. |

### Build / pruebas

| Variable | Ejemplo (ficticio) | Obligatoria | Entornos | Descripción | Dónde se obtiene |
|---|---|---|---|---|---|
| `NEXT_DIST_DIR` | `.next-ci` | No | local/CI | Carpeta de salida del build (builds aislados en CI/agentes). NO la definas en Vercel. Por defecto: `.next`. | — |
| `SKIP_TYPECHECK` | `1` | No | local | "1" omite el chequeo de tipos de next build. NO la uses en Vercel ni en CI. | — |
| `TEST_MYSQL_VERSION` | `8.4.x` | No | local/CI | Versión de MySQL de la prueba de integración (npm run test -w @travesia/db). Por defecto: `8.4.x`. | — |

## Reglas que valida `check-env.mjs`

| Regla | Por qué |
|---|---|
| Driver de BD completo (`gateway` → URL + secreto; `mysql` → `DATABASE_URL`) | Si falta una pieza, `dbDriver()` devuelve `null` y el sitio cae **en silencio** en modo demo. |
| `DB_GATEWAY_URL` sin `/` final ni `/db.php` | `client.ts` recorta la barra final, pero `storage.ts` y `monitor.ts` no: quedaría `//media.php`. |
| Las 4 llaves de Wompi con el prefijo de `WOMPI_ENV` | Si mezclas `test` y `prod`, las firmas y los eventos fallan. El webhook ignora eventos de otro ambiente. |
| `WOMPI_EVENTS_SECRET` presente si hay llaves | `isWompiConfigured()` no la exige, pero sin ella todo webhook responde 401. |
| La cuenta de servicio y `NEXT_PUBLIC_FIREBASE_PROJECT_ID` son del mismo proyecto | Si no, `verifyIdToken` rechaza todos los tokens. |
| `MAIL_FROM` del mismo dominio y buzón que `SMTP_USER` | SPF, DKIM y DMARC, y la política de remitentes de Exim en cPanel. |
| Ningún secreto con prefijo `NEXT_PUBLIC_` | Se publicaría en el JavaScript del navegador. |
| `CRON_SECRET` de 16 o más caracteres | Es el mínimo que recomienda Vercel para Cron Jobs. |

Variables del sistema que Vercel define sola y que no se configuran: `VERCEL_ENV` (el código la usa como `env.isProd`), `VERCEL_URL`, `NODE_ENV` (decide la cookie `secure`) y `VERCEL_REGION`.
