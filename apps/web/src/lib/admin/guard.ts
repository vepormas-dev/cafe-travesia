import 'server-only';
/**
 * Protección del panel.
 *  - Páginas: staffPage()/adminPage() esperan la petición (connection) y validan el rol.
 *    Deben llamarse DENTRO de un <Suspense> (Cache Components).
 *  - Acciones: runAction() valida rol, bloquea escrituras en modo demo, captura errores
 *    y devuelve un ActionState uniforme para useActionState + toasts.
 */
import { connection } from 'next/server';
import { z } from 'zod';
import { requireAdmin, requireStaff, type SessionUser } from '@/lib/auth';
import { isDemoMode } from '@/lib/env';
import { DEMO_MESSAGE, type ActionState } from './action-state';

export type AdminCtx = { user: SessionUser; isAdmin: boolean; demo: boolean };

export async function staffPage(next = '/admin'): Promise<AdminCtx> {
  await connection();
  const user = await requireStaff(next);
  return { user, isAdmin: user.role === 'admin', demo: isDemoMode() };
}

export async function adminPage(next = '/admin'): Promise<AdminCtx> {
  await connection();
  const user = await requireAdmin(next);
  return { user, isAdmin: true, demo: isDemoMode() };
}

const isNextControlFlow = (e: unknown) => {
  const d = (e as { digest?: string })?.digest;
  return typeof d === 'string' && (d.startsWith('NEXT_REDIRECT') || d.startsWith('NEXT_NOT_FOUND') || d.startsWith('NEXT_HTTP_ERROR'));
};

export class ActionError extends Error {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}

export const ok = <T,>(message: string, data?: T): ActionState<T> => ({ ok: true, message, data, ts: Date.now() });
export const fail = (message: string, errors?: Record<string, string[]>): ActionState => ({ ok: false, message, errors, ts: Date.now() });

/**
 * Ejecuta una mutación del panel.
 * opts.admin → solo administradores · opts.allowDemo → se ejecuta también en demo (lecturas IA).
 */
export async function runAction<T = unknown>(
  opts: { admin?: boolean; allowDemo?: boolean },
  fn: (ctx: AdminCtx) => Promise<ActionState<T> | string | void>,
): Promise<ActionState<T>> {
  const user = opts.admin ? await requireAdmin() : await requireStaff();
  const ctx: AdminCtx = { user, isAdmin: user.role === 'admin', demo: isDemoMode() };
  if (ctx.demo && !opts.allowDemo) return { ok: false, message: DEMO_MESSAGE, demo: true, ts: Date.now() };
  try {
    const r = await fn(ctx);
    if (typeof r === 'string') return { ok: true, message: r, ts: Date.now() };
    if (!r) return { ok: true, message: 'Cambios guardados', ts: Date.now() };
    return r as ActionState<T>;
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    if (e instanceof ActionError) return { ok: false, message: e.message, errors: e.errors, ts: Date.now() };
    if (e instanceof z.ZodError) return { ok: false, message: e.issues[0]?.message ?? 'Revisa los campos marcados', errors: zodErrors(e), ts: Date.now() };
    const msg = e instanceof Error ? e.message : String(e);
    if (/Duplicate entry/i.test(msg) || (e as { cause?: { errno?: number } })?.cause?.errno === 1062) return { ok: false, message: 'Ya existe un registro con ese identificador (slug, código o SKU repetido).', ts: Date.now() };
    console.error('[admin.action]', e);
    return { ok: false, message: msg.length < 200 ? msg : 'No pudimos guardar los cambios. Inténtalo de nuevo.', ts: Date.now() };
  }
}

export function zodErrors(e: z.ZodError) {
  const out: Record<string, string[]> = {};
  for (const i of e.issues) (out[i.path.join('.') || '_'] ??= []).push(i.message);
  return out;
}

/** Lee y valida el campo oculto "payload" (JSON) de un formulario. */
export function parsePayload<S extends z.ZodType>(schema: S, fd: FormData | unknown): z.infer<S> {
  let raw: unknown = fd;
  if (fd instanceof FormData) {
    const p = fd.get('payload');
    if (typeof p === 'string') {
      try {
        raw = JSON.parse(p);
      } catch {
        throw new ActionError('Formulario inválido');
      }
    } else raw = Object.fromEntries(fd.entries());
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw r.error;
  return r.data;
}

/** Utilidades zod comunes del panel. */
export const zs = {
  str: (max = 200) => z.string().trim().max(max, `Máximo ${max} caracteres`),
  req: (label: string, max = 200) => z.string().trim().min(1, `${label} es obligatorio`).max(max, `Máximo ${max} caracteres`),
  opt: (max = 500) =>
    z
      .string()
      .trim()
      .max(max, `Máximo ${max} caracteres`)
      .nullish()
      .transform((v) => (v ? v : null)),
  url: () =>
    z
      .string()
      .trim()
      .max(600)
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => !v || v.startsWith('/') || /^https?:\/\//.test(v), 'Usa una URL https:// o una ruta que empiece por /'),
  int: (min = 0, max = 1_000_000_000) => z.coerce.number().int('Debe ser un número entero').min(min, `Mínimo ${min}`).max(max),
  intN: (min = 0, max = 1_000_000_000) => z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int().min(min).max(max).nullable()),
  bool: () => z.preprocess((v) => v === true || v === 'true' || v === 'on' || v === '1', z.boolean()),
  slug: () => z.string().trim().toLowerCase().min(2, 'Escribe el slug').max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones'),
  color: () =>
    z
      .string()
      .trim()
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => !v || /^#[0-9a-fA-F]{6}$/.test(v), 'Color hexadecimal (#RRGGBB)'),
  list: (max = 30) => z.array(z.string().trim().min(1).max(120)).max(max).default([]),
  date: () =>
    z
      .string()
      .trim()
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Fecha inválida'),
};

/** 'YYYY-MM-DDTHH:mm' (hora Bogotá, de un <input type=datetime-local>) → Date UTC */
export const bogotaLocalToDate = (v: string | null | undefined) => (v ? new Date(`${v.length === 16 ? `${v}:00` : v}-05:00`) : null);
