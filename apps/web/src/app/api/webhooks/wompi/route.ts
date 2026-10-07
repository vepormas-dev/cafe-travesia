import { NextResponse } from 'next/server';
import { verifyEventSignature, type WompiEvent } from '@/lib/wompi';
import { applyWompiTransaction } from '@/lib/commerce/payments';
import { logEvent } from '@/lib/monitor';
import { isDbConfigured, env } from '@/lib/env';

/**
 * Webhook de eventos de Wompi. Configúralo en el dashboard de comercios:
 *   https://<dominio>/api/webhooks/wompi   (uno para Sandbox y otro para Producción)
 * Responde 200 solo si el evento quedó aplicado; Wompi reintenta a los 30 min, 3 h y 24 h.
 */
export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  let evt: WompiEvent;
  try {
    evt = (await req.json()) as WompiEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!verifyEventSignature(evt)) {
    await logEvent('wompi', 'webhook.signature', 'error', { message: `Firma inválida (${evt?.event ?? '?'})` });
    return NextResponse.json({ ok: false, error: 'firma inválida' }, { status: 401 });
  }
  const expectedEnv = env.wompi.env === 'production' ? 'prod' : 'test';
  if (evt.environment && evt.environment !== expectedEnv) {
    await logEvent('wompi', 'webhook.environment', 'ignored', { message: `Evento de ${evt.environment} en ambiente ${expectedEnv}` });
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (evt.event !== 'transaction.updated' || !evt.data?.transaction) {
    await logEvent('wompi', `webhook.${evt.event}`, 'ignored');
    return NextResponse.json({ ok: true, ignored: true });
  }
  const t0 = Date.now();
  try {
    const r = await applyWompiTransaction(evt.data.transaction, 'webhook', true);
    await logEvent('wompi', 'webhook', 'ok', { externalId: evt.data.transaction.id, message: `${evt.data.transaction.reference} → ${evt.data.transaction.status}`, durationMs: Date.now() - t0, payload: r });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logEvent('wompi', 'webhook', 'error', { externalId: evt.data.transaction.id, message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false }, { status: 500 }); // Wompi reintentará
  }
}
