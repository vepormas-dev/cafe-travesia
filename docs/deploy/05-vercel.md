# 05 · Vercel (front y back de apps/web)

**Objetivo:** proyecto `cafe-travesia` en Vercel, construido desde el monorepo con Root Directory `apps/web`, Node 22, funciones en `iad1`, variables por entorno, cron diario, previews protegidas y procedimiento de rollback.

**Prerrequisitos**

- Repositorio en GitHub con acceso para la cuenta o equipo de Vercel **del cliente**.
- Valores de [01](01-cpanel-base-de-datos.md)–[04](04-firebase-auth.md), [07](07-wompi.md) (sandbox) y [08](08-correo-smtp.md).
- Opcional: Vercel CLI (`npm i -g vercel`) para `vercel env pull`.

## Plan: Hobby vs Pro (leer antes de crear el proyecto)

Según las [fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), el plan **Hobby es solo para uso personal no comercial**. Cuentan como uso comercial cobrar a visitantes, anunciar la venta de productos y que alguien reciba pago por crear o alojar el sitio ([plan Hobby](https://vercel.com/docs/plans/hobby)). Café Travesía vende café, cursos y suscripciones, así que **en producción le corresponde el plan Pro**.

**Recomendación:** usa Hobby solo para la preproducción. **Pasa a Pro antes de apuntar el dominio y activar Wompi en producción** (*Settings › Billing › Upgrade*; USD 20 por puesto de desarrollador al mes, con 14 días de prueba). Pro trae:

- Cron por minuto: podrías mover el cron de cPanel a `vercel.json`, aunque eso requiere un cambio de código del equipo web.
- Logs de 1 día (Hobby: 1 h).
- Instant Rollback a cualquier despliegue previo.
- **Static IPs** (USD 100 al mes por proyecto, [docs](https://vercel.com/docs/connectivity/static-ips)). Con ellas puedes usar `DB_DRIVER=mysql` y abrir *Remote Database Access* solo a esas IP. **No es necesario**: la pasarela funciona igual en Pro.

### Límites del plan Hobby relevantes

| Límite (Hobby) | Valor | Impacto en Café Travesía |
|---|---|---|
| Cuerpo de petición o respuesta de una función | **4,5 MB** ([docs](https://vercel.com/docs/functions/limitations)) | Por eso los medios suben **directo** del navegador a `gateway…/media.php` con un ticket firmado. Las Server Actions tienen `bodySizeLimit: '4mb'` |
| Duración máxima de una función | 300 s (fluid compute) | `/api/cron` declara `maxDuration = 60` |
| Cron Jobs | **1 vez al día**, precisión ±59 min ([docs](https://vercel.com/docs/cron-jobs/usage-and-pricing)) | `vercel.json`: `0 13 * * *` (8:00–8:59 Bogotá). Lo frecuente va por el cron de cPanel ([06](06-cron.md)) |
| Invocaciones de funciones | 1.000.000 al mes | Holgado gracias a Cache Components |
| CPU activa / memoria aprovisionada | 4 h CPU / 360 GB-h al mes | Esperar la BD no cuenta como CPU activa |
| Transferencia rápida | 100 GB al mes | El video va por Bunny y las imágenes del CMS por `media.` |
| **Transformaciones de imagen** | **5.000 al mes** | `next/image` genera AVIF y WebP por tamaño. Con un catálogo grande puede agotarse: vigílalo en *Usage* |
| Logs de runtime | 1 hora | Usa `/admin/monitor` (eventos en BD) para la historia |
| Deployment Protection | Vercel Authentication, sin contraseña | Ver §6 |
| Despliegues | 100 al día | — |

Si se excede un límite de Hobby, la función se pausa hasta 30 días ([plan Hobby](https://vercel.com/docs/plans/hobby)). Es otra razón para usar Pro en producción.

## 1. Importar el repositorio

1. [vercel.com/new](https://vercel.com/new) › selecciona el equipo del cliente › **Import Git Repository** › `cafe-travesia`.
2. **Project Name:** `cafe-travesia`.
3. **Root Directory** › *Edit* › `apps/web` ([monorepos](https://vercel.com/docs/monorepos)).
4. **Framework Preset:** Next.js (detectado).
5. **Build and Output Settings:**

| Ajuste | Valor | Nota |
|---|---|---|
| Install Command | *(por defecto)* | Vercel detecta los workspaces de npm con el `package-lock.json` de la raíz e instala desde allí. Si el log de build muestra que no encuentra `@travesia/shared`, sobrescribe con `cd ../.. && npm ci` |
| Build Command | *(por defecto: `npm run build`, que es `next build`)* | **No** definas `SKIP_TYPECHECK` ni `NEXT_DIST_DIR` |
| Output Directory | *(por defecto)* | `.next` |
| Include files outside the Root Directory | **Enabled** (por defecto) | Necesario para `packages/shared` y `packages/db` (`transpilePackages`) |

6. **Environment Variables:** puedes desplegar primero **sin variables** para comprobar el build en modo demo, y cargarlas después (§3).
7. **Deploy.** **Esperado:** «Congratulations» y la URL `cafe-travesia.vercel.app`, con el catálogo de ejemplo.

## 2. Node.js 22

*Settings › Build and Deployment › Node.js Version* › **22.x** ([docs](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)). El `package.json` de la raíz declara `"engines": {"node": ">=22"}`. Vercel interpreta los rangos abiertos como «la última LTS», hoy **24.x**, si lee ese archivo. El que manda con Root Directory `apps/web` es `apps/web/package.json`, que no declara `engines`, así que se usa el ajuste del panel. Comprueba en el log de build la línea del runtime o agrega `node -v` temporalmente.

## 3. Variables por entorno

*Settings › Environment Variables*. Marca los secretos (🔒 en [variables.md](variables.md)) como **Sensitive**. Las `NEXT_PUBLIC_*` se incrustan al compilar: si las cambias, **redespliega** (*Deployments › ⋯ › Redeploy*). Los cambios de variables nunca afectan a despliegues ya hechos ([docs](https://vercel.com/docs/environment-variables)).

| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://cafetravesia.co` | `https://cafe-travesia-git-develop-EQUIPO.vercel.app` (URL estable de la rama) |
| `NEXT_PUBLIC_MEDIA_URL` | `https://media.cafetravesia.co` | igual |
| `NEXT_PUBLIC_WHATSAPP` | número real | igual |
| `DB_DRIVER` | `gateway` | `gateway`, o vacío para que Preview quede en **modo demo** |
| `DB_GATEWAY_URL` | `https://gateway.cafetravesia.co` | Recomendado: una pasarela y BD de **staging** aparte (`gateway-staging.`). Nunca la BD de producción con Wompi en sandbox |
| `DB_GATEWAY_SECRET` 🔒 | secreto de producción | secreto de staging |
| `NEXT_PUBLIC_FIREBASE_*` (4) | proyecto Firebase | igual, o un proyecto de staging |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` 🔒 | cuenta de servicio | igual |
| `ADMIN_EMAILS` | dueños | equipo técnico |
| `WOMPI_ENV` | `production` | `sandbox` |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | `pub_prod_…` | `pub_test_…` |
| `WOMPI_PRIVATE_KEY` 🔒 | `prv_prod_…` | `prv_test_…` |
| `WOMPI_INTEGRITY_SECRET` 🔒 | `prod_integrity_…` | `test_integrity_…` |
| `WOMPI_EVENTS_SECRET` 🔒 | `prod_events_…` | `test_events_…` |
| `SMTP_HOST` / `SMTP_PORT` | `mail.cafetravesia.co` / `465` | igual |
| `SMTP_USER` / `SMTP_PASS` 🔒 | `pedidos@cafetravesia.co` | igual, o un buzón `pruebas@` |
| `MAIL_FROM` / `MAIL_REPLY_TO` / `ADMIN_NOTIFY_EMAIL` | ver [08](08-correo-smtp.md) | `ADMIN_NOTIFY_EMAIL` = correo técnico |
| `OPENAI_API_KEY` 🔒 / `OPENAI_BASE_URL` / `OPENAI_MODEL` | ver [09](09-ia-y-push.md) | opcional (sin clave = reglas) |
| `CRON_SECRET` 🔒 | secreto A | secreto B (distinto) |
| `EXPO_ACCESS_TOKEN` 🔒 | solo si se activa la seguridad mejorada de push | — |
| `REVALIDATE_SECRET` 🔒 | opcional (sin uso hoy) | — |

Antes de pegarlas, valídalas en un archivo local fuera de git:

```bash
node scripts/check-env.mjs -f .work/.env.production --target production   # 0 errores
node scripts/check-env.mjs -f .work/.env.preview --target preview
```

Con la CLI puedes cargarlas y verificarlas:

```bash
vercel link                                  # desde la RAÍZ del repo, elige cafe-travesia
vercel env add WOMPI_PRIVATE_KEY production  # pega el valor cuando lo pida
vercel env pull .work/.env.vercel --environment=production
node scripts/check-env.mjs -f .work/.env.vercel && rm .work/.env.vercel
```

Límite: 64 KB en total por despliegue. El JSON en base64 de la cuenta de servicio ocupa unos 3 KB.

## 4. Región de las funciones: iad1

`apps/web/vercel.json` fija `"regions": ["iad1"]` (Washington D. C.), que también es la región por defecto ([regiones](https://vercel.com/docs/regions)). Vercel recomienda ejecutar las funciones **cerca de los datos**. Cada página no cacheada o API hace una o más idas y vueltas a `gateway.cafetravesia.co`, mientras que los visitantes de Colombia reciben la caché desde el PoP de CDN más cercano, sin importar la región. Vercel no tiene región en Colombia ni en Miami. Las opciones razonables son `iad1` y `gru1` (São Paulo), y la mayoría de los hostings cPanel que se venden en Colombia tienen sus servidores en EE. UU.

- Cómo decidir: mira la latencia de «Base de datos» en `/admin/monitor`. En `iad1` con un hosting en EE. UU., lo esperado es 50–200 ms por consulta. Si el hosting está en Sudamérica y la latencia pasa de 400 ms, prueba `gru1`. Pide al equipo web el cambio en `vercel.json` (no es de este equipo), despliega y compara.
- En Hobby, las funciones corren en una sola región.

## 5. Cron diario (vercel.json)

`vercel.json` define `{ "path": "/api/cron?daily=1", "schedule": "0 13 * * *" }`: todas las tareas, a las 08:xx de Bogotá. Vercel envía `Authorization: Bearer $CRON_SECRET` automáticamente si la variable existe ([manage cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)). En Hobby, una expresión más frecuente **hace fallar el despliegue**. Verifica en *Settings › Cron Jobs* (botón *View Logs*). Vercel no reintenta crons fallidos: el cron de cPanel cubre conciliación, cobros y push ([06](06-cron.md)).

## 6. Protección de previews

*Settings › Deployment Protection* › **Vercel Authentication** con alcance **Standard Protection** ([docs](https://vercel.com/docs/deployment-protection)). Las previews y las URLs de despliegue exigen sesión de Vercel; los dominios de producción quedan públicos. La protección con contraseña no existe en Hobby (en Pro cuesta USD 20 al mes).

- Wompi en sandbox necesita llegar al webhook de Preview. Como las previews están protegidas, la URL de eventos de sandbox debe apuntar a una URL **no protegida**. Usa `https://cafe-travesia.vercel.app/api/webhooks/wompi` (producción con llaves de sandbox, **antes** del corte), o crea en *Deployment Protection › Protection Bypass for Automation* un secreto y agrégalo a la URL: `…/api/webhooks/wompi?x-vercel-protection-bypass=SECRETO`.

## 7. Dominios

*Settings › Domains* › agrega `cafetravesia.co` y `www.cafetravesia.co`, con `www` → *Redirect* 308 al apex. DNS y corte: [03](03-dns-y-dominio.md).

## 8. Analytics (opcional)

*Analytics › Enable* (Web Analytics: 50.000 eventos al mes en Hobby) y *Speed Insights* (10.000 eventos). Requieren `@vercel/analytics` y `@vercel/speed-insights` en el código, que **hoy no están**: es una decisión del equipo web y el cliente, considerando el aviso de privacidad ([12](12-seguridad.md)).

## Verificación

```bash
node scripts/smoke-prod.mjs https://cafe-travesia.vercel.app --no-domain        # antes del corte
CRON_SECRET='<A>' node scripts/smoke-prod.mjs https://cafetravesia.co --cron     # después del corte
```

- Log de build: sin `Type error`, Node 22, «Compiled successfully» y la tabla de rutas con `○` y `◐`.
- `/admin/monitor`: Base de datos en verde (menos de 800 ms), Wompi «Producción», SMTP y Firebase en verde.
- *Settings › Cron Jobs*: 1 job activo.

## Rollback

1. **Instant Rollback:** *Project › Production Deployment* › **Instant Rollback** › Continue › Confirm ([docs](https://vercel.com/docs/instant-rollback)). En Hobby solo permite volver al despliegue **inmediatamente anterior**; en Pro, a cualquiera.
2. Después de un rollback, Vercel **desactiva la asignación automática** de dominios: los nuevos push a `main` no salen a producción hasta que pulses **Undo Rollback** o promuevas un despliegue (`vercel promote <url>`).
3. El rollback **no** revierte las variables de entorno **ni la BD**. Si el despliegue malo incluyó una migración incompatible, restaura la BD ([01](01-cpanel-base-de-datos.md) §8).
4. Cron: queda la configuración del despliegue restaurado.

## Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| `Module not found: @travesia/shared` | Se instaló solo dentro de `apps/web` | Install Command `cd ../.. && npm ci`, y activa «Include files outside the Root Directory» |
| `Hobby accounts are limited to daily cron jobs` | Alguien cambió `vercel.json` | Revierte a `0 13 * * *` o pasa a Pro |
| El sitio en producción muestra «modo demo» | Falta una variable de BD (cae a demo **en silencio**) | `vercel env pull` + `check-env.mjs` y redespliega |
| `413 FUNCTION_PAYLOAD_TOO_LARGE` | Cuerpo de más de 4,5 MB | Sube los archivos por el ticket a `media.php`, no por una Server Action |
| `504 FUNCTION_INVOCATION_TIMEOUT` en `/api/cron` | Lote grande o pasarela lenta | Revisa la latencia de la pasarela. Divide las tareas (`?tasks=billing`) |
| Las imágenes del CMS no cargan (`hostname not configured`) | `NEXT_PUBLIC_MEDIA_URL` cambió sin redesplegar | Redespliega |
| Login: `auth/unauthorized-domain` en Preview | URL de despliegue no autorizada | Usa la URL estable de la rama ([04](04-firebase-auth.md) §3) |
