/** Normaliza searchParams de Next (string | string[]) a un Record plano. */
export type RawSP = Record<string, string | string[] | undefined>;
export type SPromise = Promise<RawSP>;
export const flat = (sp: RawSP): Record<string, string | undefined> => Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
export const pageOf = (sp: Record<string, string | undefined>) => Math.max(1, Number(sp.page) || 1);
