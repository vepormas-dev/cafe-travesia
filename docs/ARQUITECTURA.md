# Arquitectura · Ecosistema Café Travesía

```
                         cafetravesia.com  (DNS en cPanel)
                                │
        ┌───────────────────────┴───────────────────────────┐
        │                     VERCEL                         │
        │  Next.js 16 (apps/web)                             │
        │   · Landing + CMS público  (/ , /nosotros, /blog…)  │
        │   · E-commerce            (/tienda, /suscripciones) │
        │   · Academia              (/academia)               │
        │   · Área de cliente       (/cuenta)                 │
        │   · Panel CMS + dashboard (/acceso → /admin)        │
        │   · API REST              (/api/*, /api/v1/*)       │
        │   · Cron diario (vercel.json)                       │
        └──────┬──────────────┬──────────────┬───────────────┘
               │ HTTPS+HMAC   │ Admin SDK    │ HTTPS
               ▼              ▼              ▼
   ┌─────────────────────┐ ┌──────────┐ ┌────────────────────────────┐
   │ cPanel (hosting)    │ │ Firebase │ │ Wompi · Expo Push · OpenAI │
   │ gateway.<dominio>   │ │  Auth    │ │ SMTP (correo del cPanel)   │
   │  db.php → MySQL     │ └──────────┘ └────────────────────────────┘
   │  media.php → disco  │
   │ media.<dominio>     │◀── imágenes/PDF servidos por Apache (caché 1 año)
   │ cron (cada 15 min)  │──▶ /api/cron
   └─────────────────────┘
               ▲
   App iOS/Android (Expo, apps/mobile) ── usa la misma API y Firebase Auth
```

## Decisiones clave

| Tema | Decisión | Por qué |
|---|---|---|
| Base de datos | MySQL o MariaDB del cPanel, con **Drizzle ORM** | Es el requisito del cliente: los datos quedan en su hosting. Drizzle da un esquema tipado y migraciones SQL portables. |
| Conexión | **Pasarela PHP** (`infra/cpanel/gateway/db.php`), con firma HMAC-SHA256 y ventana anti-replay de 90 s | Vercel no tiene IP fija en el plan Hobby. Así no se expone el puerto 3306 a internet y no se agotan las conexiones del hosting compartido. Con Vercel Pro y Static IPs se puede usar `DB_DRIVER=mysql`. |
| Transacciones | `atomic([...])`, que ejecuta un lote en una sola transacción dentro de la pasarela | El driver proxy no soporta `db.transaction()`. Los flujos críticos (pedido + ítems, efectos del pago) son atómicos. |
| Idempotencia | Bloqueos condicionales (`UPDATE … WHERE status IN (…)`) y `payment_events` con clave única | Wompi reintenta los webhooks. Ningún efecto (stock, inscripciones, puntos, correos) se aplica dos veces. |
| Caché | Cache Components (`"use cache"` + `cacheTag`) en todas las lecturas públicas | La landing, la tienda y la academia se sirven desde la caché de Vercel. La base de datos de cPanel solo se consulta cuando el CMS invalida contenido. |
| Archivos | Disco de cPanel (`media.<dominio>`), con subida directa desde el navegador mediante un ticket firmado | Evita el límite de 4,5 MB por petición de Vercel. Se verifica el MIME real y la carpeta de medios no ejecuta PHP. |
| Autenticación | **Firebase Auth** (correo, Google, Apple), con cookie de sesión httpOnly en la web y Bearer ID token en la app | Identidad gestionada y gratuita. Inicio de sesión unificado web/app. El rol vive en MySQL y se replica como custom claim. |
| Pagos | **Wompi**: Web Checkout para compras y fuente de pago tokenizada para suscripciones (cobro COF recurrente) | Pasarela colombiana con tarjetas, PSE, Nequi, Bancolombia y Daviplata. |
| Video de cursos | URL HLS/MP4 por lección (recomendado: Bunny Stream) | Un hosting compartido no es apto para servir video. |
| Push | Expo Push API (APNs/FCM), con bandeja en la base de datos | Un solo código para iOS y Android. Campañas segmentadas y automáticas. |
| IA | API compatible con OpenAI (`lib/ai.ts`), con respaldo por reglas | Chatbot, búsqueda, recomendaciones, tutor y redacción del CMS. Sin clave de IA, todo sigue funcionando. |
| Modo demo | Sin base de datos configurada, el sitio usa `seed-data.ts` y bloquea las escrituras | Permite previsualizar y compilar sin credenciales. |

## Estructura

```
apps/web          Next.js (sitio, tienda, academia, cuenta, CMS, API)
apps/mobile       Expo SDK 57 (iOS/Android)
packages/shared   marca, formatos, precios, validaciones y tipos de la API
packages/db       esquema Drizzle, cliente (gateway | mysql2), migraciones, seed
infra/cpanel      pasarela PHP (db.php, media.php, health.php) y .htaccess
docs/             arquitectura, API, despliegue, diseño (mockups y referentes)
```

## Flujo de una compra

1. El carrito (localStorage) pide `/api/cart/quote`, que recalcula precios, envío, cupón y puntos en el servidor.
2. `/api/checkout` valida el stock en vivo y crea el pedido y sus ítems con `atomic`. Devuelve la URL de Wompi con la firma de integridad.
3. El cliente paga en Wompi. Wompi llama a `/api/webhooks/wompi`, donde se verifica la firma, el ambiente y el monto. Entonces `markOrderPaid` aplica los efectos: stock, inscripciones, cupón, puntos, correo y push.
4. Si el webhook se pierde, hay dos respaldos: la página `/tienda/pago` verifica la transacción contra la API de Wompi, y el cron concilia los pedidos pendientes.
