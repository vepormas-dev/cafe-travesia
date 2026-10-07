import { NextResponse } from 'next/server';
import { lt } from 'drizzle-orm';
import { env, isDbConfigured, isWompiConfigured } from '@/lib/env';
import { getDb, t } from '@/lib/db';
import { logEvent } from '@/lib/monitor';
import { runSubscriptionBilling } from '@/lib/commerce/subscriptions';
import { reconcilePendingOrders } from '@/lib/commerce/payments';
import { sendDueCampaigns, sendLessonReminders } from '@/lib/push';
import { recoverAbandonedCarts } from '@/lib/commerce/carts';

export const maxDuration = 60;

/**
 * Tareas programadas. Se invoca con Authorization: Bearer <CRON_SECRET>:
 *  - Vercel Cron (vercel.json) → 1 vez al día en plan Hobby (cobros de suscripción)
 *  - Cron de cPanel (curl cada 15 min) → conciliación de pagos y campañas push programadas
 * ?tasks=billing,reconcile,push,reminders,carts,cleanup  (por defecto: todas)
 */
async function run(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isDbConfigured()) return NextResponse.json({ error: 'Sin base de datos' }, { status: 503 });
  const tasks = new Set((url.searchParams.get('tasks') ?? 'billing,reconcile,push,reminders,carts,cleanup').split(','));
  const results: Record<string, unknown> = {};
  const t0 = Date.now();
  const step = async (name: string, fn: () => Promise<unknown>) => {
    if (!tasks.has(name)) return;
    try {
      results[name] = await fn();
    } catch (e) {
      results[name] = { error: e instanceof Error ? e.message : String(e) };
      await logEvent('cron', name, 'error', { message: String(results[name] && (results[name] as { error: string }).error) });
    }
  };
  if (isWompiConfigured()) {
    await step('reconcile', reconcilePendingOrders);
    await step('billing', runSubscriptionBilling);
  }
  await step('push', sendDueCampaigns);
  // Tareas diarias: solo en la ejecución de la mañana (hora Bogotá 8-9) o si se piden explícitamente
  const hourBogota = (new Date().getUTCHours() + 19) % 24;
  const daily = url.searchParams.has('tasks') || hourBogota === 8 || url.searchParams.get('daily') === '1';
  if (daily) {
    await step('reminders', sendLessonReminders);
    await step('carts', recoverAbandonedCarts);
    await step('cleanup', async () => {
      const db = getDb();
      await db.delete(t.rateLimits).where(lt(t.rateLimits.resetAt, new Date()));
      await db.delete(t.integrationEvents).where(lt(t.integrationEvents.createdAt, new Date(Date.now() - 90 * 86400000)));
      return 'ok';
    });
  }
  await logEvent('cron', 'run', 'ok', { message: Object.keys(results).join(', '), durationMs: Date.now() - t0, payload: results });
  return NextResponse.json({ ok: true, results, ms: Date.now() - t0 });
}

export const GET = run;
export const POST = run;
