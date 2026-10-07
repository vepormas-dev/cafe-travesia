'use client';
/**
 * Sincroniza el carrito local con la cuenta (GET/PUT /api/cart).
 * Al cargar: mezcla servidor + local (máxima cantidad por línea). Luego, cada cambio → PUT con debounce.
 */
import { useEffect } from 'react';
import { cart, type CartLine } from './cart-store';
import type { Quote } from './use-quote';

type ServerLine = { kind: 'product' | 'course'; id: string; variantId?: string | null; quantity: number };
let started = false;
let authed = false;

export function isCartSynced() {
  return authed;
}

/** Envía el carrito actual a la cuenta inmediatamente (p. ej. tras limpiar al pagar). */
export async function pushCart() {
  if (!authed) return;
  const items = cart.get().map(({ kind, id, variantId, quantity }) => ({ kind, id, variantId: variantId ?? null, quantity }));
  await fetch('/api/cart', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }), keepalive: true }).catch(() => undefined);
}

export function useCartSync() {
  useEffect(() => {
    if (started) return;
    started = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ready = false;
    const onChange = () => {
      if (!ready || !authed) return;
      clearTimeout(timer);
      timer = setTimeout(() => void pushCart(), 1200);
    };
    window.addEventListener('ct-cart-change', onChange);

    void (async () => {
      const res = await fetch('/api/cart', { credentials: 'same-origin' }).catch(() => null);
      if (!res?.ok) return; // invitado o modo demo: carrito solo local
      authed = true;
      const { items = [] } = (await res.json().catch(() => ({}))) as { items?: ServerLine[] };
      const local = cart.get();
      const missing = items.filter((s) => !local.some((l) => cart.key(l) === cart.key(s)));
      let merged: CartLine[] = local.map((l) => {
        const s = items.find((x) => cart.key(x) === cart.key(l));
        return s ? { ...l, quantity: l.kind === 'course' ? 1 : Math.min(50, Math.max(l.quantity, s.quantity)) } : l;
      });
      if (missing.length) {
        // Completar datos de presentación de las líneas que solo existen en el servidor
        const q = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: missing.map((m) => ({ kind: m.kind, id: m.id, variantId: m.variantId ?? null, quantity: m.quantity })) }),
        })
          .then((r) => (r.ok ? (r.json() as Promise<Quote>) : null))
          .catch(() => null);
        for (const l of q?.lines ?? []) {
          merged.push({
            kind: l.kind,
            id: (l.kind === 'course' ? l.courseId : l.productId) ?? '',
            variantId: l.variantId,
            quantity: l.quantity,
            name: l.name,
            variantName: l.variantName,
            imageUrl: l.imageUrl,
            slug: l.slug,
            unitPriceCop: l.unitPriceCop,
          });
        }
        merged = merged.filter((l) => l.id);
      }
      if (JSON.stringify(merged) !== JSON.stringify(local)) cart.replace(merged);
      ready = true;
      if (missing.length !== items.length || local.length !== items.length) void pushCart();
    })();

    return () => {
      // El hook vive en el layout: no se desmonta en navegación normal.
    };
  }, []);
}
