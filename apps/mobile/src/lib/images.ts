import type { ImageSource } from 'expo-image';

import { absoluteUrl } from './env';

/** Fotos reales de marca empacadas en la app (convertidas desde apps/web/public/brand/fotos). */
export const PHOTOS = {
  'manos-cafe-caicedo': require('@/assets/brand/fotos/manos-cafe-caicedo.jpg'),
  'latte-travesia': require('@/assets/brand/fotos/latte-travesia.jpg'),
  'taza-frase': require('@/assets/brand/fotos/taza-frase.jpg'),
  'barra-travesia': require('@/assets/brand/fotos/barra-travesia.jpg'),
  'aromatica-frutos': require('@/assets/brand/fotos/aromatica-frutos.jpg'),
  'soda-frutos': require('@/assets/brand/fotos/soda-frutos.jpg'),
  'frappe-caramelo': require('@/assets/brand/fotos/frappe-caramelo.jpg'),
  'florida-te-esperamos': require('@/assets/brand/fotos/florida-te-esperamos.jpg'),
  'florida-lugar-diferente': require('@/assets/brand/fotos/florida-lugar-diferente.jpg'),
} as const;
export type PhotoName = keyof typeof PHOTOS;

export const LOGO = require('@/assets/brand/logo.png');
export const LOGO_CLARO = require('@/assets/brand/logo-claro.png');
export const LOGOTIPO = require('@/assets/brand/logotipo.png');

export const ICONS = {
  academia: require('@/assets/brand/iconos/academia.png'),
  cosecha: require('@/assets/brand/iconos/cosecha.png'),
  faq: require('@/assets/brand/iconos/faq.png'),
  finca: require('@/assets/brand/iconos/finca.png'),
  granja: require('@/assets/brand/iconos/granja.png'),
  granos: require('@/assets/brand/iconos/granos.png'),
  idea: require('@/assets/brand/iconos/idea.png'),
  libro: require('@/assets/brand/iconos/libro.png'),
  local: require('@/assets/brand/iconos/local.png'),
  'maquina-espresso': require('@/assets/brand/iconos/maquina-espresso.png'),
  pregunta: require('@/assets/brand/iconos/pregunta.png'),
  'tienda-online': require('@/assets/brand/iconos/tienda-online.png'),
} as const;
export type BrandIconName = keyof typeof ICONS;

/** Fuente de imagen: si la URL apunta a una foto de marca conocida usa la local; si no, la remota. */
export function imageSource(url: string | null | undefined, fallback: PhotoName = 'manos-cafe-caicedo'): ImageSource | number {
  if (!url) return PHOTOS[fallback];
  const m = /\/brand\/fotos\/([a-z0-9-]+)\.(webp|jpg|png)$/i.exec(url);
  if (m && m[1]! in PHOTOS) return PHOTOS[m[1] as PhotoName];
  return { uri: absoluteUrl(url) };
}
