# 09 · IA (API compatible con OpenAI) y notificaciones push (Expo)

**Objetivo:** activar, si se quiere, la IA del chatbot, la búsqueda, las recomendaciones, el tutor y la redacción del CMS. Dejar el envío push hacia iOS y Android con credenciales FCM V1 y APNs en EAS.

**Prerrequisitos:** cuenta del proveedor de IA a nombre del cliente, proyecto Expo del cliente ([10](10-app-movil.md) §1) y Firebase ([04](04-firebase-auth.md)).

## 1. IA

`apps/web/src/lib/ai.ts` llama `POST {OPENAI_BASE_URL}/chat/completions` con `model`, `temperature` (0,5 por defecto), `max_tokens` (700 por defecto), `response_format: {type:'json_object'}` cuando pide JSON y un timeout de 30 s. **Sin `OPENAI_API_KEY`, todo funciona con reglas** y `/admin/monitor` muestra «Motor de IA: Sin clave: respuestas por reglas».

| Variable | Valor | Nota |
|---|---|---|
| `OPENAI_API_KEY` 🔒 | `sk-proj-…` | platform.openai.com › *API keys*: crea una clave **de proyecto** («cafe-travesia-prod») con permisos solo de *Model capabilities* |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` (por defecto) | Cualquier API **compatible** con `/chat/completions` y `response_format` JSON: OpenRouter (`https://openrouter.ai/api/v1`), Groq (`https://api.groq.com/openai/v1`), Azure OpenAI con un gateway compatible, etc. |
| `OPENAI_MODEL` | **defínelo explícitamente** | El valor por defecto del código es `gpt-4.1-mini`, que no aparece en la [tabla de precios vigente](https://developers.openai.com/api/docs/pricing). Elige un modelo económico vigente de esa tabla (p. ej., al redactar esta guía, `gpt-6-luna`: USD 0,10 de entrada / 0,50 de salida por millón de tokens) |

**Costos y límites:**

- Un turno de chat típico usa unos 1.500 tokens de entrada y 400 de salida. Con un modelo de USD 0,10/0,50 por millón, 10.000 turnos al mes cuestan alrededor de USD 3,5.
- Fija un **límite de gasto mensual** en el proveedor (OpenAI › *Settings › Limits*, p. ej. USD 20) y una alerta al 80 %.
- Al llegar al límite, la API responde 429 y el código cae a reglas. El sitio no se rompe.
- Los endpoints públicos de IA tienen *rate limiting* en el servidor (`lib/rate-limit.ts`).

**Verificación:** `/admin/monitor` muestra «Motor de IA» con el modelo en verde. En el chat del sitio, una pregunta como «¿qué café me recomiendas para V60?» da una respuesta redactada, no la de reglas. Revisa en el monitor los eventos `ai … ok` y la latencia.

## 2. Push (Expo Push API → APNs/FCM)

El servidor envía a `https://exp.host/--/api/v2/push/send` en lotes de 100 (`apps/web/src/lib/push.ts`). Desactiva los tokens que responden `DeviceNotRegistered` y registra todo en `push_deliveries`. La app registra su token en `POST /api/push/register`.

### 2.1 Credenciales Android: FCM V1

([docs Expo](https://docs.expo.dev/push-notifications/fcm-credentials/))

1. Firebase (el mismo proyecto de [04](04-firebase-auth.md)) › ⚙ › **Cuentas de servicio** › *Generar nueva clave privada*. Usa una clave **distinta** de la de Vercel, para poder rotarlas por separado. La cuenta necesita el rol **Firebase Cloud Messaging API Admin**.
2. Sube la clave a EAS:

```bash
cd apps/mobile
npx eas-cli@latest credentials
# Android › production › Google Service Account ›
#   Manage your Google Service Account Key for Push Notifications (FCM V1) ›
#   Set up a Google Service Account Key for Push Notifications (FCM V1) › Upload a new service account key
```

3. `google-services.json` de la app Android ([04](04-firebase-auth.md) §5): la ruta va en `expo.android.googleServicesFile`. El repo lo ignora en git, así que se entrega a EAS como variable de tipo archivo ([10](10-app-movil.md) §2).
4. Borra el JSON local.

### 2.2 Credenciales iOS: APNs

([credenciales de app](https://docs.expo.dev/app-signing/app-credentials/))

- La forma más simple es dejar que EAS la cree en el primer `eas build -p ios` («Generate a new Apple Push Notifications service key?» › **Yes**), o con `npx eas-cli credentials` › iOS › production › *Push Notifications: Manage your Apple Push Notifications Key*.
- Límites: máximo **2 claves APNs** por cuenta de Apple. Una clave sirve para todas las apps y **no vence**. Si revocas la clave, los push dejan de llegar hasta subir otra; los tokens de Expo no cambian.

### 2.3 EXPO_ACCESS_TOKEN (opcional)

Por defecto, cualquiera que conozca un token de Expo de un dispositivo puede enviarle push. Para exigir autenticación: expo.dev › proyecto › *Settings* › **Enhanced Security for Push Notifications** › activar ([docs](https://docs.expo.dev/push-notifications/sending-notifications/)). Luego crea un token (expo.dev › *Account settings › Access tokens* › *Robot user* con rol mínimo) y defínelo en Vercel como `EXPO_ACCESS_TOKEN`. **Orden:** primero la variable y el redespliegue, después activa la opción. Al revés, todos los envíos fallan con `UNAUTHORIZED`.

### 2.4 Límites de Expo

Máximo 100 mensajes por petición (el código ya divide los envíos), 600 notificaciones por segundo por proyecto y 4 KB de payload. Error `TOO_MANY_REQUESTS` si se superan.

## Verificación (push)

1. Instala un build de `preview` o `production` en un iPhone y un Android **físicos** (el simulador de iOS no recibe push). Inicia sesión y acepta las notificaciones.
2. En phpMyAdmin: `SELECT platform, enabled, LEFT(token, 30) FROM push_tokens ORDER BY created_at DESC LIMIT 5;` debe mostrar los dos dispositivos.
3. En el CMS, crea una campaña push dirigida a tu usuario o segmento y envíala ahora. **Esperado:** llega a ambos dispositivos en menos de 1 minuto y al tocarla abre el deep link. `SELECT status, error FROM push_deliveries ORDER BY created_at DESC LIMIT 5;` da `ok`.
4. Prueba alternativa sin CMS, con la herramienta oficial [expo.dev/notifications](https://expo.dev/notifications) y el token `ExponentPushToken[…]`.

## Si algo falla

| Síntoma (`push_deliveries.error` / monitor) | Causa | Solución |
|---|---|---|
| `InvalidCredentials` (Android) | No hay clave FCM V1 en EAS o es de otro proyecto | §2.1 |
| `MismatchSenderId` | `google-services.json` y la clave FCM son de proyectos distintos | Usa el mismo proyecto de Firebase en ambos |
| `InvalidCredentials` (iOS) / `InvalidProviderToken` | La clave APNs fue revocada o el perfil está desactualizado | `eas credentials` › regenerar la clave y reconstruir |
| `DeviceNotRegistered` | El usuario desinstaló la app | Normal: el token queda `enabled=0` |
| `UNAUTHORIZED` | Seguridad mejorada activa sin `EXPO_ACCESS_TOKEN` | §2.3 |
| En Android no aparece la notificación | No existe el canal `default` en la app | El servidor envía `channelId: 'default'`, así que la app debe crear ese canal (equipo móvil) |
| IA: `ai … error 401/404` | Clave inválida o modelo inexistente en ese proveedor | Revisa `OPENAI_MODEL` y `OPENAI_BASE_URL` |

**Rollback:** para apagar la IA, borra `OPENAI_API_KEY` y redespliega. Para detener los push, pausa las campañas en el CMS. Revocar credenciales en EAS corta todos los envíos.
