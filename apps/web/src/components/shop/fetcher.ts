/** fetch JSON del lado cliente con errores legibles ({ error, issues } de la API). */
export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string; issues?: Record<string, string[]>; data?: Record<string, unknown> };

export async function api<T>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data.error === 'string' ? data.error : res.status === 404 ? 'No encontrado' : 'Ocurrió un error. Inténtalo de nuevo.',
        issues: data.issues as Record<string, string[]> | undefined,
        data,
      };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { ok: false, status: 0, error: 'cancelado' };
    return { ok: false, status: 0, error: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' };
  }
}

export const whatsappUrl = (text: string) =>
  `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? '573147482358'}?text=${encodeURIComponent(text)}`;
