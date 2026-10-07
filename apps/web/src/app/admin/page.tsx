import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, ArrowRight, BadgeDollarSign, Boxes, GraduationCap, MessageCircle, MousePointerClick, Package, Repeat, ShoppingBag, Smartphone, Sparkles, UserPlus, Users } from 'lucide-react';
import { formatCOP, formatNumber } from '@travesia/shared';
import { aiEnabled } from '@/lib/ai';
import { staffPage } from '@/lib/admin/guard';
import { getDashboard, getOps } from '@/lib/admin/metrics';
import { parseRange, shortDay } from '@/lib/admin/range';
import { CHART, HEALTH_TONE } from '@/lib/admin/labels';
import type { DashboardData } from '@/lib/admin/types';
import { Badge, Panel, Skeleton, btn, relTime } from '@/components/admin/ui';
import { KpiCard } from '@/components/admin/dashboard/kpi-card';
import { Funnel } from '@/components/admin/dashboard/funnel';
import { InsightsCard } from '@/components/admin/dashboard/insights-card';
import { RevenueChart } from '@/components/admin/charts/revenue-chart';
import { BarList, CategoryBars, DivergingBars, WeeklyBars } from '@/components/admin/charts/bars';
import { Donut } from '@/components/admin/charts/donut';
import { Heatmap } from '@/components/admin/charts/heatmap';
import { AreaTrend } from '@/components/admin/charts/area';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Dashboard' };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function DashboardPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

function greeting(now: Date) {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }).format(now));
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

async function Dashboard({ searchParams }: { searchParams: SP }) {
  const [{ user }, sp] = await Promise.all([staffPage('/admin'), searchParams]);
  const key = parseRange(sp.r);
  const d = await getDashboard(key);
  const now = new Date();
  const first = (user.fullName ?? '').split(' ')[0] || 'equipo';
  const dayLabels = d.daily.map((x) => shortDay(x.day));
  const weekLabels = d.subs.mrrWeekly.map((x) => `Semana del ${shortDay(x.week)}`);
  return (
    <div className="space-y-6">
      {sp.error === 'solo-admin' ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
          <AlertTriangle className="size-4" /> Esa sección es solo para administradores.
        </div>
      ) : null}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-ambar-700 uppercase">
            {new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
          </p>
          <h1 className="mt-1 font-display text-3xl text-noche">
            {greeting(now)}, <span className="italic">{first}</span>
          </h1>
          <p className="mt-1 text-sm text-gris">
            {d.range.label} ({shortDay(d.range.fromDay)} – {shortDay(d.range.toDay)}) comparado con los {d.range.days} días anteriores · hora de Bogotá
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/analitica${key !== '30d' ? `?r=${key}` : ''}`} className={btn.secondary}>
            Analítica completa <ArrowRight className="size-4" />
          </Link>
          <Link href="/admin/pedidos?status=paid" className={btn.primary}>
            <ShoppingBag className="size-4" /> Preparar pedidos
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ingresos" kpi={d.kpis.revenue} icon={<BadgeDollarSign className="size-3.5" />} highlight sparkLabels={dayLabels} />
        <KpiCard label="Pedidos pagados" kpi={d.kpis.orders} format="num" icon={<ShoppingBag className="size-3.5" />} color={CHART.noche} sparkLabels={dayLabels} />
        <KpiCard label="Ticket promedio" kpi={d.kpis.aov} icon={<Package className="size-3.5" />} color={CHART.montana} sparkLabels={dayLabels} />
        <KpiCard label="MRR suscripciones" kpi={d.kpis.mrr} icon={<Repeat className="size-3.5" />} sparkLabels={weekLabels} hint={`${formatNumber(d.kpis.subscribers.value)} suscriptores activos`} />
        <KpiCard label="Suscriptores activos" kpi={d.kpis.subscribers} format="num" icon={<Users className="size-3.5" />} color={CHART.ambar700} sparkLabels={weekLabels} />
        <KpiCard label="Nuevos clientes" kpi={d.kpis.newCustomers} format="num" icon={<UserPlus className="size-3.5" />} color={CHART.noche600} sparkLabels={dayLabels} />
        <KpiCard label="Estudiantes activos" kpi={d.kpis.activeStudents} format="num" icon={<GraduationCap className="size-3.5" />} color={CHART.hoja} hint={`${d.academy.certificates.value} certificados emitidos`} />
        <KpiCard label="Tasa de conversión" kpi={d.kpis.conversion} format="pct" icon={<MousePointerClick className="size-3.5" />} color={CHART.cereza} sparkLabels={dayLabels} hint={`${formatNumber(d.funnel.visits)} visitas · ${formatNumber(d.funnel.paid)} pedidos`} />
      </div>

      {/* Operación de hoy */}
      <Suspense fallback={<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px] rounded-xl" />)}</div>}>
        <OpsStrip />
      </Suspense>

      {/* Ingresos + IA */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          title="Ingresos diarios"
          description="Pedidos pagados por fecha de pago · tienda, suscripciones y cursos apilados"
          actions={<span className="text-right"><span className="block text-lg font-semibold text-noche tabular-nums">{formatCOP(d.kpis.revenue.value)}</span><span className="block text-[0.7rem] text-gris">antes {formatCOP(d.kpis.revenue.prev)}</span></span>}
        >
          <RevenueChart data={d.daily} />
        </Panel>
        <div className="xl:col-span-4">
          <InsightsCard rangeKey={key} aiReady={aiEnabled()} />
        </div>
      </div>

      {/* Ventas */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <Panel className="xl:col-span-5" title="Ventas por categoría" description="Participación sobre las ventas del periodo">
          <CategoryBars data={d.categories} />
        </Panel>
        <Panel className="xl:col-span-3" title="Canal de compra" description="Pedidos pagados por canal">
          <Donut data={d.channels} centerLabel="Pedidos" colors={[CHART.noche, CHART.ambar, CHART.montana, CHART.noche400]} height={170} />
        </Panel>
        <Panel className="lg:col-span-2 xl:col-span-4" title="Top productos" description="Unidades e ingresos" actions={<Link href="/admin/productos" className="text-xs font-medium text-ambar-700 hover:underline">Catálogo</Link>}>
          <TopProducts items={d.topProducts} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-7" title="¿Cuándo compran?" description="Pedidos por día de la semana y hora (Bogotá)">
          <Heatmap data={d.heatmap} />
        </Panel>
        <Panel className="xl:col-span-5" title="Ventas por ciudad" description="Según dirección de envío">
          <BarList items={d.cities.map((c) => ({ name: c.city, hint: `${c.region} · ${c.orders} ped.`, value: c.revenue }))} />
        </Panel>
      </div>

      {/* Suscripciones */}
      <SectionTitle icon={<Repeat className="size-4" />} title="Suscripciones" href="/admin/suscripciones" />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <Panel className="xl:col-span-5" title="Evolución del MRR" description="Últimas 12 semanas · ingreso recurrente mensual normalizado">
          <AreaTrend data={d.subs.mrrWeekly} xKey="week" yKey="mrr" name="MRR" weekly color={CHART.ambar} />
        </Panel>
        <Panel className="xl:col-span-4" title="Altas vs. cancelaciones" description="Por semana">
          <DivergingBars data={d.subs.movements} />
        </Panel>
        <Panel className="lg:col-span-2 xl:col-span-3" title="Salud de suscripciones">
          <SubsHealth d={d} />
        </Panel>
      </div>

      {/* Academia */}
      <SectionTitle icon={<GraduationCap className="size-4" />} title="Academia" href="/admin/cursos" />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <Panel className="xl:col-span-4" title="Inscripciones por semana" description="Gratis, compra y suscripción">
          <WeeklyBars data={d.academy.enrollWeekly} name="Inscripciones" />
        </Panel>
        <Panel className="xl:col-span-5" title="Finalización por curso" description="Progreso promedio y estudiantes que terminaron">
          <ul className="space-y-3.5">
            {d.academy.completion.map((c) => (
              <li key={c.title}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-noche">{c.title}</span>
                  <span className="shrink-0 text-xs text-gris tabular-nums">
                    {c.completed}/{c.students} · <strong className="text-noche">{c.avgProgress}%</strong>
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-noche/[0.06]">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-montana to-hoja" style={{ width: `${c.avgProgress}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-noche/70" style={{ width: `${c.students ? (c.completed / c.students) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-3 text-[0.68rem] text-gris">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-noche/70" />Completaron</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-hoja" />Progreso promedio</span>
          </p>
        </Panel>
        <Panel className="lg:col-span-2 xl:col-span-3" title="Cursos más vistos" description="Lecciones con actividad en el periodo">
          <div className="mb-4 flex items-center justify-between rounded-lg bg-crema/70 px-3 py-2.5">
            <span className="text-xs text-gris">Certificados emitidos</span>
            <span className="text-lg font-semibold text-noche tabular-nums">{d.academy.certificates.value}</span>
          </div>
          <BarList stacked fmt="num" color={CHART.montana} items={d.academy.mostViewed.map((m) => ({ name: m.title, value: m.views }))} />
        </Panel>
      </div>

      {/* Embudo y tráfico */}
      <SectionTitle icon={<MousePointerClick className="size-4" />} title="Embudo y tráfico" href="/admin/analitica" />
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-7" title="Embudo de conversión" description="Visitas, carritos, pedidos creados y pagados">
          <Funnel data={d.funnel} />
        </Panel>
        <Panel className="xl:col-span-5" title="Páginas más vistas" description="Tráfico propio (page_views)">
          <BarList fmt="num" color={CHART.ambar} items={d.traffic.topPages.slice(0, 6).map((p) => ({ name: p.path, value: p.views }))} />
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <Panel className="xl:col-span-4" title="Fuentes de tráfico">
          <Donut data={d.traffic.sources} centerLabel="Visitas" height={170} />
        </Panel>
        <Panel className="xl:col-span-4" title="Dispositivos">
          <Donut data={d.traffic.devices} centerLabel="Visitas" height={170} colors={[CHART.ambar, CHART.noche, CHART.montana]} />
        </Panel>
        <Panel className="lg:col-span-2 xl:col-span-4" title="App y push" description="Dispositivos registrados y entregas 7 d" actions={<Link href="/admin/notificaciones" className="text-xs font-medium text-ambar-700 hover:underline">Enviar push</Link>}>
          <PushSummary d={d} />
        </Panel>
      </div>

      {/* Operación detallada */}
      <SectionTitle icon={<Boxes className="size-4" />} title="Operación" />
      <Suspense fallback={<div className="grid gap-4 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>}>
        <OpsDetail />
      </Suspense>
    </div>
  );
}

function SectionTitle({ icon, title, href }: { icon: React.ReactNode; title: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="grid size-7 place-items-center rounded-lg bg-noche text-ambar-300">{icon}</span>
      <h2 className="font-display text-xl text-noche">{title}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-noche/15 to-transparent" />
      {href ? (
        <Link href={href} className="text-xs font-medium text-gris hover:text-noche">
          Ver detalle
        </Link>
      ) : null}
    </div>
  );
}

function TopProducts({ items }: { items: DashboardData['topProducts'] }) {
  if (!items.length) return <p className="py-8 text-center text-xs text-gris">Sin ventas de productos en el periodo</p>;
  const max = Math.max(...items.map((i) => i.revenue));
  return (
    <ol className="space-y-3">
      {items.map((p, i) => (
        <li key={p.name} className="flex items-center gap-3">
          <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[0.68rem] font-bold', i === 0 ? 'bg-ambar text-noche' : 'bg-noche/[0.06] text-noche/70')}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium text-noche">{p.name}</span>
              <span className="shrink-0 text-sm font-semibold text-noche tabular-nums">{formatCOP(p.revenue)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-noche/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-noche to-noche-600" style={{ width: `${(p.revenue / max) * 100}%` }} />
              </div>
              <span className="w-14 shrink-0 text-right text-[0.68rem] text-gris tabular-nums">{formatNumber(p.units)} u.</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SubsHealth({ d }: { d: DashboardData }) {
  const totalPlans = d.subs.byPlan.reduce((s, p) => s + p.count, 0);
  const churnUp = d.subs.churnPct > d.subs.churnPrevPct;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-crema/70 p-3">
          <p className="text-[0.68rem] text-gris">Churn del periodo</p>
          <p className={cn('text-xl font-semibold tabular-nums', churnUp ? 'text-cereza' : 'text-montana')}>{d.subs.churnPct.toLocaleString('es-CO')} %</p>
          <p className="text-[0.65rem] text-gris">antes {d.subs.churnPrevPct.toLocaleString('es-CO')} %</p>
        </div>
        <div className="rounded-lg bg-crema/70 p-3">
          <p className="text-[0.68rem] text-gris">Cobros aprobados</p>
          <p className="text-xl font-semibold text-noche tabular-nums">{d.subs.charges.approved}</p>
          <p className="text-[0.65rem] text-gris">{d.subs.charges.recovered} recuperados</p>
        </div>
        <div className="rounded-lg bg-rose-50 p-3">
          <p className="text-[0.68rem] text-rose-800/80">Cobros fallidos</p>
          <p className="text-xl font-semibold text-cereza tabular-nums">{d.subs.charges.declined}</p>
        </div>
        <Link href="/admin/suscripciones?status=past_due" className="rounded-lg bg-amber-50 p-3 transition hover:bg-amber-100">
          <p className="text-[0.68rem] text-amber-800/80">En reintento</p>
          <p className="text-xl font-semibold text-ambar-700 tabular-nums">{d.subs.charges.retrying}</p>
        </Link>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-gris">Distribución por plan</p>
        <div className="mb-2 flex h-2.5 overflow-hidden rounded-full">
          {d.subs.byPlan.map((p, i) => (
            <div key={p.name} title={`${p.name}: ${p.count}`} style={{ width: `${(p.count / Math.max(1, totalPlans)) * 100}%`, background: [CHART.noche, CHART.ambar, CHART.montana, CHART.noche400, CHART.cereza][i % 5] }} />
          ))}
        </div>
        <ul className="space-y-1">
          {d.subs.byPlan.map((p, i) => (
            <li key={p.name} className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full" style={{ background: [CHART.noche, CHART.ambar, CHART.montana, CHART.noche400, CHART.cereza][i % 5] }} />
              <span className="flex-1 truncate text-noche/80">{p.name}</span>
              <span className="text-gris tabular-nums">{p.count}</span>
              <span className="w-20 text-right font-medium text-noche tabular-nums">{formatCOP(p.mrr)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PushSummary({ d }: { d: DashboardData }) {
  const total = d.push.platforms.reduce((s, p) => s + p.value, 0);
  const sent = d.push.delivered7d + d.push.errors7d;
  const errPct = sent ? (d.push.errors7d / sent) * 100 : 0;
  const lc = d.push.lastCampaign;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="grid size-12 place-items-center rounded-xl bg-noche text-ambar-300">
          <Smartphone className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-semibold text-noche tabular-nums">{formatNumber(total)}</p>
          <p className="text-xs text-gris">dispositivos activos</p>
        </div>
        <div className="text-right text-xs">
          {d.push.platforms.map((p) => (
            <p key={p.name} className="text-gris">
              {p.name} <strong className="text-noche tabular-nums">{formatNumber(p.value)}</strong>
            </p>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-crema/70 p-3">
          <p className="text-[0.68rem] text-gris">Entregas 7 d</p>
          <p className="text-lg font-semibold text-noche tabular-nums">{formatNumber(d.push.delivered7d)}</p>
        </div>
        <div className={cn('rounded-lg p-3', errPct > 5 ? 'bg-rose-50' : 'bg-crema/70')}>
          <p className="text-[0.68rem] text-gris">% error 7 d</p>
          <p className={cn('text-lg font-semibold tabular-nums', errPct > 5 ? 'text-cereza' : 'text-noche')}>{errPct.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %</p>
        </div>
      </div>
      {lc ? (
        <div className="rounded-lg border border-noche/[0.08] p-3">
          <p className="text-[0.65rem] font-semibold tracking-wider text-gris uppercase">Última campaña · {relTime(lc.sentAt)}</p>
          <p className="mt-1 truncate text-sm font-medium text-noche">{lc.title}</p>
          <div className="mt-2 flex gap-3 text-[0.7rem] text-gris">
            <span><strong className="text-noche">{formatNumber(lc.sentCount)}</strong> enviadas</span>
            <span><strong className="text-noche">{lc.sentCount ? Math.round((lc.openCount / lc.sentCount) * 100) : 0}%</strong> aperturas</span>
            <span><strong className="text-noche">{lc.errorCount}</strong> errores</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gris">Aún no has enviado campañas.</p>
      )}
    </div>
  );
}

async function OpsStrip() {
  const ops = await getOps();
  const bad = ops.health.filter((h) => h.status === 'error').length;
  const warn = ops.health.filter((h) => h.status === 'warn').length;
  const tiles = [
    { href: '/admin/pedidos?status=paid', label: 'Por preparar', value: ops.toPrepareCount, icon: ShoppingBag, tone: ops.toPrepareCount ? 'text-ambar-700 bg-ambar-100' : 'text-gris bg-noche/5' },
    { href: '/admin/chat', label: 'Chats esperando asesor', value: ops.chatsWaiting.length, icon: MessageCircle, tone: ops.chatsWaiting.length ? 'text-cereza bg-rose-50' : 'text-gris bg-noche/5' },
    { href: '/admin/productos?status=low', label: 'Variantes con stock bajo', value: ops.lowStock.length, icon: Package, tone: ops.lowStock.length ? 'text-amber-800 bg-amber-50' : 'text-gris bg-noche/5' },
    { href: '/admin/monitor', label: bad ? 'Integraciones con error' : warn ? 'Integraciones con alertas' : 'Sistema operativo', value: bad || warn || '✓', icon: Sparkles, tone: bad ? 'text-cereza bg-rose-50' : warn ? 'text-amber-800 bg-amber-50' : 'text-montana bg-emerald-50' },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="group flex items-center gap-3 rounded-xl border border-noche/[0.08] bg-white px-4 py-3 transition hover:border-noche/20 hover:shadow-[0_10px_24px_-16px_rgba(17,26,49,0.3)]">
          <span className={cn('grid size-10 place-items-center rounded-lg', t.tone)}>
            <t.icon className="size-[1.1rem]" />
          </span>
          <span className="flex-1">
            <span className="block text-xl font-semibold text-noche tabular-nums">{t.value}</span>
            <span className="block text-xs text-gris">{t.label}</span>
          </span>
          <ArrowRight className="size-4 text-noche/30 transition group-hover:translate-x-0.5 group-hover:text-noche" />
        </Link>
      ))}
    </div>
  );
}

async function OpsDetail() {
  const ops = await getOps();
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
      <Panel className="xl:col-span-5" title="Pedidos por preparar" description={`${ops.toPrepareCount} pagados esperando tueste y empaque · más antiguos primero`} actions={<Link href="/admin/pedidos?status=paid" className="text-xs font-medium text-ambar-700 hover:underline">Ver todos</Link>} bodyClassName="px-0 pb-2">
        {ops.toPrepare.length ? (
          <ul className="divide-y divide-noche/[0.06]">
            {ops.toPrepare.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-crema/50">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-noche">
                      {o.number} <span className="font-normal text-gris">· {o.customer}</span>
                    </span>
                    <span className="block text-xs text-gris">
                      {o.items} ítems · {o.city ?? 'Sin envío'} · pagado {relTime(o.paidAt)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-noche tabular-nums">{formatCOP(o.totalCop)}</span>
                  <ArrowRight className="size-4 text-noche/30" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gris">¡Todo al día! No hay pedidos por preparar.</p>
        )}
      </Panel>
      <Panel className="xl:col-span-4" title="Stock bajo" description="Variantes activas con 5 unidades o menos" actions={<Link href="/admin/productos/inventario" className="text-xs font-medium text-ambar-700 hover:underline">Inventario</Link>}>
        {ops.lowStock.length ? (
          <ul className="space-y-2">
            {ops.lowStock.map((v) => (
              <li key={`${v.productId}-${v.variant}`} className="flex items-center gap-3 text-sm">
                <span className={cn('grid h-7 w-9 shrink-0 place-items-center rounded-md text-xs font-bold tabular-nums', v.stock === 0 ? 'bg-cereza text-white' : 'bg-amber-100 text-amber-900')}>{v.stock}</span>
                <Link href={`/admin/productos/${v.productId}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium text-noche">{v.product}</span>
                  <span className="block truncate text-xs text-gris">{v.variant} {v.sku ? `· ${v.sku}` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-gris">Inventario saludable.</p>
        )}
      </Panel>
      <div className="space-y-4 lg:col-span-2 xl:col-span-3">
        <Panel title="Chats esperando" actions={<Link href="/admin/chat" className="text-xs font-medium text-ambar-700 hover:underline">Bandeja</Link>}>
          {ops.chatsWaiting.length ? (
            <ul className="space-y-2.5">
              {ops.chatsWaiting.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/chat?s=${c.id}`} className="block rounded-lg border border-rose-100 bg-rose-50/60 p-2.5 hover:bg-rose-50">
                    <span className="flex items-center justify-between text-xs">
                      <strong className="text-noche">{c.name}</strong>
                      <span className="text-rose-700">{relTime(c.lastMessageAt)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-noche/70">{c.preview}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gris">Nadie esperando por ahora.</p>
          )}
        </Panel>
        <Panel title="Leads nuevos" actions={<Link href="/admin/leads" className="text-xs font-medium text-ambar-700 hover:underline">CRM</Link>}>
          {ops.newLeads.length ? (
            <ul className="space-y-2">
              {ops.newLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-noche">{l.name}</span>
                    <span className="block truncate text-xs text-gris">{l.interest ?? l.source}</span>
                  </span>
                  <span className="shrink-0 text-[0.68rem] text-gris">{relTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gris">Sin leads nuevos.</p>
          )}
        </Panel>
      </div>
      <Panel className="lg:col-span-2 xl:col-span-12" title="Salud del sistema" actions={<Link href="/admin/monitor" className="text-xs font-medium text-ambar-700 hover:underline">Monitor</Link>}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ops.health.map((h) => (
            <li key={h.key} className="flex items-start gap-2.5 rounded-lg border border-noche/[0.06] p-2.5">
              <span className={cn('mt-1 size-2.5 shrink-0 rounded-full ring-4', h.status === 'ok' ? 'bg-emerald-500 ring-emerald-100' : h.status === 'warn' ? 'bg-amber-400 ring-amber-100' : h.status === 'error' ? 'bg-cereza ring-rose-100' : 'bg-noche/25 ring-noche/5')} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-noche">{h.label}</span>
                <span className="block truncate text-xs text-gris">{h.detail}</span>
              </span>
              <Badge tone={HEALTH_TONE[h.status]} className="ml-auto">{h.status === 'ok' ? 'OK' : h.status === 'warn' ? 'Alerta' : h.status === 'error' ? 'Error' : 'Apagado'}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando dashboard">
      <div>
        <Skeleton className="mb-2 h-3 w-40" />
        <Skeleton className="mb-2 h-8 w-80" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-[390px] rounded-xl xl:col-span-8" />
        <Skeleton className="h-[390px] rounded-xl xl:col-span-4" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
