'use client';
/** Cotización autoritativa del servidor (POST /api/cart/quote) con debounce y cancelación. */
import { useEffect, useMemo, useState } from 'react';
import type { Totals } from '@travesia/shared';
import type { CartLine } from './cart-store';
import { api } from '@/components/shop/fetcher';

export type QuoteLine = {
  key: string;
  kind: 'product' | 'course';
  productId: string | null;
  variantId: string | null;
  courseId: string | null;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  slug: string;
  unitPriceCop: number;
  quantity: number;
  stock: number | null;
  requiresShipping: boolean;
};
export type QuoteCoupon = { ok: true; code: string; description: string | null; kind: string } | { ok: false; error: string } | null;
export type Quote = { lines: QuoteLine[]; totals: Totals | null; coupon: QuoteCoupon; availablePoints: number };
export type QuoteOptions = { region?: string | null; city?: string | null; couponCode?: string | null; email?: string | null; redeemPoints?: number };

export const toInput = (lines: CartLine[]) => lines.map((l) => ({ kind: l.kind, id: l.id, variantId: l.variantId ?? null, quantity: l.quantity }));

export function useQuote(lines: CartLine[], opts: QuoteOptions = {}, delay = 350) {
  const items = useMemo(() => toInput(lines), [lines]);
  const key = JSON.stringify([items, opts.region ?? '', opts.city ?? '', opts.couponCode ?? '', opts.email ?? '', opts.redeemPoints ?? 0]);
  const [state, setState] = useState<{ data: Quote | null; loading: boolean; error: string | null; status: number; key: string }>({ data: null, loading: false, error: null, status: 0, key: '' });

  useEffect(() => {
    if (!items.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- carrito vacío: cotización vacía inmediata, sin ir al servidor
      setState({ data: { lines: [], totals: null, coupon: null, availablePoints: 0 }, loading: false, error: null, status: 200, key });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(async () => {
      const r = await api<Quote>('/api/cart/quote', {
        body: { items, region: opts.region || null, city: opts.city || null, couponCode: opts.couponCode || null, email: opts.email || null, redeemPoints: opts.redeemPoints || 0 },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      if (r.ok) setState({ data: r.data, loading: false, error: null, status: r.status, key });
      else setState((s) => ({ ...s, loading: false, error: r.error, status: r.status, key }));
    }, delay);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay]);

  return state;
}
