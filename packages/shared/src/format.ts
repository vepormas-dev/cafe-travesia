export const TZ = 'America/Bogota';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const formatCOP = (n: number | null | undefined) => cop.format(Math.round(Number(n ?? 0))).replace(/\u00a0/g, ' ');
export const formatCOPShort = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `$${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (v >= 1_000) return `$${Math.round(n / 1_000)} mil`;
  return `$${n}`;
};
export const formatNumber = (n: number) => new Intl.NumberFormat('es-CO').format(n);
export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

const toDate = (d: Date | string | number) => (d instanceof Date ? d : new Date(d));
export const formatDate = (d: Date | string | number | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  d ? new Intl.DateTimeFormat('es-CO', { timeZone: TZ, ...opts }).format(toDate(d)) : '—';
export const formatDateTime = (d: Date | string | number | null | undefined) =>
  formatDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m.toString().padStart(2, '0')} min` : `${m} min`;
};
export const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};
/** YYYY-MM-DD en hora de Bogotá */
export const bogotaDay = (d: Date | string | number = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(toDate(d));

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export const initials = (name?: string | null) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '☕';

export const readingMinutes = (markdown: string) => Math.max(1, Math.round(markdown.split(/\s+/).length / 220));
