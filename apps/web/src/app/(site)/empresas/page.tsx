import type { Metadata } from 'next';
import Image from 'next/image';
import { Building2, Coffee, FileText, GraduationCap, Truck, Users } from 'lucide-react';
import { getPlans } from '@/lib/data/catalog';
import { PlanCard } from '@/components/site/home/sections';
import { LeadForm } from '@/components/site/lead-form';
import { Breadcrumbs } from '@/components/site/page-hero';

export const metadata: Metadata = {
  title: 'Café para empresas y oficinas',
  description: 'Planes de café especial para oficinas, restaurantes y eventos: factura electrónica, capacitación de barismo y asesor dedicado.',
  alternates: { canonical: '/empresas' },
};

const BENEFITS = [
  { Icon: Coffee, title: 'Café recién tostado', text: 'Lotes de Caicedo tostados cada semana para tu equipo.' },
  { Icon: FileText, title: 'Factura electrónica', text: 'Facturación mensual con NIT y pago por transferencia o tarjeta.' },
  { Icon: GraduationCap, title: 'Capacitación de barismo', text: 'Tu equipo aprende a preparar como en la barra. Academia incluida en planes grandes.' },
  { Icon: Truck, title: 'Entregas programadas', text: 'Quincenales o mensuales, sin que nadie tenga que pedir.' },
  { Icon: Users, title: 'Asesor dedicado', text: 'Una persona que conoce tu oficina y ajusta el plan contigo.' },
  { Icon: Building2, title: 'Eventos y regalos', text: 'Kits corporativos, catas para equipos y coffee breaks.' },
];

// Ejemplos de tipos de aliados (texto, no logotipos reales) [CONFIRMAR CON EL CLIENTE]
const ALLIES = ['Coworking Florida', 'Estudio Laureles', 'Clínica del Poblado', 'Agencia Ruta 80', 'Hotel Santa Elena', 'Colegio La Montaña'];

export default async function EmpresasPage() {
  const plans = await getPlans('empresa');
  return (
    <>
      <section className="relative overflow-hidden bg-noche text-crema">
        <Image src="/brand/fotos/barra-travesia.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-25" aria-hidden />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-noche via-noche/90 to-noche/40" />
        <div className="container-site relative py-16 lg:py-24">
          <Breadcrumbs dark items={[{ label: 'Empresas' }]} />
          <p className="eyebrow mt-10 mb-4 text-ambar-300">Travesía para empresas</p>
          <h1 className="max-w-3xl font-display text-[2.6rem] leading-[1.04] text-crema sm:text-6xl lg:text-7xl">
            El café de tu oficina <em className="font-normal text-ambar-300">también puede ser de verdad</em>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-crema/80">Café especial de Caicedo para oficinas, restaurantes, hoteles y eventos. Planes con factura electrónica, capacitación y un asesor que conoce tu equipo.</p>
          <a href="#cotizar" className="btn-ambar mt-9">
            Solicitar propuesta
          </a>
        </div>
      </section>

      <section aria-labelledby="beneficios" className="container-site py-16 lg:py-24">
        <h2 id="beneficios" className="title-lg max-w-2xl">
          Todo lo que tu equipo necesita para una buena pausa
        </h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, text }) => (
            <li key={title} className="card p-6">
              <Icon className="size-7 text-ambar-700" aria-hidden />
              <h3 className="mt-4 text-xl">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gris">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {plans.length ? (
        <section aria-labelledby="planes-empresa" className="bg-arena/60 py-16 lg:py-24">
          <div className="container-site">
            <p className="eyebrow mb-3">Planes</p>
            <h2 id="planes-empresa" className="title-lg">
              Elige el ritmo de tu oficina
            </h2>
            <div className="mt-12 grid max-w-4xl gap-6 md:grid-cols-2 md:items-center">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} cta={{ label: `Cotizar plan ${p.name}`, href: '#cotizar' }} />
              ))}
            </div>
            <p className="mt-8 text-sm text-gris">¿Más de 200 personas, varias sedes o marca propia? Armamos un plan a la medida.</p>
          </div>
        </section>
      ) : null}

      <section aria-label="Aliados" className="border-y border-noche/10 py-10">
        <div className="container-site">
          <p className="text-center text-xs font-semibold tracking-[0.25em] text-gris uppercase">Equipos que ya toman Travesía (ejemplos)</p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {ALLIES.map((a) => (
              <li key={a} className="font-display text-xl text-noche/45 italic">
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="cotizar" aria-labelledby="cotizar-title" className="container-site scroll-mt-24 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow mb-3">Cotiza sin compromiso</p>
            <h2 id="cotizar-title" className="title-lg">
              Cuéntanos de tu equipo
            </h2>
            <p className="lede mt-4">Te enviamos una propuesta en menos de 24 horas hábiles, con muestras para catar en tu oficina [CONFIRMAR CON EL CLIENTE].</p>
          </div>
          <LeadForm
            source="empresas"
            fields={['company', 'phone', 'size', 'interest', 'message']}
            interests={['Plan de café mensual', 'Café + capacitación', 'Kits y regalos corporativos', 'Catas para equipos', 'Restaurante / HORECA', 'Distribución']}
            submitLabel="Solicitar propuesta"
            successTitle="¡Gracias! Pronto te enviamos tu propuesta"
          />
        </div>
      </section>
    </>
  );
}
