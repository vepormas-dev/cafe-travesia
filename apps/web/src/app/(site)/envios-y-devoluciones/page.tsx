import type { Metadata } from 'next';
import { Truck } from 'lucide-react';
import { formatCOP } from '@travesia/shared';
import { getShippingZones } from '@/lib/data/catalog';
import { LegalPage } from '@/components/site/legal-page';
import { Markdown } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Envíos y devoluciones',
  description: 'Tarifas y tiempos de envío de Café Travesía a toda Colombia, cambios, devoluciones y derecho de retracto.',
  alternates: { canonical: '/envios-y-devoluciones' },
};

const MD = `
## Cómo enviamos

- **Tostamos cada semana** y despachamos en máximo **48 horas** después del tueste, en bolsas con válvula para conservar el aroma.
- Recibes un correo y una notificación con el **número de guía** apenas sale tu pedido. También lo ves en [Mis pedidos](/cuenta/pedidos).
- Las **suscripciones tienen envío gratis** siempre.
- Las experiencias (catas y tours) y los cursos no requieren envío.

## Si algo llega mal

Si tu pedido llega incompleto, con el empaque dañado o con un producto equivocado, escríbenos **dentro de los 5 días siguientes** a la entrega con fotos y tu número de pedido. Lo resolvemos con **reposición sin costo o reembolso**.

## Derecho de retracto (Ley 1480 de 2011)

En compras a distancia tienes **5 días hábiles** desde la entrega para retractarte, devolviendo el producto en las mismas condiciones en que lo recibiste. Por tratarse de alimentos, **no aplica para café con el empaque abierto** ni para bienes perecederos o de uso personal; en cursos, no aplica una vez accedido el contenido. Los costos de transporte de la devolución corren por cuenta del comprador, salvo que la devolución se deba a un error nuestro o a un producto defectuoso.

El reembolso se hace al mismo medio de pago en máximo **30 días calendario** desde que ejerces el retracto.

## Reversión del pago

Si fuiste víctima de fraude, la operación no fue solicitada, el producto no se recibió o no corresponde a lo pedido, puedes solicitar la reversión del pago dentro de los **5 días hábiles** siguientes a conocer el hecho, según el artículo 51 de la Ley 1480 de 2011, avisándonos y al emisor de tu medio de pago.

## Cambios de dirección

Puedes cambiar la dirección mientras el pedido esté **"En preparación"** escribiéndonos por WhatsApp o desde el [asistente](/contacto). En suscripciones, cámbiala tú mismo desde tu cuenta.
`;

export default async function EnviosPage() {
  const zones = await getShippingZones();
  return (
    <LegalPage title="Envíos y devoluciones" intro="Del tostador a tu puerta, recién empacado. Y si algo no sale bien, lo arreglamos." current="/envios-y-devoluciones">
      <h2 className="font-display text-3xl">Tarifas y tiempos</h2>
      <div className="mt-6 overflow-hidden rounded-2xl border border-noche/10 bg-hueso shadow-suave">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Tarifas de envío por zona</caption>
          <thead className="bg-arena/70 text-xs tracking-wider text-noche/70 uppercase">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Zona
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Tarifa
              </th>
              <th scope="col" className="hidden px-5 py-3 font-semibold sm:table-cell">
                Gratis desde
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Tiempo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-noche/10">
            {zones.map((z) => (
              <tr key={z.id}>
                <th scope="row" className="px-5 py-4 font-medium text-noche">
                  <span className="flex items-center gap-2">
                    <Truck className="size-4 text-ambar-700" aria-hidden />
                    {z.name}
                  </span>
                  {z.cities.length ? <span className="mt-1 block text-xs font-normal text-gris">{z.cities.slice(0, 6).join(', ')}{z.cities.length > 6 ? '…' : ''}</span> : null}
                </th>
                <td className="px-5 py-4 tabular-nums">{formatCOP(z.rateCop)}</td>
                <td className="hidden px-5 py-4 tabular-nums sm:table-cell">{z.freeFromCop ? formatCOP(z.freeFromCop) : '—'}</td>
                <td className="px-5 py-4">{z.etaDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-10">
        <Markdown className="[&_h2]:mt-12 [&_h2]:text-3xl">{MD}</Markdown>
      </div>
    </LegalPage>
  );
}
