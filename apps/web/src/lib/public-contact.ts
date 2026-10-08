const PLACEHOLDER_DIGITS = /^(57)?300000000\d$/;
const REAL_WHATSAPP = '573147482358';

function digits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

/** Seed de ejemplo: 573000000000 y cualquier teléfono 300 000 000x. */
export function isPlaceholderPhone(value: string | null | undefined) {
  const d = digits(value);
  return d === '573000000000' || PLACEHOLDER_DIGITS.test(d);
}

export function publicPhone(value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  return trimmed && !isPlaceholderPhone(trimmed) ? trimmed : '';
}

/** Si el CMS trae el WhatsApp de ejemplo, usa NEXT_PUBLIC_WHATSAPP o el número real. */
export function publicWhatsapp(value: string | null | undefined) {
  const d = digits(value);
  if (d && !isPlaceholderPhone(d)) return d;
  const fromEnv = digits(process.env.NEXT_PUBLIC_WHATSAPP);
  if (fromEnv && !isPlaceholderPhone(fromEnv)) return fromEnv;
  return REAL_WHATSAPP;
}
