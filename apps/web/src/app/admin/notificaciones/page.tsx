import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PUSH_AUDIENCES, formatDateTime } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { getPushOverview } from '@/lib/admin/data/ops';
import { listCourses } from '@/lib/admin/data/academy';
import { CAMPAIGN_STATUS_LABEL, CAMPAIGN_STATUS_TONE, CHART } from '@/lib/admin/labels';
import { Badge, DemoBanner, Empty, PageHeader, PageSkeleton, Panel, Stat, Table, td, th, trHover, relTime } from '@/components/admin/ui';
import { PushComposer } from '@/components/admin/marketing/push-composer';
import { CancelCampaignButton } from '@/components/admin/marketing/campaign-actions';
import { Donut } from '@/components/admin/charts/donut';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Notificaciones push' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={10} kpis={4} />}>
      <Push />
    </Suspense>
  );
}

const audienceLabel = (a: string) => PUSH_AUDIENCES.find((x) => x.value === a)?.label ?? (a.startsWith('course:') ? 'Estudiantes de un curso' : a.startsWith('user:') ? 'Un usuario' : a);

async function Push() {
  const { demo } = await staffPage('/admin/notificaciones');
  const [o, courses] = await Promise.all([getPushOverview(), listCourses()]);
  const sent = o.campaigns.filter((c) => c.status === 'sent');
  const totalSent = sent.reduce((s, c) => s + c.sentCount, 0);
  const totalErr = sent.reduce((s, c) => s + c.errorCount, 0);
  const opens = sent.reduce((s, c) => s + c.openCount, 0);
  return (
    <>
      <PageHeader eyebrow="Marketing" title="Notificaciones push" description="Campañas segmentadas a la app iOS/Android (Expo, APNs y FCM). También llegan a la bandeja de notificaciones de la cuenta." />
      {demo ? <DemoBanner>Puedes componer y ver la vista previa; el envío real requiere la base de datos.</DemoBanner> : null}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><Stat label="Dispositivos activos" value={(o.devices.ios + o.devices.android).toLocaleString('es-CO')} hint={`${o.devices.withUser.toLocaleString('es-CO')} con sesión · ${o.devices.disabled} deshabilitados`} /></Panel>
        <Panel><Stat label="Enviadas (campañas)" value={totalSent.toLocaleString('es-CO')} hint={`${sent.length} campañas`} /></Panel>
        <Panel><Stat label="Tasa de error" value={`${totalSent ? ((totalErr / (totalSent + totalErr)) * 100).toFixed(1).replace('.', ',') : '0'} %`} hint={`${totalErr} errores`} /></Panel>
        <Panel><Stat label="Aperturas" value={`${totalSent ? Math.round((opens / totalSent) * 100) : 0} %`} hint={`${opens.toLocaleString('es-CO')} toques`} /></Panel>
      </div>
      <PushComposer courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
      <div className="mt-5 grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8" title="Historial de campañas" bodyClassName="pb-2">
          {o.campaigns.length ? (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Campaña</th>
                  <th className={th}>Audiencia</th>
                  <th className={th}>Estado</th>
                  <th className={cn(th, 'text-right')}>Enviadas</th>
                  <th className={cn(th, 'text-right')}>Errores</th>
                  <th className={cn(th, 'text-right')}>Aperturas</th>
                  <th className={th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {o.campaigns.map((c) => (
                  <tr key={c.id} className={trHover}>
                    <td className={td}>
                      <p className="font-medium text-noche">{c.title}</p>
                      <p className="max-w-xs truncate text-xs text-gris">{c.body}</p>
                    </td>
                    <td className={cn(td, 'text-xs text-gris')}>{audienceLabel(c.audience)} · {c.platform === 'all' ? 'iOS+Android' : c.platform}</td>
                    <td className={td}>
                      <Badge tone={CAMPAIGN_STATUS_TONE[c.status]} dot>{CAMPAIGN_STATUS_LABEL[c.status]}</Badge>
                    </td>
                    <td className={cn(td, 'text-right tabular-nums')}>{c.sentCount}/{c.targetCount}</td>
                    <td className={cn(td, 'text-right tabular-nums', c.errorCount ? 'text-cereza' : 'text-gris')}>{c.errorCount}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{c.sentCount ? `${Math.round((c.openCount / c.sentCount) * 100)} %` : '—'}</td>
                    <td className={cn(td, 'text-xs whitespace-nowrap text-gris')}>
                      {c.status === 'scheduled' ? <>Programada {formatDateTime(c.scheduledAt)} <CancelCampaignButton id={c.id} /></> : formatDateTime(c.sentAt ?? c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty title="Aún no hay campañas" text="Envía la primera desde el compositor." />
          )}
        </Panel>
        <div className="space-y-4 xl:col-span-4">
          <Panel title="Dispositivos por plataforma">
            <Donut data={[{ name: 'Android', value: o.devices.android }, { name: 'iOS', value: o.devices.ios }, ...(o.devices.web ? [{ name: 'Web', value: o.devices.web }] : [])]} colors={[CHART.montana, CHART.noche, CHART.ambar]} centerLabel="Dispositivos" height={160} />
          </Panel>
          <Panel title="Automáticas (7 d)" description="Pagos, envíos, suscripción, recordatorios">
            <ul className="space-y-2 text-sm">
              {o.byTrigger.map((b) => (
                <li key={b.trigger} className="flex items-center justify-between gap-2">
                  <code className="text-xs text-noche/80">{b.trigger}</code>
                  <span className="text-xs text-gris tabular-nums">
                    <strong className="text-noche">{b.ok}</strong> ok · <span className={b.error ? 'text-cereza' : ''}>{b.error} error</span>
                  </span>
                </li>
              ))}
              {!o.byTrigger.length ? <li className="text-xs text-gris">Sin entregas en 7 días.</li> : null}
            </ul>
          </Panel>
          <Panel title="Entregas recientes" bodyClassName="max-h-80 overflow-y-auto">
            <ul className="space-y-2">
              {o.deliveries.slice(0, 20).map((d) => (
                <li key={d.id} className="flex items-start gap-2 text-xs">
                  <span className={cn('mt-1 size-2 shrink-0 rounded-full', d.status === 'ok' ? 'bg-emerald-500' : 'bg-cereza')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-noche">{d.title}</span>
                    <span className="block text-gris">{d.trigger} · {d.platform}{d.error ? ` · ${d.error}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-gris">{relTime(d.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
