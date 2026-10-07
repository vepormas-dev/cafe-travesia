# 08 · Correo transaccional por el SMTP del cPanel

**Objetivo:** que la app envíe confirmaciones, certificados, avisos y carritos abandonados desde `pedidos@cafetravesia.co` por el SMTP del hosting (`apps/web/src/lib/email.ts`, nodemailer), con SPF, DKIM y DMARC aprobados.

**Prerrequisitos:** el DNS del dominio está en el cPanel ([03](03-dns-y-dominio.md) §1) y existe el registro `mail.cafetravesia.co` con AutoSSL ([02](02-cpanel-pasarela-y-medios.md) §6).

## 1. Buzones

cPanel › **Email › Email Accounts** › **+ Create**:

| Buzón | Uso | Variable |
|---|---|---|
| `pedidos@cafetravesia.co` | Remitente de la app y bandeja de avisos internos | `SMTP_USER`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` |
| `hola@cafetravesia.co` | Atención al cliente (respuestas) | `MAIL_REPLY_TO` |
| `dmarc@cafetravesia.co` (opcional) | Reportes DMARC | registro `_dmarc` |

Contraseña: usa el generador de cPanel (20 caracteres o más) y guárdala en el gestor del cliente. Cuota de 1–2 GB para `pedidos@`.

> `MAIL_FROM` por defecto en el código es `Café Travesía <hola@cafetravesia.co>`. Si el SMTP autentica como `pedidos@`, **define** `MAIL_FROM=Café Travesía <pedidos@cafetravesia.co>`. Exim de cPanel puede rechazar o reescribir remitentes que no sean el buzón autenticado.

## 2. Datos SMTP

cPanel › Email Accounts › `pedidos@` › **Connect Devices** › *Mail Client Manual Settings* ([docs](https://docs.cpanel.net/cpanel/email/set-up-mail-client)):

| Variable | Valor |
|---|---|
| `SMTP_HOST` | `mail.cafetravesia.co`. Debe tener **certificado válido** (AutoSSL). Si no lo tiene, usa el *hostname del servidor* que muestra esa pantalla (p. ej. `server123.hosting.com`) |
| `SMTP_PORT` | `465` (SSL/TLS implícito: el código pone `secure: true` con 465). Alternativa: `587` con STARTTLS |
| `SMTP_USER` | `pedidos@cafetravesia.co` (dirección completa) |
| `SMTP_PASS` | contraseña del buzón |

## 3. SPF, DKIM y DMARC

cPanel › **Email › Email Deliverability** ([docs](https://docs.cpanel.net/cpanel/email/email-deliverability-in-cpanel)) › `cafetravesia.co` › **Manage**:

1. **DKIM:** si aparece «Problems Exist», pulsa **Install the suggested record**. Queda `default._domainkey` TXT `v=DKIM1; k=rsa; p=…`.
2. **SPF:** instala el sugerido y, **después del corte del DNS**, revísalo. Debe autorizar la IP del hosting, **no** el `+a` del apex que ahora es Vercel ([03](03-dns-y-dominio.md) §2). Ejemplo: `v=spf1 +mx +ip4:IP_HOSTING ~all`. Si el hosting usa un *smarthost* o relay, agrega su `include:` según su documentación.
3. **DMARC:** Zone Editor › *Add Record* › TXT › nombre `_dmarc.cafetravesia.co.` › valor:

```
v=DMARC1; p=none; rua=mailto:dmarc@cafetravesia.co; fo=1; adkim=r; aspf=r
```

   Tras 2–4 semanas sin fallos en los reportes, sube a `p=quarantine`.
4. **PTR (reverse DNS):** Email Deliverability muestra si el PTR de la IP coincide con el HELO. Si no coincide, solo el hosting puede corregirlo.

## 4. Variables en Vercel

```
SMTP_HOST=mail.cafetravesia.co
SMTP_PORT=465
SMTP_USER=pedidos@cafetravesia.co
SMTP_PASS=<contraseña>
MAIL_FROM=Café Travesía <pedidos@cafetravesia.co>
MAIL_REPLY_TO=hola@cafetravesia.co
ADMIN_NOTIFY_EMAIL=pedidos@cafetravesia.co
```

Redespliega y valida con `node scripts/check-env.mjs`, que advierte si `MAIL_FROM` y `SMTP_USER` son de dominios distintos.

## 5. Prueba

**Desde tu equipo** (prueba las credenciales tal como las usa la app):

```bash
cd apps/web && read -rs SMTP_PASS && export SMTP_PASS && node -e "
const n=require('nodemailer');
n.createTransport({host:'mail.cafetravesia.co',port:465,secure:true,auth:{user:'pedidos@cafetravesia.co',pass:process.env.SMTP_PASS}})
 .sendMail({from:'Café Travesía <pedidos@cafetravesia.co>',to:'TU_CORREO@gmail.com',subject:'Prueba SMTP Café Travesía',text:'Hola ☕'})
 .then(i=>console.log('OK',i.messageId,i.response)).catch(e=>{console.error('ERROR',e.message);process.exit(1)})"
# Esperado: OK <…@cafetravesia.co> 250 OK id=…
```

**Desde la app:** haz una compra de sandbox ([07](07-wompi.md) §3.1). Llega la confirmación al comprador y el aviso a `ADMIN_NOTIFY_EMAIL`. En `/admin/monitor` aparece `email send ok`.

**Entregabilidad:** envía la prueba a la dirección que da [mail-tester.com](https://www.mail-tester.com). Meta: 8/10 o más. En Gmail › *Mostrar original* debe verse: `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

## Verificación

- El script de prueba responde `OK … 250`.
- Los encabezados del correo recibido muestran `spf=pass`, `dkim=pass header.d=cafetravesia.co` y `dmarc=pass`.
- `/admin/monitor` › Correo SMTP: `mail.cafetravesia.co:465` en verde, y eventos `email send ok`.

## Si algo falla

| Síntoma (`/admin/monitor` › `email send error`) | Causa | Solución |
|---|---|---|
| `Hostname/IP does not match certificate's altnames` | `mail.` sin AutoSSL | §2: usa el hostname del servidor, o ejecuta AutoSSL para `mail.` |
| `Invalid login: 535` | Contraseña incorrecta o buzón suspendido | Cambia la contraseña en Email Accounts y actualiza Vercel |
| `ETIMEDOUT` / `ECONNREFUSED` intermitente | cPHulk o LFD bloquearon IPs de Vercel tras intentos fallidos | Pide al hosting desbloquear y revisar *cPHulk*. Corrige la contraseña primero |
| `550 … sender address rejected` / `not permitted to relay` | `MAIL_FROM` distinto del buzón autenticado | §1: `MAIL_FROM` = `SMTP_USER` |
| Los correos llegan a spam | SPF con `+a` tras el corte, sin DKIM o sin PTR | §3 |
| Límite de envíos por hora del hosting (p. ej. 100–500/h) | Campañas o carritos masivos | Pregunta el límite al hosting. Para volumen, usa un SMTP transaccional (Brevo, Amazon SES): solo cambian las variables `SMTP_*` |
| `email send.skipped (SMTP sin configurar)` | Falta `SMTP_HOST`, `SMTP_USER` o `SMTP_PASS` | §4 |

**Rollback:** borrar `SMTP_HOST` en Vercel desactiva los envíos sin romper el flujo. Los envíos se registran como `skipped`.
