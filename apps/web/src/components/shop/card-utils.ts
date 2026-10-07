/** Validación y formato de tarjetas (solo cliente; la tarjeta nunca toca nuestro servidor). */
export const digits = (s: string) => s.replace(/\D/g, '');

export function luhn(num: string) {
  const d = digits(num);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | null;
export function cardBrand(num: string): CardBrand {
  const d = digits(num);
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^3(0[0-5]|[68])/.test(d)) return 'diners';
  return null;
}
export const BRAND_LABEL: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', diners: 'Diners Club' };

export function formatCardNumber(v: string) {
  const d = digits(v).slice(0, 19);
  if (cardBrand(d) === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export type CardInput = { number: string; cvc: string; expMonth: string; expYear: string; holder: string };

export function validateCard(c: CardInput, now = new Date()): Record<string, string> {
  const e: Record<string, string> = {};
  if (!luhn(c.number)) e['card.number'] = 'Revisa el número de la tarjeta';
  const amex = cardBrand(c.number) === 'amex';
  if (!new RegExp(amex ? '^\\d{4}$' : '^\\d{3,4}$').test(c.cvc)) e['card.cvc'] = amex ? 'El CVC tiene 4 dígitos' : 'El CVC tiene 3 dígitos';
  const m = Number(c.expMonth);
  const y = Number(c.expYear.length === 2 ? `20${c.expYear}` : c.expYear);
  if (!m || m < 1 || m > 12) e['card.expMonth'] = 'Mes inválido';
  else if (!y || y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1) || y > now.getFullYear() + 20) e['card.expYear'] = 'La tarjeta está vencida o la fecha no es válida';
  if (c.holder.trim().length < 5) e['card.holder'] = 'Escribe el nombre como aparece en la tarjeta';
  return e;
}

export type Acceptance = { publicKey: string; acceptanceToken: string; termsUrl: string; personalAuthToken: string | null; personalDataUrl: string | null; env: 'sandbox' | 'production' };

/** Tokeniza la tarjeta directamente con Wompi usando la llave pública. */
export async function tokenizeCard(acc: Acceptance, c: CardInput): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://${acc.env === 'production' ? 'production' : 'sandbox'}.wompi.co/v1/tokens/cards`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${acc.publicKey}` },
      body: JSON.stringify({
        number: digits(c.number),
        cvc: c.cvc,
        exp_month: c.expMonth.padStart(2, '0'),
        exp_year: c.expYear.slice(-2),
        card_holder: c.holder.trim(),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }; error?: { reason?: string; messages?: Record<string, string[]> } };
    if (!res.ok || !data.data?.id) {
      const msg = data.error?.reason ?? (data.error?.messages ? Object.values(data.error.messages).flat().join(', ') : null);
      return { ok: false, error: msg ? `Wompi: ${msg}` : 'No pudimos validar la tarjeta. Revisa los datos.' };
    }
    return { ok: true, token: data.data.id };
  } catch {
    return { ok: false, error: 'No pudimos conectar con Wompi. Revisa tu conexión.' };
  }
}
