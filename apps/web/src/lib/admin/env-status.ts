import 'server-only';
/** Estado de la configuración (solo nombres y si están definidas — nunca valores). */
import { env } from '@/lib/env';

const has = (k: string) => Boolean(process.env[k]?.trim());
export type EnvGroup = { group: string; vars: { name: string; set: boolean; required: boolean; purpose: string }[] };

export function envStatus(): EnvGroup[] {
  const groups: [string, [string, boolean, string][]][] = [
    ['Base de datos y medios (cPanel)', [
      ['DB_DRIVER', false, 'gateway (recomendado) o mysql'],
      ['DB_GATEWAY_URL', true, 'https://gateway.<dominio> (pasarela PHP)'],
      ['DB_GATEWAY_SECRET', true, 'Secreto HMAC compartido con config.php'],
      ['MEDIA_GATEWAY_URL', false, 'Si los medios usan otra URL de pasarela'],
      ['NEXT_PUBLIC_MEDIA_URL', true, 'https://media.<dominio>'],
    ]],
    ['Firebase Auth', [
      ['NEXT_PUBLIC_FIREBASE_API_KEY', true, 'SDK web'],
      ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', true, 'SDK web'],
      ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', true, 'SDK web'],
      ['NEXT_PUBLIC_FIREBASE_APP_ID', false, 'SDK web'],
      ['FIREBASE_SERVICE_ACCOUNT_BASE64', false, 'Admin SDK (o las 3 variables siguientes)'],
      ['FIREBASE_CLIENT_EMAIL', false, 'Admin SDK'],
      ['FIREBASE_PRIVATE_KEY', false, 'Admin SDK'],
      ['ADMIN_EMAILS', true, 'Correos que se vuelven administradores al ingresar'],
    ]],
    ['Pagos Wompi', [
      ['WOMPI_ENV', true, 'sandbox | production'],
      ['NEXT_PUBLIC_WOMPI_PUBLIC_KEY', true, 'Llave pública'],
      ['WOMPI_PRIVATE_KEY', true, 'Llave privada (cobros recurrentes)'],
      ['WOMPI_INTEGRITY_SECRET', true, 'Firma de integridad del checkout'],
      ['WOMPI_EVENTS_SECRET', true, 'Verificación de webhooks'],
    ]],
    ['Correo (SMTP del hosting)', [
      ['SMTP_HOST', true, 'mail.<dominio>'],
      ['SMTP_PORT', false, '465 por defecto'],
      ['SMTP_USER', true, 'Buzón remitente'],
      ['SMTP_PASS', true, 'Contraseña del buzón'],
      ['MAIL_FROM', false, 'Remitente visible'],
      ['ADMIN_NOTIFY_EMAIL', false, 'Aviso de pedidos nuevos al equipo'],
    ]],
    ['IA, push y tareas', [
      ['OPENAI_API_KEY', false, 'Chatbot, redacción del CMS, análisis (sin clave: reglas)'],
      ['OPENAI_MODEL', false, `Por defecto ${env.ai.model}`],
      ['EXPO_ACCESS_TOKEN', false, 'Opcional para Expo Push'],
      ['CRON_SECRET', true, 'Protege /api/cron'],
      ['NEXT_PUBLIC_SITE_URL', true, 'URL pública del sitio'],
    ]],
  ];
  return groups.map(([group, vars]) => ({ group, vars: vars.map(([name, required, purpose]) => ({ name, required, purpose, set: has(name) })) }));
}

export function integrationUrls() {
  const gw = (env.gatewayUrl ?? process.env.DB_GATEWAY_URL ?? 'https://gateway.cafetravesia.co').replace(/\/$/, '');
  return {
    webhook: `${env.siteUrl}/api/webhooks/wompi`,
    redirect: `${env.siteUrl}/tienda/pago`,
    cron: `${env.siteUrl}/api/cron`,
    cronDaily: `${env.siteUrl}/api/cron?daily=1`,
    gatewayHealth: `${gw}/health.php`,
    media: env.mediaUrl,
    authDomain: env.firebase.authDomain ?? '<proyecto>.firebaseapp.com',
    site: env.siteUrl,
  };
}
