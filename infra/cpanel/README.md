# Pasarela cPanel (BD + medios)

Dos archivos PHP, sin dependencias, conectan el backend en Vercel con la MySQL/MariaDB y el disco del hosting, sin exponer el puerto 3306. La instalación paso a paso está en [`docs/deploy/02-cpanel-pasarela-y-medios.md`](../../docs/deploy/02-cpanel-pasarela-y-medios.md).

## Archivos

| Archivo | Se sube a | Función |
|---|---|---|
| `gateway/db.php` | `gateway.<dominio>/` | Ejecuta SQL parametrizado firmado. Es compatible con `drizzle-orm/mysql-proxy` |
| `gateway/media.php` | `gateway.<dominio>/` | Recibe subidas directas del navegador con ticket y operaciones firmadas `put`, `delete` y `stats` |
| `gateway/health.php` | `gateway.<dominio>/` | Salud pública: `200 {ok:true}` o `503` si no hay MySQL |
| `gateway/lib.php` | `gateway.<dominio>/` | Configuración, verificación de firma, PDO y CORS. Responde 404 si se llama directo |
| `gateway/.htaccess` | `gateway.<dominio>/` | Fuerza HTTPS, sin listado, deniega `config*.php`, `lib.php`, `*.log`, `*.sql`… y aplica HSTS |
| `gateway/config.sample.php` | **No se sube** | Plantilla de `config.php`, que se crea en el servidor y está en `.gitignore` |
| `media/.htaccess` | `media.<dominio>/` | Nunca ejecuta scripts, sirve con caché de 1 año `immutable`, CORS `*` y `nosniff` |

`config.php` se lee de `getenv('CT_GATEWAY_CONFIG')` o, si no está definida, de `__DIR__/config.php`. Claves: `secret`, `db{host,port,name,user,pass}`, `allow_ddl`, `max_skew` (90), `media{dir,base_url,max_bytes,allowed_mime}` y `cors_origins`.

## Protocolo

**Firma** (igual a `signGatewayBody` en `packages/db/src/client.ts`):

```
X-CT-Timestamp: <milisegundos epoch>
X-CT-Signature: hex( HMAC-SHA256( secret, "<timestamp>.<cuerpo exacto>" ) )
```

Se rechaza con **401** si falta la firma, si `|ahora − timestamp| > max_skew` (anti-replay) o si el HMAC no coincide (`hash_equals`).

**`POST /db.php`** (JSON firmado, cuerpo de 8 MB como máximo):

| Cuerpo | Respuesta |
|---|---|
| `{"op":"ping"}` | `{"ok":true,"version":"8.0.x","gateway":"1.0.0","php":"8.3.x"}` |
| `{"op":"query","sql":"SELECT … ?","params":[…],"method":"all"}` | `{"ok":true,"rows":[[…],…],"ms":3}`: filas como arreglos (drizzle) |
| `… "method":"objects"` | Filas como objetos (`rawQuery`, migraciones) |
| `… "method":"execute"` | `{"rows":[{"insertId":0,"affectedRows":1}]}` |
| `{"op":"batch","statements":[{"sql","params"},…]}` | Transacción única (`atomic()`): todo o nada, con 200 sentencias como máximo |

Reglas:

- `allow_ddl=false` → **403** para `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`, `GRANT` y `REVOKE`.
- Siempre **403** para `INTO OUTFILE`, `INTO DUMPFILE`, `LOAD_FILE(` y `LOAD DATA`.
- Los errores de MySQL vuelven como `400 {ok:false,error,sqlState,errno}`; por ejemplo, `errno 1062` es un duplicado.
- La sesión usa `time_zone '+00:00'`, `sql_mode` estricto y `utf8mb4`.

**`POST /media.php`**

- Multipart con `ticket` y `file`. El ticket es `base64url(json{folder,maxBytes,exp,nonce}) + "." + hex(HMAC(secret, payload))` y lo emite `createUploadTicket()` solo para staff. Valida el vencimiento, el tamaño, el **MIME real** (`finfo`) y la lista blanca, y guarda como `carpeta/AAAA/MM/<aleatorio>.<ext>`. Respuesta: `{ok,path,url,mime,size,width,height}`. Aplica CORS solo a `cors_origins`.
- JSON firmado (igual que `db.php`): `{"op":"put","folder","dataBase64"}`, `{"op":"delete","path"}` (confinado a `media.dir`) y `{"op":"stats"}`.

## Pruebas

```bash
# Integración completa local: MySQL real + php -S + drizzle (migraciones, CRUD, transacciones, firma, DDL, medios)
npm run test -w @travesia/db            # requiere PHP ≥ 8.1 con pdo_mysql/fileinfo y xz

# Autoprueba de los scripts de despliegue contra la pasarela local
node scripts/selftest.mjs

# Contra el hosting real
DB_GATEWAY_URL=https://gateway.cafetravesia.co DB_GATEWAY_SECRET='…' node scripts/gateway-smoke.mjs --media-write
curl -s https://gateway.cafetravesia.co/health.php
```

Para levantarla a mano en local:

```bash
php -S 127.0.0.1:8080 -t infra/cpanel/gateway     # con CT_GATEWAY_CONFIG=/ruta/config.php
node scripts/gateway-smoke.mjs --url http://127.0.0.1:8080 --no-apache
```

## Cambios

Si modificas el protocolo, actualiza a la vez `packages/db/src/client.ts`, `apps/web/src/lib/storage.ts`, `scripts/gateway-smoke.mjs` y este README. Sube `CT_GATEWAY_VERSION` en `lib.php` y vuelve a subir **todos** los archivos al hosting, sin sobrescribir `config.php`.
