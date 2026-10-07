# 03 · DNS (Zone Editor de cPanel), dominio en Vercel y corte del WordPress

**Objetivo:** que `cafetravesia.co` y `www` sirvan la app de Vercel, mientras el correo, `gateway`, `media` y `mail` siguen en el hosting. Luego, retirar el WordPress comprometido (spam de casinos) sin perder SEO.

**Prerrequisitos**

- Proyecto de Vercel desplegado y probado en su URL `*.vercel.app` ([05](05-vercel.md)). Pruebas de [07](07-wompi.md) §3 aprobadas.
- IP del hosting: cPanel › *General Information › Shared IP Address*. En esta guía: `IP_HOSTING`.
- Respaldo completo del WordPress (§6.1) **antes** del corte.

## 1. Confirmar que el DNS autoritativo es el cPanel

```bash
dig NS cafetravesia.co +short
dig SOA cafetravesia.co +short
```

**Esperado:** los nameservers del hosting (p. ej. `ns1.hosting.com`). Si aparecen otros (Cloudflare, el registrador), los cambios del Zone Editor **no tienen efecto**: haz los mismos cambios en ese proveedor, o mueve los NS al hosting en el registrador.

## 2. Registros objetivo

Primero agrega el dominio en Vercel (§3, paso 1) para ver los valores que pide **para tu proyecto**: *Settings › Domains › cafetravesia.co › View DNS records*. Los valores generales que publica Vercel son `A 76.76.21.21` para el apex y `CNAME cname.vercel-dns-0.com` para subdominios. Hoy el panel suele mostrar valores **por proyecto**, como un `A 216.198.79.x` y un CNAME `<hash>.vercel-dns-017.com`. **Usa siempre lo que muestre tu panel** ([Vercel: set up custom domain](https://vercel.com/docs/domains/set-up-custom-domain), [Adding & configuring a custom domain](https://vercel.com/docs/projects/custom-domains)).

| Nombre | Tipo | Valor | TTL | Dónde apunta |
|---|---|---|---|---|
| `cafetravesia.co.` | A | `76.76.21.21` *(o la IP que indique tu panel de Vercel)* | 300 → 3600 | Vercel |
| `www.cafetravesia.co.` | CNAME | `cname.vercel-dns-0.com.` *(o el CNAME de tu proyecto)* | 300 → 3600 | Vercel |
| `cafetravesia.co.` | AAAA | **eliminar** si existe | — | — |
| `gateway.cafetravesia.co.` | A | `IP_HOSTING` | 3600 | cPanel |
| `media.cafetravesia.co.` | A | `IP_HOSTING` | 3600 | cPanel |
| `mail.cafetravesia.co.` | A | `IP_HOSTING` | 3600 | cPanel (SMTP/IMAP) |
| `cpanel.`, `webmail.`, `autodiscover.`, `autoconfig.`, `cpcalendars.`, `cpcontacts.`, `webdisk.` | A | `IP_HOSTING` | — | **No tocar** |
| `cafetravesia.co.` | MX | prioridad `0` → `mail.cafetravesia.co.` | 3600 | cPanel |
| `cafetravesia.co.` | TXT (SPF) | `v=spf1 +mx +ip4:IP_HOSTING ~all` | 3600 | Ver nota |
| `default._domainkey.cafetravesia.co.` | TXT (DKIM) | `v=DKIM1; k=rsa; p=MIIBIjANBg…` (lo genera cPanel) | 3600 | cPanel |
| `_dmarc.cafetravesia.co.` | TXT | `v=DMARC1; p=none; rua=mailto:dmarc@cafetravesia.co; fo=1` | 3600 | [08](08-correo-smtp.md) |
| `cafetravesia.co.` | CAA (si ya hay alguna) | `0 issue "letsencrypt.org"` y la CA del AutoSSL (`0 issue "sectigo.com"`) | 3600 | Vercel usa Let's Encrypt |
| `cafetravesia.co.` | TXT | `google-site-verification=…` | 3600 | Search Console (§7) |

> **SPF:** el SPF típico de cPanel es `v=spf1 +a +mx +ip4:… ~all`. Después del corte, `+a` autoriza la IP de **Vercel**, que no envía correo, y deja de cubrir la IP del hosting. Reemplaza `+a` por `+ip4:IP_HOSTING` (o déjalo junto a `+mx`). El correo sale de `mail.cafetravesia.co`, en la IP del hosting. No agregues registros de Vercel al SPF: la app envía por el SMTP del cPanel.

## 3. Pasos en Vercel y en el Zone Editor

1. **Vercel** › proyecto › *Settings › Domains* › **Add Domain** › `cafetravesia.co`. Acepta la sugerencia de agregar `www.cafetravesia.co`. Anota los registros que muestre.
2. **Redirección:** en *Domains*, `www.cafetravesia.co` › *Edit* › **Redirect to `cafetravesia.co`** con código **308** (permanente). El apex es el canónico porque `NEXT_PUBLIC_SITE_URL=https://cafetravesia.co`.
3. **24 h antes del corte:** cPanel › **Domains › Zone Editor** › *Manage* `cafetravesia.co` ([docs](https://docs.cpanel.net/cpanel/domains/zone-editor/)). Baja a `300` el TTL de los registros A `cafetravesia.co.` y CNAME/A `www`. Así el corte (y un eventual rollback) se propaga en unos 5 minutos.
4. **Corte** (en horario de bajo tráfico):
   1. Edita el registro A `cafetravesia.co.` → la IP de Vercel. Elimina cualquier AAAA del apex o de `www`.
   2. `www`: si es un A o un CNAME hacia el apex, edítalo a **CNAME** → el valor de Vercel.
   3. Revisa la tabla del §2: MX, SPF (corregido), DKIM, `mail`, `gateway` y `media` **sin cambios**.
5. **Vercel** › *Domains*: espera «Valid Configuration». El certificado TLS se emite solo, normalmente en minutos ([docs](https://vercel.com/docs/domains/set-up-custom-domain)).
6. **AutoSSL de cPanel:** el apex y `www` ya no resuelven al hosting, así que AutoSSL reportará errores para ellos. Esto es esperado. En *SSL/TLS Status*, selecciona `cafetravesia.co` y `www.cafetravesia.co` › **Exclude from AutoSSL**, para evitar avisos. Mantén incluidos `mail`, `gateway` y `media`.
7. **Cuando todo esté estable (unas 48 h):** sube los TTL a 3600.

## 4. Verificación del DNS

```bash
dig +short cafetravesia.co A          # solo la IP de Vercel
dig +short cafetravesia.co AAAA       # vacío
dig +short www.cafetravesia.co CNAME  # el CNAME de Vercel
dig +short gateway.cafetravesia.co A media.cafetravesia.co A mail.cafetravesia.co A   # IP_HOSTING x3
dig +short cafetravesia.co MX         # 0 mail.cafetravesia.co.
dig +short cafetravesia.co TXT        # incluye v=spf1 … +ip4:IP_HOSTING …
dig +short default._domainkey.cafetravesia.co TXT
dig @8.8.8.8 +short cafetravesia.co A ; dig @1.1.1.1 +short cafetravesia.co A   # propagación
curl -sI https://www.cafetravesia.co | grep -iE '^(HTTP|location)'   # 308 → https://cafetravesia.co/
curl -sI http://cafetravesia.co | grep -iE '^(HTTP|location)'        # 308 → https://
node scripts/smoke-prod.mjs https://cafetravesia.co
```

## 5. Rutas antiguas y SEO

`apps/web/next.config.ts` ya define las redirecciones del WordPress: `/producto/:slug` → `/tienda/:slug`, `/categoria-producto/*` → `/tienda`, `/category/*` → `/blog`, `/suscripcion` → `/suscripciones`, `/carrito` → `/tienda/carrito` y `/mi-cuenta` → `/cuenta`, todas con 308. `/wp-admin` y `/wp-login.php` van a `/acceso` con 307. `smoke-prod.mjs` las verifica.

Antes del corte, compara el inventario de URLs del WordPress con estas reglas:

```bash
curl -s https://cafetravesia.co/wp-sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>//'     # o /sitemap_index.xml (Yoast)
```

Si un slug de producto cambió, repórtalo al equipo de la web para agregar la regla en `next.config.ts`; ese archivo no es de este equipo. Las páginas de spam de casinos **no** deben redirigirse: tras el corte devuelven 404, y eso acelera su desindexación.

## 6. Plan de corte del WordPress comprometido

### 6.1 Antes del corte: respaldar el contenido sin copiar la infección

1. cPanel › **Files › Backup** › **Download a Full Account Backup** › Home Directory. Guárdalo **fuera** del servidor como evidencia; no se restaura completo.
2. WordPress › Herramientas › **Exportar** › Todo el contenido (XML). Exporta también la lista de productos o pedidos de WooCommerce a CSV, si existe.
3. Descarga solo `wp-content/uploads/` (imágenes) y revísalas: **ningún** `.php`, `.js` ni `.ico` raro. El contenido útil (textos y fotos) se carga a mano en el nuevo CMS ([13](13-traspaso-al-cliente.md)).
4. **No migres** plugins, temas, usuarios, la base de datos del WordPress, `.htaccess` ni código PHP.

### 6.2 Después del corte (mismo día)

1. **Desactiva el WordPress:** File Manager › renombra `public_html` a `public_html.wp-desactivado-AAAAMMDD` y crea un `public_html` vacío con un `index.html` mínimo. Así nada ejecuta el código comprometido aunque alguien llegue por la IP. Tras 30 días sin incidentes, **bórralo** junto con la BD del WordPress (Manage My Databases).
2. **Limpieza del hosting:**
   - cPanel › **Advanced › Cron Jobs**: elimina cualquier tarea desconocida. Solo deben quedar las de [06](06-cron.md) y [01](01-cpanel-base-de-datos.md) §7.
   - **Security › Virus Scanner** (si existe) o Imunify360: escanea todo el Home Directory.
   - Revisa y depura: **FTP Accounts**, **Security › SSH Access › Manage SSH Keys**, **Security › Manage API Tokens**, **Email › Forwarders** y **Email › Email Filters** (los spammers suelen dejar reenvíos), y usuarios de BD que no sean `ctapp` ni `ctbackup`.
   - Busca PHP fuera de lugar: `find ~ -name '*.php' -newer ~/public_html.wp-desactivado-*/wp-config.php -not -path '*/gateway.cafetravesia.co/*' | head` (Terminal).
3. **Cambia todas las contraseñas** (y guárdalas en el gestor del cliente): cPanel (en el portal del hosting), cuentas FTP, usuarios de BD, buzones de correo, la cuenta del registrador del dominio (con 2FA) y el panel del hosting (con 2FA). Rota también `DB_GATEWAY_SECRET` si se generó antes de la limpieza ([11](11-operacion.md#4-rotación-de-secretos)).
4. Activa la autenticación de dos factores de cPanel: **Security › Two-Factor Authentication**.

**Rollback del corte:** en el Zone Editor, vuelve a poner el A del apex en `IP_HOSTING` y el `www` como antes; con TTL 300 se aplica en minutos. Hazlo **solo** si la app no puede quedar en línea: el WordPress está comprometido. Si es posible, usa en cambio Instant Rollback de Vercel ([05](05-vercel.md#rollback)).

## 7. Google Search Console (re-indexación y spam)

1. [search.google.com/search-console](https://search.google.com/search-console) › *Agregar propiedad* › **Dominio** `cafetravesia.co` › copia el TXT `google-site-verification=…` › Zone Editor › *Add Record* TXT en `cafetravesia.co.` › *Verificar*.
2. **Sitemaps** › envía `https://cafetravesia.co/sitemap.xml`.
3. **Seguridad y acciones manuales**: si hay avisos de «contenido pirateado» o spam, solicita una **revisión** explicando que se reemplazó el sitio y se limpió el hosting.
4. **Retiradas** › *Nueva solicitud*: retira temporalmente los prefijos de spam (por ejemplo `https://cafetravesia.co/casino/`, según lo que muestre `site:cafetravesia.co casino`). Tras el corte responden 404, lo que hace permanente la desindexación.
5. **Inspección de URL** › `https://cafetravesia.co/` y `/tienda` › *Solicitar indexación*.
6. Revisa en 1–2 semanas: *Páginas* (indexadas o no) y *Rendimiento*.

## Verificación

- §4 completo sin diferencias, y `smoke-prod.mjs` en ✓ (incluye http→https y www→apex).
- `/admin/monitor`: «Pasarela y medios» en verde, porque `gateway` no se movió.
- Correo de prueba enviado y recibido después del corte ([08](08-correo-smtp.md) §Verificación) con `spf=pass`.
- Search Console: propiedad verificada y sitemap «Correcto».

## Si algo falla

| Síntoma | Solución |
|---|---|
| Vercel: «Invalid Configuration» | Hay un A, AAAA o CNAME duplicado o en conflicto para el mismo nombre. Compara con los valores de *tu* panel, no los de otro proyecto, y revisa el §1 (NS) |
| `www` funciona y el apex no (o al revés) | Falta agregar uno de los dos dominios en Vercel o la redirección (§3.2) |
| El correo dejó de llegar | Se tocó el MX o el `mail.`, o el SPF quedó con `+a`. Restaura los valores del §2 |
| Certificado de Vercel pendiente | Hay una CAA que no incluye `letsencrypt.org`, o la propagación no ha terminado (TTL) |
| Google sigue mostrando spam | Normal durante semanas. Verifica que esas URLs den 404 y repite la solicitud de *Retiradas* |
