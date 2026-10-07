import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Receipt, Repeat } from 'lucide-react';
import { formatCOP, formatDate } from '@travesia/shared';
import { requireUser } from '@/lib/auth';
import { listAddresses, listCharges, listSubscriptions } from '@/lib/account';
import { getPlans, getProducts } from '@/lib/data/catalog';
import { EmptyState } from '@/components/ui/primitives';
import { SubscriptionManager } from '@/components/account/subscription-manager';
import { PageTitle, SectionSkeleton } from '@/components/account/ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Suscripción' };

const CHARGE: Record<string, { l: string; c: string }> = {
  approved: { l: 'Aprobado', c: 'text-montana' },
  pending: { l: 'Pendiente', c: 'text-ambar-700' },
  declined: { l: 'Rechazado', c: 'text-cereza' },
  error: { l: 'Error', c: 'text-cereza' },
};

export default function SuscripcionPage() {
  return (
    <>
      <PageTitle title="Mi suscripción" intro="Pausa, salta un envío, cambia de café o de plan cuando quieras. Sin llamadas ni letra pequeña." />
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <Subscriptions />
      </Suspense>
    </>
  );
}

async function Subscriptions() {
  const user = await requireUser('/cuenta/suscripcion');
  const [subs, plans, coffees, addresses] = await Promise.all([listSubscriptions(user.id), getPlans(), getProducts({ kind: 'coffee' }), listAddresses(user.id)]);
  if (!subs.length)
    return (
      <EmptyState
        icon={<Repeat className="size-10" aria-hidden />}
        title="Aún no tienes una suscripción"
        text="Recibe café recién tostado cada 2 o 4 semanas con envío gratis y hasta 25 % de ahorro."
        action={
          <Link href="/suscripciones" className="btn-primary mt-2">
            Ver planes
          </Link>
        }
      />
    );
  const charges = await listCharges(
    user.id,
    subs.map((s) => s.id),
  );
  const eligible = coffees.filter((p) => p.subscriptionEligible).map((p) => ({ id: p.id, name: p.name, themeColor: p.themeColor, accentColor: p.accentColor, tastingNotes: p.tastingNotes }));
  const ordered = [...subs].sort((a, b) => Number(a.status === 'cancelled') - Number(b.status === 'cancelled'));
  return (
    <div className="space-y-8">
      {ordered.map((s) => (
        <SubscriptionManager key={s.id} sub={s} plans={plans.filter((p) => p.audience === s.plan.audience)} coffees={eligible} addresses={addresses} />
      ))}

      <section className="card p-6" aria-labelledby="cobros">
        <h2 id="cobros" className="flex items-center gap-2 text-xl">
          <Receipt className="size-5 text-ambar-700" aria-hidden /> Historial de cobros
        </h2>
        {charges.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs tracking-wider text-gris uppercase">
                <tr className="border-b border-noche/10">
                  <th scope="col" className="py-2 font-semibold">
                    Fecha
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Plan
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-noche/10">
                {charges.map((c) => {
                  const st = CHARGE[c.status] ?? { l: c.status, c: '' };
                  const sub = subs.find((s) => s.id === c.subscriptionId);
                  return (
                    <tr key={c.id}>
                      <td className="py-3">{formatDate(c.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 text-gris">{sub?.plan.name ?? '—'}{c.attempt > 1 ? ` · intento ${c.attempt}` : ''}</td>
                      <td className={cn('py-3 font-semibold', st.c)} title={c.error ?? undefined}>
                        {st.l}
                      </td>
                      <td className="py-3 text-right tabular-nums">{formatCOP(c.amountCop)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gris">Aún no hay cobros registrados.</p>
        )}
      </section>
    </div>
  );
}
