# 11 · Operación: monitoreo, alertas, respaldos, rotación de secretos y runbooks

**Objetivo:** detectar fallas antes que los clientes, tener respaldos verificados y resolver los incidentes típicos con pasos concretos.

**Prerrequisitos:** producción en línea (00-checklist §A–H).

## 1. Monitoreo

| Qué | Dónde | Umbral |
|---|---|---|
| Salud de integraciones | `https://cafetravesia.co/admin/monitor` (solo staff). Usa `runHealthChecks()` de `lib/monitor.ts` | BD: amarillo con más de 800 ms y rojo si no responde. Pasarela: amarillo con más de 1.200 ms. Cron: amarillo con más de 1,5 h y rojo con más de 26 h. Errores en 24 h: amarillo de 1 a 9 y rojo con 10 o más |
| Eventos de integración | `/admin/monitor` (tabla `integration_events`: wompi, push, email, ai, cron, gateway, auth, storage) | Revisa los `error` todos los días |
| Pasarela | `https://gateway.cafetravesia.co/health.php`: 200 o 503, sin datos sensibles | 503 = MySQL caído |
| Vercel | *Project › Logs* (Hobby: 1 h; Pro: 1 día), *Usage* (transformaciones de imagen, invocaciones) y *Cron Jobs › View Logs* | — |
| Wompi | Dashboard › Transacciones y estado de los eventos entregados | — |

### Monitor externo gratuito

En [UptimeRobot](https://uptimerobot.com) (plan gratis, intervalo de 5 min) o Better Stack, con una cuenta del cliente, crea:

1. HTTP(s) `https://cafetravesia.co/`. Palabra clave esperada: `Café Travesía`.
2. HTTP(s) `https://cafetravesia.co/api/v1/products`. Palabra clave: `"products"`.
3. HTTP(s) `https://gateway.cafetravesia.co/health.php`. Palabra clave: `"ok":true`.
4. Opcional: un *heartbeat* (cron-job.org o la función de heartbeat de Better Stack) que alerte si el cron de cPanel deja de llamar.

Alertas: correo técnico y correo del cliente (más WhatsApp o Telegram si el servicio lo ofrece). Dispara la alerta tras 2 fallos seguidos.

### Revisión semanal (15 min)

```bash
DB_GATEWAY_URL=https://gateway.cafetravesia.co DB_GATEWAY_SECRET='<secreto>' node scripts/gateway-smoke.mjs --media
node scripts/smoke-prod.mjs https://cafetravesia.co
```

Revisa también:

- `/admin/monitor`: errores de la semana.
- Vercel › *Usage*: transformaciones de imagen frente al límite del plan.
- cPanel › *Disk Usage*: la BD, `media.` y `backups/`.
- Que el último respaldo exista: `ls -la ~/backups/mysql | tail -3`.

## 2. Tareas recurrentes

| Frecuencia | Tarea | Responsable |
|---|---|---|
| Diaria | Ver los pedidos pagados, pendientes y fallidos en `/admin` y los errores del monitor | Cliente / soporte |
| Semanal | Revisión semanal (§1) y descarga del respaldo fuera del servidor ([01](01-cpanel-base-de-datos.md) §7) | Técnico |
| Mensual | Restauración de prueba en `cpuser_restore`. Revisar DMARC (reportes en `dmarc@`), el gasto de IA, el uso de Vercel y el disco de cPanel | Técnico |
| Trimestral | Actualizar dependencias (`npm outdated`, rama `chore/deps`, CI en verde). PHP del hosting en una versión con soporte | Técnico |
| Anual | Renovar el dominio (con autorrenovación), Apple Developer (USD 99) y la revisión legal de la política de privacidad | Cliente |
| Al rotar personal | Quitar accesos en Vercel, Firebase, Wompi, cPanel, Expo y las tiendas, y rotar los secretos (§4) | Cliente + técnico |

## 3. Respaldos

- BD: cron diario con 14 días de retención ([01](01-cpanel-base-de-datos.md) §7), descarga semanal fuera del servidor y restauración probada cada mes.
- Medios: `/home/cpuser/media.cafetravesia.co` entra en el respaldo de cuenta del hosting. Además, haz una descarga mensual (*File Manager › Compress › Download*) o pide al hosting un respaldo remoto.
- Código: GitHub (rama `main` protegida). Configuración: las variables de Vercel se exportan con `vercel env pull`. Guarda una copia cifrada en el gestor del cliente, nunca en git.

## 4. Rotación de secretos

### DB_GATEWAY_SECRET (Vercel y config.php a la vez)

La firma solo acepta **un** secreto. Para minimizar la ventana de errores (segundos):

1. `scripts/gen-secrets.sh --only DB_GATEWAY_SECRET` y guarda el valor.
2. Vercel › *Environment Variables* › `DB_GATEWAY_SECRET` (Production) › *Edit* › pega el valor nuevo › Save. **Todavía no redespliegues.**
3. Abre *Deployments* › último de Production › *⋯ › Redeploy*. Mientras compila (unos 3–5 min), deja abierto en cPanel el editor de `config.php`.
4. Cuando el despliegue pase a **Ready**, guarda en `config.php` el secreto nuevo.
5. Verifica: `gateway-smoke` con el secreto nuevo (todo ✓) y `/admin/monitor` en verde.

Durante unos segundos, las lecturas no cacheadas fallan (401) y el sitio sigue sirviendo la caché. **No** rotes durante una campaña, ni mientras Wompi esté reintentando webhooks (tienen reintento a los 30 min). Los tickets de subida emitidos con el secreto viejo se invalidan: los editores solo deben reintentar la subida.

### Otros secretos

| Secreto | Cómo rotar |
|---|---|
| `CRON_SECRET` | Genera uno nuevo → Vercel (redespliega) → actualiza `~/.config/cafetravesia/cron.env` en cPanel (o el comando del cron) |
| Contraseña de `cpuser_ctapp` | Manage My Databases › *Change Password* → `config.php` › `db.pass` (inmediato, sin Vercel) |
| `SMTP_PASS` | Email Accounts › *Manage* › contraseña → Vercel (redespliega) |
| Llaves de Wompi | Si el dashboard permite regenerarlas: genera, actualiza Vercel y redespliega. El secreto de eventos viejo deja de validar al instante |
| Cuenta de servicio de Firebase | [04](04-firebase-auth.md) §6.5 |
| `OPENAI_API_KEY` | Crea una nueva → Vercel (redespliega) → revoca la vieja |
| Credenciales push | `eas credentials` (APNs y FCM V1). Los tokens de los usuarios no cambian |

## Runbooks de incidentes

### Pagos no se confirman

**Síntomas:** el cliente pagó y el pedido sigue `pending`; Wompi muestra APPROVED.

1. Busca en `/admin/monitor` los eventos `wompi`:
   - `webhook.signature error` → `WOMPI_EVENTS_SECRET` incorrecto o de otro ambiente. Revisa con `check-env` y corrige.
   - `webhook.environment ignored` → evento `prod` con `WOMPI_ENV=sandbox`, o al revés.
   - `transaction.amount_mismatch` → montos distintos. **No** lo apruebes a mano sin investigar.
   - `transaction.unknown_reference` → el evento es de otro sitio, o la URL de eventos de otro ambiente apunta aquí.
   - Sin eventos → Wompi no llega: revisa la URL de eventos en el dashboard y que la URL no esté protegida (Preview).
2. Dashboard de Wompi › la transacción › estado de entrega del evento (código HTTP).
3. Forzar la conciliación: `curl -H "Authorization: Bearer $CRON_SECRET" "https://cafetravesia.co/api/cron?tasks=reconcile"`. Debe devolver `reconcile` con `fixed ≥ 1`.
4. Si `/api/cron` falla, revisa la pasarela (siguiente runbook).

### Pasarela caída

**Síntomas:** el monitor muestra la BD en rojo. Las páginas cacheadas cargan, pero el login, el checkout y el CMS fallan.

1. `curl -i https://gateway.cafetravesia.co/health.php`:
   - **Timeout o DNS** → hosting caído. Consulta el estado del proveedor y abre un ticket.
   - **503** → PHP vivo y MySQL caído. En phpMyAdmin, ¿conecta? Si no, es MySQL del hosting: ticket. Si sí: credenciales de `config.php` (¿cambió una contraseña?).
   - **500** → `config.php` falta o tiene un error de sintaxis (revisa `error_log` en la carpeta), o cambió la versión de PHP (MultiPHP Manager).
   - **403 o 406 HTML** → ModSecurity o Imunify ([02](02-cpanel-pasarela-y-medios.md) §9).
   - **508 o 503 intermitente** → límite de recursos (CloudLinux): pide más recursos al hosting.
2. `node scripts/gateway-smoke.mjs`: 401 «Firma vencida» indica desfase de reloj, y 401 «Firma inválida» que el secreto no coincide.
3. Mientras tanto: el sitio público sigue sirviendo la caché. Avisa por WhatsApp o redes si dura más de 30 min. Los webhooks de Wompi se reintentan solos.

### BD llena o cuota de disco

**Síntomas:** errores `1114 The table is full`, `Disk quota exceeded`, o fallos al subir medios.

1. cPanel › *Disk Usage* y *Manage My Databases* (tamaño por BD).
2. Tablas que crecen: `integration_events` (el cron borra lo de más de 90 días), `page_views`, `push_deliveries` y `chat_messages`. Consulta:

```sql
SELECT table_name, ROUND((data_length+index_length)/1048576,1) AS mb FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY mb DESC LIMIT 10;
```

3. Limpieza segura (con respaldo previo): `DELETE FROM page_views WHERE created_at < NOW() - INTERVAL 180 DAY;` y `DELETE FROM push_deliveries WHERE created_at < NOW() - INTERVAL 90 DAY;`.
4. Respaldos antiguos: baja `--keep-days`. Medios huérfanos: revísalos desde el CMS.
5. Si no alcanza, pide al hosting más cuota o un plan superior.

### Correos no llegan

1. `/admin/monitor` › eventos `email`:
   - `send.skipped` → SMTP sin configurar.
   - `send error` con mensaje → tabla de [08](08-correo-smtp.md) §Si algo falla.
2. Si el envío da `ok` pero no llegan: revisa spam, `dig TXT cafetravesia.co` (SPF sin `+a` tras el corte), DKIM, y cPanel › *Email › Track Delivery* (busca el destinatario).
3. Límite de envío por hora del hosting: pregúntalo a soporte.

### Push fallan

1. `SELECT status, error, COUNT(*) FROM push_deliveries WHERE created_at > NOW() - INTERVAL 1 DAY GROUP BY status, error;`
2. Errores → tabla de [09](09-ia-y-push.md) §Si algo falla (`InvalidCredentials`, `MismatchSenderId`, `UNAUTHORIZED`).
3. Si no hay filas: la campaña no se envió. ¿Está programada? ¿Corrió el cron `push`?
4. Si el estado es `ok` y no llegan: permisos del dispositivo, el canal `default` en Android y el modo de ahorro de energía. Prueba con [expo.dev/notifications](https://expo.dev/notifications).

### Login falla

1. Navegador › consola, por código de Firebase:
   - `auth/unauthorized-domain` → Authorized domains ([04](04-firebase-auth.md) §3).
   - `auth/invalid-api-key` → `NEXT_PUBLIC_FIREBASE_API_KEY` incorrecta o con una restricción de referer que no incluye el dominio.
2. `POST /api/auth/session`:
   - 503 → modo demo o falta `FIREBASE_SERVICE_ACCOUNT_BASE64`.
   - 401 → la cuenta de servicio es de otro proyecto, o hay errores en la BD (el evento `auth session.create error` en el monitor da el detalle).
   - 429 → rate limit (20 por minuto por IP).
3. «Vuelve a iniciar sesión» es lo esperado si el login tiene más de 10 minutos.
4. La app móvil usa un Bearer ID token. Si solo falla la app, revisa `EXPO_PUBLIC_FIREBASE_*` en EAS y los SHA-1 de Android.

## Verificación

- Los 3 monitores externos están en «Up» y se recibió la alerta de prueba (pausa el monitor de `health.php` cambiando la URL para forzar la alerta, y restáurala).
- Se hizo una rotación de `CRON_SECRET` de prueba sin errores del cron.
- Hay un registro de la restauración mensual en el ticket de operación.

## Si algo falla

Escala según la matriz de [README.md](README.md):

- hosting → soporte de cPanel;
- pagos → soporte de Wompi (con el ID de la transacción);
- Vercel → status.vercel.com y soporte (en Pro);
- Firebase → status.firebase.google.com.

Si un despliegue introdujo la falla: Instant Rollback ([05](05-vercel.md#rollback)).
