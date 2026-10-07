# 12 · Seguridad: amenazas, controles, hardening y Ley 1581

**Objetivo:** documentar qué protege el sistema y cómo, cerrar el checklist de hardening antes de salir a producción y cumplir el régimen colombiano de protección de datos personales (habeas data).

**Prerrequisitos:** haber completado [02](02-cpanel-pasarela-y-medios.md), [04](04-firebase-auth.md), [05](05-vercel.md) y [07](07-wompi.md).

## 1. Modelo de amenazas resumido

| Activo | Amenaza | Control implementado (código) |
|---|---|---|
| BD en cPanel | Acceso directo o fuerza bruta al puerto 3306 | El puerto no se expone: Vercel usa la pasarela por HTTPS. *Remote Database Access* queda **vacío** con `DB_DRIVER=gateway` |
| Pasarela `db.php` | Peticiones falsificadas o repetidas | **HMAC-SHA256** de `timestamp.body` con un secreto de 64 o más caracteres y comparación `hash_equals`. Ventana **anti-replay de 90 s** (`lib.php: ct_verify_signature`). Límite de cuerpo de 8 MB |
| Pasarela | Destrucción o exfiltración del esquema | **DDL bloqueado** (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`, `GRANT`, `REVOKE`) salvo `allow_ddl=true`. `INTO OUTFILE`, `DUMPFILE`, `LOAD_FILE` y `LOAD DATA` siempre prohibidos. Sentencias **preparadas** (sin emulación) y usuario con solo DML |
| Medios | Subir un webshell | Ticket firmado y con vencimiento, emitido solo a staff. **MIME real** verificado con `finfo` contra una lista blanca. Nombre aleatorio y extensión según el MIME. La carpeta `media.` **no ejecuta** PHP ni CGI (`RemoveHandler`, `FilesMatch` deny, `engine off`). `nosniff` |
| Medios | Path traversal al borrar | `realpath` debe quedar dentro de `media.dir`. Se rechazan `..` y rutas absolutas |
| Sesión web | Robo de cookie, XSS o CSRF | Cookie de sesión de Firebase **httpOnly**, `Secure` en producción y `SameSite=Lax`, de 14 días. Se crea solo con un login de menos de 10 min y `DELETE` revoca los refresh tokens. Cabeceras: `X-Frame-Options SAMEORIGIN`, `nosniff`, HSTS con preload, `Referrer-Policy` y `Permissions-Policy` |
| Autorización | Acceso a datos de otros o escalada de rol | El rol vive en MySQL (fuente de verdad), con `requireStaff`/`requireAdmin`/`apiStaff`. Las consultas se filtran por `user.id`. El editor no gestiona pagos, roles ni configuración |
| Pagos | Webhook falso o monto alterado | **Checksum de Wompi** con el secreto de eventos (`timingSafeEqual`) y **ambiente** verificado. El pedido se aprueba **solo si el monto coincide** con el total. Integridad firmada en el checkout. Los precios se recalculan en el servidor (`/api/cart/quote`, `/api/checkout`) |
| Pagos | Reintentos o duplicados | **Idempotencia**: clave única `payment_events(provider, external_id, status)` y actualizaciones condicionales (`UPDATE … WHERE status = 'pending'`). Ver el caso de concurrencia del cobro recurrente en [06](06-cron.md) |
| Endpoints públicos | Abuso o spam | **Rate limiting** en BD (`lib/rate-limit.ts`, por IP de `x-forwarded-for` de Vercel): sesión 20/min, checkout 10/min, leads, newsletter, chat, IA… Honeypot en leads |
| Cron | Ejecución por terceros | `Authorization: Bearer CRON_SECRET`, que también se acepta como `?key=`. Ver el punto 4 del §2 |
| Secretos | Fuga | Solo en variables de Vercel (*Sensitive*) y en `config.php` (fuera de git, deniega el acceso web, permisos 600). `.gitignore` cubre `.env*`, `*.p8`, `*.pem`, `service-account*.json` y `config.php` |
| Hosting compartido | WordPress comprometido (spam de casinos) | Corte y limpieza ([03](03-dns-y-dominio.md) §6). Los subdominios nuevos quedan fuera de `public_html` |

## 2. Checklist de hardening

**cPanel**

- [ ] 2FA activo (*Security › Two-Factor Authentication*) en cPanel y en el portal del hosting.
- [ ] WordPress desactivado y borrado tras 30 días. Sin cron, FTP, SSH keys ni API tokens desconocidos ([03](03-dns-y-dominio.md) §6.2).
- [ ] `config.php` con permisos 600, `allow_ddl => false` y `display_errors=Off` (`gateway-smoke` verifica el acceso y el DDL).
- [ ] `cpuser_ctapp` solo con SELECT, INSERT, UPDATE y DELETE. *Remote Database Access* sin hosts (o solo las Static IPs de Vercel Pro si se usa `mysql`).
- [ ] ModSecurity activo en el dominio principal y en `media.` (excepción solo para la pasarela).
- [ ] AutoSSL vigente en `gateway`, `media` y `mail`, con Force HTTPS.

**Vercel**

- [ ] Equipo del cliente con 2FA. Miembros mínimos, y el agente con rol *Developer*.
- [ ] Secretos marcados como *Sensitive*. Preview **sin** llaves de producción de Wompi y con una BD distinta.
- [ ] Deployment Protection: Standard Protection.
- [ ] Rama `main` protegida en GitHub (PR + CI obligatorios, ver [CONTRIBUTING.md](../../CONTRIBUTING.md)).

**Aplicación**

- [ ] `ADMIN_EMAILS` solo con los dueños.
- [ ] Firebase: protección contra enumeración activa, API key restringida por referer y dominios autorizados mínimos.
- [ ] Wompi: usuarios del dashboard con 2FA y roles mínimos.
- [ ] `node scripts/smoke-prod.mjs` en verde (cabeceras, 401 de cron y webhook).

**Pendientes de código (reportados al equipo web)**

1. Eliminación de cuenta (`DELETE /api/v1/me`). La exigen la Ley 1581 (supresión) y las tiendas. Ver [10](10-app-movil.md) §6.
2. Bloqueo condicional del cobro de suscripciones ([06](06-cron.md)).
3. Content-Security-Policy: no está en `next.config.ts`. Recomendada en modo *report-only* primero (Wompi, Firebase y `media.`).
4. `/api/cron` acepta `?key=CRON_SECRET`. Los secretos en la URL quedan en logs: usa solo el header y elimina esa opción del código.

## 3. Ley 1581 de 2012 (habeas data) y aviso de privacidad

La Ley 1581 de 2012 y su reglamentación (Decreto 1377 de 2013, compilado en el Decreto 1074 de 2015) regulan el tratamiento de datos personales en Colombia; la SIC es la autoridad. Esto es una guía técnica, **no asesoría legal**: el cliente debe validar los textos con su abogado.

| Requisito | Dónde se cumple | Estado |
|---|---|---|
| Política de tratamiento de datos: responsable (razón social, NIT, dirección, correo, teléfono), finalidades, derechos del titular (conocer, actualizar, rectificar, suprimir, revocar), procedimiento y plazos de consultas y reclamos, y vigencia | `https://cafetravesia.co/privacidad` (página existente) | Completar con los **datos reales** del responsable ([13](13-traspaso-al-cliente.md)) |
| **Autorización previa, expresa e informada** | Casilla en el registro, el checkout, el newsletter y los leads, con enlace a la política. Wompi pide su propia autorización (`personalAuthToken`) para suscripciones | Verificar con el cliente que el texto de cada formulario mencione las finalidades (marketing por separado: `marketingOptIn`) |
| Aviso de privacidad | Enlace visible en el footer y en la app (Perfil › «Política de tratamiento de datos») | Hecho en la app. Verificar en la web |
| Derechos del titular: acceso y rectificación | `/cuenta` (perfil, direcciones) y `GET`/`PATCH /api/v1/me` | Hecho |
| Derecho de supresión | Falta el flujo de eliminación | **Pendiente** (§2, punto 1). Mientras tanto, publica en `/privacidad` un correo de atención (`hola@cafetravesia.co`) y atiende a mano en máximo 15 días hábiles (reclamos) |
| Encargados y transferencias | Vercel (EE. UU.), Firebase/Google (EE. UU.), Wompi (Colombia), el proveedor de IA (EE. UU.), Expo (EE. UU.) y el hosting cPanel | Declararlos en la política (transferencia o transmisión internacional) |
| Registro Nacional de Bases de Datos (RNBD) ante la SIC | Obligación para sociedades y entidades sin ánimo de lucro con activos de más de 100.000 UVT | El cliente confirma con su contador si le aplica |
| Seguridad de la información | §1 y §2 | Hecho / en curso |
| Retención | `integration_events` 90 días. Pedidos: plazos contables y tributarios | Definir y publicar en la política |
| Menores de edad | La tienda no está dirigida a menores | Indicarlo en la política |

## Verificación

- El checklist del §2 está marcado, con evidencias en el ticket.
- `/privacidad` muestra los datos reales del responsable y el cliente aprobó el texto por escrito.
- `smoke-prod.mjs` y `gateway-smoke.mjs` en verde.

## Si algo falla

- **Sospecha de compromiso:**
  1. Rota **todos** los secretos ([11](11-operacion.md) §4).
  2. Revisa los accesos en Vercel, Firebase, Wompi y cPanel.
  3. Revisa `audit_log` (`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100;`).
  4. Pide al hosting un escaneo de malware.
  5. Si se expusieron datos personales, la Ley 1581 obliga a reportar el incidente a la SIC: el cliente coordina con su asesor legal.
- **Fallo de un control** (por ejemplo, `config.php` accesible): corrígelo de inmediato y rota el secreto afectado.
