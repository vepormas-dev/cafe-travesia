import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { formatDateTime } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { runHealthChecks } from '@/lib/monitor';
import { eventStats24h, listEvents } from '@/lib/admin/data/ops';
import { EVENT_STATUS_TONE, HEALTH_TONE } from '@/lib/admin/labels';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Badge, Empty, PageHeader, PageSkeleton, Panel, Skeleton, Stat, Table, btn, relTime, td, th, trHover } from '@/components/admin/ui';
import { SearchBox, SelectFilter } from '@/components/admin/client-ui';
import { OkErrorBars } from '@/components/admin/charts/bars';
import { RefreshButton } from '@/components/admin/refresh-button';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Monitor' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} kpis={4} />}>
      <Monitor searchParams={searchParams} />
    </Suspense>
  );
}

const SOURCES = ['wompi', 'push', 'email', 'ai', 'cron', 'gateway', 'auth', 'storage', 'system'];

async function Monitor({ searchParams }: { searchParams: SPromise }) {
  const { isAdmin } = await staffPage('/admin/monitor');
  const sp = flat(await searchParams);
  const [stats, events] = await Promise.all([eventStats24h(), listEvents({ source: sp.source, status: sp.status, q: sp.q })]);
  const errors24 = stats.hours.reduce((s, h) => s + h.error, 0);
  const ok24 = stats.hours.reduce((s, h) => s + h.ok, 0);
  return (
    <>
      <PageHeader
        eyebrow="Resumen"
        title="Monitor del ecosistema"
        description="Salud de integraciones, eventos y webhooks en tiempo real."
        actions={
          <>
            <RefreshButton />
            {isAdmin ? <Link href="/admin/integraciones" className={btn.secondary}>Guía de configuración</Link> : null}
          </>
        }
      />
      <Suspense fallback={<div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}>
        <Health />
      </Suspense>
      <div className="mb-5 grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8" title="Eventos de integración · últimas 24 h" description={`${ok24} correctos · ${errors24} errores (por hora, Bogotá)`}>
          <OkErrorBars data={stats.hours} height={180} />
        </Panel>
        <Panel className="xl:col-span-4" title="Webhooks Wompi · 24 h">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Aplicados" value={stats.wompi.ok} />
            <Stat label="Errores" value={<span className={stats.wompi.error ? 'text-cereza' : ''}>{stats.wompi.error}</span>} />
            <Stat label="Ignorados" value={stats.wompi.ignored} hint="duplicados" />
          </div>
          <ul className="mt-4 space-y-1.5 border-t border-noche/[0.06] pt-3 text-xs">
            {stats.bySource.map((s) => (
              <li key={s.source} className="flex items-center gap-2">
                <code className="w-16 text-noche/80">{s.source}</code>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-noche/5">
                  <div className="h-full bg-noche/70" style={{ width: `${Math.min(100, ((s.ok + s.error) / Math.max(1, ...stats.bySource.map((x) => x.ok + x.error))) * 100)}%` }} />
                </div>
                <span className="w-16 text-right text-gris tabular-nums">{s.ok}{s.error ? <span className="text-cereza"> · {s.error}</span> : null}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Feed de eventos" description="integration_events · más recientes primero">
        <div className="mb-4 flex flex-wrap gap-2">
          <SearchBox placeholder="Evento, mensaje o id externo…" />
          <SelectFilter param="source" label="Todas las fuentes" options={SOURCES.map((s) => ({ value: s, label: s }))} />
          <SelectFilter param="status" label="Todos los estados" options={[{ value: 'ok', label: 'ok' }, { value: 'error', label: 'error' }, { value: 'ignored', label: 'ignorado' }]} />
        </div>
        {events.length ? (
          <Table>
            <thead>
              <tr>
                <th className={th}>Cuándo</th>
                <th className={th}>Fuente</th>
                <th className={th}>Evento</th>
                <th className={th}>Estado</th>
                <th className={th}>Detalle</th>
                <th className={cn(th, 'text-right')}>Duración</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className={trHover}>
                  <td className={cn(td, 'whitespace-nowrap text-xs text-gris')} title={formatDateTime(e.createdAt)}>{relTime(e.createdAt)}</td>
                  <td className={td}><code className="rounded bg-noche/5 px-1.5 py-0.5 text-xs">{e.source}</code></td>
                  <td className={cn(td, 'font-medium text-noche')}>{e.event}</td>
                  <td className={td}><Badge tone={EVENT_STATUS_TONE[e.status]} dot>{e.status}</Badge></td>
                  <td className={cn(td, 'max-w-md text-xs text-gris')}>
                    <span className="line-clamp-2">{e.message || '—'}</span>
                    {e.externalId ? <code className="text-[0.65rem]">{e.externalId}</code> : null}
                  </td>
                  <td className={cn(td, 'text-right text-xs text-gris tabular-nums')}>{e.durationMs != null ? `${e.durationMs} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty title="Sin eventos con estos filtros" />
        )}
      </Panel>
    </>
  );
}

async function Health() {
  const checks = await runHealthChecks();
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {checks.map((h) => (
        <div key={h.key} className={cn('rounded-xl border bg-white p-4', h.status === 'error' ? 'border-rose-200' : h.status === 'warn' ? 'border-amber-200' : 'border-noche/[0.08]')}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full ring-4', h.status === 'ok' ? 'bg-emerald-500 ring-emerald-100' : h.status === 'warn' ? 'bg-amber-400 ring-amber-100' : h.status === 'error' ? 'bg-cereza ring-rose-100' : 'bg-noche/25 ring-noche/5')} />
              <span className="text-sm font-semibold text-noche">{h.label}</span>
            </span>
            <Badge tone={HEALTH_TONE[h.status]}>{h.status === 'ok' ? 'OK' : h.status === 'warn' ? 'Alerta' : h.status === 'error' ? 'Error' : 'Apagado'}</Badge>
          </div>
          <p className="mt-2 text-xs text-gris">{h.detail}</p>
          {h.ms != null ? (
            <div className="mt-2 flex items-center gap-2 text-[0.68rem] text-gris">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-noche/5">
                <div className={cn('h-full', h.ms > 800 ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${Math.min(100, (h.ms / 1500) * 100)}%` }} />
              </div>
              {h.ms} ms
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
