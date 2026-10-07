# 10 · App móvil iOS/Android con EAS

**Objetivo:** compilar y enviar la app (`apps/mobile`, Expo SDK 57) a App Store y Google Play desde las cuentas **del cliente**, con fichas en español, cumplimiento de privacidad y eliminación de cuenta, y una estrategia de versiones y actualizaciones. El desarrollo, la estructura y las variables `EXPO_PUBLIC_*` están en [`apps/mobile/README.md`](../../apps/mobile/README.md).

**Prerrequisitos**

- Cuentas del cliente: **Apple Developer Program** (USD 99 al año; persona jurídica con número D-U-N-S si se publica como empresa), **Google Play Console** (pago único de USD 25; mejor como *organización* para evitar la prueba cerrada obligatoria, §5) y **expo.dev** (organización «cafe-travesia»).
- Firebase con las apps iOS y Android ([04](04-firebase-auth.md) §5) y push configurado ([09](09-ia-y-push.md)).
- La web en producción (`https://cafetravesia.co`), porque la app consume esa API, y `/privacidad` publicada.
- Configuración en el repo (equipo móvil): `app.json` (`bundleIdentifier`/`package` `co.cafetravesia.app`, esquema `cafetravesia`), `app.config.ts` y `eas.json` (perfiles `development`, `preview`, `production`; `appVersionSource: remote`; `autoIncrement` en producción).

## 1. Vincular el proyecto EAS

```bash
npm i -g eas-cli          # o usa npx eas-cli@latest
eas login                 # con un usuario de la organización del cliente
cd apps/mobile
eas init                  # crea o vincula el proyecto y escribe expo.extra.eas.projectId en app.json
eas whoami && eas project:info
```

**Esperado:** `projectId` (UUID) en `app.json` › `expo.extra.eas.projectId`. Es necesario para obtener el token push. Si prefieres no escribirlo en `app.json`, `app.config.ts` acepta `EAS_PROJECT_ID`.

## 2. Variables y archivos en EAS

Define las variables `EXPO_PUBLIC_*` de `apps/mobile/README.md` por entorno (`production`, `preview`):

```bash
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://cafetravesia.co --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_API_KEY --value AIza… --visibility plaintext
# … resto de EXPO_PUBLIC_FIREBASE_* y EXPO_PUBLIC_GOOGLE_*_CLIENT_ID
eas env:list --environment production
```

`google-services.json` y `GoogleService-Info.plist` están en `.gitignore`. Para usarlos en EAS, súbelos como variables de tipo archivo y haz que `app.config.ts` lea su ruta (cambio del equipo móvil):

```bash
eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
eas env:create --environment production --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
# app.config.ts: android.googleServicesFile = process.env.GOOGLE_SERVICES_JSON; ios.googleServicesFile = process.env.GOOGLE_SERVICE_INFO_PLIST
```

## 3. Builds

```bash
eas build -p android --profile preview          # APK interno para probar en dispositivos
eas build -p ios --profile preview              # registra los dispositivos con: eas device:create
eas build -p ios --profile production           # .ipa firmado (EAS crea el certificado, el perfil y la clave APNs)
eas build -p android --profile production       # .aab (EAS crea el keystore de subida; guárdalo: eas credentials › Download)
```

En el primer build de iOS, inicia sesión con el Apple ID del cliente (o un usuario de App Store Connect con rol *Admin*). Acepta que EAS genere el *Distribution Certificate*, el *Provisioning Profile* y la *Push Key*.

## 4. Envío a las tiendas (EAS Submit)

([docs](https://docs.expo.dev/submit/introduction/))

**iOS**

1. App Store Connect › *Apps* › `+` › Nueva app: nombre «Café Travesía», idioma principal Español (México o España; no hay variante para Colombia), bundle `co.cafetravesia.app`, SKU `cafetravesia-ios`.
2. Copia el **Apple ID** numérico de la app a `eas.json` › `submit.production.ios.ascAppId`, que hoy tiene `REEMPLAZAR_CON_APP_STORE_CONNECT_APP_ID`.
3. `eas submit -p ios --profile production --latest`. El build queda en **TestFlight** en 10–15 min. Para publicar: completa la ficha (§5), selecciona el build y pulsa **Enviar a revisión**.

**Android**

1. Play Console › *Crear app*: «Café Travesía», Español (Latinoamérica), App, Gratis.
2. Google Cloud (proyecto de Firebase) › cuenta de servicio con acceso a Play Console (*Usuarios y permisos* › invitar al correo de la cuenta de servicio con permiso de versiones) › clave JSON → `apps/mobile/google-service-account.json`. **Ojo:** ese nombre **no** está cubierto por `.gitignore` (solo `service-account*.json`). No lo subas a git, o guárdalo fuera del repo y usa una ruta absoluta.
3. `eas submit -p android --profile production --latest`. Con `eas.json` actual queda en el track **internal** como **draft**. Promuévelo en Play Console.

## 5. Fichas de tienda (textos sugeridos)

| Campo | Texto sugerido |
|---|---|
| Nombre | Café Travesía |
| Subtítulo (iOS, 30 caracteres) | Café especial de Caicedo |
| Descripción corta (Play, 80) | Café especial de Caicedo, Antioquia: tienda, suscripción y Academia. |
| Descripción | Cultivamos, tostamos y servimos café especial. Porque si vas a tomar café… que sea de verdad. Con la app de Café Travesía comprá nuestros cafés de origen Caicedo (Antioquia), armá tu suscripción y recibí café fresco en casa, aprendé en la Academia con cursos de barismo y métodos de preparación, acumulá puntos y seguí tus pedidos. Te esperamos también en nuestro punto del Parque Comercial Florida, en Medellín. |
| Palabras clave (iOS, 100) | café,café especial,Antioquia,Caicedo,suscripción,barismo,cursos,tostado,origen,Medellín |
| Categoría | iOS: **Comida y bebida** (secundaria: Educación). Play: **Comida y bebida** |
| Clasificación de contenido | iOS: 4+. Play (IARC): sin violencia ni contenido sensible; declarar compras en la app de bienes físicos (no son compras dentro de la app de Apple/Google) |
| URL de política de privacidad | `https://cafetravesia.co/privacidad` |
| URL de soporte / marketing | `https://cafetravesia.co/contacto` / `https://cafetravesia.co` |
| Correo de soporte | `hola@cafetravesia.co` |
| Capturas | iPhone 6,9" (1320×2868) y 6,5" (1284×2778), mínimo 3. Android: teléfono 1080×1920 o más, mínimo 2, y gráfico destacado de 1024×500. Pantallas: Inicio, Tienda o producto con perfil sensorial, Suscripción, Academia (lección) y Pedidos. Genéralas en un simulador o dispositivo con datos reales (no demo) |
| Cuenta de prueba para la revisión | Crea `revision@cafetravesia.co` con contraseña, con una compra y un curso, e inclúyela en *App Review Information* y en *Acceso a la app* de Play |

**Privacidad en las tiendas**

- App Store › *Privacidad de la app* y Play › *Seguridad de los datos*. Datos recogidos: nombre, correo, teléfono, dirección de envío, historial de compras, identificadores (token push) y contenido de soporte (chat). Uso: funcionalidad de la app y atención al cliente. No hay seguimiento publicitario. Los pagos los procesa Wompi: la app no almacena tarjetas.
- **Google Play, cuentas personales nuevas:** antes de producción exige una **prueba cerrada con al menos 12 testers durante 14 días** seguidos ([política](https://support.google.com/googleplay/android-developer/answer/14151465)). Las cuentas de organización no tienen este requisito. Planea el calendario según el tipo de cuenta.

## 6. Eliminación de cuenta (obligatoria) — FALTA EN EL CÓDIGO

- **Apple** (guía 5.1.1(v)): si la app permite crear cuentas, debe permitir **iniciar la eliminación desde la app**. Con Sign in with Apple, además hay que revocar el token ([Firebase](https://firebase.google.com/docs/auth/web/apple)).
- **Google Play:** exige una ruta dentro de la app **y** un **enlace web** donde se pueda pedir la eliminación sin reinstalar la app, declarado en *Seguridad de los datos* ([política](https://support.google.com/googleplay/android-developer/answer/13327111?hl=es)).
- **Estado actual:** no existe endpoint `DELETE /api/v1/me` (`apps/web/src/app/api/v1/me/route.ts` solo tiene GET y PATCH). Tampoco hay opción en `apps/mobile/src/app/(tabs)/perfil.tsx` ni una página web de solicitud. **Bloquea la publicación** en ambas tiendas. Propuesta para los equipos web y móvil:
  - `DELETE /api/v1/me`: anonimizar el usuario y los pedidos (conservar los datos contables), revocar sesiones, borrar los tokens push y anular las fuentes de pago de Wompi.
  - En la app: la opción «Eliminar mi cuenta» en Perfil, con reautenticación y la revocación de Apple.
  - En la web: `/cuenta/eliminar` o una sección en `/privacidad` con un formulario o un correo.

## 7. Versiones y actualizaciones OTA

- `eas.json` usa `appVersionSource: remote` y `autoIncrement` en `production`: EAS incrementa `buildNumber` y `versionCode` en cada build. La versión visible (`expo.version`, hoy `1.0.0`) se cambia a mano en `app.json` cuando hay cambios para el usuario (1.1.0) o cambios nativos.
- Consulta y ajusta con `eas build:version:get -p ios` y `eas build:version:set`.
- **OTA (EAS Update):** los perfiles ya definen `channel`, pero **`expo-updates` no está instalado** en `apps/mobile/package.json` ni hay `runtimeVersion`. Para activarlo (equipo móvil): `npx expo install expo-updates` y `eas update:configure`. Luego publica arreglos de JS o recursos sin pasar por revisión con `eas update --channel production --message "…"`. Los cambios nativos (SDK, permisos, plugins) requieren un build nuevo y su revisión.
- **Enlaces universales:** `app.json` declara `applinks:cafetravesia.co` e *intent filters* con `autoVerify` para `https://cafetravesia.co/…`. Para que funcionen, la web debe servir `https://cafetravesia.co/.well-known/apple-app-site-association` (con `appID` `TEAMID.co.cafetravesia.app`) y `/.well-known/assetlinks.json` (con el SHA-256 de la firma de Play). **Hoy no existen** en `apps/web/public/`. Sin ellos, los enlaces abren el navegador; el esquema `cafetravesia://` sigue funcionando.

## Verificación

- `eas build:list --limit 4`: builds `production` de iOS y Android en `finished`.
- TestFlight y prueba interna de Play, en dispositivos físicos:
  - inicio de sesión con correo, Google y Apple (iOS);
  - compra con Wompi sandbox o real que vuelve a la app (`cafetravesia://pago`) y muestra el pedido pagado;
  - una lección de la Academia;
  - un push de prueba recibido ([09](09-ia-y-push.md) §Verificación).
- La ficha está completa, sin advertencias en «Contenido de la app» (Play) ni en «Información de la app» (App Store Connect).

## Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| `eas build` iOS: «No Apple Developer team» | Usuario sin rol en la cuenta del cliente | Invitación en App Store Connect con rol Admin o App Manager |
| Login con Google falla en Android | SHA-1 del keystore de EAS o de la firma de Play sin registrar en Firebase/Google Cloud | `eas credentials` › Android › muestra el SHA-1. Agrégalo junto con el de *Integridad de la app* |
| No hay token push | Falta `projectId`, o se usa Expo Go | §1. Usa un build de desarrollo o preview |
| Rechazo de Apple 5.1.1(v) | No hay eliminación de cuenta | §6 |
| Rechazo de Apple 4.8 / 4.0 | Falta Sign in with Apple o se ve como una web empaquetada | Ya está Apple. Destaca las funciones nativas (push, Academia) en las notas de revisión |
| Play: «Se requiere una prueba cerrada» | Cuenta personal nueva | §5 (12 testers, 14 días) |
| El retorno de Wompi no cierra el navegador | La página `/tienda/pago?app=1` no redirige a `cafetravesia://pago` | Revísalo con el equipo web (contrato en `docs/API.md`) |

**Rollback:**

- iOS: *App Store Connect › versión* › retira el build de la venta o publica la versión anterior como una nueva.
- Android: *Play Console › Versiones* › detén el lanzamiento progresivo («Detener lanzamiento»).
- Con EAS Update (cuando exista): `eas update:republish` de la actualización anterior.
