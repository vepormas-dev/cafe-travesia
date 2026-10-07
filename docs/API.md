# API de Café Travesía

Base: `https://cafetravesia.com` (web y app móvil usan la misma API). JSON en UTF-8, fechas ISO 8601, dinero en **COP enteros**.

**Autenticación.**

- **Web:** cookie httpOnly `__session`. Se crea con `POST /api/auth/session { idToken }` después de iniciar sesión con Firebase en el navegador.
- **App móvil:** header `Authorization: Bearer <Firebase ID token>`, que se renueva solo con el SDK.

**Errores:** `{ error: string, issues?: { campo: string[] } }`, con estos códigos:

- `401`: sin sesión.
- `403`: sin permiso.
- `404`: no existe.
- `409`: conflicto o stock.
- `422`: validación.
- `429`: límite de solicitudes.
- `503`: modo demo o servicio sin configurar.

Los tipos están en `packages/shared/src/api-types.ts` y las validaciones en `packages/shared/src/schemas.ts`.

## Catálogo y contenido (público, en caché)

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/v1/products?kind=&featured=1&seasonal=1` | `{ products: ProductDTO[] }` |
| GET | `/api/v1/products/:slug` | `{ product: ProductDTO }` |
| GET | `/api/v1/plans?audience=personal\|empresa` | `{ plans: PlanDTO[] }` |
| GET | `/api/v1/courses?featured=1` | `{ courses: CourseDTO[] }` |
| GET | `/api/v1/courses/:slug` | `{ course: CourseDTO }` (con `modules[].lessons[]`, sin contenido protegido) |
| GET | `/api/v1/posts?category=&limit=` | `{ posts: PostSummary[] }` |
| GET | `/api/v1/posts/:slug` | `{ post: Post }` |
| GET | `/api/v1/content/:key` | `{ key, content }`. Claves: `home.hero`, `home.seasonal`, `home.banner`, `home.story`, `about`, `impact`, `faq`, `contact`, `app_links`, `seo` |
| GET | `/api/v1/stores` | `{ stores: StoreLocation[] }` |

## Carrito, checkout y pagos

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/cart/quote` | `{ items: CartLineInput[], region?, city?, couponCode?, email?, redeemPoints? }` | `{ lines, totals: Totals, coupon: {ok, code, description, kind} \| {ok:false, error}, availablePoints }` |
| GET/PUT | `/api/cart` (sesión) | PUT `{ items: CartLineInput[] }` | `{ items }`: carrito sincronizado entre web y app |
| POST | `/api/coupons/validate` | `{ code, items }` | `{ ok, code, description, discountCop, freeShipping }` o `{ ok:false, error }` |
| POST | `/api/checkout` | `CheckoutInput` | `201 CheckoutResultDTO` → abrir `wompi.checkoutUrl` (web: redirección; app: `WebBrowser.openAuthSessionAsync`) |
| GET | `/api/payments/verify?id=<txId>&pedido=<orderId>` | | `{ transactionStatus, order: { id, number, status, totalCop, kind, emailHint } }` |
| POST | `/api/webhooks/wompi` | evento Wompi | `200` si se aplicó (firma verificada, idempotente) |

Si el pago se hace en la app, Wompi redirige a `https://cafetravesia.com/tienda/pago?pedido=<id>&id=<txId>&app=1`. Esa página detecta `app=1` y abre `cafetravesia://pago?pedido=...` para cerrar el navegador de la app.

## Suscripciones

| Método | Ruta | Cuerpo / respuesta |
|---|---|---|
| GET | `/api/wompi/acceptance` | `{ publicKey, acceptanceToken, termsUrl, personalAuthToken, personalDataUrl, env }`, para tokenizar la tarjeta con `https://<sandbox\|production>.wompi.co/v1/tokens/cards` desde el cliente |
| POST | `/api/subscriptions` (sesión) | `SubscribeInput` → `201 { subscriptionId, chargeStatus }` |
| GET | `/api/v1/subscriptions` (sesión) | `{ subscriptions: SubscriptionDTO[] }` |
| PATCH | `/api/subscriptions/:id` (sesión) | `subscriptionUpdateSchema` (`pause` / `resume` / `skip` / `cancel` / `change_plan` / `change_coffee` / `change_address`) → `{ subscription: SubscriptionDTO }` |

## Cuenta (sesión)

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/v1/me` | `{ user: MeDTO }` |
| PATCH | `/api/v1/me` | `profileSchema` → `{ user: MeDTO }` |
| GET | `/api/v1/orders` | `{ orders: OrderDTO[] }` |
| GET | `/api/v1/orders/:id` | `{ order: OrderDTO }` |
| GET/POST | `/api/v1/addresses` | `{ addresses }` / `addressSchema` + `{ label?, isDefault? }` |
| PATCH/DELETE | `/api/v1/addresses/:id` | |
| GET | `/api/v1/loyalty` | `{ points, ledger: { points, reason, createdAt }[] }` |
| GET | `/api/v1/notifications` | `{ notifications: { id, title, body, deepLink, kind, readAt, createdAt }[], unread }` |
| POST | `/api/v1/notifications/read` | `{ ids?: string[] }`: sin `ids` marca todas como leídas |
| POST | `/api/reviews` | `{ productId? \| courseId?, ...reviewSchema }` |

## Academia

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/v1/academy/me` (sesión) | `{ enrollments: { course: CourseDTO, progressPct, lastLessonId, status, completedAt }[], certificates: { code, courseTitle, issuedAt, url }[] }` |
| GET | `/api/v1/courses/:slug/access` | `CourseAccessDTO` |
| POST | `/api/courses/:id/enroll` (sesión) | `{ ok, enrollmentId }`: gratis o incluido en una suscripción con Academia; si no aplica, `402` con `{ error, purchase: true }` |
| GET | `/api/v1/lessons/:id` | `LessonDTO`. Requiere inscripción, salvo `isPreview`: `401`/`403` |
| POST | `/api/v1/progress` | `progressSchema` → `{ ok, progressPct, courseCompleted, certificateCode? }` |
| GET/POST | `/api/v1/lessons/:id/notes` | `{ notes }` / `{ atS, body }` |
| GET | `/api/v1/quizzes/:id` | `{ quiz: { id, title, passScore, questions: { id, prompt, options }[] } }`: nunca incluye la respuesta correcta |
| POST | `/api/v1/quizzes/:id/submit` | `quizSubmitSchema` → `{ score, passed, results: { correct, explanation }[], certificateCode? }` |
| GET | `/api/certificates/:code` | PDF del certificado |
| GET | `/certificados/:code` | Página pública de verificación |

## IA y asistente

| Método | Ruta | Cuerpo → respuesta |
|---|---|---|
| POST | `/api/chat` | `chatMessageSchema` → `ChatReplyDTO` (bot de ventas y soporte; `{ type:'human' }` escala a un asesor) |
| GET | `/api/chat?sessionId=` | `ChatReplyDTO`: polling de mensajes del asesor |
| POST | `/api/ai/search` | `aiSearchSchema` → `{ summary, items: AiRecommendation[], ai: boolean }` |
| POST | `/api/ai/recommend` | `aiRecommendSchema` → `{ items: AiRecommendation[], ai: boolean }` |
| POST | `/api/ai/tutor` (sesión e inscripción) | `aiTutorSchema` → `{ answer, lessons: { id, title }[], ai: boolean }` |

## Captación

| Método | Ruta | Cuerpo |
|---|---|---|
| POST | `/api/leads` | `leadSchema` (honeypot `website`) |
| POST | `/api/newsletter` | `newsletterSchema` |

## Push

| Método | Ruta | Cuerpo |
|---|---|---|
| POST | `/api/push/register` | `pushRegisterSchema` (con o sin sesión) |
| DELETE | `/api/push/register` | `{ token }` |

`data.url` de cada notificación es una ruta de la web (`DEEP_LINKS` en shared). La app la traduce a su pantalla equivalente.

## Operación (protegidas)

| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/api/cron` | `Authorization: Bearer $CRON_SECRET`; `?tasks=billing,reconcile,push,reminders,carts,cleanup`, `?daily=1` |
| POST | `/api/media/ticket` (staff) | `{ folder }` → `{ ticket, uploadUrl }` para subir directo a la pasarela cPanel |
| POST | `/api/media` (staff) | registra un archivo subido en `media_assets` |
