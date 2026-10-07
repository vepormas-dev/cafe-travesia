/** Navegación pública (header, menú móvil y footer). */
export const SHOP_CATEGORIES = [
  { label: 'Café de origen', href: '/tienda?tipo=coffee', text: 'Lotes de Caicedo tostados cada semana', icon: 'granos' },
  { label: 'Barismo en casa', href: '/tienda?tipo=accessory', text: 'V60, prensa y todo para tu ritual', icon: 'maquina-espresso' },
  { label: 'Kits de regalo', href: '/tienda?tipo=kit', text: 'Para regalar origen', icon: 'cosecha' },
  { label: 'Catas y tours', href: '/tienda?tipo=experience', text: 'Vive el café en Florida y en la finca', icon: 'finca' },
  { label: 'Ropa y merch', href: '/tienda?tipo=merch', text: 'Mugs, gorras y más Travesía', icon: 'tienda-online' },
] as const;

export const MAIN_NAV = [
  { label: 'Suscripciones', href: '/suscripciones' },
  { label: 'Academia', href: '/academia' },
  { label: 'Notas de café', href: '/blog' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Tiendas', href: '/tiendas' },
] as const;

export const ACCOUNT_LINKS = [
  { label: 'Mi cuenta', href: '/cuenta' },
  { label: 'Pedidos', href: '/cuenta/pedidos' },
  { label: 'Suscripción', href: '/cuenta/suscripcion' },
  { label: 'Mis cursos', href: '/cuenta/cursos' },
  { label: 'Puntos Travesía', href: '/cuenta/puntos' },
] as const;
