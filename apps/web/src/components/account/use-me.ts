'use client';
/**
 * Sesión del cliente en componentes estáticos (tienda, checkout, suscripciones):
 * GET /api/v1/me una sola vez por carga de página (promesa compartida).
 */
import { useEffect, useState } from 'react';
import type { MeDTO } from '@travesia/shared';

export type AddressLite = { id: string; label: string; recipient: string; phone: string; region: string; city: string; line1: string; line2: string | null; notes: string | null; isDefault: boolean };

let mePromise: Promise<MeDTO | null> | null = null;
let addrPromise: Promise<AddressLite[]> | null = null;

export function fetchMe(): Promise<MeDTO | null> {
  mePromise ??= fetch('/api/v1/me', { credentials: 'same-origin' })
    .then(async (r) => (r.ok ? ((await r.json()) as { user: MeDTO }).user : null))
    .catch(() => null);
  return mePromise;
}
export function fetchAddresses(): Promise<AddressLite[]> {
  addrPromise ??= fetch('/api/v1/addresses', { credentials: 'same-origin' })
    .then(async (r) => (r.ok ? ((await r.json()) as { addresses: AddressLite[] }).addresses : []))
    .catch(() => []);
  return addrPromise;
}

/** status: 'loading' | 'guest' | 'user' */
export function useMe(withAddresses = false) {
  const [state, setState] = useState<{ status: 'loading' | 'guest' | 'user'; me: MeDTO | null; addresses: AddressLite[] }>({ status: 'loading', me: null, addresses: [] });
  useEffect(() => {
    let alive = true;
    void fetchMe().then(async (me) => {
      const addresses = me && withAddresses ? await fetchAddresses() : [];
      if (alive) setState({ status: me ? 'user' : 'guest', me, addresses });
    });
    return () => {
      alive = false;
    };
  }, [withAddresses]);
  return state;
}
