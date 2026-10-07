# 07 · Pagos con Wompi

**Objetivo:** configurar las llaves, los secretos y las URLs de eventos de sandbox y producción, y aprobar en sandbox las pruebas de compra, curso, cupón, suscripción e idempotencia antes de pasar a producción.

Cómo funciona en el código (`apps/web/src/lib/wompi.ts`, `commerce/payments.ts`, `api/webhooks/wompi/route.ts`):

- **Compra:** `/api/checkout` crea el pedido y la URL del **Web Checkout** con `signature:integrity = SHA256(referencia + monto_en_centavos + COP + secreto_de_integridad)` y `redirect-url = NEXT_PUBLIC_SITE_URL/tienda/pago…`.
- **Webhook:** se verifica el checksum `SHA256(valores de signature.properties + timestamp + secreto_de_eventos)` y el ambiente (`test`/`prod` según `WOMPI_ENV`). Si la firma no es válida responde 401. Al aprobar, se exige que `amount_in_cents == total del pedido × 100`. Responde 200 solo si el efecto quedó aplicado; si no, responde 500 para que Wompi reintente a los 30 min, 3 h y 24 h ([eventos](https://docs.wompi.co/docs/colombia/eventos/)).
- **Idempotencia:** `payment_events` tiene una clave única `(provider, external_id, status)`. Un evento repetido, o la combinación webhook + página de retorno + conciliación, aplica los efectos **una sola vez**.
- **Respaldo:** la página `/tienda/pago` consulta la transacción, y el cron `reconcile` concilia los pendientes ([06](06-cron.md)).
- **Suscripciones:** la tarjeta se tokeniza en el cliente (`/v1/tokens/cards` con la llave pública), se crea una **fuente de pago** con la llave privada y los tokens de aceptación, y los cobros son `POST /v1/transactions` con `payment_source_id` y `recurrent: true` (COF) ([fuentes de pago](https://docs.wompi.co/docs/colombia/fuentes-de-pago/)).

**Prerrequisitos:** sitio desplegado con BD ([05](05-vercel.md), [01](01-cpanel-base-de-datos.md)). Datos legales del comercio del cliente: NIT o cédula, RUT, cuenta bancaria y representante legal.

## 1. Cuenta de comercio

1. El cliente se registra en [comercios.wompi.co](https://comercios.wompi.co) con el correo corporativo y completa la vinculación (documentos y cuenta para dispersión). La aprobación de producción la hace Wompi y puede tardar días.
2. **Medios de pago:** en el dashboard, activa los que ofrecerá el comercio: tarjetas, PSE, Nequi, Botón Bancolombia, Daviplata y QR. El Web Checkout muestra los habilitados.
3. **Suscripciones (cobro recurrente con fuente de pago):** confirma con el asesor comercial de Wompi que el comercio tiene habilitados la creación de **fuentes de pago** y los cobros **recurrentes (COF)**. Sin esto, `/api/subscriptions` falla al crear la fuente.

## 2. Llaves, secretos y URL de eventos (por ambiente)

Dashboard › **Desarrolladores**. Activa el interruptor **modo de pruebas** para ver las de sandbox ([soporte Wompi](https://soporte.wompi.co/hc/es-419/articles/1500010231462)). Prefijos ([ambientes y llaves](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/)):

| Dato | Sandbox | Producción | Variable de Vercel |
|---|---|---|---|
| Llave pública | `pub_test_…` | `pub_prod_…` | `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` |
| Llave privada | `prv_test_…` | `prv_prod_…` | `WOMPI_PRIVATE_KEY` 🔒 |
| Secreto de integridad | `test_integrity_…` | `prod_integrity_…` | `WOMPI_INTEGRITY_SECRET` 🔒 |
| Secreto de eventos | `test_events_…` | `prod_events_…` | `WOMPI_EVENTS_SECRET` 🔒 |
| API | `https://sandbox.wompi.co/v1` | `https://production.wompi.co/v1` | se elige con `WOMPI_ENV` = `sandbox` / `production` |

**URL de eventos:** Wompi pide una **por ambiente** ([docs](https://docs.wompi.co/docs/colombia/eventos/)). En *Desarrolladores › URL de eventos*:

| Ambiente | URL | Nota |
|---|---|---|
| Sandbox (antes del corte) | `https://cafe-travesia.vercel.app/api/webhooks/wompi` | Producción de Vercel con llaves de **sandbox**. Así se prueba sin tocar el dominio |
| Sandbox (después, para Preview y staging) | URL estable de Preview + `?x-vercel-protection-bypass=SECRETO` | Ver [05](05-vercel.md) §6. Preview debe usar su **propia BD** de staging |
| Producción | `https://cafetravesia.co/api/webhooks/wompi` | Se configura en el paso a producción (§5) |

Carga en Vercel las llaves de sandbox (`WOMPI_ENV=sandbox`) y valida con `node scripts/check-env.mjs`. La regla de prefijos detecta mezclas de llaves entre ambientes.

## 3. Pruebas en sandbox

Datos oficiales ([datos de prueba](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/)):

| Medio | Aprobada | Rechazada |
|---|---|---|
| Tarjeta | `4242 4242 4242 4242` (fecha futura y CVC de 3 dígitos) | `4111 1111 1111 1111` |
| Nequi | `3991111111` | `3992222222` |
| PSE (Widget/Checkout) | banco «Banco que aprueba» | «Banco que rechaza» |
| Botón Bancolombia, QR y Daviplata | se elige el estado final en la pantalla de sandbox | — |

Cualquier otra tarjeta o número termina en `ERROR`. Para cada prueba, anota el **ID de transacción**, la **referencia** y el **número de pedido** (`CT-…`).

### 3.1 Compra de café

1. `/tienda` › un café › Agregar › Carrito › Checkout como **invitado** con un correo real de pruebas.
2. Wompi › Tarjeta `4242…` › Pagar. Te redirige a `/tienda/pago?…`, que muestra «Pago aprobado».
3. **Esperado:**
   - `/admin` › Pedidos: el pedido en **pagado**, con el stock descontado.
   - `/admin/monitor` › Eventos: `wompi webhook ok … CT-… → APPROVED`.
   - Llega el correo de confirmación al cliente y el aviso a `ADMIN_NOTIFY_EMAIL`.
4. Repite con `4111…`: el pedido queda en **fallido**, sin descontar stock. Repite con Nequi `3991111111` y con PSE «Banco que aprueba».

### 3.2 Compra de curso

1. `/academia/cursos` › un curso de pago › Comprar › paga con `4242…`.
2. **Esperado:** el pedido queda pagado y el usuario aparece **inscrito**: `/cuenta/cursos` muestra el curso y las lecciones se abren. Si compraste como invitado, al registrarte con el mismo correo se vincula (`upsertUserFromToken` une las cuentas por correo).

### 3.3 Cupón

1. Usa en el carrito un cupón del seed: `BIENVENIDA10` (10 %, 1 uso por usuario), `ENVIOGRATIS` (envío gratis desde $80.000 en productos) o `ACADEMIA20` (20 % en cursos). `/api/cart/quote` debe mostrar el descuento.
2. Paga. **Esperado:** el total cobrado en Wompi es igual al total con descuento, y el cupón suma 1 uso (`coupon_redemptions`).
3. Con `BIENVENIDA10`, una segunda compra con el mismo correo o usuario debe rechazar el cupón (`maxUsesPerUser: 1`).

### 3.4 Suscripción (tokenización y cobro recurrente)

1. Inicia sesión › `/suscripciones` › un plan › tarjeta `4242…` › acepta los términos y la autorización de datos (vienen de `/api/wompi/acceptance`).
2. **Esperado:** `201 { subscriptionId, chargeStatus }`, la suscripción queda **activa** y hay un `subscription_charges` aprobado. `/cuenta/suscripcion` la muestra.
3. **Cobro recurrente:** en phpMyAdmin pon `UPDATE subscriptions SET next_billing_at = NOW() - INTERVAL 1 MINUTE WHERE id = '<id>';` y ejecuta `curl -H "Authorization: Bearer $CRON_SECRET" "https://…/api/cron?tasks=billing"`. **Esperado:** `{"billing":{"due":1,"charged":1}}` y un nuevo cobro `SUB-…` aprobado en el dashboard de Wompi (sandbox).
4. Repite la suscripción con `4111…`: la creación de la fuente debe fallar con «La fuente de pago ha sido declinada».
5. Cancelar desde `/cuenta/suscripcion` anula la fuente de pago (`PUT /payment_sources/{id}/void`).

### 3.5 Firma inválida

`node scripts/smoke-prod.mjs <url>` envía un evento con checksum falso. **Esperado:** `401`, y en el monitor `wompi webhook.signature error`.

### 3.6 Webhook duplicado (idempotencia)

1. Dashboard sandbox › **Transacciones** › la transacción de §3.1 › **reenviar el evento**, si el dashboard lo ofrece. Si no, espera un reintento o haz el retorno a `/tienda/pago?id=<txId>` otra vez.
2. **Esperado:** Wompi recibe **200**. En el monitor el resultado queda con `payload: { duplicate: true }`. El stock, los puntos, el cupón y los correos **no** se aplican de nuevo. Compruébalo con el stock del producto antes y después.
3. Evento de otro ambiente: un evento `environment: "prod"` con `WOMPI_ENV=sandbox` responde `200 { ignored: true }`, sin efectos.

## 4. Checklist previo a producción

- [ ] Todo el §3 está aprobado y documentado con los IDs.
- [ ] Wompi aprobó el comercio en producción.
- [ ] Vercel está en plan Pro ([05](05-vercel.md) §Plan).
- [ ] El dominio ya apunta a Vercel ([03](03-dns-y-dominio.md)) y `NEXT_PUBLIC_SITE_URL=https://cafetravesia.co`, porque es la `redirect-url` de Wompi.

## 5. Paso a producción

1. Dashboard › Desarrolladores (con el **modo de pruebas desactivado**) › copia las 4 llaves `prod`.
2. **URL de eventos de producción:** `https://cafetravesia.co/api/webhooks/wompi`.
3. Vercel › Production: `WOMPI_ENV=production` y las 4 variables `prod`. Preview conserva las de sandbox. Valida con `check-env` y **redespliega**.
4. **Compra real de bajo valor** (por ejemplo, un producto de prueba a COP 2.000 creado en el CMS y oculto después) con una tarjeta real. Verifica el pedido pagado, el webhook `ok` y el correo. Luego **anula o reembolsa** desde el dashboard de Wompi.
5. `/admin/monitor` › Pagos Wompi: **Producción** en verde.

## Verificación

- Monitor: `wompi webhook ok` por cada prueba y ningún `webhook.signature error` salvo el de §3.5.
- En el dashboard de Wompi › Transacciones › cada transacción, el evento entregado muestra **200**.
- Consulta para reconciliar a mano:

```sql
SELECT o.number, o.status, o.total_cop, e.status AS evento, e.created_at FROM orders o
LEFT JOIN payment_events e ON e.reference = o.wompi_reference ORDER BY o.created_at DESC LIMIT 20;
```

## Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| Wompi: «La firma es inválida» al abrir el checkout | `WOMPI_INTEGRITY_SECRET` es de otro ambiente o tiene espacios | `check-env` (prefijos). Redespliega |
| El webhook siempre da 401 | Falta `WOMPI_EVENTS_SECRET` o es de otro ambiente | Ídem. Los pedidos se confirman igual por el retorno y la conciliación, pero tarde |
| El webhook da 503 | Sitio en modo demo (sin BD) | [05](05-vercel.md) |
| El webhook da 500 y Wompi reintenta | Error al aplicar (pasarela caída, BD) | `/admin/monitor`. Cuando se arregle, el reintento o `reconcile` lo aplica |
| `amount_mismatch` en el monitor | El monto pagado no coincide con el pedido (manipulación o cambio de precio) | **No se aprueba**. Revisa el caso y reembolsa desde Wompi |
| El pedido sigue `pending` | El webhook no llegó a esa URL (Preview protegida, URL de otro ambiente) | §2 (URL por ambiente). `reconcile` lo resuelve a los 15 min o más |
| Suscripción: error al crear la fuente | Función no habilitada en el comercio, o tarjeta `4111` | §1.3 |

**Rollback:** vuelve a poner `WOMPI_ENV=sandbox` y las llaves `test` en Production y redespliega. Para detener la venta en caliente, quita `WOMPI_PRIVATE_KEY`: `/api/checkout` responde 503 «Los pagos aún no están configurados».
