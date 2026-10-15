/**
 * ¿La página está abierta desde la app de Café Travesía? La app abre la web con ?app=1
 * (en SFSafariViewController no se puede cambiar el user agent) y la marca dura la sesión de esa pestaña.
 * Dentro de la app no hay aviso de cookies ni analítica: no se rastrea (revisión de Apple 5.1.2).
 */
const KEY = 'cafe-travesia-app';

export function isInApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (/\bTravesiaApp\b/i.test(navigator.userAgent)) return true;
  try {
    if (new URLSearchParams(window.location.search).get('app') === '1') {
      sessionStorage.setItem(KEY, '1');
      return true;
    }
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return new URLSearchParams(window.location.search).get('app') === '1';
  }
}
