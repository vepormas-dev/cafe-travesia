/**
 * Carrito local (AsyncStorage) con el mismo formato CartLineInput de @travesia/shared.
 * Con sesión se sincroniza con GET/PUT /api/cart (carrito compartido web ↔ app).
 */
import { useSyncExternalStore } from 'react';
import type { CartLineInput } from '@travesia/shared';

import { api, isDemo } from './api';
import { KEYS, readJSON, writeJSON } from './storage';

let items: CartLineInput[] = [];
let loaded = false;
let signedIn = false;
const listeners = new Set<() => void>();
const sameLine = (a: CartLineInput, b: CartLineInput) => a.kind === b.kind && a.id === b.id && (a.variantId ?? null) === (b.variantId ?? null);

function emit(sync = true) {
  listeners.forEach((l) => l());
  void writeJSON(KEYS.cart, items);
  if (sync) scheduleSync();
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync() {
  if (!signedIn || isDemo()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    api.put('/api/cart', { items }).catch(() => undefined);
  }, 800);
}

export const cart = {
  async load() {
    if (loaded) return;
    items = await readJSON<CartLineInput[]>(KEYS.cart, []);
    loaded = true;
    emit(false);
  },
  get items() {
    return items;
  },
  add(line: CartLineInput) {
    const i = items.findIndex((x) => sameLine(x, line));
    if (line.kind === 'course') {
      if (i >= 0) return; // un curso se compra una vez
      items = [...items, { ...line, quantity: 1 }];
    } else if (i >= 0) {
      items = items.map((x, j) => (j === i ? { ...x, quantity: Math.min(50, x.quantity + line.quantity) } : x));
    } else {
      items = [...items, line];
    }
    emit();
  },
  setQuantity(line: CartLineInput, quantity: number) {
    items = quantity <= 0 ? items.filter((x) => !sameLine(x, line)) : items.map((x) => (sameLine(x, line) ? { ...x, quantity: Math.min(50, quantity) } : x));
    emit();
  },
  remove(line: CartLineInput) {
    items = items.filter((x) => !sameLine(x, line));
    emit();
  },
  clear() {
    items = [];
    emit();
  },
  /** Al iniciar sesión: une el carrito local con el del servidor y lo sube. */
  async syncOnLogin() {
    signedIn = true;
    if (isDemo()) return;
    try {
      await cart.load();
      const remote = await api.get<{ items: CartLineInput[] }>('/api/cart');
      const merged = [...(remote.items ?? [])];
      for (const l of items) {
        const i = merged.findIndex((x) => sameLine(x, l));
        if (i < 0) merged.push(l);
        else merged[i] = { ...merged[i]!, quantity: Math.max(merged[i]!.quantity, l.quantity) };
      }
      items = merged;
      emit(false);
      await api.put('/api/cart', { items });
    } catch {
      /* sin red: se sincroniza en el próximo cambio */
    }
  },
  onLogout() {
    signedIn = false;
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useCart = () => useSyncExternalStore(subscribe, () => items, () => items);
export const useCartCount = () => useCart().reduce((s, l) => s + l.quantity, 0);
