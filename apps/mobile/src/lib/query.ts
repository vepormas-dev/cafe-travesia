/**
 * TanStack Query con caché persistente simple: las consultas de catálogo (clave 'catalog')
 * se guardan en AsyncStorage para abrir la app al instante y sin conexión.
 */
import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query';

import { KEYS, readJSON, writeJSON } from './storage';

const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 días

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: MAX_AGE,
      retry: (count, err) => count < 2 && !(err && typeof err === 'object' && 'status' in err && [401, 403, 404, 422].includes((err as { status: number }).status)),
    },
  },
});

let timer: ReturnType<typeof setTimeout> | null = null;
const persist = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (q) => q.queryKey[0] === 'catalog' && q.state.status === 'success',
    });
    void writeJSON(KEYS.query, { at: Date.now(), state });
  }, 1500);
};

let restored = false;
export async function restoreQueryCache() {
  if (restored) return;
  restored = true;
  const saved = await readJSON<{ at: number; state: unknown } | null>(KEYS.query, null);
  if (saved && Date.now() - saved.at < MAX_AGE) {
    try {
      hydrate(queryClient, saved.state as Parameters<typeof hydrate>[1]);
    } catch {
      /* caché corrupta: se ignora */
    }
  }
  queryClient.getQueryCache().subscribe((e) => {
    if (e.type === 'updated' && e.query.queryKey[0] === 'catalog') persist();
  });
}
