# Despliegue a producción · Café Travesía

Runbooks para dejar en producción el ecosistema descrito en [`../ARQUITECTURA.md`](../ARQUITECTURA.md). Pueden ejecutarlos personas o agentes de IA. Cada documento incluye: objetivo, prerrequisitos, pasos con rutas de menú, comandos copiables, valores esperados, **Verificación** y **Si algo falla**.

**Convenciones**

- Reemplaza `cpuser` por el usuario real del cPanel y `cafetravesia.co` por el dominio, si cambia.
- Los valores entre `<…>` o con `XXXX` son ficticios.
- Los comandos se ejecutan desde la raíz del repositorio, con Node 22, salvo que el paso diga otra cosa.
- Los secretos se guardan en el gestor de contraseñas **del cliente**. Nunca van en git, tickets ni chats.
- Usa `/projects/sandbox/.work/` o una carpeta temporal fuera del repo para archivos con secretos (`.env.production`, JSON de cuentas de servicio).

## Orden de ejecución

| # | Documento | Resultado | Depende de | Tiempo activo | Espera típica |
|---|---|---|---|---|---|
| 0 | [00-checklist.md](00-checklist.md) | Checklist maestro y criterios de aceptación | — | 10 min (lectura) | — |
| 1 | [13-traspaso-al-cliente.md](13-traspaso-al-cliente.md) §1 | Cuentas creadas a nombre del cliente | — | 1–2 h (cliente) | Apple: 1–2 días; Wompi: días (validación comercial) |
| 2 | [01-cpanel-base-de-datos.md](01-cpanel-base-de-datos.md) | BD utf8mb4, usuario con privilegios mínimos, respaldos | 1 | 45 min | — |
| 3 | [02-cpanel-pasarela-y-medios.md](02-cpanel-pasarela-y-medios.md) | `gateway.` y `media.` con HTTPS y prueba firmada OK | 2 | 1 h | AutoSSL: minutos a horas |
| 4 | [04-firebase-auth.md](04-firebase-auth.md) | Proveedores, dominios autorizados, cuenta de servicio | 1 | 1 h | — |
| 5 | [07-wompi.md](07-wompi.md) §1–2 | Llaves sandbox y URL de eventos | 1 | 30 min | — |
| 6 | [08-correo-smtp.md](08-correo-smtp.md) | Buzones, SPF, DKIM, DMARC y prueba de envío | 2 | 45 min | DNS: hasta 1 h |
| 7 | [09-ia-y-push.md](09-ia-y-push.md) | Clave de IA (opcional) y credenciales push | 4 | 30 min | — |
| 8 | [05-vercel.md](05-vercel.md) | Proyecto, variables, despliegue Preview y luego Production | 3–7 | 1 h | Build: unos 5 min |
| 9 | [01 §Migraciones](01-cpanel-base-de-datos.md#5-aplicar-migraciones) | Esquema y contenido inicial cargados | 3, 8 | 20 min | — |
| 10 | [06-cron.md](06-cron.md) | Cron de cPanel cada 15 min y cron diario de Vercel | 8 | 15 min | — |
| 11 | [07-wompi.md](07-wompi.md) §3 | Pruebas en sandbox aprobadas | 8–10 | 1–2 h | — |
| 12 | [03-dns-y-dominio.md](03-dns-y-dominio.md) | Corte del WordPress al dominio real en Vercel | 8–11 | 1 h + monitoreo | Propagación: 5 min a 48 h (TTL) |
| 13 | [07-wompi.md](07-wompi.md) §5 | Paso a producción de pagos | 12 | 30 min | — |
| 14 | [10-app-movil.md](10-app-movil.md) | Builds de EAS y envío a las tiendas | 4, 7, 12 | 3–4 h | Apple: 1–3 días; Google (cuenta personal nueva): 14 días de prueba cerrada |
| 15 | [11-operacion.md](11-operacion.md) | Monitoreo externo, alertas y runbooks | 12 | 45 min | — |
| 16 | [12-seguridad.md](12-seguridad.md) | Hardening y revisión legal (Ley 1581) | 12 | 1 h | — |
| 17 | [13-traspaso-al-cliente.md](13-traspaso-al-cliente.md) | Entrega, capacitación y contenidos pendientes | todo | 3 h | — |

**Total activo:** unos 2 días de trabajo técnico. **Calendario realista:** 1–2 semanas para la web, por la validación de Wompi y los contenidos del cliente. Para la app en Google Play, más de 3 semanas si la cuenta de desarrollador es personal y nueva.

Referencia de variables: [variables.md](variables.md). Pasarela de cPanel: [`../../infra/cpanel/README.md`](../../infra/cpanel/README.md). App móvil: [`../../apps/mobile/README.md`](../../apps/mobile/README.md).

## Matriz de responsabilidades (RACI)

R = ejecuta · A = aprueba/dueño · C = consultado · I = informado

| Tarea | Cliente (Café Travesía) | Agente de despliegue | Soporte del hosting | Wompi / Apple / Google |
|---|---|---|---|---|
| Crear cuentas (Vercel, Firebase, Wompi, Apple, Google Play, Expo, IA) | **A/R** | C | — | C |
| BD, subdominios, PHP, SSL en cPanel | A | **R** | C (ModSecurity, versión de PHP, NTP) | — |
| DNS en el Zone Editor | A | **R** | C | — |
| Variables en Vercel y despliegue | A | **R** | — | — |
| Validación comercial y paso a producción en Wompi | **A/R** (documentos) | R (técnico) | — | R |
| Pruebas de aceptación (00-checklist) | A | **R** | — | — |
| Fichas de tienda, textos legales, precios y fotos | **A/R** | C | — | R (revisión) |
| Corte del WordPress y limpieza del hosting | A | **R** | C (escaneo de malware) | — |
| Operación diaria (pedidos, CMS, campañas) | **R** | I | — | — |
| Incidentes técnicos (runbooks de 11-operacion.md) | I | **R** | C | C |

## Comandos de apoyo (scripts/)

| Script | Uso |
|---|---|
| `scripts/gen-secrets.sh` | Genera `DB_GATEWAY_SECRET`, `CRON_SECRET` y `REVALIDATE_SECRET`. |
| `node scripts/check-env.mjs -f <archivo>` | Valida variables y combinaciones antes de cargarlas en Vercel. |
| `node scripts/gateway-smoke.mjs` | Prueba la pasarela de cPanel: health, firma, consulta, anti-replay, DDL, charset y medios. |
| `node scripts/sql-bundle.mjs --out x.sql` | Genera el SQL de migraciones listo para phpMyAdmin. |
| `scripts/backup-mysql.sh` | Respaldo diario con `mysqldump` y rotación (se instala en el hosting). |
| `node scripts/smoke-prod.mjs <url>` | Prueba de humo después de cada despliegue. |
| `node scripts/selftest.mjs` | Autoprueba local de todo lo anterior: MySQL real con la pasarela PHP. |

Todos aceptan `--help`.
