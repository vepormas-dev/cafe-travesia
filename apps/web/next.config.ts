import type { NextConfig } from 'next';

const mediaHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_MEDIA_URL ?? 'https://media.cafetravesia.co').hostname;
  } catch {
    return 'media.cafetravesia.co';
  }
})();

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  // Cache Components: las páginas públicas se sirven desde caché ("use cache" + cacheTag)
  // y solo consultan la base de datos de cPanel al invalidarse desde el CMS.
  cacheComponents: true,
  partialPrefetching: true,
  // Permite builds paralelos/aislados (CI, agentes) sin pisarse: NEXT_DIST_DIR=.next-ci
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === '1' },
  transpilePackages: ['@travesia/shared', '@travesia/db'],
  serverExternalPackages: ['firebase-admin', 'mysql2', 'nodemailer', '@react-pdf/renderer'],
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: mediaHost },
      { protocol: 'https', hostname: '*.b-cdn.net' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/brand/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
  async redirects() {
    // URLs del WordPress actual (cafetravesia.co) → nuevas rutas, para no perder SEO
    return [
      { source: '/suscripcion', destination: '/suscripciones', permanent: true },
      { source: '/suscripcion/:path*', destination: '/suscripciones', permanent: true },
      { source: '/carrito', destination: '/tienda/carrito', permanent: true },
      { source: '/producto/:slug', destination: '/tienda/:slug', permanent: true },
      { source: '/categoria-producto/:path*', destination: '/tienda', permanent: true },
      { source: '/category/:path*', destination: '/blog', permanent: true },
      { source: '/wp-admin', destination: '/acceso', permanent: false },
      { source: '/wp-login.php', destination: '/acceso', permanent: false },
      { source: '/mi-cuenta', destination: '/cuenta', permanent: true },
    ];
  },
};

export default nextConfig;
