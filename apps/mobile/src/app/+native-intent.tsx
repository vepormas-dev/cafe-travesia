import { toAppRoute } from '@/lib/links';

/**
 * Reescribe enlaces entrantes (universal links https://cafetravesia.co/..., cafetravesia://...)
 * a las rutas de la app. Ej.: /cuenta/pedidos/<id> → /pedidos/<id>, /tienda/<slug> → /producto/<slug>.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return toAppRoute(path) ?? path;
  } catch {
    return path;
  }
}
