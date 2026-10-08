import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Minus, Quote } from 'lucide-react';
import { FREQUENCY_LABEL, formatCOP, monthlyValue } from '@travesia/shared';
import { getPlans, getProducts, getSiteContent } from '@/lib/data/catalog';
import { BrandIcon } from '@/components/brand/logo';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { PatternDivider, SectionHeading } from '@/components/ui/primitives';
import { PlanTabs } from '@/components/shop/plan-tabs';

export const metadata: Metadata = {
  title: 'Suscripciones de café recién tostado',
  description: 'Recibe café especial de Caicedo, Antioquia, recién tostado en tu puerta cada 2 o 4 semanas. Envío gratis, hasta 25 % de ahorro y Academia incluida en el plan Maestro.',
  alternates: { canonical: '/suscripciones' },
};

const STEPS = [
  { icon: 'granos', title: 'Elige tu plan y tu café', text: 'Personal o para tu empresa. Escoge origen y molienda, o déjate sorprender por el tostador.' },
  { icon: 'cosecha', title: 'Tostamos y despachamos', text: 'Tostamos cada semana en pequeños lotes y enviamos en menos de 48 horas, con envío gratis.' },
  { icon: 'tienda-online', title: 'Disfruta y gestiona', text: 'Pausa, salta un envío, cambia de café o cancela desde tu cuenta o la app, sin llamadas.' },
];

// Testimonios de EJEMPLO: reemplazar por testimonios reales del cliente (CMS) antes de producción.
const TESTIMONIALS = [
  { name: 'Laura M.', city: 'Envigado', plan: 'Explorador', text: 'Cada mes llega un origen distinto y siempre está recién tostado. Ya no compro café en el supermercado.' },
  { name: 'Andrés R.', city: 'Bogotá', plan: 'Maestro Premium', text: 'Los cursos de la Academia me cambiaron la forma de preparar en V60. El café llega perfecto.' },
  { name: 'Oficina Nexo', city: 'Medellín', plan: 'Oficina', text: 'El equipo pasó de café de greca a espresso de verdad. La factura electrónica llega sin pedirla.' },
];

const SUB_FAQ = [
  { q: '¿Cuándo me cobran?', a: 'El primer cobro se hace hoy al confirmar. Luego cobramos automáticamente según la frecuencia de tu plan y te avisamos antes de cada envío.' },
  { q: '¿Puedo cambiar de café o de molienda?', a: 'Sí, cuantas veces quieras desde tu cuenta. El cambio aplica para la siguiente entrega.' },
  { q: '¿Qué pasa si me voy de viaje?', a: 'Pausa la suscripción hasta la fecha que elijas o salta solo el próximo envío. No pierdes tus beneficios.' },
  { q: '¿Hay permanencia mínima?', a: 'No. Cancelas cuando quieras desde tu cuenta, sin penalidad ni llamadas.' },
];

export default async function SuscripcionesPage() {
  const [plans, coffees, faq] = await Promise.all([getPlans(), getProducts({ kind: 'coffee' }), getSiteContent('faq')]);
  const personal = plans.filter((p) => p.audience === 'personal');
  const bags = coffees.filter((p) => p.subscriptionEligible).slice(0, 3);
  const maxSave = plans.reduce((m, p) => (p.compareAtCop ? Math.max(m, Math.round((1 - p.priceCop / p.compareAtCop) * 100)) : m), 0);
  const faqs = [...SUB_FAQ, ...faq.items.filter((i) => /suscrip|pago|envío|envios|tuest/i.test(i.q))].slice(0, 7);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-arena">
        <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.07]" />
        <div className="container-site relative grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow">Suscripciones Travesía</p>
            <h1 className="title-xl mt-4">
              Recibe café recién tostado <em className="text-ambar-700">en tu puerta</em>
            </h1>
            <p className="lede mt-5 max-w-xl">Café de altura de Caicedo, Antioquia, tostado la misma semana que lo recibes. Envío gratis{maxSave ? `, hasta ${maxSave} % de ahorro` : ''} y control total desde tu cuenta.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#planes" className="btn-primary">
                Elegir mi plan <ArrowRight className="size-4" aria-hidden />
              </a>
              <a href="#empresas" className="btn-outline">
                Planes para empresas
              </a>
            </div>
            <p className="mt-6 font-script text-2xl text-ambar-700">porque si vas a tomar café… que sea de verdad</p>
          </div>
          <div className="relative mx-auto h-[440px] w-full max-w-lg">
            <div className="arch absolute top-0 right-0 h-full w-[68%] overflow-hidden shadow-elevada">
              <Image src="/brand/fotos/latte-travesia.webp" alt="Latte con café Travesía" fill priority sizes="(min-width:1024px) 34vw, 70vw" className="object-cover" />
            </div>
            {bags.slice(0, 2).map((p, i) => (
              <div key={p.id} className="arch absolute bottom-0 aspect-[4/5] w-[38%] overflow-hidden shadow-elevada" style={{ left: `${i * 22}%`, zIndex: 2 - i, transform: `rotate(${i ? 6 : -6}deg)`, backgroundColor: p.themeColor ?? '#111A31' }} aria-hidden>
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt="" fill sizes="180px" className="object-cover" />
                ) : (
                  <CoffeeBag name={p.name} color={p.themeColor} accent={p.accentColor} origin={p.originRegion} />
                )}
              </div>
            ))}
          </div>
        </div>
        <PatternDivider />
      </section>

      {/* Cómo funciona */}
      <section className="container-site py-16 lg:py-20" aria-labelledby="como">
        <SectionHeading align="center" eyebrow="Así de fácil" title={<span id="como">Cómo funciona</span>} />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative p-7">
              <span className="absolute top-6 right-6 font-display text-5xl text-noche/10">{i + 1}</span>
              <BrandIcon name={s.icon} className="size-12 text-ambar-700" />
              <h3 className="mt-5 text-2xl">{s.title}</h3>
              <p className="mt-2 text-gris">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Planes */}
      <section id="planes" className="scroll-mt-24 bg-crema pb-16" aria-labelledby="planes-t">
        <div className="container-site">
          <span id="empresas" className="block scroll-mt-24" />
          <SectionHeading align="center" eyebrow="Planes" title={<span id="planes-t">Elige tu ritmo cafetero</span>} intro="Todos incluyen envío gratis y puedes pausar o cancelar cuando quieras." className="mb-10" />
          <PlanTabs plans={plans} />
        </div>
      </section>

      {/* Comparativa */}
      {personal.length > 1 ? (
        <section className="container-site py-16" aria-labelledby="compara">
          <SectionHeading eyebrow="Compara" title={<span id="compara">¿Cuál es para ti?</span>} />
          <div className="card mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Comparativa de planes personales</caption>
              <thead>
                <tr className="border-b border-noche/10">
                  <th scope="col" className="p-5 font-medium text-gris">
                    Incluye
                  </th>
                  {personal.map((p) => (
                    <th key={p.id} scope="col" className={p.isHighlighted ? 'bg-noche/[0.04] p-5' : 'p-5'}>
                      <span className="font-display text-xl text-noche">{p.name}</span>
                      {p.isHighlighted ? <span className="ml-2 rounded-full bg-ambar px-2 py-0.5 text-[0.6rem] font-bold text-noche uppercase">Top</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-noche/10">
                {(
                  [
                    ['Precio por entrega', (p) => formatCOP(p.priceCop)],
                    ['Equivalente mensual', (p) => formatCOP(monthlyValue(p.priceCop, p.frequencyWeeks))],
                    ['Frecuencia', (p) => FREQUENCY_LABEL(p.frequencyWeeks)],
                    ['Café por entrega', (p) => `${p.bagsPerDelivery} × ${p.bagWeightG} g`],
                    ['Ahorro vs. tienda', (p) => (p.compareAtCop ? `${Math.round((1 - p.priceCop / p.compareAtCop) * 100)} %` : '—')],
                    ['Envío gratis', () => true],
                    ['Academia Travesía', (p) => p.includesAcademy],
                    ['Pausa y cancela cuando quieras', () => true],
                  ] as [string, (p: (typeof personal)[number]) => string | boolean][]
                ).map(([label, fn]) => (
                  <tr key={label}>
                    <th scope="row" className="p-5 font-medium text-noche">
                      {label}
                    </th>
                    {personal.map((p) => {
                      const v = fn(p);
                      return (
                        <td key={p.id} className={p.isHighlighted ? 'bg-noche/[0.04] p-5' : 'p-5'}>
                          {v === true ? <Check className="size-5 text-montana" aria-label="Sí" /> : v === false ? <Minus className="size-5 text-noche/30" aria-label="No" /> : <span className="tabular-nums">{v}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="p-5" />
                  {personal.map((p) => (
                    <td key={p.id} className={p.isHighlighted ? 'bg-noche/[0.04] p-5' : 'p-5'}>
                      <Link href={`/suscripciones/${p.slug}`} className={p.isHighlighted ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>
                        Elegir
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Testimonios */}
      <section className="relative overflow-hidden bg-noche py-16 text-crema lg:py-20" aria-labelledby="testimonios">
        <div aria-hidden className="bg-andino absolute inset-0 opacity-10" />
        <div className="container-site relative">
          <SectionHeading dark eyebrow="Suscriptores" title={<span id="testimonios">Lo que dicen en casa y en la oficina</span>} />
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <li key={t.name} className="rounded-2xl border border-crema/15 bg-crema/5 p-7">
                <Quote className="size-6 text-ambar" aria-hidden />
                <p className="mt-4 font-display text-lg leading-relaxed text-crema/90 italic">“{t.text}”</p>
                <p className="mt-5 text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-crema/60">
                  {t.city} · Plan {t.plan}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-site grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr] lg:py-20" aria-labelledby="faq">
        <div>
          <SectionHeading eyebrow="Preguntas frecuentes" title={<span id="faq">Todo lo que quieres saber</span>} intro="¿Otra duda? Nuestro asistente te responde al instante o te conecta con el equipo." />
          <BrandIcon name="faq" className="mt-8 size-20 text-ambar-700" />
        </div>
        <div className="divide-y divide-noche/10 border-y border-noche/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-noche">
                {f.q}
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-noche/15 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-noche/75">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
