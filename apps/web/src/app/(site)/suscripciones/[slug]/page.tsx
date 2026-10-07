import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { FREQUENCY_LABEL, formatCOP } from '@travesia/shared';
import { getPlan, getPlans, getProducts } from '@/lib/data/catalog';
import { SubscriptionConfigurator } from '@/components/shop/subscription-configurator';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const plans = await getPlans();
  return plans.length ? plans.map((p) => ({ slug: p.slug })) : [{ slug: 'explorador' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlan(slug);
  if (!plan) return { title: 'Plan no encontrado' };
  return {
    title: `Suscripción ${plan.name} · ${formatCOP(plan.priceCop)} ${FREQUENCY_LABEL(plan.frequencyWeeks).toLowerCase()}`,
    description: plan.description ?? plan.tagline ?? undefined,
    alternates: { canonical: `/suscripciones/${plan.slug}` },
  };
}

export default async function PlanPage({ params }: Props) {
  const { slug } = await params;
  const [plan, plans, coffees] = await Promise.all([getPlan(slug), getPlans(), getProducts({ kind: 'coffee' })]);
  if (!plan) notFound();
  const eligible = coffees.filter((p) => p.subscriptionEligible);
  const others = plans.filter((p) => p.audience === plan.audience && p.id !== plan.id);
  return (
    <div className="container-site py-10 lg:py-14">
      <Link href="/suscripciones" className="inline-flex items-center gap-1 text-sm text-gris hover:text-noche">
        <ChevronLeft className="size-4" aria-hidden /> Todos los planes
      </Link>
      <header className="mt-4 mb-10 max-w-2xl">
        <p className="eyebrow">
          Plan {plan.name} · {FREQUENCY_LABEL(plan.frequencyWeeks)}
        </p>
        <h1 className="title-xl mt-3">
          Diseña tu <em className="text-ambar-700">experiencia</em>
        </h1>
        <p className="lede mt-4">{plan.description ?? 'Elige los granos que viajan desde las montañas de Caicedo directamente a tu puerta. Frescura garantizada en cada entrega.'}</p>
      </header>
      <SubscriptionConfigurator plan={plan} coffees={eligible} otherPlans={others} />
    </div>
  );
}
