import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CartError } from '@/lib/commerce/cart';
import { isDemoMode } from '@/lib/env';
import { logEvent } from '@/lib/monitor';

export const json = <T>(data: T, init?: number | ResponseInit) => NextResponse.json(data, typeof init === 'number' ? { status: init } : init);
export const apiError = (error: string, status = 400, issues?: Record<string, string[]>) => NextResponse.json({ error, ...(issues ? { issues } : {}) }, { status });
export const demoBlocked = () => apiError('Función no disponible en modo demo: conecta la base de datos para habilitarla.', 503);

/** Lee y valida el JSON del cuerpo. Devuelve [data, null] o [null, respuesta 400]. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<[z.infer<S>, null] | [null, NextResponse]> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return [null, apiError('El cuerpo de la solicitud no es JSON válido')];
  }
  const r = schema.safeParse(raw);
  if (!r.success) {
    const issues: Record<string, string[]> = {};
    for (const i of r.error.issues) (issues[i.path.join('.') || '_'] ??= []).push(i.message);
    const first = r.error.issues[0];
    return [null, apiError(first?.message ?? 'Datos inválidos', 422, issues)];
  }
  return [r.data, null];
}

/** Envuelve un handler: errores conocidos → 4xx legible; desconocidos → 500 + monitor. */
export function handle(name: string, fn: () => Promise<Response>) {
  return fn().catch(async (e: unknown) => {
    if (e instanceof CartError) return apiError(e.message, e.code === 'stock' ? 409 : 422);
    const msg = e instanceof Error ? e.message : String(e);
    await logEvent('system', `api.${name}`, 'error', { message: msg });
    return apiError(isDemoMode() ? msg : 'Ocurrió un error inesperado. Inténtalo de nuevo en un momento.', 500);
  });
}

/** CORS para la app móvil en desarrollo (Expo web) — en producción la app usa fetch nativo. */
export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
