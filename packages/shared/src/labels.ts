export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  failed: 'Pago rechazado',
};
export const ORDER_FLOW = ['paid', 'preparing', 'shipped', 'delivered'] as const;

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activa',
  paused: 'En pausa',
  past_due: 'Pago pendiente',
  cancelled: 'Cancelada',
};

export const FREQUENCY_LABEL = (weeks: number) =>
  weeks === 1 ? 'Semanal' : weeks === 2 ? 'Quincenal' : weeks === 4 ? 'Mensual' : weeks === 8 ? 'Bimestral' : `Cada ${weeks} semanas`;

export const GRIND_LABEL: Record<string, string> = {
  grano: 'En grano',
  fina: 'Molienda fina (espresso)',
  media: 'Molienda media (filtrados)',
  gruesa: 'Molienda gruesa (prensa francesa)',
};

export const LEVEL_LABEL: Record<string, string> = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

export const PRODUCT_KIND_LABEL: Record<string, string> = {
  coffee: 'Café de origen',
  merch: 'Ropa y merch',
  accessory: 'Barismo en casa',
  kit: 'Kits de regalo',
  experience: 'Catas y tours',
};

export const PROFILE_LABELS: Record<string, string> = {
  tueste: 'Nivel de tueste',
  acidez: 'Acidez',
  cuerpo: 'Cuerpo',
  dulzor: 'Dulzor',
  amargor: 'Amargor',
  complejidad: 'Complejidad aromática',
};

export const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  won: 'Ganado',
  lost: 'Perdido',
};

/** Rutas profundas comunes web ↔ app (data.url en push). */
export const DEEP_LINKS = [
  { value: '/', label: 'Inicio' },
  { value: '/tienda', label: 'Tienda' },
  { value: '/academia', label: 'Academia' },
  { value: '/suscripciones', label: 'Suscripciones' },
  { value: '/cuenta/pedidos', label: 'Mis pedidos' },
  { value: '/cuenta/suscripcion', label: 'Mi suscripción' },
  { value: '/cuenta/cursos', label: 'Mis cursos' },
  { value: '/cuenta/notificaciones', label: 'Notificaciones' },
  { value: '/chat', label: 'Asistente' },
] as const;

export const PUSH_AUDIENCES = [
  { value: 'all', label: 'Todos los dispositivos' },
  { value: 'subscribers', label: 'Suscriptores activos' },
  { value: 'students', label: 'Estudiantes de la Academia' },
  { value: 'customers', label: 'Clientes con compras' },
  { value: 'inactive', label: 'Inactivos (+30 días sin abrir la app)' },
] as const;
