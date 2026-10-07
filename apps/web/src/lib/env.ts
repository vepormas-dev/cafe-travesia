/**
 * Variables de entorno (ver apps/web/.env.example y docs/deploy/variables.md).
 * Todo es opcional para compilar: sin credenciales el sitio corre en MODO DEMO
 * (catálogo de ejemplo, sin pagos ni escritura).
 */
import { isDbConfigured } from '@travesia/db';

const v = (k: string) => {
  const x = process.env[k];
  return x && x.trim() !== '' ? x.trim() : undefined;
};

export const env = {
  siteUrl: (v('NEXT_PUBLIC_SITE_URL') ?? 'https://cafetravesia.com').replace(/\/$/, ''),
  mediaUrl: (v('NEXT_PUBLIC_MEDIA_URL') ?? 'https://media.cafetravesia.co').replace(/\/$/, ''),
  isProd: process.env.VERCEL_ENV === 'production',

  // Pasarela cPanel (BD + medios)
  gatewayUrl: (v('MEDIA_GATEWAY_URL') ?? v('DB_GATEWAY_URL'))?.replace(/\/+$/, ''),
  gatewaySecret: v('DB_GATEWAY_SECRET'),

  // Firebase (cliente público + Admin SDK)
  firebase: {
    apiKey: v('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: v('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: v('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ?? v('FIREBASE_PROJECT_ID'),
    appId: v('NEXT_PUBLIC_FIREBASE_APP_ID'),
  },
  firebaseAdmin: {
    projectId: v('FIREBASE_PROJECT_ID') ?? v('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    clientEmail: v('FIREBASE_CLIENT_EMAIL'),
    privateKey: v('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    serviceAccountB64: v('FIREBASE_SERVICE_ACCOUNT_BASE64'),
  },
  adminEmails: (v('ADMIN_EMAILS') ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),

  // Wompi
  wompi: {
    env: (v('WOMPI_ENV') ?? 'sandbox') as 'sandbox' | 'production',
    publicKey: v('NEXT_PUBLIC_WOMPI_PUBLIC_KEY'),
    privateKey: v('WOMPI_PRIVATE_KEY'),
    integritySecret: v('WOMPI_INTEGRITY_SECRET'),
    eventsSecret: v('WOMPI_EVENTS_SECRET'),
  },

  // Correo (SMTP del hosting cPanel o cualquier proveedor SMTP)
  smtp: {
    host: v('SMTP_HOST'),
    port: Number(v('SMTP_PORT') ?? 465),
    user: v('SMTP_USER'),
    pass: v('SMTP_PASS'),
    from: v('MAIL_FROM') ?? 'Café Travesía <hola@cafetravesia.co>',
    replyTo: v('MAIL_REPLY_TO'),
    adminNotify: v('ADMIN_NOTIFY_EMAIL'),
  },

  // IA (OpenAI o cualquier API compatible)
  ai: {
    apiKey: v('OPENAI_API_KEY'),
    baseUrl: (v('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: v('OPENAI_MODEL') ?? 'gpt-4.1-mini',
    // Modelo de respaldo si el principal responde 429/5xx o no contesta (p. ej. Gemini saturado).
    fallbackModel: v('OPENAI_FALLBACK_MODEL'),
    // Solo para modelos de razonamiento (Gemini 2.5+/3, o-series): "none" | "low" | "medium" | "high".
    reasoningEffort: v('OPENAI_REASONING_EFFORT'),
  },

  expoAccessToken: v('EXPO_ACCESS_TOKEN'),
  cronSecret: v('CRON_SECRET'),
  revalidateSecret: v('REVALIDATE_SECRET'),
  whatsapp: v('NEXT_PUBLIC_WHATSAPP') ?? '573000000000',
};

export const isFirebaseClientConfigured = () => Boolean(env.firebase.apiKey && env.firebase.authDomain && env.firebase.projectId);
export const isFirebaseAdminConfigured = () =>
  Boolean(env.firebaseAdmin.serviceAccountB64 || (env.firebaseAdmin.projectId && env.firebaseAdmin.clientEmail && env.firebaseAdmin.privateKey));
export const isWompiConfigured = () => Boolean(env.wompi.publicKey && env.wompi.privateKey && env.wompi.integritySecret);
export const isEmailConfigured = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
export const isAiConfigured = () => Boolean(env.ai.apiKey);
export const isStorageConfigured = () => Boolean(env.gatewayUrl && env.gatewaySecret);
export { isDbConfigured };

/** Modo demo: sin base de datos el sitio muestra datos de ejemplo y bloquea escrituras. */
export const isDemoMode = () => !isDbConfigured();
