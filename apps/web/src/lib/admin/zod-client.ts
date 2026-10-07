import type { z } from 'zod';
/** Errores de zod → { 'ruta.del.campo': [mensajes] } (para validar en el cliente antes de enviar). */
export function zodErrorsClient(e: z.ZodError) {
  const out: Record<string, string[]> = {};
  for (const i of e.issues) (out[i.path.join('.') || '_'] ??= []).push(i.message);
  return out;
}
