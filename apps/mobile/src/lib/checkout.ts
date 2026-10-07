import { useQuery } from '@tanstack/react-query';
import { computeTotals, type CartLineInput, type Totals } from '@travesia/shared';

import { isDemo, request, useApiMode } from './api';
import { demoCoupons, demoCourses, demoProducts, demoShippingZones } from './demo';

export type Quote = {
  lines: unknown[];
  totals: Totals;
  coupon: { ok: true; code: string; description: string; kind: string } | { ok: false; error: string } | null;
  availablePoints: number;
};
export type QuoteInput = { items: CartLineInput[]; region?: string; city?: string; couponCode?: string; email?: string; redeemPoints?: number };

/** Cálculo local equivalente (solo modo demo). El servidor es la fuente de verdad. */
export function demoQuote(input: QuoteInput, availablePoints = 1240): Quote {
  const lines = input.items.map((l) => {
    if (l.kind === 'course') {
      const c = demoCourses.find((x) => x.id === l.id);
      return { kind: 'course' as const, unitPriceCop: c?.priceCop ?? 0, quantity: 1, requiresShipping: false };
    }
    const p = demoProducts.find((x) => x.id === l.id);
    const v = p?.variants.find((x) => x.id === l.variantId) ?? p?.variants[0];
    return { kind: 'product' as const, unitPriceCop: v?.priceCop ?? 0, quantity: l.quantity, requiresShipping: p?.kind !== 'experience', weightG: v?.weightG };
  });
  const code = input.couponCode?.trim().toUpperCase();
  const rule = code ? demoCoupons.find((c) => c.code === code) : undefined;
  const totals = computeTotals({ lines, zones: demoShippingZones, region: input.region, city: input.city, coupon: rule ?? null, redeemPoints: input.redeemPoints, availablePoints });
  return {
    lines,
    totals,
    coupon: code ? (rule ? { ok: true, code: rule.code, description: rule.description, kind: rule.kind } : { ok: false, error: 'Ese cupón no existe o ya no está activo.' }) : null,
    availablePoints,
  };
}

export function useQuote(input: QuoteInput, enabled = true) {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['quote', input, mode],
    enabled: enabled && input.items.length > 0 && mode !== 'checking',
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    queryFn: async () => {
      if (isDemo()) return demoQuote(input);
      return request<Quote>('/api/cart/quote', { method: 'POST', body: input });
    },
  });
}
