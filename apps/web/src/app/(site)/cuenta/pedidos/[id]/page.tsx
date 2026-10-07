import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronLeft, ExternalLink, GraduationCap, MapPin, Truck } from 'lucide-react';
import { formatCOP, formatDateTime, formatNumber } from '@travesia/shared';
import { requireUser } from '@/lib/auth';
import { getOrder } from '@/lib/account';
import { LineThumb } from '@/components/cart/line-thumb';
import { ChatButton } from '@/components/account/chat-button';
import { OrderTimeline, SectionSkeleton, StatusPill } from '@/components/account/ui';

export const metadata: Metadata = { title: 'Detalle del pedido' };

type Props = { params: Promise<{ id: string }> };

export default function PedidoPage({ params }: Props) {
  return (
    <Suspense fallback={<SectionSkeleton rows={3} />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/cuenta/pedidos/${id}`);
  const o = await getOrder(user.id, id);
  if (!o) notFound();
  const hasCourses = o.items.some((i) => i.itemKind === 'course');

  return (
    <div className="space-y-6">
      <Link href="/cuenta/pedidos" className="inline-flex items-center gap-1 text-sm text-gris hover:text-noche">
        <ChevronLeft className="size-4" aria-hidden /> Mis pedidos
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pedido</p>
          <h1 className="title-lg mt-1">#{o.number}</h1>
          <p className="mt-1 text-sm text-gris">Realizado el {formatDateTime(o.createdAt)}</p>
        </div>
        <StatusPill status={o.status} className="text-sm" />
      </header>

      <section className="card p-6 sm:p-8" aria-label="Seguimiento">
        <OrderTimeline order={o} />
        {o.requiresShipping && (o.trackingNumber || o.carrier) ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-arena/70 p-4">
            <p className="flex items-center gap-3 text-sm">
              <Truck className="size-5 text-ambar-700" aria-hidden />
              <span>
                {o.carrier ? <strong className="text-noche">{o.carrier}</strong> : null}
                {o.trackingNumber ? <span className="block text-gris">Guía {o.trackingNumber}</span> : null}
              </span>
            </p>
            {o.trackingUrl ? (
              <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                Rastrear envío <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
        ) : o.requiresShipping && ['paid', 'preparing'].includes(o.status) ? (
          <p className="mt-6 text-center text-sm text-gris">Tostamos y despachamos en máximo 48 horas. Te enviaremos la guía por correo y notificación.</p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-6" aria-labelledby="items-t">
          <h2 id="items-t" className="text-xl">
            Productos
          </h2>
          <ul className="mt-4 divide-y divide-noche/10">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-4">
                <LineThumb name={i.name} imageUrl={i.imageUrl} kind={i.itemKind} className="size-16" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-noche">{i.name}</p>
                  {i.variantName ? <p className="text-sm text-gris">{i.variantName}</p> : null}
                  <p className="text-xs text-gris tabular-nums">
                    {i.quantity} × {formatCOP(i.unitPriceCop)}
                  </p>
                </div>
                <span className="font-semibold text-noche tabular-nums">{formatCOP(i.totalCop)}</span>
              </li>
            ))}
          </ul>
          {hasCourses && o.status !== 'pending' && o.status !== 'failed' ? (
            <Link href="/cuenta/cursos" className="btn-ambar btn-sm mt-2">
              <GraduationCap className="size-4" aria-hidden /> Ir a mis cursos
            </Link>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="tot-t">
            <h2 id="tot-t" className="text-xl">
              Resumen
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gris">Subtotal</dt>
                <dd className="tabular-nums">{formatCOP(o.subtotalCop)}</dd>
              </div>
              {o.discountCop > 0 ? (
                <div className="flex justify-between text-montana">
                  <dt>
                    Descuentos{o.couponCode ? ` (cupón ${o.couponCode})` : ''}
                    {o.pointsRedeemed ? <span className="block text-xs">Incluye {formatNumber(o.pointsRedeemed)} puntos redimidos</span> : null}
                  </dt>
                  <dd className="tabular-nums">−{formatCOP(o.discountCop)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-gris">Envío</dt>
                <dd className="tabular-nums">{o.requiresShipping ? (o.shippingCop ? formatCOP(o.shippingCop) : 'Gratis') : 'No aplica'}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-noche/10 pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="font-display text-2xl tabular-nums">{formatCOP(o.totalCop)}</dd>
              </div>
              {o.pointsEarned ? <p className="text-right text-xs text-ambar-700">+{formatNumber(o.pointsEarned)} Puntos Travesía</p> : null}
            </dl>
          </section>
          {o.shippingAddress ? (
            <section className="card p-6" aria-labelledby="addr-t">
              <h2 id="addr-t" className="flex items-center gap-2 text-xl">
                <MapPin className="size-5 text-ambar-700" aria-hidden /> Dirección de envío
              </h2>
              <address className="mt-3 text-sm text-noche/80 not-italic">
                <strong className="text-noche">{o.shippingAddress.recipient}</strong>
                <br />
                {o.shippingAddress.line1}
                <br />
                {o.shippingAddress.city}, {o.shippingAddress.region}
              </address>
            </section>
          ) : null}
          <div className="rounded-2xl border border-dashed border-noche/20 p-5 text-center">
            <p className="text-sm text-gris">¿Algo no salió como esperabas?</p>
            <ChatButton className="mt-3" message={`Necesito ayuda con mi pedido #${o.number}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
