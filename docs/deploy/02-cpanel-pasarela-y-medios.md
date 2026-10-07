# 02 · Pasarela PHP y medios en cPanel

**Objetivo:** publicar `https://gateway.cafetravesia.co` (pasarela SQL y de archivos, firmada con HMAC) y `https://media.cafetravesia.co` (archivos estáticos que nunca se ejecutan), ambos con HTTPS. La prueba firmada debe pasar desde fuera del hosting. Detalle del protocolo: [`infra/cpanel/README.md`](../../infra/cpanel/README.md).

**Prerrequisitos**

- BD y usuario creados ([01](01-cpanel-base-de-datos.md) §1–3).
- Los registros DNS de `gateway` y `media` apuntan a la IP del hosting. cPanel los crea al crear el subdominio, siempre que el DNS del dominio esté en este cPanel ([03](03-dns-y-dominio.md) §1).
- `DB_GATEWAY_SECRET` generado:

```bash
scripts/gen-secrets.sh --only DB_GATEWAY_SECRET
# o, en el Terminal de cPanel:
php -r "echo bin2hex(random_bytes(48));"
```

## 1. Crear los subdominios (document roots fuera de public_html)

1. cPanel › **Domains › Domains** › **Create A New Domain** ([docs](https://docs.cpanel.net/cpanel/domains/domains/)).
2. Domain: `gateway.cafetravesia.co`. **Desmarca** «Share document root». Document Root: `gateway.cafetravesia.co`, que queda en `/home/cpuser/gateway.cafetravesia.co`. **Submit**.
3. Repite para `media.cafetravesia.co` → `/home/cpuser/media.cafetravesia.co`.

> No uses carpetas dentro de `public_html`: ahí vive el WordPress comprometido ([03](03-dns-y-dominio.md) §6) y se eliminará.

## 2. PHP 8.1+ con pdo_mysql y fileinfo

1. cPanel › **Software › MultiPHP Manager** ([docs](https://docs.cpanel.net/cpanel/software/multiphp-manager-for-cpanel/)) › marca `gateway.cafetravesia.co` › *PHP Version* **8.3** (mínimo 8.1) › **Apply**.
2. Extensiones: si el hosting tiene *Select PHP Version* (CloudLinux), activa `pdo_mysql`, `fileinfo` y `json`. En EasyApache 4 normalmente ya vienen; `gateway-smoke` confirmará.
3. `media.cafetravesia.co` no necesita PHP. Su `.htaccess` lo desactiva.

## 3. Límites de PHP (MultiPHP INI Editor)

cPanel › **Software › MultiPHP INI Editor** ([docs](https://docs.cpanel.net/cpanel/software/multiphp-ini-editor-for-cpanel/)) › *Basic Mode* › *Configure PHP INI basic settings*: elige **gateway.cafetravesia.co** y fija:

| Directiva | Valor | Por qué |
|---|---|---|
| `upload_max_filesize` | `16M` | `media.php` acepta hasta 15 MB (`max_bytes`) |
| `post_max_size` | `18M` | Debe ser mayor que upload (multipart y `ticket`) |
| `max_execution_time` | `60` | Lotes de transacción y subidas lentas |
| `memory_limit` | `256M` | `op:put` decodifica base64 en memoria |
| `display_errors` | **Off** | No filtrar rutas ni SQL en la respuesta |
| `log_errors` | On | Los errores van a `error_log` de la carpeta |
| `allow_url_fopen` | Off | La pasarela no lo necesita |

**Apply.** Con PHP-FPM o LSAPI, las directivas `php_value` del `.htaccess` se ignoran (están dentro de `<IfModule mod_php.c>`). Por eso este paso es obligatorio.

## 4. Subir los archivos de la pasarela

1. cPanel › **File Manager** › *Settings* › **Show Hidden Files (dotfiles)** › Save.
2. Entra a `/home/cpuser/gateway.cafetravesia.co/`. Borra el `index.html` o `default.htm` que cree cPanel.
3. **Upload** de `infra/cpanel/gateway/`: `db.php`, `media.php`, `health.php`, `lib.php`, `.htaccess`. **No subas `config.sample.php`**. Si ya lo subiste, bórralo.
4. Crea `config.php` (*+ File*) con el contenido de `config.sample.php` y edítalo:

```php
<?php
return [
    'secret' => 'PEGA_AQUI_DB_GATEWAY_SECRET_96_HEX',
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'cpuser_cafetravesia',
        'user' => 'cpuser_ctapp',
        'pass' => 'CLAVE_DE_CTAPP',
    ],
    'allow_ddl' => false,          // true SOLO durante npm run db:migrate
    'max_skew' => 90,              // ventana anti-replay en segundos
    'media' => [
        'dir' => '/home/cpuser/media.cafetravesia.co',
        'base_url' => 'https://media.cafetravesia.co',
        'max_bytes' => 15 * 1024 * 1024,
        'allowed_mime' => ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf', 'video/mp4'],
    ],
    'cors_origins' => [
        'https://cafetravesia.co',
        'https://www.cafetravesia.co',
        // agrega la URL estable de Preview solo si los editores suben medios desde allí
    ],
];
```

   Algunos hostings usan otro `host` para MySQL. El valor correcto aparece en *Manage My Databases › Remote Database Host*. Si esa sección no aparece, usa `localhost`.

5. Permisos (File Manager › *Permissions*):

| Ruta | Permiso |
|---|---|
| `/home/cpuser/gateway.cafetravesia.co/` | 755 |
| `db.php`, `media.php`, `health.php`, `lib.php`, `.htaccess` | 644 |
| `config.php` | **600**. Si `health.php` responde 500 «Pasarela sin config.php» o un error de lectura, prueba 640 y luego 644: el `.htaccess` igual niega el acceso web |
| `/home/cpuser/media.cafetravesia.co/` | 755 (PHP la escribe con el usuario `cpuser` bajo suEXEC o PHP-FPM) |

**Opcional (más estricto):** saca `config.php` del document root. Muévelo a `/home/cpuser/.ct-gateway/config.php` (carpeta 700) y agrega al `.htaccess` de la pasarela `SetEnv CT_GATEWAY_CONFIG /home/cpuser/.ct-gateway/config.php`. `lib.php` lee esa variable con `getenv()`. Funciona con mod_php y con la mayoría de configuraciones de PHP-FPM y LSAPI. Si `health.php` responde «Pasarela sin config.php», vuelve al esquema estándar.

## 5. Carpeta de medios

1. Sube `infra/cpanel/media/.htaccess` a `/home/cpuser/media.cafetravesia.co/.htaccess` con permisos 644.
2. Borra cualquier `index.html` de ejemplo. El listado ya está desactivado con `Options -Indexes`.
3. `media.php` crea las subcarpetas `carpeta/AAAA/MM/` con 755 y los archivos con 644.

## 6. HTTPS (AutoSSL / Let's Encrypt) y redirección

1. cPanel › **Security › SSL/TLS Status** ([docs](https://docs.cpanel.net/cpanel/security/ssl-tls-status/)) › selecciona `gateway.cafetravesia.co`, `www.gateway…`, `media.cafetravesia.co`, `www.media…` y `mail.cafetravesia.co` › **Run AutoSSL**. Espera a que aparezcan con «AutoSSL Domain Validated».
2. cPanel › **Domains › Domains** › activa **Force HTTPS Redirect** en `gateway` y `media`. Los `.htaccess` también redirigen.
3. Si aparece una CAA en el Zone Editor, debe permitir a la CA del AutoSSL (Sectigo o Let's Encrypt, según el hosting) ([03](03-dns-y-dominio.md) §2).

## 7. Sincronía horaria

La firma vence a los **90 s** (`max_skew`). El reloj del servidor y el de Vercel deben coincidir.

```bash
curl -s https://gateway.cafetravesia.co/health.php ; echo ; date -u +%Y-%m-%dT%H:%M:%S+00:00
```

**Esperado:** el campo `time` difiere menos de 5 s de tu hora UTC (sincronizada por NTP). `gateway-smoke` lo mide. Si el desfase es mayor, pide al hosting que active NTP/chrony. Mientras tanto puedes subir `max_skew` a `300`, a costa de una ventana de replay más amplia.

## 8. Probar desde fuera

```bash
curl -i https://gateway.cafetravesia.co/health.php
# Esperado: HTTP/2 200 … {"ok":true,"service":"cafe-travesia-gateway","version":"1.0.0","time":"…"}

export DB_GATEWAY_URL=https://gateway.cafetravesia.co
read -rs DB_GATEWAY_SECRET && export DB_GATEWAY_SECRET
node scripts/gateway-smoke.mjs --media-write
```

**Esperado (resumen):**

```
  ✓ health.php 200 — 120 ms, v1.0.0
  ✓ reloj del servidor — desfase ≈ 0 s (la firma tolera 90 s)
  ✓ ping firmado 200 — 140 ms · BD 10.6.x-MariaDB · PHP 8.3.x · pasarela 1.0.0
  ✓ parámetros + UNION/comillas/emoji — el WAF no bloquea y utf8mb4 viaja bien
  ✓ DDL bloqueado (allow_ddl=false)
  ✓ firma inválida rechazada (401)
  ✓ firma vencida (anti-replay 90 s) rechazada
  ✓ /config.php no accesible — HTTP 403
  ✓ medios: URL pública — HTTP 200 · image/png · cache-control: public, max-age=31536000, immutable
✓ Pasarela OK
```

Prueba manual de un ping firmado con curl, con el mismo algoritmo que `signGatewayBody`:

```bash
TS=$(($(date +%s%N)/1000000)); BODY='{"op":"ping"}'
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$DB_GATEWAY_SECRET" -hex | sed 's/^.* //')
curl -s -X POST https://gateway.cafetravesia.co/db.php -H 'content-type: application/json' -H "x-ct-timestamp: $TS" -H "x-ct-signature: $SIG" -d "$BODY"
# {"ok":true,"version":"…","gateway":"1.0.0","php":"8.3.x"}
```

## 9. Seguridad del hosting

### ModSecurity

Las consultas viajan en JSON con texto SQL (`SELECT … UNION …`, comillas), y las reglas OWASP CRS pueden bloquearlas con **403 o 406 sin JSON**. `gateway-smoke` lo detecta en la línea «parámetros + UNION/comillas».

1. Diagnóstico: cPanel › **Metrics › Errors** muestra `ModSecurity: Access denied … [id "942100"] … [uri "/db.php"]`.
2. Solución preferida: pide al hosting una excepción **solo para `/db.php` y `/media.php`** del subdominio `gateway`. Texto sugerido para el ticket:

   > Por favor desactiven las reglas ModSecurity que bloquean JSON con SQL (IDs en los logs, p. ej. 942100, 942200, 949110) **solo** para `https://gateway.cafetravesia.co/db.php` y `/media.php`. Las peticiones están autenticadas con HMAC-SHA256. Ejemplo de configuración (WHM): `<LocationMatch "^/(db|media)\.php$"> SecRuleRemoveById 942100 942200 949110 </LocationMatch>` en el VirtualHost de gateway.cafetravesia.co.

3. Alternativa: cPanel › **Security › ModSecurity** › apaga el interruptor **solo** de `gateway.cafetravesia.co` ([docs](https://docs.cpanel.net/cpanel/security/modsecurity/)). Es aceptable porque cada petición está firmada y `db.php` bloquea DDL, `INTO OUTFILE`, `LOAD_FILE` y `LOAD DATA`. Déjalo **activo** en el dominio principal y en `media`. Las reglas no se pueden desactivar con `SecRuleRemoveById` dentro de `.htaccess`.

### Errores y listado

- `display_errors=Off` (§3). La pasarela registra sus errores con `error_log('[ct-gateway] …')` en `/home/cpuser/gateway.cafetravesia.co/error_log`. El `.htaccess` impide descargar `*.log`.
- `Options -Indexes` en ambos `.htaccess`. `gateway-smoke` verifica que no haya listado.
- `.htaccess` de la pasarela: deniega `config.php`, `config.sample.php`, `lib.php`, `*.sql`, `*.log`, `*.md`, `*.json` e `*.ini`. Además `lib.php` responde 404 si se invoca directamente.

### Si el hosting bloquea peticiones

| Bloqueo | Síntoma | Qué hacer |
|---|---|---|
| **Entrante** (Imunify360, «bot protection», CAPTCHA, firewall de país): Vercel → gateway | `gateway-smoke` pasa desde tu equipo, pero `/admin/monitor` dice «Pasarela respondió 403/415 sin JSON» o muestra HTML de un desafío | Pide al hosting una lista blanca para `gateway.cafetravesia.co` (por ruta o user-agent `node`), sin depender de IP: Vercel no tiene IP fija en Hobby. Si no lo permiten, cambia de plan o de hosting |
| **cPHulk / LFD** bloquea las IP de Vercel tras fallos de SMTP | Correos con `ETIMEDOUT` intermitentes | Ver [08](08-correo-smtp.md) §Si algo falla |
| **Saliente** (curl hacia internet bloqueado en el cron) | El cron de cPanel no registra ejecuciones | Usa un cron externo gratuito (cron-job.org) con el mismo header ([06](06-cron.md) §Alternativa) |
| Límite de procesos o entry processes (CloudLinux) | 503 o 508 intermitentes en horas pico | La caché de Vercel reduce la carga. Pide más EP o un plan superior; revisa `/admin/monitor` |

## Verificación

- `curl -s -o /dev/null -w '%{http_code}' https://gateway.cafetravesia.co/health.php` → `200`.
- `curl -s -o /dev/null -w '%{http_code}' https://gateway.cafetravesia.co/config.php` → `403`.
- `node scripts/gateway-smoke.mjs --media-write` → `✓ Pasarela OK`.
- Medios sin ejecución: sube por File Manager `media.cafetravesia.co/x.php` con `<?php echo 1;` y abre `https://media.cafetravesia.co/x.php`. **Esperado:** 403 (no «1»). Bórralo.

## Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| `health.php` 500 «Pasarela sin config.php» | Falta `config.php`, tiene otro nombre o no se puede leer | §4.4–4.5 |
| `health.php` 503 | PHP no conecta a MySQL | Revisa en `config.php` el nombre con prefijo, el usuario, la clave y el host (§4.4). Revisa `error_log` |
| 401 «Firma inválida» | El secreto de Vercel y el de `config.php` difieren, o hay espacios o saltos de línea al pegar | Vuelve a pegarlo en ambos lados. Usa hex de `gen-secrets.sh` |
| 401 «Firma vencida» | Reloj desfasado | §7 |
| 403 o 406 HTML | ModSecurity o WAF | §9 |
| 413 o `UPLOAD_ERR_INI_SIZE` (código 1) | Límites de PHP | §3 |
| Subida desde el navegador: error CORS | Origen no listado en `cors_origins` | Agrega el origen exacto (con `https://`, sin barra final) |
| Imagen 404 en el sitio | `NEXT_PUBLIC_MEDIA_URL` distinto de `media.base_url` | Iguálalos y vuelve a desplegar: el host de next/image se fija al compilar |

**Rollback:** borra los subdominios (Domains › *Manage* › *Remove*) y la carpeta. La web sigue en modo demo mientras `DB_*` no esté en Vercel.
