import 'server-only';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { getDb, pingDb, t } from '@/lib/db';
import { env, isAiConfigured, isDbConfigured, isEmailConfigured, isFirebaseAdminConfigured, isStorageConfigured, isWompiConfigured } from '@/lib/env';

export type EventSource = 'wompi' | 'push' | 'email' | 'ai' | 'cron' | 'gateway' | 'auth' | 'system' | 'storage';

/** Registra un evento de integración. Nunca lanza (el monitoreo no debe romper el flujo). */
export async function logEvent(
  source: EventSource,
  event: string,
  status: 'ok' | 'error' | 'ignored' = 'ok',
  extra: { message?: string; externalId?: string; payload?: unknown; durationMs?: number } = {},
) {
  if (status === 'error') console.error(`[${source}] ${event}: ${extra.message ?? ''}`);
  if (!isDbConfigured()) return;
  try {
    await getDb()
      .insert(t.integrationEvents)
      .values({
        source,
        event,
        status,
        message: extra.message?.slice(0, 1000) ?? null,
        externalId: extra.externalId ?? null,
        durationMs: extra.durationMs ?? null,
        payload: extra.payload ?? null,
      });
  } catch (e) {
    console.error('[monitor] no se pudo registrar el evento', e);
  }
}

export async function audit(userId: string | null, action: string, entity: string, entityId?: string | null, meta?: unknown) {
  if (!isDbConfigured() || userId === 'demo-admin') return;
  try {
    await getDb().insert(t.auditLog).values({ userId, action, entity, entityId: entityId ?? null, meta: meta ?? null });
  } catch {
    /* ignore */
  }
}

export type HealthCheck = { key: string; label: string; status: 'ok' | 'warn' | 'error' | 'off'; detail: string; ms?: number };

async function timed<T>(fn: () => Promise<T>) {
  const t0 = Date.now();
  const r = await fn();
  return { r, ms: Date.now() - t0 };
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  // Base de datos (cPanel)
  if (!isDbConfigured()) checks.push({ key: 'db', label: 'Base de datos (cPanel)', status: 'off', detail: 'Sin configurar: el sitio está en modo demo' });
  else {
    const p = await pingDb();
    checks.push({
      key: 'db',
      label: `Base de datos (${process.env.DB_DRIVER === 'mysql' ? 'MySQL directo' : 'pasarela cPanel'})`,
      status: !p.ok ? 'error' : p.ms > 800 ? 'warn' : 'ok',
      detail: p.ok ? `MySQL ${p.version ?? ''} · ${p.ms} ms` : (p.error ?? 'Sin respuesta'),
      ms: p.ms,
    });
  }
  // Almacenamiento
  if (!isStorageConfigured()) checks.push({ key: 'storage', label: 'Almacenamiento de medios', status: 'off', detail: 'Sin configurar (MEDIA_GATEWAY_URL / DB_GATEWAY_SECRET)' });
  else {
    try {
      const { r, ms } = await timed(() => fetch(`${env.gatewayUrl}/health.php`, { cache: 'no-store', signal: AbortSignal.timeout(6000) }));
      checks.push({ key: 'storage', label: 'Pasarela y medios (cPanel)', status: r.ok ? (ms > 1200 ? 'warn' : 'ok') : 'error', detail: r.ok ? `${new URL(env.mediaUrl).host} · ${ms} ms` : `HTTP ${r.status}`, ms });
    } catch (e) {
      checks.push({ key: 'storage', label: 'Pasarela y medios (cPanel)', status: 'error', detail: e instanceof Error ? e.message : 'Sin respuesta' });
    }
  }
  checks.push({
    key: 'auth',
    label: 'Firebase Auth',
    status: isFirebaseAdminConfigured() ? 'ok' : 'off',
    detail: isFirebaseAdminConfigured() ? `Proyecto ${env.firebaseAdmin.projectId ?? '(service account)'}` : 'Sin credenciales de Admin SDK',
  });
  checks.push({
    key: 'wompi',
    label: 'Pagos Wompi',
    status: isWompiConfigured() ? (env.wompi.env === 'production' ? 'ok' : 'warn') : 'off',
    detail: isWompiConfigured() ? (env.wompi.env === 'production' ? 'Producción' : 'Sandbox (pruebas)') : 'Sin llaves',
  });
  checks.push({ key: 'email', label: 'Correo SMTP', status: isEmailConfigured() ? 'ok' : 'off', detail: isEmailConfigured() ? `${env.smtp.host}:${env.smtp.port}` : 'Sin SMTP: no se envían correos' });
  checks.push({ key: 'ai', label: 'Motor de IA', status: isAiConfigured() ? 'ok' : 'warn', detail: isAiConfigured() ? env.ai.model : 'Sin clave: respuestas por reglas' });
  checks.push({ key: 'push', label: 'Push (Expo)', status: 'ok', detail: env.expoAccessToken ? 'Con token de acceso' : 'Sin token de acceso (opcional)' });

  if (isDbConfigured()) {
    try {
      const db = getDb();
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const [lastCron] = await db
        .select({ at: t.integrationEvents.createdAt, status: t.integrationEvents.status })
        .from(t.integrationEvents)
        .where(eq(t.integrationEvents.source, 'cron'))
        .orderBy(desc(t.integrationEvents.createdAt))
        .limit(1);
      const hours = lastCron ? (Date.now() - lastCron.at.getTime()) / 3600000 : null;
      checks.push({
        key: 'cron',
        label: 'Tareas programadas',
        status: hours === null ? 'warn' : hours > 26 ? 'error' : hours > 1.5 ? 'warn' : 'ok',
        detail: hours === null ? 'Aún no ha corrido' : `Última ejecución hace ${hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} h`}`,
      });
      const [errs] = await db
        .select({ n: count() })
        .from(t.integrationEvents)
        .where(and(eq(t.integrationEvents.status, 'error'), gte(t.integrationEvents.createdAt, since)));
      checks.push({ key: 'errors', label: 'Errores de integración (24 h)', status: errs.n === 0 ? 'ok' : errs.n < 10 ? 'warn' : 'error', detail: `${errs.n} errores` });
    } catch (e) {
      checks.push({ key: 'cron', label: 'Tareas programadas', status: 'error', detail: e instanceof Error ? e.message : 'Error' });
    }
  }
  return checks;
}
