/**
 * Traducción de rutas de la web (DEEP_LINKS de @travesia/shared, data.url de push, acciones del chat,
 * href de recomendaciones IA) a pantallas de la app. También acepta https://cafetravesia.co/... y cafetravesia://...
 */
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { absoluteUrl, env } from './env';

const hostOf = (u: string) => /^https?:\/\/([^/?#]+)/i.exec(u)?.[1]?.toLowerCase() ?? '';
const HOSTS = new Set(['cafetravesia.co', 'www.cafetravesia.co', hostOf(env.apiUrl)]);

/** Devuelve la ruta interna de la app o null si debe abrirse en el navegador. */
export function toAppRoute(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = input.trim();
  if (/^cafetravesia:\/\//i.test(raw)) raw = '/' + raw.replace(/^cafetravesia:\/\/\/?/i, '');
  else if (/^https?:\/\//i.test(raw)) {
    if (!HOSTS.has(hostOf(raw))) return null;
    raw = raw.replace(/^https?:\/\/[^/?#]+/i, '').replace(/#.*$/, '') || '/';
  }
  if (!raw.startsWith('/')) raw = '/' + raw;
  const [pathPart, query = ''] = raw.split('?');
  const path = (pathPart ?? '/').replace(/\/+$/, '') || '/';
  const q = query ? `?${query}` : '';
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const enc = (s: string) => encodeURIComponent(s);

  const [a, b, c, d, e] = seg;
  switch (a) {
    case undefined:
      return '/';
    case 'tienda':
      if (!b) return `/tienda${q}`;
      if (b === 'carrito') return '/carrito';
      if (b === 'checkout') return '/checkout';
      if (b === 'pago') return `/pago/resultado${q}`;
      return `/producto/${enc(b)}`;
    case 'producto':
      return b ? `/producto/${enc(b)}` : '/tienda';
    case 'academia':
      if (b === 'cursos' && c) {
        if (d === 'lecciones' && e) return `/leccion/${enc(e)}`;
        return `/curso/${enc(c)}`;
      }
      if (b === 'lecciones' && c) return `/leccion/${enc(c)}`;
      if (b === 'quiz' && c) return `/quiz/${enc(c)}`;
      return '/academia';
    case 'curso':
      return b ? `/curso/${enc(b)}` : '/academia';
    case 'leccion':
      return b ? `/leccion/${enc(b)}` : '/academia';
    case 'suscripciones':
      return b ? `/suscribir/${enc(b)}` : '/plan';
    case 'cuenta':
      switch (b) {
        case undefined:
          return '/perfil';
        case 'pedidos':
          return c ? `/pedidos/${enc(c)}` : '/pedidos';
        case 'suscripcion':
          return '/plan';
        case 'cursos':
          return '/academia';
        case 'certificados':
          return '/certificados';
        case 'notificaciones':
          return '/notificaciones';
        case 'puntos':
          return '/puntos';
        case 'direcciones':
          return '/direcciones';
        case 'datos':
        case 'perfil':
          return '/datos';
        default:
          return '/perfil';
      }
    case 'chat':
      return '/chat';
    case 'pago':
      return `/pago/resultado${q}`;
    case 'ingresar':
    case 'acceso':
      return '/ingresar';
    case 'plan':
    case 'perfil':
    case 'carrito':
    case 'checkout':
    case 'pedidos':
    case 'notificaciones':
    case 'puntos':
    case 'datos':
    case 'direcciones':
    case 'certificados':
      return path + q;
    default:
      return null;
  }
}

/** Navega dentro de la app o abre el navegador para enlaces externos. */
export async function openLink(href: string | null | undefined) {
  if (!href) return;
  const route = toAppRoute(href);
  if (route) {
    router.push(route as Href);
    return;
  }
  const url = /^https?:\/\//i.test(href) ? href : absoluteUrl(href);
  await WebBrowser.openBrowserAsync(url, { toolbarColor: '#111A31', controlsColor: '#EB9A37' });
}

export const openWeb = (path: string) =>
  WebBrowser.openBrowserAsync(absoluteUrl(path), { toolbarColor: '#111A31', controlsColor: '#EB9A37' });

/** Lee los parámetros de una URL (cafetravesia://pago?pedido=..&id=..) sin depender de URL(). */
export const paramsFromUrl = (url: string) => {
  const out: Record<string, string> = {};
  const q = url.split('?')[1]?.split('#')[0] ?? '';
  q.split('&').forEach((kv) => {
    const [k, v] = kv.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent((v ?? '').replace(/\+/g, ' '));
  });
  return out;
};
