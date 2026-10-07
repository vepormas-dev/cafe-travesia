# 13 · Traspaso al cliente

**Objetivo:** que Café Travesía sea **dueña** de todas las cuentas, los datos y los secretos, sepa operar el CMS y tenga claro qué contenidos le faltan entregar.

**Prerrequisitos:** ninguno para el §1, que se hace al inicio del proyecto. El resto, al final (00-checklist §A–J).

## 1. Cuentas que el cliente crea a su nombre

Usa un correo corporativo genérico y permanente, por ejemplo `tecnologia@cafetravesia.co` (no el personal de un empleado), con 2FA. El agente o equipo técnico entra **solo como invitado** y se le retira el acceso al cierre.

| Servicio | Cuenta / plan | Por qué a nombre del cliente | Acceso para el equipo técnico |
|---|---|---|---|
| Registrador del dominio `cafetravesia.co` | Autorrenovación y bloqueo de transferencia | Sin el dominio no hay nada | Ninguno (solo NS/DNS) |
| Hosting cPanel | Plan vigente | BD, medios, correo y DNS: los datos viven aquí | Usuario de cPanel o acceso delegado |
| GitHub | Organización `cafe-travesia`, dueña del repo | Propiedad del código | *Maintainer* |
| Vercel | Equipo **Pro** (uso comercial) | Despliegue y facturación | *Developer* / *Member* |
| Firebase / Google Cloud | Proyecto `cafe-travesia` (Spark, luego Blaze con presupuesto) | Identidad de los usuarios | *Editor* (temporal) |
| Wompi | Comercio con la razón social y la cuenta bancaria del cliente | El dinero se dispersa al cliente | Usuario con rol técnico |
| Apple Developer Program | Organización (D-U-N-S) | Publicación en App Store | *Admin* o *App Manager* en App Store Connect |
| Google Play Console | Organización | Publicación en Play (evita la prueba cerrada obligatoria de las cuentas personales) | Permisos de versiones |
| Expo (expo.dev) | Organización `cafe-travesia` | Builds, credenciales y push | *Developer* |
| Proveedor de IA (OpenAI u otro) | Organización con límite de gasto | Facturación del uso | Miembro |
| Google Search Console | Propiedad de dominio | SEO y limpieza del spam | Usuario completo |
| Monitor externo (UptimeRobot) | Gratis | Alertas | Miembro |
| Gestor de contraseñas (Bitwarden, 1Password…) | Bóveda «Café Travesía» | Custodia de los secretos | Compartir la bóveda |

## 2. Qué se entrega

- [ ] Repositorio en la organización del cliente, con `main` protegida y CI en verde.
- [ ] Bóveda con: el secreto de la pasarela, `CRON_SECRET`, las contraseñas de BD (`ctapp`, `ctbackup`), los buzones, las llaves de Wompi (sandbox y prod), el JSON de la cuenta de servicio de Firebase, el `.p8` de Apple con su Key ID y Team ID, el keystore de Android (`eas credentials` › *Download*), la clave de IA y el acceso a cPanel.
- [ ] Este directorio `docs/deploy/` y el registro de evidencias de [00-checklist.md](00-checklist.md).
- [ ] Inventario de recursos: URLs, subdominios, rutas en cPanel (`/home/cpuser/gateway.cafetravesia.co`, `media.`, `backups/`), cron jobs y monitores.
- [ ] Último respaldo de la BD y del contenido del WordPress anterior (XML + uploads), entregados fuera del servidor.
- [ ] Acta de entrega firmada: alcance, pendientes (§4) y garantía o soporte acordado.
- [ ] Retiro de los accesos del equipo técnico al cierre (o según el contrato de soporte).

## 3. Capacitación del CMS (unas 3 h, grabada)

| Bloque | Contenido | Práctica |
|---|---|---|
| Acceso y roles (15 min) | `/acceso`, Admin frente a Editor, `ADMIN_EMAILS`, gestionar usuarios | Crear un editor |
| Catálogo (40 min) | Productos, variantes y stock, perfil sensorial, color de origen (`themeColor`), fotos (subida directa a `media.`; JPG o WebP, idealmente de menos de 2 MB y 1600 px), cafés de temporada y destacados | Crear un producto completo |
| Suscripciones (20 min) | Planes, precios y frecuencias. Pausas, saltos y cancelaciones de clientes. Qué pasa si un cobro falla (`past_due`) | Revisar una suscripción de prueba |
| Pedidos y pagos (30 min) | Estados, cambiar a enviado, conciliación con Wompi, reembolsos (se hacen en el dashboard de Wompi) | Marcar un pedido como enviado |
| Academia (30 min) | Cursos, módulos, lecciones (URL de video HLS/MP4 en Bunny Stream), quizzes, vista previa gratuita, certificados | Subir una lección con video |
| Contenido del sitio (20 min) | Bloques del CMS (`home.hero`, `home.seasonal`, `about`, `faq`, `contact`, `seo`…), blog, tiendas, cupones, puntos, zonas de envío | Cambiar el banner del home |
| Marketing (15 min) | Campañas push segmentadas y programadas, newsletter, leads, chat con escalamiento a un asesor | Programar una campaña de prueba |
| Monitor y soporte (10 min) | `/admin/monitor`: qué significa cada color y a quién escribir | Leer el monitor |

Entrega: la grabación, una guía de una página por bloque y un canal de soporte (correo o WhatsApp) con un tiempo de respuesta acordado.

## 4. Contenidos pendientes del cliente

Bloquean la salida a producción o la publicación en las tiendas. Para cada uno, el cliente define un responsable y una fecha.

| Pendiente | Detalle | Dónde se usa |
|---|---|---|
| **Fotos de producto** | Fotos reales de cada bolsa y presentación (fondo limpio, vertical u horizontal consistente, buena resolución). Hoy hay fotos de marca, pero no de cada referencia | Tienda, fichas, app y tiendas de apps |
| **Precios reales y stock** | Precios por presentación (250 g, 500 g, 1 kg…), molienda, costos de envío por zona y umbral de envío gratis. Hoy son valores del seed | Tienda, suscripciones, `shipping_zones` |
| **Textos legales** | Política de tratamiento de datos (con razón social, NIT, dirección, correo y teléfono reales), términos y condiciones, envíos y devoluciones, y términos de suscripción (cobro recurrente, cancelación, retracto según el Estatuto del Consumidor) | `/privacidad`, `/terminos`, `/envios-y-devoluciones`, fichas de las tiendas |
| **Videos de cursos** | Videos de cada lección, alojados en Bunny Stream (cuenta del cliente) o en MP4/HLS. No se sirven desde cPanel | Academia |
| **Datos de contacto y WhatsApp reales** | Número de WhatsApp (`NEXT_PUBLIC_WHATSAPP`; hoy el ficticio `573000000000`), teléfono, correo y redes. `packages/shared/src/brand.ts` tiene `phone: '+57 300 000 0000'` y `whatsapp: '573000000000'`, y `email: 'info@cafetravesia.co'`, que difiere de `hola@` | Footer, contacto, correos, chat, app |
| **Horarios y ubicación del punto de Florida** | Dirección exacta, horarios y enlace de Google Maps | `/tiendas`, contacto |
| **Manual de marca de Café Travesía** | El PDF del Drive compartido es el manual de **Florida Parque Comercial**, no el de Café Travesía. Hace falta el manual propio (logo vectorial en SVG o PDF, paleta oficial, tipografías y usos). Mientras tanto se usa la identidad derivada del logotipo (`packages/shared/src/brand.ts`) | Web, app, correos, fichas |
| **Datos del comercio para Wompi** | RUT, cámara de comercio, cuenta bancaria y representante legal | [07](07-wompi.md) §1 |
| **Datos para las tiendas de apps** | D-U-N-S y datos fiscales, capturas aprobadas, texto final de la ficha y cuenta de revisión | [10](10-app-movil.md) §5 |
| **Contenido del blog y de «Nosotros»** | Historias de Gabo y Alex, productores y fotos de finca | Blog, Nosotros, Impacto |

## Verificación

- El cliente inicia sesión **solo**, sin ayuda, en: Vercel, Firebase, Wompi, cPanel, App Store Connect, Play Console, Expo y el gestor de contraseñas.
- El cliente crea un producto y publica un cambio del home en el CMS sin asistencia.
- El acta de entrega está firmada y la tabla de pendientes del §4 tiene responsable y fecha.

## Si algo falla

- **Una cuenta quedó a nombre del equipo técnico:** transfiérela.
  - Vercel: *Settings › Transfer* del proyecto al equipo del cliente.
  - Firebase/Google Cloud: agrega al cliente como *Owner* y quita los accesos propios.
  - Apple y Google: la app se transfiere entre cuentas con sus procesos de *App Transfer*.
  - Wompi: no admite transferencia; se crea un comercio nuevo y se cambian las llaves.
- **Sin contenidos a tiempo:** se puede salir con el catálogo mínimo verificado (precios reales obligatorios) y marcar los demás como «Próximamente». **Nunca** salgas con precios o datos legales de ejemplo.
