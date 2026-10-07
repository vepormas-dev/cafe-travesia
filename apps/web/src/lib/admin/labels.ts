/** Etiquetas, colores y opciones del panel (seguros para cliente y servidor). */
export const CHART = {
  noche: '#111A31',
  noche600: '#36466E',
  noche400: '#7B88A8',
  ambar: '#EB9A37',
  ambar300: '#F5C27A',
  ambar700: '#C4741A',
  montana: '#4D6630',
  hoja: '#7C9A4E',
  cereza: '#B23A2E',
  cafe: '#5B3A26',
  arena: '#EFE6D6',
  grid: '#E9E3D8',
  muted: '#8A847C',
} as const;
export const SERIES = [CHART.noche, CHART.ambar, CHART.montana, CHART.noche400, CHART.cereza, CHART.hoja, CHART.ambar300, CHART.cafe];

export const CATEGORY_LABEL: Record<string, string> = {
  coffee: 'Café',
  accessory: 'Accesorios',
  kit: 'Kits',
  experience: 'Experiencias',
  merch: 'Merch',
  course: 'Cursos',
  plan: 'Suscripciones',
};
export const CHANNEL_LABEL: Record<string, string> = { web: 'Web', app: 'App', pos: 'Punto físico', admin: 'Panel' };
export const ORDER_KIND_LABEL: Record<string, string> = { store: 'Tienda', course: 'Curso', subscription: 'Suscripción', mixed: 'Mixto' };
export const DEVICE_LABEL: Record<string, string> = { desktop: 'Escritorio', mobile: 'Móvil', app: 'App' };
export const SOURCE_LABEL: Record<string, string> = { google: 'Google', instagram: 'Instagram', directo: 'Directo', whatsapp: 'WhatsApp', facebook: 'Facebook', tiktok: 'TikTok', email: 'Correo', referido: 'Referidos' };
export const CARRIERS = ['Servientrega', 'Coordinadora', 'Interrapidísimo', 'Envía', 'TCC', 'Deprisa', 'Mensajería propia'] as const;
export const CARRIER_TRACKING: Record<string, string> = {
  Servientrega: 'https://www.servientrega.com/wps/portal/rastreo-envio?guia=',
  Coordinadora: 'https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=',
  Interrapidísimo: 'https://www.interrapidisimo.com/sigue-tu-envio/?guia=',
  Envía: 'https://envia.co/rastreo?guia=',
  TCC: 'https://tcc.com.co/courier/mensajeria/rastrear-envio/?guia=',
  Deprisa: 'https://www.deprisa.com/rastreo?guia=',
};
export const PAYMENT_LABEL: Record<string, string> = {
  CARD: 'Tarjeta',
  'CARD (recurrente)': 'Tarjeta (recurrente)',
  PSE: 'PSE',
  NEQUI: 'Nequi',
  BANCOLOMBIA_TRANSFER: 'Botón Bancolombia',
  BANCOLOMBIA_QR: 'QR Bancolombia',
  DAVIPLATA: 'Daviplata',
  MANUAL: 'Manual (transferencia)',
  GRATIS: 'Sin costo',
};

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'ambar' | 'noche';
export const ORDER_STATUS_TONE: Record<string, Tone> = {
  pending: 'warning',
  paid: 'ambar',
  preparing: 'info',
  shipped: 'noche',
  delivered: 'success',
  cancelled: 'neutral',
  refunded: 'neutral',
  failed: 'danger',
};
export const SUB_STATUS_TONE: Record<string, Tone> = { pending: 'warning', active: 'success', paused: 'info', past_due: 'danger', cancelled: 'neutral' };
export const LEAD_STATUS_TONE: Record<string, Tone> = { new: 'ambar', contacted: 'info', qualified: 'noche', won: 'success', lost: 'neutral' };
export const CHAT_STATUS_LABEL: Record<string, string> = { bot: 'Con IA', human_requested: 'Esperando asesor', human: 'Con asesor', closed: 'Cerrado' };
export const CHAT_STATUS_TONE: Record<string, Tone> = { bot: 'info', human_requested: 'danger', human: 'success', closed: 'neutral' };
export const CAMPAIGN_STATUS_LABEL: Record<string, string> = { draft: 'Borrador', scheduled: 'Programada', sending: 'Enviando', sent: 'Enviada', failed: 'Fallida', cancelled: 'Cancelada' };
export const CAMPAIGN_STATUS_TONE: Record<string, Tone> = { draft: 'neutral', scheduled: 'ambar', sending: 'info', sent: 'success', failed: 'danger', cancelled: 'neutral' };
export const POST_STATUS_LABEL: Record<string, string> = { draft: 'Borrador', scheduled: 'Programado', published: 'Publicado' };
export const POST_STATUS_TONE: Record<string, Tone> = { draft: 'neutral', scheduled: 'ambar', published: 'success' };
export const REVIEW_STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
export const REVIEW_STATUS_TONE: Record<string, Tone> = { pending: 'warning', approved: 'success', rejected: 'neutral' };
export const ROLE_LABEL: Record<string, string> = { customer: 'Cliente', editor: 'Editor', admin: 'Administrador' };
export const ENROLL_SOURCE_LABEL: Record<string, string> = { purchase: 'Compra', subscription: 'Suscripción', admin: 'Manual', free: 'Gratis' };
export const EVENT_STATUS_TONE: Record<string, Tone> = { ok: 'success', error: 'danger', ignored: 'neutral' };
export const HEALTH_TONE: Record<string, Tone> = { ok: 'success', warn: 'warning', error: 'danger', off: 'neutral' };
export const VIDEO_PROVIDERS = ['mp4', 'hls', 'bunny', 'youtube', 'vimeo'] as const;
export const PRODUCT_KINDS = ['coffee', 'accessory', 'kit', 'experience', 'merch'] as const;
