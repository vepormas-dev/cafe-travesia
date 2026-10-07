import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, HandCoins, Leaf, Sprout } from 'lucide-react';
import { getSiteContent } from '@/lib/data/catalog';
import { Breadcrumbs } from '@/components/site/page-hero';

export const metadata: Metadata = {
  title: 'Nuestro impacto social y ambiental',
  description: 'Comercio justo, sostenibilidad y formación para la nueva generación cafetera de Caicedo, Antioquia.',
  alternates: { canonical: '/impacto' },
};

const ICONS = [HandCoins, Leaf, Sprout];

export default async function ImpactoPage() {
  const impact = await getSiteContent('impact');
  const [first, ...rest] = impact.title.split(',');
  return (
    <>
      <section className="relative -mt-px flex min-h-[78vh] items-end overflow-hidden bg-noche text-crema">
        <Image src="/brand/fotos/manos-cafe-caicedo.webp" alt="Manos de caficultor de Caicedo con café recién beneficiado" fill priority sizes="100vw" className="object-cover object-[50%_40%]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche via-noche/60 to-noche/10" />
        <div className="container-site relative pt-24 pb-16 lg:pb-24">
          <Breadcrumbs dark items={[{ label: 'Impacto' }]} />
          <h1 className="mt-8 max-w-4xl font-display text-[2.6rem] leading-[1.02] text-crema sm:text-6xl lg:text-7xl">
            {first}
            {rest.length ? (
              <>
                ,<br />
                <em className="font-normal text-ambar-300">{rest.join(',').trim()}</em>
              </>
            ) : null}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-crema/85">{impact.intro}</p>
        </div>
      </section>

      <section aria-label="Cifras" className="bg-ambar text-noche">
        <dl className="container-site grid grid-cols-2 gap-8 py-14 lg:grid-cols-4">
          {impact.stats.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block font-display text-5xl font-semibold tabular-nums sm:text-6xl">{s.value}</span>
                <span className="mt-2 block text-sm text-noche/80">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pilares-title" className="container-site py-16 lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">Nuestros pilares</p>
          <h2 id="pilares-title" className="title-lg">
            Lo que cada compra hace posible
          </h2>
        </div>
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {impact.pillars.map((p, i) => {
            const Icon = ICONS[i % ICONS.length]!;
            return (
              <li key={p.title} className="group relative overflow-hidden rounded-[2rem] border border-noche/10 bg-hueso p-8 shadow-suave">
                <span className="grid size-14 place-items-center rounded-2xl bg-montana/10 text-montana transition group-hover:bg-montana group-hover:text-crema">
                  <Icon className="size-7" aria-hidden />
                </span>
                <h3 className="mt-6 text-2xl">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-gris">{p.text}</p>
                <span aria-hidden className="absolute -right-6 -bottom-10 font-display text-[9rem] leading-none text-noche/[0.04]">
                  {i + 1}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="relative overflow-hidden bg-montana py-16 text-crema lg:py-24">
        <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.07]" />
        <div className="container-site relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
            <Image src="/brand/video/caicedo-jeep.webp" alt="Jeep con la cosecha de café subiendo por Caicedo" fill sizes="(min-width: 1024px) 45vw, 92vw" className="object-cover" />
          </div>
          <div>
            <p className="font-script text-3xl text-ambar-300">Trazabilidad total</p>
            <h2 className="mt-2 font-display text-4xl text-crema sm:text-5xl">Sabes de dónde viene cada grano</h2>
            <p className="mt-4 text-lg text-crema/80">Cada lote lleva su finca, su altura, su variedad y su proceso. Lo puedes ver en la ficha de cada café y, si quieres, vivirlo en persona en la Travesía cafetera por Caicedo.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tienda?tipo=coffee" className="btn-ambar">
                Ver cafés de origen <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/tienda?tipo=experience" className="btn-light">
                Visitar la finca
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
