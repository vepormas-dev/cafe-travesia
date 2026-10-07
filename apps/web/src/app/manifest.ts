import type { MetadataRoute } from 'next';
import { brand } from '@travesia/shared';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: 'Travesía',
    description: brand.claim,
    lang: 'es-CO',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: brand.colors.crema,
    theme_color: brand.colors.noche,
    categories: ['food', 'shopping', 'education'],
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      { name: 'Tienda', url: '/tienda' },
      { name: 'Mi suscripción', url: '/cuenta/suscripcion' },
      { name: 'Mis cursos', url: '/cuenta/cursos' },
    ],
  };
}
