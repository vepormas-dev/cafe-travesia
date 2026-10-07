import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Coins, Gift, Repeat, ShoppingBag, Star } from 'lucide-react';
import { LOYALTY, formatCOP, formatDate, formatNumber } from '@travesia/shared';
import { requireUser } from '@/lib/auth';
import { getLoyalty } from '@/lib/account';
import { PageTitle, SectionSkeleton } from '@/components/account/ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Puntos Travesía' };

const EARN = [
  { icon: ShoppingBag, title: 'Compra en la tienda', text: `1 punto por cada ${formatCOP(LOYALTY.earnPer)} en café, accesorios y cursos.` },
  { icon: Repeat, title: 'Mantén tu suscripción', text: 'Cada cobro de tu plan también suma puntos.' },
  { icon: Star, title: 'Deja tus reseñas', text: 'Cuéntanos cómo te supo: ayudas a otros viajeros cafeteros.' },
  { icon: Gift, title: 'Redime en el pago', text: `Cada punto vale ${formatCOP(LOYALTY.valueCop)}; usa hasta el ${LOYALTY.maxRedeemPct} % del valor de tu pedido.` },
];

export default function PuntosPage() {
  return (
    <>
      <PageTitle title="Puntos Travesía" intro="Tu café de todos los días te devuelve sabor: acumula puntos y úsalos en tu próxima compra." />
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <Points />
      </Suspense>
    </>
  );
}

async function Points() {
  const user = await requireUser('/cuenta/puntos');
  const { points, ledger } = await getLoyalty(user.id);
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-noche p-8 text-crema shadow-elevada" aria-label="Saldo">
          <div aria-hidden className="bg-andino absolute inset-0 opacity-10" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm text-crema/70">
              <Coins className="size-4 text-ambar" aria-hidden /> Saldo disponible
            </p>
            <p className="mt-3 font-display text-6xl tabular-nums">{formatNumber(points)}</p>
            <p className="text-crema/75">puntos · equivalen a <strong className="text-ambar-300">{formatCOP(points * LOYALTY.valueCop)}</strong></p>
            <Link href="/tienda" className="btn-ambar mt-6">
              Usarlos en la tienda
            </Link>
          </div>
        </section>
        <section className="card p-6" aria-labelledby="equiv">
          <h2 id="equiv" className="text-xl">
            Así funcionan
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gris">Ganas</dt>
              <dd className="font-semibold">1 punto por cada {formatCOP(LOYALTY.earnPer)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Cada punto vale</dt>
              <dd className="font-semibold">{formatCOP(LOYALTY.valueCop)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Tope por pedido</dt>
              <dd className="font-semibold">{LOYALTY.maxRedeemPct} % del valor</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-xl bg-arena/70 p-3 text-xs text-gris">Ejemplo: una compra de {formatCOP(100000)} te da 100 puntos = {formatCOP(100 * LOYALTY.valueCop)} para la siguiente.</p>
        </section>
      </div>

      <section aria-labelledby="ganar">
        <h2 id="ganar" className="text-2xl">
          Cómo ganar más
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {EARN.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card p-5">
              <Icon className="size-6 text-ambar-700" aria-hidden />
              <p className="mt-3 font-display text-lg text-noche">{title}</p>
              <p className="mt-1 text-sm text-gris">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6" aria-labelledby="movs">
        <h2 id="movs" className="text-xl">
          Movimientos
        </h2>
        {ledger.length ? (
          <ul className="mt-4 divide-y divide-noche/10">
            {ledger.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-noche">{l.reason}</p>
                  <p className="text-xs text-gris">{formatDate(l.createdAt)}</p>
                </div>
                <span className={cn('font-semibold tabular-nums', l.points >= 0 ? 'text-montana' : 'text-cereza')}>
                  {l.points >= 0 ? '+' : ''}
                  {formatNumber(l.points)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gris">Aún no tienes movimientos. Tu primera compra ya empieza a sumar.</p>
        )}
      </section>
    </div>
  );
}
