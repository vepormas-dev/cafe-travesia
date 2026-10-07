// Catálogo de variables de entorno de apps/web (fuente: apps/web/src/lib/env.ts,
// packages/db/src/client.ts, apps/web/next.config.ts y apps/web/src/lib/firebase/client.ts).
// Lo usan scripts/check-env.mjs (validación) y `check-env.mjs --markdown` (tabla de docs).
//
// required: 'prod'  → obligatoria en Production (sin ella una función queda apagada o en demo)
//           'cond'  → obligatoria si se usa la integración del grupo
//           'opt'   → opcional (tiene valor por defecto o es un ajuste fino)
// envs:     entornos de Vercel donde se define (P = Production, V = Preview, D = Development)

export const GROUPS = {
  site: 'Sitio',
  db: 'Base de datos (cPanel)',
  storage: 'Medios (cPanel)',
  firebase: 'Firebase Auth',
  wompi: 'Pagos Wompi',
  smtp: 'Correo SMTP',
  ai: 'IA (API compatible con OpenAI)',
  ops: 'Operación',
  build: 'Build / pruebas',
};

/** @type {Array<{name:string, group:keyof typeof GROUPS, required:'prod'|'cond'|'opt', secret?:boolean, public?:boolean, example:string, default?:string, desc:string, source:string, envs:string, pattern?:RegExp, hint?:string}>} */
export const VARS = [
  // --- Sitio --------------------------------------------------------------
  { name: 'NEXT_PUBLIC_SITE_URL', group: 'site', required: 'prod', public: true, example: 'https://cafetravesia.co', default: 'https://cafetravesia.co', desc: 'URL canónica del sitio, sin "/" final. Se usa en correos, redirect-url de Wompi, sitemap y metadatos.', source: 'Dominio final (03-dns-y-dominio.md). En Preview: la URL estable de la rama.', envs: 'P, V', pattern: /^https?:\/\/[^/]+$/, hint: 'https://dominio sin barra final ni ruta' },
  { name: 'NEXT_PUBLIC_MEDIA_URL', group: 'storage', required: 'prod', public: true, example: 'https://media.cafetravesia.co', default: 'https://media.cafetravesia.co', desc: 'URL pública de la carpeta de medios. Su host se autoriza en next/image (next.config.ts) en tiempo de BUILD.', source: 'Subdominio media.<dominio> (02-cpanel-pasarela-y-medios.md).', envs: 'P, V', pattern: /^https:\/\/[^/]+$/, hint: 'https://media.<dominio> sin barra final' },
  { name: 'NEXT_PUBLIC_WHATSAPP', group: 'site', required: 'prod', public: true, example: '573001234567', default: '573000000000 (ficticio)', desc: 'Número de WhatsApp en formato internacional sin "+" ni espacios.', source: 'Cliente (13-traspaso-al-cliente.md).', envs: 'P, V', pattern: /^\d{11,13}$/, hint: 'solo dígitos, p. ej. 57300…' },

  // --- Base de datos -------------------------------------------------------
  { name: 'DB_DRIVER', group: 'db', required: 'prod', example: 'gateway', default: 'se infiere: gateway si hay DB_GATEWAY_URL; mysql si hay DATABASE_URL', desc: '"gateway" (pasarela PHP en cPanel, recomendado en Vercel) o "mysql" (conexión directa con mysql2).', source: 'Decisión de arquitectura: gateway en Hobby; mysql solo con Vercel Pro + Static IPs.', envs: 'P, V', pattern: /^(gateway|mysql)$/, hint: 'gateway | mysql' },
  { name: 'DB_GATEWAY_URL', group: 'db', required: 'cond', example: 'https://gateway.cafetravesia.co', desc: 'URL base de la pasarela (sin /db.php y sin "/" final). También es la URL de subida de medios.', source: 'Subdominio gateway.<dominio> (02-cpanel-pasarela-y-medios.md).', envs: 'P, V', pattern: /^https?:\/\/[^/]+(\/[^/]+)*$/, hint: 'https://gateway.<dominio> sin barra final' },
  { name: 'DB_GATEWAY_SECRET', group: 'db', required: 'cond', secret: true, example: '<96 caracteres hex de scripts/gen-secrets.sh>', desc: 'Secreto HMAC compartido con config.php de la pasarela (firma BD, medios y tickets de subida).', source: 'scripts/gen-secrets.sh; el MISMO valor va en config.php → secret.', envs: 'P, V (distinto si Preview usa otra BD)', pattern: /^.{64,}$/, hint: 'mínimo 64 caracteres' },
  { name: 'DB_GATEWAY_TIMEOUT_MS', group: 'db', required: 'opt', example: '12000', default: '12000', desc: 'Tiempo máximo por llamada a la pasarela (ms). Hay 1 reintento ante red/502-504.', source: 'Ajuste fino.', envs: 'P, V', pattern: /^\d{3,6}$/ },
  { name: 'DATABASE_URL', group: 'db', required: 'cond', secret: true, example: 'mysql://usuario_ctapp:CLAVE@servidor.hosting.com:3306/usuario_cafetravesia', desc: 'Solo con DB_DRIVER=mysql. Requiere "Remote Database Access" en cPanel.', source: 'cPanel › Manage My Databases + Remote Database Access.', envs: 'P, V', pattern: /^mysql:\/\/.+/, hint: 'mysql://usuario:clave@host:puerto/bd' },
  { name: 'DB_POOL_SIZE', group: 'db', required: 'opt', example: '3', default: '3', desc: 'Conexiones por instancia con DB_DRIVER=mysql (cuida max_user_connections del hosting).', source: 'Ajuste fino.', envs: 'P, V', pattern: /^\d{1,2}$/ },
  { name: 'DB_SSL', group: 'db', required: 'opt', example: 'strict', default: 'TLS sin verificar certificado', desc: 'Solo mysql: "false" sin TLS, "strict" TLS verificando el certificado; cualquier otro valor/ausente: TLS sin verificar.', source: 'Según el servidor MySQL del hosting.', envs: 'P, V', pattern: /^(false|strict|true)$/ },

  // --- Medios ---------------------------------------------------------------
  { name: 'MEDIA_GATEWAY_URL', group: 'storage', required: 'opt', example: 'https://gateway.cafetravesia.co', default: 'DB_GATEWAY_URL', desc: 'Solo si media.php vive en otra URL distinta a la pasarela de BD. Usa el mismo DB_GATEWAY_SECRET.', source: 'Normalmente vacío.', envs: 'P, V', pattern: /^https?:\/\/[^/]+(\/[^/]+)*$/, hint: 'sin barra final' },

  // --- Firebase ---------------------------------------------------------------
  { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', group: 'firebase', required: 'prod', public: true, example: 'AIzaSyA-EJEMPLO-no-real-000000000000', desc: 'Configuración web de Firebase (pública).', source: 'Firebase › Configuración del proyecto › General › Tus apps › App web.', envs: 'P, V', pattern: /^AIza[0-9A-Za-z_-]{30,}$/ },
  { name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', group: 'firebase', required: 'prod', public: true, example: 'cafe-travesia.firebaseapp.com', desc: 'Dominio de autenticación (popup de Google/Apple).', source: 'Igual que arriba.', envs: 'P, V', pattern: /^[a-z0-9.-]+$/ },
  { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', group: 'firebase', required: 'prod', public: true, example: 'cafe-travesia', desc: 'ID del proyecto (también sirve al Admin SDK si falta FIREBASE_PROJECT_ID).', source: 'Igual que arriba.', envs: 'P, V', pattern: /^[a-z0-9-]{4,40}$/ },
  { name: 'NEXT_PUBLIC_FIREBASE_APP_ID', group: 'firebase', required: 'prod', public: true, example: '1:123456789012:web:abcdef0123456789abcdef', desc: 'ID de la app web.', source: 'Igual que arriba.', envs: 'P, V', pattern: /^1:\d+:web:[0-9a-f]+$/ },
  { name: 'FIREBASE_SERVICE_ACCOUNT_BASE64', group: 'firebase', required: 'prod', secret: true, example: '<JSON de la cuenta de servicio en base64, una línea>', desc: 'Credencial del Admin SDK (verifica tokens, crea la cookie de sesión, custom claims). Alternativa: las 3 variables siguientes.', source: 'Firebase › Configuración › Cuentas de servicio › Generar nueva clave privada; `base64 -w0 archivo.json`.', envs: 'P, V' },
  { name: 'FIREBASE_PROJECT_ID', group: 'firebase', required: 'opt', example: 'cafe-travesia', desc: 'Alternativa a la base64 (junto con CLIENT_EMAIL y PRIVATE_KEY).', source: 'project_id del JSON.', envs: 'P, V' },
  { name: 'FIREBASE_CLIENT_EMAIL', group: 'firebase', required: 'opt', example: 'firebase-adminsdk-xxxxx@cafe-travesia.iam.gserviceaccount.com', desc: 'Alternativa a la base64.', source: 'client_email del JSON.', envs: 'P, V', pattern: /^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/ },
  { name: 'FIREBASE_PRIVATE_KEY', group: 'firebase', required: 'opt', secret: true, example: '"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n"', desc: 'Alternativa a la base64. Los "\\n" literales se convierten en saltos de línea.', source: 'private_key del JSON.', envs: 'P, V' },
  { name: 'ADMIN_EMAILS', group: 'firebase', required: 'prod', example: 'gabo@cafetravesia.co,admin@cafetravesia.co', desc: 'Correos que reciben rol admin al iniciar sesión (arranque del primer administrador). Separados por coma.', source: 'Cliente.', envs: 'P, V', pattern: /^[^@\s,]+@[^@\s,]+(\s*,\s*[^@\s,]+@[^@\s,]+)*$/ },

  // --- Wompi ----------------------------------------------------------------
  { name: 'WOMPI_ENV', group: 'wompi', required: 'prod', example: 'production', default: 'sandbox', desc: '"sandbox" o "production". Define la URL del API y el ambiente esperado en los eventos (test/prod).', source: 'production en Production; sandbox en Preview.', envs: 'P, V', pattern: /^(sandbox|production)$/ },
  { name: 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY', group: 'wompi', required: 'prod', public: true, example: 'pub_prod_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', desc: 'Llave pública del comercio (Web Checkout, tokenización).', source: 'comercios.wompi.co › Desarrolladores (activa «modo de pruebas» para ver las de sandbox).', envs: 'P (prod), V (test)', pattern: /^pub_(test|prod)_[A-Za-z0-9]+$/ },
  { name: 'WOMPI_PRIVATE_KEY', group: 'wompi', required: 'prod', secret: true, example: 'prv_prod_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', desc: 'Llave privada (fuentes de pago, cobros recurrentes, conciliación).', source: 'Igual que arriba.', envs: 'P (prod), V (test)', pattern: /^prv_(test|prod)_[A-Za-z0-9]+$/ },
  { name: 'WOMPI_INTEGRITY_SECRET', group: 'wompi', required: 'prod', secret: true, example: 'prod_integrity_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', desc: 'Secreto de integridad (firma del checkout y de cada cobro).', source: 'comercios.wompi.co › Desarrolladores › secretos de integración.', envs: 'P (prod), V (test)', pattern: /^(test|prod)_integrity_[A-Za-z0-9]+$/ },
  { name: 'WOMPI_EVENTS_SECRET', group: 'wompi', required: 'prod', secret: true, example: 'prod_events_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', desc: 'Secreto de eventos (verifica el checksum del webhook). Sin él TODO webhook responde 401.', source: 'Igual que arriba.', envs: 'P (prod), V (test)', pattern: /^(test|prod)_events_[A-Za-z0-9]+$/ },

  // --- SMTP -----------------------------------------------------------------
  { name: 'SMTP_HOST', group: 'smtp', required: 'prod', example: 'mail.cafetravesia.co', desc: 'Servidor SMTP (cuenta de correo del cPanel). Debe tener certificado TLS válido para ese nombre.', source: 'cPanel › Email Accounts › Connect Devices › Mail Client Manual Settings.', envs: 'P, V', pattern: /^[a-z0-9.-]+$/i },
  { name: 'SMTP_PORT', group: 'smtp', required: 'opt', example: '465', default: '465', desc: '465 = TLS implícito (secure). 587 = STARTTLS.', source: 'Igual que arriba.', envs: 'P, V', pattern: /^(465|587|25|2525)$/ },
  { name: 'SMTP_USER', group: 'smtp', required: 'prod', example: 'pedidos@cafetravesia.co', desc: 'Usuario SMTP = dirección completa del buzón.', source: 'Igual que arriba.', envs: 'P, V', pattern: /^[^@\s]+@[^@\s]+$/ },
  { name: 'SMTP_PASS', group: 'smtp', required: 'prod', secret: true, example: '<contraseña del buzón>', desc: 'Contraseña del buzón.', source: 'cPanel › Email Accounts (al crear o cambiar contraseña).', envs: 'P, V' },
  { name: 'MAIL_FROM', group: 'smtp', required: 'opt', example: 'Café Travesía <pedidos@cafetravesia.co>', default: 'Café Travesía <hola@cafetravesia.co>', desc: 'Remitente. Usa el MISMO buzón de SMTP_USER (o un alias del mismo dominio) para pasar SPF/DKIM/DMARC.', source: 'Decisión del cliente.', envs: 'P, V' },
  { name: 'MAIL_REPLY_TO', group: 'smtp', required: 'opt', example: 'hola@cafetravesia.co', desc: 'Dirección de respuesta.', source: 'Cliente.', envs: 'P, V', pattern: /^[^@\s]+@[^@\s]+$/ },
  { name: 'ADMIN_NOTIFY_EMAIL', group: 'smtp', required: 'opt', example: 'pedidos@cafetravesia.co', desc: 'Buzón interno que recibe avisos (pedidos nuevos, leads, asesor humano).', source: 'Cliente.', envs: 'P, V', pattern: /^[^@\s]+@[^@\s]+$/ },

  // --- IA ---------------------------------------------------------------------
  { name: 'OPENAI_API_KEY', group: 'ai', required: 'opt', secret: true, example: 'sk-proj-XXXXXXXXXXXXXXXX', desc: 'Clave de la API de IA. Sin clave: chatbot, búsqueda y tutor responden por reglas.', source: 'platform.openai.com › API keys (o el proveedor compatible).', envs: 'P (V opcional)' },
  { name: 'OPENAI_BASE_URL', group: 'ai', required: 'opt', example: 'https://api.openai.com/v1', default: 'https://api.openai.com/v1', desc: 'URL base de una API compatible con OpenAI (sin "/" final).', source: 'Proveedor.', envs: 'P, V', pattern: /^https:\/\/.+[^/]$/ },
  { name: 'OPENAI_MODEL', group: 'ai', required: 'opt', example: 'gpt-4.1-mini', default: 'gpt-4.1-mini', desc: 'Modelo de chat.', source: 'Proveedor.', envs: 'P, V' },
  { name: 'OPENAI_FALLBACK_MODEL', group: 'ai', required: 'opt', example: 'gemini-3.5-flash-lite', desc: 'Modelo de respaldo si el principal responde 429/5xx o no contesta.', source: 'Proveedor.', envs: 'P, V' },
  { name: 'OPENAI_REASONING_EFFORT', group: 'ai', required: 'opt', example: 'low', desc: 'Solo modelos de razonamiento (Gemini 2.5+/3, o-series): none, low, medium o high.', source: 'Proveedor.', envs: 'P, V' },

  // --- Operación ----------------------------------------------------------------
  { name: 'CRON_SECRET', group: 'ops', required: 'prod', secret: true, example: '<64 caracteres hex de scripts/gen-secrets.sh>', desc: 'Protege /api/cron. Vercel Cron lo envía solo como "Authorization: Bearer"; el cron de cPanel usa el mismo valor.', source: 'scripts/gen-secrets.sh.', envs: 'P (V con otro valor)', pattern: /^.{16,}$/, hint: 'mínimo 16 caracteres (Vercel)' },
  { name: 'REVALIDATE_SECRET', group: 'ops', required: 'opt', secret: true, example: '<64 caracteres hex>', desc: 'Reservada (env.ts la lee, pero ninguna ruta la usa todavía).', source: 'scripts/gen-secrets.sh.', envs: 'P, V' },
  { name: 'APPLE_TEAM_ID', group: 'ops', required: 'opt', example: 'ABCDE12345', desc: 'Team ID de Apple Developer; publica /.well-known/apple-app-site-association para Universal Links de la app iOS.', source: 'developer.apple.com › Membership details.', envs: 'P', pattern: /^[A-Z0-9]{10}$/, hint: '10 caracteres A-Z/0-9' },
  { name: 'ANDROID_SHA256_FINGERPRINTS', group: 'ops', required: 'opt', example: 'AB:CD:…:EF', desc: 'Huellas SHA-256 del certificado de firma Android (separadas por coma) para /.well-known/assetlinks.json (App Links).', source: 'eas credentials › Android, o Play Console › Integridad de la app.', envs: 'P' },
  { name: 'EXPO_ACCESS_TOKEN', group: 'ops', required: 'opt', secret: true, example: '<token de expo.dev>', desc: 'Solo si activas "Enhanced push security" en EAS: entonces es OBLIGATORIO o los push fallan con UNAUTHORIZED.', source: 'expo.dev › Account settings › Access tokens.', envs: 'P' },

  // --- Build / pruebas (no se configuran en Vercel) ----------------------------
  { name: 'NEXT_DIST_DIR', group: 'build', required: 'opt', example: '.next-ci', default: '.next', desc: 'Carpeta de salida del build (builds aislados en CI/agentes). NO la definas en Vercel.', source: '—', envs: 'local/CI' },
  { name: 'SKIP_TYPECHECK', group: 'build', required: 'opt', example: '1', desc: '"1" omite el chequeo de tipos de next build. NO la uses en Vercel ni en CI.', source: '—', envs: 'local' },
  { name: 'TEST_MYSQL_VERSION', group: 'build', required: 'opt', example: '8.4.x', default: '8.4.x', desc: 'Versión de MySQL de la prueba de integración (npm run test -w @travesia/db).', source: '—', envs: 'local/CI' },
];

/** Variables del sistema que Vercel define sola (no se configuran). */
export const SYSTEM_VARS = ['VERCEL_ENV', 'VERCEL_URL', 'NODE_ENV', 'VERCEL', 'VERCEL_REGION', 'VERCEL_GIT_COMMIT_SHA'];

export const byName = Object.fromEntries(VARS.map((v) => [v.name, v]));
