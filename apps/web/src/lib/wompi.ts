import 'server-only';
/**
 * Wompi (Bancolombia) — https://docs.wompi.co
 *  - Web Checkout / Widget con firma de integridad (SHA256(reference+amount+currency+secret))
 *  - Verificación de eventos (SHA256 de las propiedades listadas + timestamp + events secret)
 *  - Fuentes de pago con tarjeta tokenizada para cobros recurrentes de suscripciones
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { env, isWompiConfigured } from '@/lib/env';

export const wompiApiBase = () => (env.wompi.env === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1');

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function integritySignature(reference: string, amountInCents: number, currency = 'COP', expirationTime?: string) {
  return sha256(`${reference}${amountInCents}${currency}${expirationTime ?? ''}${env.wompi.integritySecret}`);
}

export function checkoutData(reference: string, amountCop: number, redirectPath: string, customer?: { email: string; fullName: string; phone?: string | null }) {
  if (!isWompiConfigured()) return null;
  const amountInCents = Math.round(amountCop * 100);
  const redirectUrl = `${env.siteUrl}${redirectPath}`;
  const signatureIntegrity = integritySignature(reference, amountInCents);
  const params = new URLSearchParams({
    'public-key': env.wompi.publicKey!,
    currency: 'COP',
    'amount-in-cents': String(amountInCents),
    reference,
    'signature:integrity': signatureIntegrity,
    'redirect-url': redirectUrl,
  });
  if (customer) {
    params.set('customer-data:email', customer.email);
    params.set('customer-data:full-name', customer.fullName);
    if (customer.phone) {
      params.set('customer-data:phone-number', customer.phone.replace(/\D/g, '').slice(-10));
      params.set('customer-data:phone-number-prefix', '+57');
    }
  }
  return {
    publicKey: env.wompi.publicKey!,
    currency: 'COP' as const,
    amountInCents,
    reference,
    signatureIntegrity,
    redirectUrl,
    checkoutUrl: `https://checkout.wompi.co/p/?${params.toString()}`,
  };
}

export type WompiEvent = {
  event: string;
  data: { transaction: WompiTransaction };
  environment: string;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  sent_at: string;
};

export type WompiTransaction = {
  id: string;
  amount_in_cents: number;
  reference: string;
  customer_email: string;
  currency: string;
  payment_method_type: string;
  payment_method?: { type?: string; extra?: { brand?: string; last_four?: string } };
  status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING';
  status_message?: string | null;
  payment_source_id?: number | null;
  created_at?: string;
  finalized_at?: string | null;
};

/** Verifica el checksum del evento según la documentación de Wompi. */
export function verifyEventSignature(evt: WompiEvent): boolean {
  if (!env.wompi.eventsSecret || !evt?.signature?.properties) return false;
  const values = evt.signature.properties.map((path) =>
    path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), evt.data),
  );
  const expected = sha256(values.map((x) => String(x ?? '')).join('') + String(evt.timestamp) + env.wompi.eventsSecret);
  const got = String(evt.signature.checksum ?? '').toLowerCase();
  return expected.length === got.length && timingSafeEqual(Buffer.from(expected), Buffer.from(got));
}

async function wompiFetch<T>(path: string, init: RequestInit & { auth?: 'public' | 'private' } = {}): Promise<T> {
  const key = init.auth === 'public' ? env.wompi.publicKey : env.wompi.privateKey;
  const res = await fetch(`${wompiApiBase()}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const data = (await res.json().catch(() => ({}))) as { data?: T; error?: { type?: string; reason?: string; messages?: Record<string, string[]> } };
  if (!res.ok || !data.data) {
    const msg = data.error?.reason ?? (data.error?.messages ? Object.values(data.error.messages).flat().join(', ') : `Wompi respondió ${res.status}`);
    throw new Error(msg);
  }
  return data.data;
}

export const getTransaction = (id: string) => wompiFetch<WompiTransaction>(`/transactions/${encodeURIComponent(id)}`, { auth: 'public' });

/** Tokens de aceptación (términos y tratamiento de datos) del comercio. */
export async function getAcceptanceTokens() {
  const m = await wompiFetch<{
    presigned_acceptance: { acceptance_token: string; permalink: string };
    presigned_personal_data_auth?: { acceptance_token: string; permalink: string };
  }>(`/merchants/${env.wompi.publicKey}`, { auth: 'public' });
  return {
    acceptanceToken: m.presigned_acceptance.acceptance_token,
    termsUrl: m.presigned_acceptance.permalink,
    personalAuthToken: m.presigned_personal_data_auth?.acceptance_token ?? null,
    personalDataUrl: m.presigned_personal_data_auth?.permalink ?? null,
  };
}

/** Crea una fuente de pago reutilizable a partir de un token de tarjeta. */
export async function createPaymentSource(input: { cardToken: string; email: string; acceptanceToken: string; personalAuthToken?: string | null }) {
  return wompiFetch<{ id: number; status: string; public_data?: { bin?: string; last_four?: string; brand?: string; exp_month?: string; exp_year?: string } }>('/payment_sources', {
    method: 'POST',
    body: JSON.stringify({
      type: 'CARD',
      token: input.cardToken,
      customer_email: input.email,
      acceptance_token: input.acceptanceToken,
      ...(input.personalAuthToken ? { accept_personal_auth: input.personalAuthToken } : {}),
    }),
  });
}

/** Cobro con una fuente de pago guardada (renovaciones de suscripción). */
export async function chargePaymentSource(input: { paymentSourceId: string; amountCop: number; reference: string; email: string }) {
  const amountInCents = Math.round(input.amountCop * 100);
  return wompiFetch<WompiTransaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      amount_in_cents: amountInCents,
      currency: 'COP',
      signature: integritySignature(input.reference, amountInCents),
      customer_email: input.email,
      reference: input.reference,
      payment_source_id: Number(input.paymentSourceId),
      payment_method: { installments: 1 },
      recurrent: true,
    }),
  });
}

/** Anula una fuente de pago (al cancelar la suscripción, la tarjeta deja de poder cobrarse). */
export async function voidPaymentSource(id: string) {
  return wompiFetch<{ id: number; status: string }>(`/payment_sources/${encodeURIComponent(id)}/void`, { method: 'PUT' });
}

/** Busca la transacción más reciente de una referencia (conciliación si el webhook no llegó). */
export async function findTransactionByReference(reference: string) {
  const list = await wompiFetch<WompiTransaction[]>(`/transactions?reference=${encodeURIComponent(reference)}`);
  return list.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0] ?? null;
}
