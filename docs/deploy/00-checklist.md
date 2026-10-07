# 00 · Checklist maestro de salida a producción

**Objetivo:** dar por terminada la salida a producción solo cuando **todas** las casillas estén marcadas y cada criterio medible tenga su evidencia: salida de un comando, captura o ID de una transacción.

**Prerrequisitos:** haber leído [README.md](README.md). Guarda las evidencias en el ticket del despliegue, nunca con secretos.

## A. Cuentas y propiedad (13-traspaso-al-cliente.md)

- [ ] Vercel (plan **Pro**, ver 05 §Plan), Firebase, Wompi, Apple Developer, Google Play Console, Expo y el proveedor de IA están creados **a nombre del cliente**. El agente entra como miembro invitado.
- [ ] Los secretos están en el gestor de contraseñas del cliente: `DB_GATEWAY_SECRET`, `CRON_SECRET`, la contraseña de la BD, `SMTP_PASS`, las llaves de Wompi y el JSON de la cuenta de servicio.

## B. cPanel (01, 02)

- [ ] BD `cpuser_cafetravesia` en `utf8mb4_unicode_ci`. Evidencia: `gateway-smoke` muestra `charset de la BD — …: utf8mb4`.
- [ ] El usuario de la app solo tiene SELECT, INSERT, UPDATE, DELETE. Los privilegios DDL se retiraron después de migrar (01 §6).
- [ ] La versión de la BD es MySQL 5.7.8 o superior, o MariaDB 10.3 o superior. Evidencia: línea `MySQL ≥ 5.7.8` o `MariaDB ≥ 10.3` en `gateway-smoke`.
- [ ] `https://gateway.cafetravesia.co/health.php` responde **200** con `{"ok":true,…}` en menos de 1 s.
- [ ] `node scripts/gateway-smoke.mjs --media-write` termina con `✓ Pasarela OK`: firma válida 200, firma inválida 401, replay 401, DDL bloqueado 403, `config.php` no accesible, PHP 8.1 o superior y desfase de reloj menor de 5 s.
- [ ] `config.php` tiene `allow_ddl => false`.
- [ ] Un archivo subido en `media.cafetravesia.co` se sirve con `Cache-Control: public, max-age=31536000, immutable`. Un `.php` dentro de media **no** se ejecuta (02 §Verificación).
- [ ] Hay respaldo diario de la BD en `~/backups/mysql/` y existe un `.sql.gz` de hoy. La restauración se probó una vez en una BD temporal (01 §8).

## C. Vercel (05)

- [ ] Root Directory es `apps/web`, Node.js 22.x y la región de funciones `iad1` (o la justificada).
- [ ] `node scripts/check-env.mjs -f .work/.env.production` da **0 errores**. Se descarga con `vercel env pull --environment=production`.
- [ ] El último despliegue de Production compiló sin `SKIP_TYPECHECK`.
- [ ] `node scripts/smoke-prod.mjs https://cafetravesia.co` termina en `✓ Despliegue OK`, sin `MODO DEMO`.
- [ ] `/admin/monitor` muestra en verde: Base de datos (menos de 800 ms), Pasarela y medios, Firebase Auth, Pagos Wompi (Producción), Correo SMTP y Tareas programadas.
- [ ] Deployment Protection está en *Standard Protection*: las previews piden login de Vercel y Production es pública.

## D. Tareas programadas (06)

- [ ] `curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $CRON_SECRET" "https://cafetravesia.co/api/cron?tasks=noop"` imprime **200**. Sin el header imprime **401**.
- [ ] El cron de cPanel corre cada 15 min. En `/admin/monitor`, «Tareas programadas» dice «Última ejecución hace < 20 min».
- [ ] Vercel › Settings › Cron Jobs lista `/api/cron?daily=1` con horario `0 13 * * *`.

## E. Pagos Wompi (07)

- [ ] En sandbox, una compra de café con tarjeta `4242 4242 4242 4242` deja el pedido en **pagado**. Evidencia: ID de la transacción y estado en `/admin`.
- [ ] El webhook de sandbox llega y queda registrado como `wompi webhook ok` en el monitor. Al reenviarlo, Wompi recibe 200 y no hay efectos dobles: el stock y los puntos no cambian dos veces (07 §3.6).
- [ ] Probados en sandbox: compra rechazada (`4111…`), Nequi `3991111111`, PSE «Banco que aprueba», compra de curso (queda la inscripción), cupón y suscripción (tokenización y primer cobro).
- [ ] Un webhook con firma falsa recibe **401**. `smoke-prod` lo comprueba.
- [ ] En producción: llaves `pub_prod_`/`prv_prod_`/`prod_integrity_`/`prod_events_`, URL de eventos de producción configurada y una compra real de bajo valor aprobada y luego anulada o reembolsada.

## F. Autenticación (04)

- [ ] El login con Google funciona en `https://cafetravesia.co/ingresar` (dominio real) y crea la sesión: aparece la cookie `__session` httpOnly.
- [ ] Probados: registro con correo y contraseña, verificación y recuperación de contraseña (correos en español), y login con Apple en la web.
- [ ] El primer administrador (en `ADMIN_EMAILS`) entra a `/admin`. Un cliente normal recibe redirección a `/acceso?error=permisos`.
- [ ] La protección contra la enumeración de correos está activa.

## G. Correo (08)

- [ ] Un pedido de prueba envía la confirmación al cliente y el aviso a `ADMIN_NOTIFY_EMAIL`. En los encabezados del correo recibido: `spf=pass`, `dkim=pass`, `dmarc=pass`.
- [ ] mail-tester.com da 8/10 o más.

## H. Dominio y corte (03)

- [ ] `dig +short cafetravesia.co A` devuelve **solo** la IP que indica Vercel. `dig +short www.cafetravesia.co CNAME` devuelve el CNAME de Vercel.
- [ ] `www` redirige con 308 a `https://cafetravesia.co`. `http://` redirige a `https://`.
- [ ] Los registros MX, SPF, DKIM y DMARC siguen apuntando al cPanel, y `mail.`, `gateway.` y `media.` apuntan a la IP del hosting.
- [ ] El WordPress está desactivado y respaldado fuera de `public_html`, el hosting está escaneado y se cambiaron **todas** las contraseñas (03 §6).
- [ ] Google Search Console: dominio verificado, sitemap nuevo enviado y URLs de spam retiradas o respondiendo 404/410.

## I. App móvil (10, 09)

- [ ] Un push de prueba (campaña desde el CMS a un segmento con tu dispositivo) **llega** a un iPhone y a un Android físicos. En `push_deliveries` queda `status=ok`.
- [ ] Builds de `production` aprobados en TestFlight y en la prueba interna de Play. El inicio de sesión, la compra (Wompi en navegador) y el regreso a la app con `cafetravesia://pago` funcionan.
- [ ] Existe la **eliminación de cuenta** desde la app y una URL web para solicitarla, exigida por Apple y Google. Ver 10 §6: **hoy falta en el código**.

## J. Operación y seguridad (11, 12)

- [ ] Monitor externo (UptimeRobot u otro) sobre `/`, `/api/v1/products` y `gateway…/health.php`, con alertas al correo técnico y al del cliente.
- [ ] El checklist de hardening de 12 está completo, y el aviso de privacidad y los términos fueron revisados por el cliente o su asesor legal.
- [ ] Se hizo la capacitación del CMS y el cliente firmó el acta de entrega (13).

## Verificación

Ejecuta en orden. Todo debe terminar con código de salida 0:

```bash
node scripts/check-env.mjs -f .work/.env.production --target production
DB_GATEWAY_URL=https://gateway.cafetravesia.co DB_GATEWAY_SECRET='<secreto>' node scripts/gateway-smoke.mjs --media
CRON_SECRET='<secreto>' node scripts/smoke-prod.mjs https://cafetravesia.co --cron --sitemap 30
```

## Si algo falla

- Busca el síntoma en los runbooks de [11-operacion.md](11-operacion.md#runbooks-de-incidentes).
- No marques una casilla con evidencia parcial. Anota el bloqueo, el responsable (según la matriz de [README.md](README.md)) y la fecha.
- Si el problema está en Production y no tiene solución rápida, haz Instant Rollback (05 §Rollback) y deja el DNS como está.
