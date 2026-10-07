# 04 · Firebase Auth

**Objetivo:** dejar listo el inicio de sesión con correo y contraseña, Google y Apple en la web (y la base para la app móvil). La web usa `signInWithPopup` y después cambia el ID token por la cookie httpOnly `__session` en `POST /api/auth/session`. El rol vive en MySQL y se replica como custom claim (`apps/web/src/lib/auth.ts`).

**Prerrequisitos**

- Cuenta Google **del cliente** (p. ej. `tecnologia@cafetravesia.co`).
- Para Apple: membresía de Apple Developer Program del cliente (aprobación de 1–2 días).
- Dominio final decidido. La URL de Vercel ya existe ([05](05-vercel.md)).

## 1. Crear el proyecto

1. [console.firebase.google.com](https://console.firebase.google.com) › **Agregar proyecto** › nombre `cafe-travesia`. El ID queda, por ejemplo, `cafe-travesia` o `cafe-travesia-1a2b3`. Google Analytics: opcional (no lo usa el código).
2. Plan **Spark** (gratis) para empezar. Ver los límites en §9.

## 2. Habilitar los proveedores

Consola › **Authentication** › *Comenzar* › pestaña **Sign-in method**:

1. **Correo electrónico/contraseña** › Habilitar. *Vínculo de correo electrónico* (sin contraseña): **deshabilitado**, porque el código no lo usa.
2. **Google** › Habilitar › *Nombre público*: `Café Travesía` › *Correo de asistencia*: el del cliente › Guardar.
   - En Google Cloud Console › *APIs y servicios › Pantalla de consentimiento de OAuth*: nombre de la app «Café Travesía», logo, correo de asistencia, dominios autorizados `cafetravesia.co`, y enlaces a `https://cafetravesia.co/privacidad` y `/terminos`.
3. **Apple** ([guía oficial](https://firebase.google.com/docs/auth/web/apple)):
   1. [developer.apple.com](https://developer.apple.com/account) › *Certificates, Identifiers & Profiles* › **Identifiers** › `+` › *App IDs* › Bundle ID `co.cafetravesia.app` (sugerido: debe ser **idéntico** a `ios.bundleIdentifier` de `apps/mobile/app.json`; ver `apps/mobile/README.md`) › capacidad **Sign In with Apple**.
   2. `+` › **Services IDs** › Identifier `co.cafetravesia.web` › *Configure* Sign In with Apple: *Primary App ID* `co.cafetravesia.app`. *Domains and Subdomains*: `PROYECTO.firebaseapp.com`. *Return URLs*: `https://PROYECTO.firebaseapp.com/__/auth/handler`. Cambia `PROYECTO` por el ID del §1.
   3. **Keys** › `+` › *Sign in with Apple* › *Configure* (App ID primario) › *Register* › **descarga el `.p8`** (solo se puede una vez) y anota el **Key ID**. El **Team ID** está en *Membership*.
   4. *Sign in with Apple for Email Communication*: registra `noreply@PROYECTO.firebaseapp.com`, para que los correos de Firebase (verificación, recuperación) lleguen a los usuarios con correo oculto de Apple.
   5. En Firebase › Apple › Habilitar: *ID de servicios* `co.cafetravesia.web`. En *Flujo de código OAuth*: Team ID, Key ID y el contenido del `.p8` › Guardar.
   6. Guarda el `.p8` en el gestor del cliente. **No** va en git: `.gitignore` excluye `*.p8`.

> Apple exige que una app que permite crear cuentas también permita eliminarlas desde la app, y que con Sign in with Apple se revoque el token ([Firebase: token revocation](https://firebase.google.com/docs/auth/web/apple)). **Hoy esa función no existe en el código**: ver [10](10-app-movil.md) §6.

## 3. Dominios autorizados

Authentication › **Settings** › **Authorized domains** › *Add domain*:

| Dominio | Para qué |
|---|---|
| `localhost` | Viene por defecto (desarrollo) |
| `PROYECTO.firebaseapp.com` | Viene por defecto (es el `authDomain` del popup) |
| `cafetravesia.co` | Producción |
| `www.cafetravesia.co` | Por si alguien abre el popup antes de la redirección |
| `cafe-travesia.vercel.app` | URL de producción de Vercel (pruebas antes del corte) |
| `cafe-travesia-git-develop-EQUIPO.vercel.app` | URL **estable** de la rama de Preview. Firebase **no admite comodines**: las URLs por despliegue (`cafe-travesia-abc123-…`) no funcionan para iniciar sesión |

## 4. App web → variables NEXT_PUBLIC_FIREBASE_*

Consola › ⚙ **Configuración del proyecto** › *General* › *Tus apps* › **`</>` Web** › apodo `web` (sin Firebase Hosting) › copia:

| Campo de `firebaseConfig` | Variable de Vercel |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` (`PROYECTO.firebaseapp.com`) | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

Son públicas por diseño. Restringe la API key en Google Cloud Console › *Credenciales* › la clave «Browser key» › *Restricciones de sitios web*: `https://cafetravesia.co/*`, `https://www.cafetravesia.co/*`, `https://*.vercel.app/*` y `http://localhost:3000/*`. Las apps móviles tienen sus propias claves.

## 5. Apps iOS y Android (app móvil)

*Tus apps* › **Agregar app** › iOS (`ios.bundleIdentifier` de `apps/mobile/app.json`, sugerido `co.cafetravesia.app`) y Android (`android.package`, sugerido `co.cafetravesia.app`, con la huella SHA-1 de la **firma de la app** de Play Console › *Integridad de la app*). Descarga `GoogleService-Info.plist` y `google-services.json`. **No los subas a git** (`.gitignore` los excluye): súbelos a EAS como variables de tipo archivo. Pasos en [10](10-app-movil.md) §2 y en `apps/mobile/README.md`.

## 6. Cuenta de servicio → FIREBASE_SERVICE_ACCOUNT_BASE64

1. ⚙ Configuración › **Cuentas de servicio** › *Firebase Admin SDK* › **Generar nueva clave privada** › Generar clave ([docs](https://firebase.google.com/docs/admin/setup)).
2. En tu equipo:

```bash
base64 -w0 ~/Descargas/cafe-travesia-firebase-adminsdk-xxxxx.json > .work/sa.b64   # macOS: base64 -i archivo.json | tr -d '\n'
node -e "const j=JSON.parse(Buffer.from(require('fs').readFileSync('.work/sa.b64','utf8'),'base64'));console.log(j.type,j.project_id,j.client_email)"
# Esperado: service_account cafe-travesia firebase-adminsdk-xxxxx@cafe-travesia.iam.gserviceaccount.com
```

3. Vercel › *Environment Variables* › `FIREBASE_SERVICE_ACCOUNT_BASE64` = el contenido de `sa.b64` (*Sensitive*, Production y Preview).
4. Borra el JSON y `sa.b64` de tu equipo (`shred -u` o la papelera segura). El original queda en el gestor del cliente.
5. **Rotación:** genera una clave nueva, actualiza Vercel y redespliega. Después borra la clave vieja en Google Cloud Console › *IAM › Cuentas de servicio* › la cuenta `firebase-adminsdk-…` › *Claves*.

## 7. Plantillas de correo en español

Authentication › **Templates**:

1. Ícono de idioma › **Español**. Aplica a la verificación, el restablecimiento de contraseña y el cambio de correo. Además el código fija `auth.languageCode = 'es'`.
2. Por plantilla: *Nombre del remitente* `Café Travesía`, *Responder a* `hola@cafetravesia.co`. Asunto sugerido: «Verifica tu correo en Café Travesía» / «Restablece tu contraseña de Café Travesía».
3. Opcional: *Personalizar dominio* para enviar desde `@cafetravesia.co`. Firebase pide registros TXT/CNAME, que se agregan en el Zone Editor ([03](03-dns-y-dominio.md)).

## 8. Primer administrador y protección

1. `ADMIN_EMAILS=gabo@cafetravesia.co` (o el que defina el cliente) en Vercel. Al iniciar sesión con ese correo, `upsertUserFromToken` le asigna `role=admin` en MySQL y en el custom claim. Después se gestionan los roles desde `/admin`. Deja en `ADMIN_EMAILS` solo a los dueños.
2. **Protección contra la enumeración de correos:** Authentication › *Settings* › *User actions* › **Email enumeration protection (recommended)**. Viene activa por defecto en proyectos creados desde el 15/09/2023 ([docs](https://docs.cloud.google.com/identity-platform/docs/admin/email-enumeration-protection)). Con ella activa, el login inválido devuelve `auth/invalid-credential`, que el código ya traduce («Correo o contraseña incorrectos»).
3. *User actions*: mantén permitido «Crear (registro)». La eliminación por el usuario desde el cliente depende de §10.6 de la app.
4. Sesión: `/api/auth/session` exige un login de **menos de 10 minutos** (`auth_time`) y crea una cookie de 14 días. Si un usuario ve «Vuelve a iniciar sesión», es lo esperado.

## 9. Cuotas (Spark)

Límites publicados ([Firebase Auth limits](https://firebase.google.com/docs/auth/limits)): 100 cuentas nuevas por hora por IP, 1.000 correos de verificación al día en Spark y 3.000 usuarios activos diarios en Spark con Identity Platform. Si el negocio crece o se activan funciones de Identity Platform, pasa a **Blaze** con una alerta de presupuesto (Google Cloud › *Facturación › Presupuestos*, p. ej. USD 10).

## Verificación

1. En `https://cafetravesia.co/ingresar` (o la URL de Vercel autorizada): **Google** › elige la cuenta › redirige a `/cuenta`. DevTools › *Application › Cookies* debe mostrar `__session` con *HttpOnly* ✓ y *Secure* ✓.
2. Registro con correo: llega «Verifica tu correo» en español. «Olvidé mi contraseña» envía su correo.
3. Apple en Safari o Chrome: el popup vuelve sin error `invalid_client`.
4. Con el correo de `ADMIN_EMAILS`: `/admin` abre. Con otro usuario: redirige a `/acceso?error=permisos`.
5. `/admin/monitor` › «Firebase Auth: Proyecto cafe-travesia» en verde.

## Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| `auth/unauthorized-domain` | El dominio no está en *Authorized domains* | §3 |
| `/api/auth/session` 503 | Falta `FIREBASE_SERVICE_ACCOUNT_BASE64` o la BD (modo demo) | `node scripts/check-env.mjs -f …` |
| 401 «No pudimos validar tu sesión» | La cuenta de servicio es de otro proyecto, o el reloj del cliente está desfasado | `check-env` compara `project_id` |
| Apple `invalid_client` o `invalid_request` | El Services ID o la Return URL no coinciden, o el `.p8`/Key ID es incorrecto | §2.3 |
| `auth/popup-blocked` | Bloqueador del navegador | El código ya muestra el mensaje. Prueba en otra ventana |
| No llegan los correos de verificación | Spam o cuota | Revisa spam y el §9. Opcional: dominio propio (§7.3) |

**Rollback:** deshabilitar un proveedor en *Sign-in method* es inmediato. Para revertir la cuenta de servicio, restaura el valor anterior en Vercel y redespliega.
