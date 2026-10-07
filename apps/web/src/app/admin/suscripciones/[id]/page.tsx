import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FREQUENCY_LABEL, formatCOP, formatDate, formatDateTime, monthlyValue, ORDER_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { getSubscription } from '@/lib/admin/data/ops';
import { ORDER_STATUS_TONE, SUB_STATUS_TONE } from '@/lib/admin/labels';
import { Badge, KeyValue, PageHeader, PageSkeleton, Panel, Stat, Table, td, th, trHover } from '@/components/admin/ui';
import { SubscriptionActions } from '@/components/admin/sales/sub-actions';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Suscripción' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isAdmin } = await staffPage(`/admin/suscripciones/${id}`);
  const d = await getSubscription(id);
  if (!d) notFound();
  const s = d.sub;
  const approved = d.charges.filter((c) => c.status === 'approved');
  const addr = s.address;
  return (
    <>
      <PageHeader
        back={{ href: '/admin/suscripciones', label: 'Suscripciones' }}
        title={<span className="flex flex-wrap items-center gap-3">{d.user.fullName ?? d.user.email} <Badge tone={SUB_STATUS_TONE[s.status]} dot>{SUBSCRIPTION_STATUS_LABEL[s.status]}</Badge></span>}
        description={`${d.plan?.name ?? 'Plan'} · ${d.plan ? FREQUENCY_LABEL(d.plan.frequencyWeeks) : ''} · desde ${formatDate(s.startedAt ?? s.createdAt)}`}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><Stat label="Precio por ciclo" value={formatCOP(s.priceCop)} hint={d.plan ? `MRR ${formatCOP(monthlyValue(s.priceCop, d.plan.frequencyWeeks))}` : undefined} /></Panel>
        <Panel><Stat label="Cobros aprobados" value={approved.length} hint={`${formatCOP(approved.reduce((a, c) => a + c.amountCop, 0))} en total`} /></Panel>
        <Panel><Stat label="Próximo cobro" value={s.status === 'cancelled' ? '—' : formatDate(s.nextBillingAt, { day: 'numeric', month: 'short' })} hint={s.pausedUntil ? `Pausada hasta ${formatDate(s.pausedUntil)}` : undefined} /></Panel>
        <Panel><Stat label="Intentos fallidos" value={<span className={s.failedAttempts ? 'text-cereza' : ''}>{s.failedAttempts}</span>} hint="se cancela al 3.º" /></Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Panel title="Historial de cobros" bodyClassName="pb-2">
            <Table>
              <thead><tr><th className={th}>Fecha</th><th className={th}>Estado</th><th className={th}>Intento</th><th className={th}>Transacción</th><th className={th}>Pedido</th><th className={cn(th, 'text-right')}>Monto</th></tr></thead>
              <tbody>
                {d.charges.map((c) => (
                  <tr key={c.id} className={trHover}>
                    <td className={cn(td, 'text-gris')}>{formatDateTime(c.createdAt)}</td>
                    <td className={td}><Badge tone={c.status === 'approved' ? 'success' : c.status === 'pending' ? 'warning' : 'danger'} dot>{c.status === 'approved' ? 'Aprobado' : c.status === 'pending' ? 'Pendiente' : c.status === 'declined' ? 'Rechazado' : 'Error'}</Badge>{c.error ? <p className="mt-0.5 text-[0.68rem] text-cereza">{c.error}</p> : null}</td>
                    <td className={cn(td, 'tabular-nums')}>{c.attempt}</td>
                    <td className={cn(td, 'font-mono text-[0.7rem] text-gris')}>{c.wompiTransactionId ?? '—'}</td>
                    <td className={td}>{c.orderId ? <Link href={`/admin/pedidos/${c.orderId}`} className="text-ambar-700 hover:underline">Ver</Link> : '—'}</td>
                    <td className={cn(td, 'text-right font-semibold tabular-nums')}>{formatCOP(c.amountCop)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
          <Panel title="Pedidos de despacho" bodyClassName="pb-2">
            <ul className="divide-y divide-noche/[0.06]">
              {d.orders.slice(0, 12).map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-noche hover:underline">{o.number}</Link>
                  <span className="text-xs text-gris">{formatDate(o.createdAt)}</span>
                  <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  <span className="tabular-nums">{formatCOP(o.totalCop)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="space-y-4 xl:col-span-4">
          <Panel title="Acciones"><SubscriptionActions id={s.id} status={s.status} isAdmin={isAdmin} /></Panel>
          <Panel title="Suscriptor">
            <KeyValue items={[['Nombre', <Link key="n" href={`/admin/clientes/${d.user.id}`} className="hover:underline">{d.user.fullName ?? '—'}</Link>], ['Correo', d.user.email], ['Teléfono', d.user.phone ?? '—']]} />
          </Panel>
          <Panel title="Plan y café">
            <KeyValue items={[['Plan', d.plan?.name ?? '—'], ['Entrega', d.plan ? `${d.plan.bagsPerDelivery} × ${d.plan.bagWeightG} g · ${FREQUENCY_LABEL(d.plan.frequencyWeeks)}` : '—'], ['Café', d.product ?? 'Selección del tostador'], ['Molienda', s.grind], ['Academia', d.plan?.includesAcademy ? 'Incluida' : 'No'], ['Tarjeta', s.cardBrand ? `${s.cardBrand} •••• ${s.cardLast4}` : '—'], ...(s.cancelReason ? ([['Motivo de baja', s.cancelReason]] as [string, string][]) : [])]} />
          </Panel>
          {addr ? (
            <Panel title="Dirección de envío">
              <address className="text-sm text-noche not-italic">{addr.recipient}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />{addr.city}, {addr.region}<br />{addr.phone}</address>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
