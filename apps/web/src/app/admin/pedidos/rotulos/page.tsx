import { Suspense } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import { brand, formatCOP, formatDate } from '@travesia/shared';
import { publicPhone } from '@/lib/public-contact';
import { staffPage } from '@/lib/admin/guard';
import { getOrder } from '@/lib/admin/data/orders';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Empty, PageHeader, PageSkeleton } from '@/components/admin/ui';
import { PrintButton } from '@/components/admin/print-button';

export const metadata: Metadata = { title: 'Rótulos' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Labels searchParams={searchParams} />
    </Suspense>
  );
}

async function Labels({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/pedidos');
  const ids = (flat(await searchParams).ids ?? '').split(',').filter(Boolean).slice(0, 40);
  const orders = (await Promise.all(ids.map((id) => getOrder(id)))).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const senderPhone = publicPhone(brand.phone);
  return (
    <>
      <div className="print:hidden">
        <PageHeader back={{ href: '/admin/pedidos', label: 'Pedidos' }} title="Rótulos y packing slips" description="Una hoja por pedido: rótulo de envío arriba (recórtalo) y lista de empaque abajo." actions={<PrintButton />} />
      </div>
      {!orders.length ? <Empty title="Selecciona pedidos desde la lista" /> : null}
      <div className="space-y-6 print:space-y-0">
        {orders.map(({ order: o, items }) => {
          const a = o.shippingAddress;
          return (
            <article key={o.id} className="mx-auto max-w-[800px] rounded-xl border border-noche/10 bg-white p-8 text-noche shadow-sm print:break-after-page print:rounded-none print:border-0 print:shadow-none">
              <section className="rounded-lg border-2 border-dashed border-noche/40 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-[0.65rem] font-bold tracking-[0.2em] text-gris uppercase">Remitente</p>
                    <p className="font-semibold">{brand.name}</p>
                    <p className="text-sm">Parque Comercial Florida, Medellín{senderPhone ? ` · ${senderPhone}` : ''}</p>
                  </div>
                  <Image src="/brand/logo.png" alt={brand.name} width={1200} height={804} className="h-auto w-24" />
                </div>
                <div className="mt-5 border-t border-noche/15 pt-5">
                  <p className="text-[0.65rem] font-bold tracking-[0.2em] text-gris uppercase">Destinatario</p>
                  <p className="mt-1 text-2xl font-bold">{a?.recipient ?? o.customerName}</p>
                  <p className="text-lg">{a ? `${a.line1}${a.line2 ? `, ${a.line2}` : ''}` : 'Sin dirección (no requiere envío)'}</p>
                  {a ? <p className="text-lg font-semibold uppercase">{a.city} · {a.region}</p> : null}
                  <p className="mt-1">Tel. {a?.phone ?? o.phone ?? '—'}</p>
                  {a?.notes ? <p className="mt-1 text-sm">Indicaciones: {a.notes}</p> : null}
                </div>
                <div className="mt-5 flex items-end justify-between border-t border-noche/15 pt-4">
                  <div>
                    <p className="font-mono text-xl font-bold tracking-wider">{o.number}</p>
                    <p className="text-xs">{o.carrier ?? 'Transportadora: __________'} {o.trackingNumber ? `· Guía ${o.trackingNumber}` : ''}</p>
                  </div>
                  <p className="text-xs">Café tostado · frágil · mantener seco</p>
                </div>
              </section>
              <section className="mt-8">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl">Lista de empaque</h2>
                  <p className="text-sm text-gris">
                    {o.number} · {formatDate(o.paidAt ?? o.createdAt)}
                  </p>
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-noche/20 text-left text-xs text-gris uppercase">
                      <th className="py-2">✓</th>
                      <th className="py-2">Producto</th>
                      <th className="py-2">Variante</th>
                      <th className="py-2 text-right">Cant.</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-b border-noche/10">
                        <td className="py-2.5"><span className="inline-block size-4 rounded border border-noche/40" /></td>
                        <td className="py-2.5 font-medium">{i.name}</td>
                        <td className="py-2.5">{i.variantName ?? '—'}</td>
                        <td className="py-2.5 text-right text-base font-bold">{i.quantity}</td>
                        <td className="py-2.5 text-right">{formatCOP(i.totalCop)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-right text-sm">
                  Total pagado: <strong>{formatCOP(o.totalCop)}</strong>
                </p>
                {o.notes ? <p className="mt-4 rounded bg-crema p-3 text-sm">Nota del cliente: “{o.notes}”</p> : null}
                <p className="mt-8 text-center font-script text-2xl text-ambar-700">¡Gracias por tomar café de verdad!</p>
                <p className="text-center text-xs text-gris">{brand.domain} · {brand.instagram.replace('https://', '')}</p>
              </section>
            </article>
          );
        })}
      </div>
    </>
  );
}
