import { Suspense } from 'react';
import type { Metadata } from 'next';
import { formatNumber } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { getAnalytics } from '@/lib/admin/metrics';
import { parseRange, shortDay, shortMonth } from '@/lib/admin/range';
import { CHART } from '@/lib/admin/labels';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Delta, PageHeader, Panel, Skeleton, Stat } from '@/components/admin/ui';
import { Funnel } from '@/components/admin/dashboard/funnel';
import { StackedAreas, AreaTrend } from '@/components/admin/charts/area';
import { BarList } from '@/components/admin/charts/bars';
import { Donut } from '@/components/admin/charts/donut';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Analítica' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-72" /><div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>}>
      <Analytics searchParams={searchParams} />
    </Suspense>
  );
}

async function Analytics({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/analitica');
  const sp = flat(await searchParams);
  const a = await getAnalytics(parseRange(sp.r));
  const f = a.funnel;
  const fp = a.funnelPrev;
  const conv = f.visits ? (f.paid / f.visits) * 100 : 0;
  const convPrev = fp.visits ? (fp.paid / fp.visits) * 100 : 0;
  const views = a.traffic.daily.reduce((s, d) => s + d.views, 0);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Resumen" title="Analítica" description={`${a.range.label} (${shortDay(a.range.fromDay)} – ${shortDay(a.range.toDay)}) · tráfico propio sin cookies de terceros (page_views), embudo y recompra`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><Stat label="Visitas" value={formatNumber(f.visits)} hint={<Delta value={f.visits} prev={fp.visits} />} /></Panel>
        <Panel><Stat label="Conversión visita a pago" value={`${conv.toFixed(2).replace('.', ',')} %`} hint={<Delta value={conv} prev={convPrev} />} /></Panel>
        <Panel><Stat label="Tasa de recompra" value={`${a.repeatRate.toString().replace('.', ',')} %`} hint="clientes con 2+ pedidos (sin suscripciones)" /></Panel>
        <Panel><Stat label="Pedidos por cliente" value={a.avgOrdersPerCustomer.toString().replace('.', ',')} hint="promedio histórico" /></Panel>
      </div>
      <Panel title="Tráfico por fuente" description={`${formatNumber(views)} vistas de página en el periodo`}>
        <StackedAreas data={a.traffic.bySource} keys={a.traffic.sourceKeys} height={300} />
      </Panel>
      <Panel title="Embudo de conversión" description="Comparado con el periodo anterior">
        <Funnel data={f} prev={fp} />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-5" title="Páginas más vistas">
          <BarList fmt="num" color={CHART.ambar} items={a.traffic.topPages.map((p) => ({ name: p.path, value: p.views }))} />
        </Panel>
        <Panel className="xl:col-span-4" title="Fuentes">
          <Donut data={a.traffic.sources} centerLabel="Visitas" height={170} />
        </Panel>
        <Panel className="xl:col-span-3" title="Dispositivos">
          <Donut data={a.traffic.devices} centerLabel="Visitas" height={170} colors={[CHART.ambar, CHART.noche, CHART.montana]} />
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-7" title="Cohortes de recompra" description="% de clientes de cada mes de primera compra que volvieron a comprar en los meses siguientes (tienda y cursos)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr className="text-gris">
                  <th className="text-left font-medium">Cohorte</th>
                  <th className="text-right font-medium">Clientes</th>
                  {a.cohorts[0]?.values.map((_, i) => (
                    <th key={i} className="font-medium">{i === 0 ? 'Mes 0' : `+${i}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.cohorts.map((c) => (
                  <tr key={c.cohort}>
                    <td className="pr-2 font-medium whitespace-nowrap text-noche">{shortMonth(c.cohort)}</td>
                    <td className="pr-2 text-right text-gris tabular-nums">{c.size}</td>
                    {c.values.map((v, i) => (
                      <td key={i} className={cn('h-9 rounded-md text-center font-semibold tabular-nums', v == null ? 'bg-transparent' : i === 0 ? 'bg-noche text-crema' : '')} style={v != null && i > 0 ? { background: `rgba(235,154,55,${Math.min(0.9, 0.08 + v / 40)})`, color: v > 18 ? '#111A31' : '#5b3a26' } : undefined}>
                        {v == null ? '' : `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel className="xl:col-span-5" title="Vistas diarias">
          <AreaTrend data={a.traffic.daily} xKey="day" yKey="views" name="Vistas" fmt="num" color={CHART.noche} height={250} />
        </Panel>
      </div>
    </div>
  );
}
