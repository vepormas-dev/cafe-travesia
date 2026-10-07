/**
 * Cliente de la API de Café Travesía (contrato en docs/API.md).
 * - Autenticación: Authorization: Bearer <Firebase ID token> (el SDK lo renueva solo).
 * - MODO DEMO: si EXPO_PUBLIC_API_URL no responde (o EXPO_PUBLIC_DEMO=1), las lecturas usan
 *   src/lib/demo.ts y las escrituras lanzan DemoError (la UI muestra un aviso).
 */
import { useSyncExternalStore } from 'react';

import { env } from './env';
import { getFirebaseAuth } from './firebase';

export class ApiError extends Error {
  status: number;
  issues?: Record<string, string[]>;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    const d = data as { issues?: Record<string, string[]> } | undefined;
    this.issues = d?.issues;
  }
}
/** Escritura bloqueada: la app está en modo demo o el backend respondió 503. */
export class DemoError extends ApiError {
  constructor(message = 'Modo demo: esta acción se habilita cuando la app se conecta con cafetravesia.com.') {
    super(503, message);
  }
}
export const isDemoError = (e: unknown) => e instanceof DemoError || (e instanceof ApiError && e.status === 503);
export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Algo salió mal. Intenta de nuevo.';

/* ---------------- Estado online / demo ---------------- */
type Mode = 'checking' | 'online' | 'demo';
let mode: Mode = env.forceDemo ? 'demo' : 'checking';
const listeners = new Set<() => void>();
const setMode = (m: Mode) => {
  if (mode === m) return;
  mode = m;
  listeners.forEach((l) => l());
};
export const getMode = () => mode;
export const isDemo = () => mode === 'demo';
export function useApiMode() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => mode,
    () => mode,
  );
}

let probe: Promise<void> | null = null;
/** Verifica una vez que la API responda JSON; si no, activa el modo demo. */
export function ensureMode(): Promise<void> {
  if (mode !== 'checking') return Promise.resolve();
  probe ??= (async () => {
    try {
      const res = await fetchWithTimeout(`${env.apiUrl}/api/v1/products?featured=1`, { headers: { Accept: 'application/json' } }, 7000);
      const ok = res.ok && (res.headers.get('content-type') ?? '').includes('json');
      if (ok) await res.json();
      setMode(ok ? 'online' : 'demo');
    } catch {
      setMode('demo');
    }
  })();
  return probe;
}
/** Reintenta la conexión (p. ej. desde el aviso de modo demo). */
export function retryOnline() {
  if (env.forceDemo) return Promise.resolve();
  probe = null;
  mode = 'checking';
  listeners.forEach((l) => l());
  return ensureMode();
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function idToken(force = false): Promise<string | null> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(force);
  } catch {
    return null;
  }
}

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; timeoutMs?: number; absolute?: boolean };

/** Petición cruda a la API (no aplica respaldo demo). */
export async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  await ensureMode();
  const method = opts.method ?? 'GET';
  if (mode === 'demo') throw new DemoError();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = await idToken();
  if (token && !opts.absolute) headers.Authorization = `Bearer ${token}`;
  const url = opts.absolute ? path : `${env.apiUrl}${path}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }, opts.timeoutMs);
  } catch {
    throw new ApiError(0, 'Sin conexión. Revisa tu internet e intenta de nuevo.');
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? defaultMessage(res.status);
    if (res.status === 503) throw new DemoError(msg);
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

const defaultMessage = (s: number) =>
  s === 401 ? 'Inicia sesión para continuar.' : s === 403 ? 'No tienes permiso para esto.' : s === 404 ? 'No encontramos lo que buscas.' : s === 429 ? 'Demasiadas solicitudes. Espera un momento.' : 'Algo salió mal. Intenta de nuevo.';

/** Lectura con respaldo demo: si la API no está disponible, devuelve datos locales. */
export async function read<T>(path: string, demo: () => T, opts: { fallbackOnError?: boolean } = {}): Promise<T> {
  await ensureMode();
  if (mode === 'demo') return demo();
  try {
    return await request<T>(path);
  } catch (e) {
    if (opts.fallbackOnError !== false && e instanceof ApiError && (e.status === 0 || e.status === 503)) return demo();
    throw e;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};
