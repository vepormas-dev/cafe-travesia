'use client';
/**
 * Carrito del navegador (localStorage, sin dependencias). Fuente de verdad del precio:
 * POST /api/cart/quote. Se sincroniza con la cuenta (POST /api/cart) al iniciar sesión.
 */
import { useSyncExternalStore } from 'react';

export type CartLine = {
  kind: 'product' | 'course';
  id: string; // productId o courseId
  variantId?: string | null;
  quantity: number;
  // Datos de presentación (el servidor recalcula el precio)
  name: string;
  variantName?: string | null;
  imageUrl?: string | null;
  slug: string;
  unitPriceCop: number;
  themeColor?: string | null;
};

const KEY = 'ct-cart-v1';
const EVT = 'ct-cart-change';
let cache: CartLine[] | null = null;

function read(): CartLine[] {
  if (cache) return cache;
  if (typeof window === 'undefined') return [];
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartLine[];
  } catch {
    cache = [];
  }
  return cache!;
}
function write(lines: CartLine[]) {
  cache = lines;
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVT));
}
const lineKey = (l: Pick<CartLine, 'kind' | 'id' | 'variantId'>) => `${l.kind}:${l.id}:${l.variantId ?? ''}`;

export const cart = {
  get: read,
  add(line: CartLine) {
    const lines = [...read()];
    const i = lines.findIndex((x) => lineKey(x) === lineKey(line));
    if (i >= 0) lines[i] = { ...lines[i]!, quantity: line.kind === 'course' ? 1 : Math.min(50, lines[i]!.quantity + line.quantity) };
    else lines.push({ ...line, quantity: line.kind === 'course' ? 1 : line.quantity });
    write(lines);
    window.dispatchEvent(new CustomEvent('ct-cart-open'));
  },
  setQuantity(key: string, quantity: number) {
    write(read().map((x) => (lineKey(x) === key ? { ...x, quantity: Math.max(1, Math.min(50, quantity)) } : x)));
  },
  remove(key: string) {
    write(read().filter((x) => lineKey(x) !== key));
  },
  replace(lines: CartLine[]) {
    write(lines);
  },
  clear() {
    write([]);
  },
  key: lineKey,
};

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener('storage', onStorage);
  };
}
const EMPTY: CartLine[] = [];

export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = lines.reduce((n, l) => n + l.unitPriceCop * l.quantity, 0);
  return { lines, count, subtotal, ...cart };
}

/** Abre el carrito lateral desde cualquier parte. */
export const openCart = () => window.dispatchEvent(new CustomEvent('ct-cart-open'));
