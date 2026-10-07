# 06 · Tareas programadas (cron de cPanel cada 15 min y Vercel Cron diario)

**Objetivo:** que `/api/cron` corra cada 15 minutos para conciliar pagos, cobrar suscripciones y enviar campañas push programadas, y una vez al día para todo lo demás. Debe quedar visible en `/admin/monitor`.

**Prerrequisitos:** producción desplegada con `CRON_SECRET` ([05](05-vercel.md)) y la BD migrada ([01](01-cpanel-base-de-datos.md)). Ten a mano el **mismo** `CRON_SECRET` de Production.

## Qué hace cada tarea (`apps/web/src/app/api/cron/route.ts`)

| Tarea | Función | Qué hace | Frecuencia |
|---|---|---|---|
| `reconcile` | `reconcilePendingOrders` | Consulta en Wompi los pedidos y cobros de suscripción `pending` de más de 15 min, por si el webhook no llegó. Cancela los pedidos sin pago tras 48 h. Solo corre si Wompi está configurado | 15 min (cPanel) + diario |
| `billing` | `runSubscriptionBilling` | Reactiva las pausas vencidas y cobra las suscripciones con `next_billing_at` vencido, con la fuente de pago tokenizada (COF recurrente). Solo con Wompi | 15 min + diario |
| `push` | `sendDueCampaigns` | Envía las campañas push programadas cuya hora llegó | 15 min + diario |
| `reminders` | `sendLessonReminders` | Recordatorios de lecciones pendientes de la Academia | Diario |
| `carts` | `recoverAbandonedCarts` | Correo y push de carrito abandonado | Diario |
| `cleanup` | — | Borra `rate_limits` vencidos y `integration_events` de más de 90 días | Diario |

Reglas de la ruta:

- Sin `?tasks=` corren todas.
- Con `?tasks=a,b` corren solo esas.
- Las diarias (`reminders`, `carts`, `cleanup`) corren si se piden explícitamente, con `?daily=1` o entre las 8:00 y las 8:59 de Bogotá.
- Responde `401` sin el secreto y `503` sin BD.
- `?tasks=noop` no ejecuta nada: solo valida el secreto y deja la marca «Última ejecución» del monitor. Úsalo para pruebas.

## 1. Cron diario de Vercel

Ya está en `apps/web/vercel.json`: `/api/cron?daily=1` a las `0 13 * * *` UTC (08:00–08:59 en Bogotá, por la precisión de ±59 min de Hobby). No requiere pasos. Confírmalo en Vercel › *Settings › Cron Jobs*.

## 2. Cron de cPanel cada 15 minutos

1. cPanel › **Advanced › Cron Jobs** ([docs](https://docs.cpanel.net/cpanel/advanced/cron-jobs/)).
2. **Cron Email:** el correo técnico. cPanel envía allí la salida de los fallos, porque `curl -fsS` solo escribe en stderr cuando hay error.
3. **Add New Cron Job** › *Common Settings*: «Once Per Fifteen Minutes» (`*/15 * * * *`).

**Opción A: comando directo.** Reemplaza `TU_CRON_SECRET`. El crontab solo lo puede leer `cpuser`.

```bash
CRON_SECRET=TU_CRON_SECRET; curl -fsS --max-time 70 --retry 2 --retry-delay 20 -H "Authorization: Bearer $CRON_SECRET" "https://cafetravesia.co/api/cron?tasks=reconcile,billing,push" > /dev/null
```

**Opción B (recomendada): el secreto en un archivo `600`**, fuera del crontab:

```bash
# Una sola vez, en cPanel › Advanced › Terminal (o crea el archivo en File Manager):
mkdir -p ~/.config/cafetravesia && chmod 700 ~/.config/cafetravesia
printf 'CRON_SECRET=%s\n' 'TU_CRON_SECRET' > ~/.config/cafetravesia/cron.env && chmod 600 ~/.config/cafetravesia/cron.env
```

Comando del cron:

```bash
. $HOME/.config/cafetravesia/cron.env; curl -fsS --max-time 70 --retry 2 --retry-delay 20 -H "Authorization: Bearer $CRON_SECRET" "https://cafetravesia.co/api/cron?tasks=reconcile,billing,push" > /dev/null
```

4. **Add New Cron Job.** Los 15 minutos son suficientes. En condiciones normales, `next_billing_at` evita cobrar dos veces en el mismo ciclo; hay un caso borde de concurrencia, explicado en «Si algo falla».

### Alternativa si el hosting bloquea curl saliente

Configura en [cron-job.org](https://cron-job.org) (gratis) un job cada 15 min: método GET, URL `https://cafetravesia.co/api/cron?tasks=reconcile,billing,push`, header `Authorization: Bearer TU_CRON_SECRET` y notificación por correo si falla. La cuenta debe ser del cliente.

## 3. Monitoreo

- `/admin/monitor` › **Tareas programadas**: verde si la última ejecución fue hace menos de 1,5 h, amarillo hasta 26 h y rojo después. Con el cron de 15 min debe decir «hace < 20 min».
- **Errores de integración (24 h):** cada tarea fallida registra `cron/<tarea> error`, y cada corrida un `cron run ok` con la duración y el resultado (`results`).
- Logs de Vercel (*Logs*, filtro `/api/cron`): en Hobby solo se ven 1 h.

## Verificación

```bash
read -rs CRON_SECRET && export CRON_SECRET
curl -s -o /dev/null -w '%{http_code}\n' "https://cafetravesia.co/api/cron?tasks=noop"                                         # 401
curl -s -w '\n%{http_code}\n' -H "Authorization: Bearer $CRON_SECRET" "https://cafetravesia.co/api/cron?tasks=noop"          # {"ok":true,"results":{},"ms":…} 200
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://cafetravesia.co/api/cron?tasks=reconcile,billing,push"              # {"ok":true,"results":{"reconcile":…,"billing":{"due":0,"charged":0},"push":…}}
```

A los 30 minutos, `/admin/monitor` debe mostrar «Última ejecución hace < 20 min».

## Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| Correo del cron con `curl: (22) … 401` | El `CRON_SECRET` del crontab no coincide con el de Vercel Production, o tiene espacios o comillas | Copia el valor exacto. Si cambias el de Vercel, **redespliega** |
| `curl: (22) … 503` | Sin BD (modo demo) | [05](05-vercel.md) §3 |
| `curl: (28) Operation timed out` | La función tarda más de 70 s (pasarela lenta) | Revisa la latencia en `/admin/monitor` y divide: `?tasks=reconcile` y `?tasks=billing,push` en dos crons |
| `curl: (6) Could not resolve host` o `(7)` | El hosting bloquea las salidas | Usa la alternativa cron-job.org |
| `results.billing.error` | Wompi rechazó el cobro o la fuente de pago está anulada | [11](11-operacion.md#pagos-no-se-confirman) |
| Riesgo de doble cobro | `chargeSubscription` hace SELECT y luego mueve `next_billing_at`, **sin** bloqueo condicional (`apps/web/src/lib/commerce/subscriptions.ts:64-73`). Si el cron de Vercel (13:xx UTC) y el de cPanel coinciden en el mismo segundo, ambos podrían cobrar | Mitigación operativa hasta que el equipo web lo corrija: programa el cron de cPanel como `5,20,35,50 * * * *`. Igual coincide de vez en cuando con Vercel (que puede correr en cualquier minuto de las 13 h UTC), así que revisa en Wompi que no haya cobros duplicados el mismo día. Corrección propuesta: `UPDATE subscriptions SET next_billing_at = … WHERE id = ? AND next_billing_at <= NOW()` y cobrar solo si `affectedRows = 1` |

**Rollback:** elimina o comenta la línea en cPanel › Cron Jobs (*Delete*). El cron de Vercel se desactiva en *Settings › Cron Jobs › Disable*.
