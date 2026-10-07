# Café Travesía · App iOS/Android

App en Expo SDK 57 (Expo Router, React 19.2, React Native 0.86) que consume la misma API que la web (`docs/API.md`) en `EXPO_PUBLIC_API_URL`.

## Desarrollo

```bash
# desde la raíz del monorepo
npm install
cd apps/mobile
cp .env.example .env          # completa las variables
npx expo start                # Expo Go sirve para la UI; push, Apple y Google requieren development build
npx expo run:ios | run:android   # o: eas build --profile development
```

- Instala dependencias **solo** con `npx expo install <pkg>` desde `apps/mobile`. React está fijado en 19.2.3 en los `overrides` de la raíz.
- Verificación: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`, `npx expo export --platform android`.
- **Modo demo.** Si la API no responde (o `EXPO_PUBLIC_DEMO=1`), la app usa `src/lib/demo.ts` (datos adaptados de `packages/db/src/seed-data.ts`). Las escrituras como pagar, suscribirse, inscribirse o editar muestran un aviso. Si tocas el aviso, la app reintenta conectarse.

## Estructura

```
src/app/(tabs)/        Inicio, Tienda, Academia (oscura), Plan, Perfil; tab bar propia y botón flotante de soporte
src/app/…              producto/[slug], curso/[slug], leccion/[id], quiz/[id], carrito, checkout, pago/(index|resultado),
                       pedidos(/[id]), suscribir/[slug], notificaciones, ingresar, puntos, datos, direcciones,
                       certificados, chat, +native-intent (enlaces web → rutas app), +not-found
src/lib/api.ts         cliente con Bearer de Firebase, detección online/demo, errores del contrato
src/lib/queries.ts     hooks TanStack Query ('catalog' se persiste en AsyncStorage: lib/query.ts)
src/lib/auth.tsx       Firebase Auth (correo, Google, Apple) + GET /api/v1/me
src/lib/cart.ts        carrito CartLineInput persistido; sincroniza GET/PUT /api/cart con sesión
src/lib/push.ts        expo-notifications: permisos, canal 'default', token Expo, registro y toques (data.url)
src/lib/links.ts       DEEP_LINKS/URLs https://cafetravesia.co → pantallas
src/components/        UI (tipografía, botones, chips…), marca (bolsa SVG, patrón andino), catálogo, formularios
```

## Variables (`.env.example`)

| Variable | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend (por defecto `https://cafetravesia.co`) |
| `EXPO_PUBLIC_DEMO` | `1` fuerza el modo demo |
| `EXPO_PUBLIC_FIREBASE_*` | Config de la app web de Firebase (apiKey, authDomain, projectId, appId, messagingSenderId, storageBucket) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | OAuth client tipo iOS (bundle `co.cafetravesia.app`). `app.config.ts` agrega su esquema invertido |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | OAuth client tipo Android (paquete `co.cafetravesia.app` + SHA‑1 del keystore de EAS) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | "Web client" creado por Firebase (vista web) |
| `EAS_PROJECT_ID` | projectId de EAS si no está en `app.json` → `extra.eas.projectId` (necesario para el token push) |

En EAS, define estas variables como *environment variables* del proyecto: `eas env:create`, o con la sección `env` de `eas.json`.

## Inicio de sesión

- **Firebase:** activa los proveedores Correo/contraseña, Google y Apple en Authentication. La app usa `initializeAuth` con `getReactNativePersistence(AsyncStorage)`.
- **Google:** usa `expo-auth-session` (`providers/google`, `useIdTokenAuthRequest`). El `id_token` se cambia por `GoogleAuthProvider.credential`. Crea los tres client IDs en el mismo proyecto de Google Cloud que Firebase. Para producción a gran escala se puede migrar a `@react-native-google-signin/google-signin`, que Expo recomienda.
- **Apple (iOS):** `ios.usesAppleSignIn: true` y el plugin `expo-apple-authentication`. El nonce aleatorio se envía a Apple como SHA‑256 (`expo-crypto`) y en crudo a `OAuthProvider('apple.com').credential({ idToken, rawNonce })`. En Firebase → Apple, registra el Services ID y la clave de Apple (Team ID, Key ID, .p8).
- Después de ingresar, la app llama `GET /api/v1/me` con Bearer, lo que crea o actualiza el usuario en el backend. También sincroniza el carrito.

## Pagos

- **Compra:** `POST /api/cart/quote` calcula los totales. Luego `POST /api/checkout {channel:'app'}` y la app abre `wompi.checkoutUrl` con `WebBrowser.openAuthSessionAsync(url, 'cafetravesia://pago')`. Al volver, `GET /api/payments/verify` (con polling mientras esté PENDING). La página web `/tienda/pago?app=1` debe redirigir a `cafetravesia://pago?pedido=…&id=…`.
- **Suscripción:** `GET /api/wompi/acceptance` y luego `POST https://<sandbox|production>.wompi.co/v1/tokens/cards` con la llave pública. La tarjeta no pasa por el backend. Por último `POST /api/subscriptions`.

## Push (APNs / FCM)

1. `npx eas-cli@latest init` vincula el proyecto y escribe `extra.eas.projectId` (o usa `EAS_PROJECT_ID`).
2. **iOS:** `eas credentials` → *Push Notifications: set up* genera o sube la clave APNs (.p8). EAS la asocia al bundle `co.cafetravesia.app`.
3. **Android:** crea la app Android en Firebase (`co.cafetravesia.app`). Luego sube la *Service Account Key* (FCM v1) en `eas credentials` → Android → *Google Service Account* → *FCM V1*. No hace falta `google-services.json` para Expo Push.
4. El backend envía con Expo Push API. `data.url` debe ser una ruta de la web (`DEEP_LINKS`), por ejemplo `/cuenta/pedidos/<id>` o `/tienda/<slug>`.
5. El plugin `expo-notifications` usa `assets/images/notification-icon.png` (blanco 96×96), color ámbar y canal `default`.

## Build y publicación (EAS)

```bash
npx eas-cli@latest build --profile development --platform ios|android   # cliente de desarrollo
npx eas-cli@latest build --profile preview --platform all                 # QA interno (APK / ad hoc)
npx eas-cli@latest build --profile production --platform all              # tiendas (autoIncrement)
npx eas-cli@latest submit --profile production --platform ios|android
npx eas-cli@latest update --channel production                            # OTA (canales por perfil)
```

- En `eas.json`, completa `submit.production.ios.ascAppId` y agrega `google-service-account.json` para Play (no lo subas a git).
- Universal links: `ios.associatedDomains` (`applinks:cafetravesia.co`) e `intentFilters` de Android requieren publicar `/.well-known/apple-app-site-association` y `/.well-known/assetlinks.json` en la web.
- Íconos y splash: `assets/images/*` se generaron con Pillow desde `apps/web/public/brand/logotipo.png` y `logo-claro.png`.
