import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CheckCircle2, CircleDot, CreditCard, ExternalLink, MapPin, Printer, Receipt, Ticket, Truck, User, XCircle } from 'lucide-react';
import { formatCOP, formatDateTime, ORDER_STATUS_LABEL } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { getOrder } from '@/lib/admin/data/orders';
import { CHANNEL_LABEL, ORDER_KIND_LABEL, ORDER_STATUS_TONE, PAYMENT_LABEL } from '@/lib/admin/labels';
import { Avatar, Badge, KeyValue, PageHeader, PageSkeleton, Panel, btn } from '@/components/admin/ui';
import { MarkPaidButton, NotesEditor, OrderStatusForm } from '@/components/admin/orders/order-actions';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Pedido' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isAdmin } = await staffPage(`/admin/pedidos/${id}`);
  const d = await getOrder(id);
  if (!d) notFound();
  const o = d.order;
  const timeline: { at: Date | null; label: string; detail?: string; tone: 'ok' | 'info' | 'bad' }[] = [
    { at: o.createdAt, label: 'Pedido creado', detail: `${CHANNEL_LABEL[o.channel]} · referencia ${o.wompiReference}`, tone: 'info' as const },
    ...d.paymentEvents.map((e) => ({ at: e.createdAt, label: `Wompi: ${e.status}`, detail: `${e.event} · tx ${e.externalId}${e.signatureOk ? ' · firma verificada' : ' · firma NO verificada'}`, tone: e.status === 'APPROVED' ? ('ok' as const) : ('bad' as const) })),
    { at: o.paidAt, label: 'Pago confirmado', detail: o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod : undefined, tone: 'ok' as const },
    { at: o.shippedAt, label: 'Enviado', detail: [o.carrier, o.trackingNumber && `guía ${o.trackingNumber}`].filter(Boolean).join(' · '), tone: 'info' as const },
    { at: o.deliveredAt, label: 'Entregado', tone: 'ok' as const },
    { at: o.cancelledAt, label: o.status === 'refunded' ? 'Reembolsado' : 'Cancelado', tone: 'bad' as const },
    ...d.audit.map((a) => ({ at: a.createdAt, label: `Panel: ${a.action.replace('order.', '')}`, detail: `${a.userEmail ?? 'equipo'}${a.meta ? ` · ${JSON.stringify(a.meta).slice(0, 120)}` : ''}`, tone: 'info' as const })),
  ]
    .filter((x) => x.at)
    .sort((a, b) => a.at!.getTime() - b.at!.getTime());
  const addr = o.shippingAddress;
  const canPay = o.status === 'pending' || o.status === 'failed';
  return (
    <>
      <PageHeader
        back={{ href: '/admin/pedidos', label: 'Pedidos' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {o.number}
            <Badge tone={ORDER_STATUS_TONE[o.status]} dot className="text-xs">
              {ORDER_STATUS_LABEL[o.status]}
            </Badge>
          </span>
        }
        description={`${ORDER_KIND_LABEL[o.kind]} · ${CHANNEL_LABEL[o.channel]} · creado ${formatDateTime(o.createdAt)}`}
        actions={
          <>
            {canPay && isAdmin ? <MarkPaidButton orderId={o.id} totalLabel={formatCOP(o.totalCop)} /> : null}
            {o.requiresShipping ? (
              <Link href={`/admin/pedidos/rotulos?ids=${o.id}`} className={btn.secondary}>
                <Printer className="size-4" /> Rótulo y packing slip
              </Link>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Panel title="Productos" description={`${d.items.reduce((s, i) => s + i.quantity, 0)} ítems`}>
            <ul className="divide-y divide-noche/[0.06]">
              {d.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-arena">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.imageUrl ? <img src={i.imageUrl} alt="" className="size-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-noche">{i.name}</p>
                    <p className="truncate text-xs text-gris">{[i.variantName, i.itemKind === 'course' ? 'Curso digital' : i.itemKind === 'plan' ? 'Suscripción' : null].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="text-sm text-gris tabular-nums">
                    {i.quantity} × {formatCOP(i.unitPriceCop)}
                  </span>
                  <span className="w-28 text-right font-semibold text-noche tabular-nums">{formatCOP(i.totalCop)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 ml-auto max-w-xs space-y-1.5 border-t border-noche/[0.08] pt-3 text-sm">
              <Row k="Subtotal" v={formatCOP(o.subtotalCop)} />
              {o.discountCop ? <Row k={`Descuentos${o.couponCode ? ` (${o.couponCode})` : ''}`} v={`− ${formatCOP(o.discountCop)}`} /> : null}
              {o.requiresShipping ? <Row k="Envío" v={o.shippingCop ? formatCOP(o.shippingCop) : 'Gratis'} /> : null}
              <Row k="Total" v={formatCOP(o.totalCop)} strong />
            </dl>
          </Panel>

          <Panel title="Línea de tiempo">
            <ol className="relative ml-2 space-y-4 border-l border-noche/10 pl-6">
              {timeline.map((e, i) => (
                <li key={i} className="relative">
                  <span className={cn('absolute top-0.5 -left-[2.05rem] grid size-5 place-items-center rounded-full bg-white ring-4 ring-white', e.tone === 'ok' ? 'text-montana' : e.tone === 'bad' ? 'text-cereza' : 'text-noche/60')}>
                    {e.tone === 'ok' ? <CheckCircle2 className="size-5" /> : e.tone === 'bad' ? <XCircle className="size-5" /> : <CircleDot className="size-5" />}
                  </span>
                  <p className="text-sm font-medium text-noche">{e.label}</p>
                  <p className="text-xs text-gris">
                    {formatDateTime(e.at)}
                    {e.detail ? ` · ${e.detail}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          {o.notes ? (
            <Panel title="Nota del cliente">
              <p className="rounded-lg bg-ambar-100/60 p-3 text-sm text-noche">“{o.notes}”</p>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Panel title="Cambiar estado" actions={<Truck className="size-4 text-gris" />}>
            <OrderStatusForm orderId={o.id} status={o.status} carrier={o.carrier} trackingNumber={o.trackingNumber} trackingUrl={o.trackingUrl} requiresShipping={o.requiresShipping} />
            {o.trackingUrl ? (
              <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ambar-700 hover:underline">
                Rastrear envío <ExternalLink className="size-3" />
              </a>
            ) : null}
          </Panel>
          <Panel title="Cliente" actions={<User className="size-4 text-gris" />}>
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={o.customerName} />
              <div className="min-w-0">
                {d.customer ? (
                  <Link href={`/admin/clientes/${d.customer.id}`} className="block truncate font-medium text-noche hover:underline">
                    {o.customerName}
                  </Link>
                ) : (
                  <p className="truncate font-medium text-noche">{o.customerName} <span className="text-xs text-gris">(invitado)</span></p>
                )}
                <a href={`mailto:${o.email}`} className="block truncate text-xs text-gris hover:text-noche">
                  {o.email}
                </a>
              </div>
            </div>
            <KeyValue
              items={[
                ['Teléfono', o.phone ? <a href={`https://wa.me/${o.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">{o.phone}</a> : '—'],
                ['Documento', o.legalId ? `${o.legalIdType ?? ''} ${o.legalId}` : '—'],
                ['Pedidos pagados', d.stats.orders],
                ['LTV', formatCOP(d.stats.ltv)],
                ...(d.customer ? ([['Puntos', d.customer.loyaltyPoints.toLocaleString('es-CO')]] as [string, string][]) : []),
              ]}
            />
          </Panel>
          {addr ? (
            <Panel title="Dirección de envío" actions={<MapPin className="size-4 text-gris" />}>
              <address className="text-sm leading-relaxed text-noche not-italic">
                <strong>{addr.recipient}</strong>
                <br />
                {addr.line1}
                {addr.line2 ? <>, {addr.line2}</> : null}
                <br />
                {addr.city}, {addr.region}
                <br />
                {addr.phone}
                {addr.notes ? <span className="mt-1 block text-xs text-gris">Indicaciones: {addr.notes}</span> : null}
              </address>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(`${addr.line1}, ${addr.city}, ${addr.region}, Colombia`)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ambar-700 hover:underline">
                Ver en Google Maps <ExternalLink className="size-3" />
              </a>
            </Panel>
          ) : null}
          <Panel title="Pago (Wompi)" actions={<CreditCard className="size-4 text-gris" />}>
            <KeyValue
              items={[
                ['Método', o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod : '—'],
                ['Transacción', o.wompiTransactionId ? <code className="text-xs">{o.wompiTransactionId}</code> : '—'],
                ['Referencia', <code key="r" className="text-xs break-all">{o.wompiReference}</code>],
                ['Pagado', formatDateTime(o.paidAt)],
              ]}
            />
          </Panel>
          <Panel title="Cupón y puntos" actions={<Ticket className="size-4 text-gris" />}>
            <KeyValue
              items={[
                ['Cupón', o.couponCode ? <Badge tone="ambar">{o.couponCode}</Badge> : '—'],
                ['Descuento', o.discountCop ? formatCOP(o.discountCop) : '—'],
                ['Puntos redimidos', o.pointsRedeemed],
                ['Puntos ganados', o.pointsEarned],
                ...(d.subscription ? ([['Suscripción', <Link key="s" href={`/admin/suscripciones/${d.subscription.id}`} className="text-ambar-700 hover:underline">Ver suscripción</Link>]] as [string, React.ReactNode][]) : []),
              ]}
            />
          </Panel>
          <Panel title="Notas internas" actions={<Receipt className="size-4 text-gris" />}>
            <NotesEditor orderId={o.id} initial={o.internalNotes ?? ''} />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between', strong && 'border-t border-noche/[0.08] pt-1.5 text-base font-semibold text-noche')}>
      <dt className={strong ? '' : 'text-gris'}>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
