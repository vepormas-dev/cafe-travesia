'use client';
/** Preferencias del carrito compartidas entre cajón, carrito y checkout (localStorage). */
export type CartPrefs = { region?: string | null; city?: string | null; couponCode?: string | null; redeemPoints?: boolean };
const KEY = 'ct-cart-prefs-v1';

export function getPrefs(): CartPrefs {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as CartPrefs;
  } catch {
    return {};
  }
}
export function setPrefs(patch: CartPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify({ ...getPrefs(), ...patch }));
}
