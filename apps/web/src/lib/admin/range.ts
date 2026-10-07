/**
 * Rangos de fechas del dashboard (hora de Bogotá, UTC-5 fijo, sin horario de verano).
 * Se usa en servidor y en cliente (sin dependencias de servidor).
 */
export const RANGE_OPTIONS = [
  { key: '7d', label: 'Últimos 7 días', short: '7 d' },
  { key: '30d', label: 'Últimos 30 días', short: '30 d' },
  { key: '90d', label: 'Últimos 90 días', short: '90 d' },
  { key: 'mes', label: 'Este mes', short: 'Mes' },
] as const;
export type RangeKey = (typeof RANGE_OPTIONS)[number]['key'];

export const BOGOTA_OFFSET_MS = 5 * 3600 * 1000;
const DAY = 86400000;

/** 'YYYY-MM-DD' (Bogotá) de un instante. */
export const dayOf = (d: Date | number) => new Date((typeof d === 'number' ? d : d.getTime()) - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
/** Instante UTC de la medianoche de Bogotá de un día 'YYYY-MM-DD'. */
export const startOfDay = (day: string) => new Date(`${day}T05:00:00.000Z`);
export const addDays = (day: string, n: number) => dayOf(startOfDay(day).getTime() + n * DAY + 3600000);

export type ResolvedRange = {
  key: RangeKey;
  label: string;
  days: number;
  fromDay: string;
  toDay: string;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  prevFromDay: string;
  dayList: string[];
};

export function parseRange(v: string | string[] | undefined | null): RangeKey {
  const s = Array.isArray(v) ? v[0] : v;
  return RANGE_OPTIONS.some((o) => o.key === s) ? (s as RangeKey) : '30d';
}

export function resolveRange(key: RangeKey, now = new Date()): ResolvedRange {
  const today = dayOf(now);
  let fromDay: string;
  if (key === 'mes') fromDay = `${today.slice(0, 8)}01`;
  else fromDay = addDays(today, -(Number(key.replace('d', '')) - 1));
  const days = Math.round((startOfDay(today).getTime() - startOfDay(fromDay).getTime()) / DAY) + 1;
  const from = startOfDay(fromDay);
  const to = new Date(startOfDay(today).getTime() + DAY);
  const prevFromDay = addDays(fromDay, -days);
  const dayList = Array.from({ length: days }, (_, i) => addDays(fromDay, i));
  return {
    key,
    label: RANGE_OPTIONS.find((o) => o.key === key)!.label,
    days,
    fromDay,
    toDay: today,
    from,
    to,
    prevFrom: startOfDay(prevFromDay),
    prevTo: from,
    prevFromDay,
    dayList,
  };
}

/** Lunes (Bogotá) de la semana de un día. */
export function weekOf(day: string) {
  const d = startOfDay(day);
  const dow = (new Date(d.getTime() - BOGOTA_OFFSET_MS).getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(day, -dow);
}

export const deltaPct = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : 100) : ((cur - prev) / Math.abs(prev)) * 100);

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** '2026-10-07' → '7 oct' */
export const shortDay = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
/** '2026-10' → 'oct 26' */
export const shortMonth = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

/** 'YYYY-MM-DDTHH:mm' (Bogotá) desde Date/ISO para inputs datetime-local. */
export const toBogotaLocal = (d: Date | string | null | undefined) => (d ? new Date(new Date(d).getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 16) : '');
