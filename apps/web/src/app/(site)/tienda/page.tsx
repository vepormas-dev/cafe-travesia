import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Clock, GraduationCap, Repeat, Truck } from 'lucide-react';
import { LEVEL_LABEL, formatCOP } from '@travesia/shared';
import { getCourses, getPlans, getProducts } from '@/lib/data/catalog';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { BrandIcon } from '@/components/brand/logo';
import { PatternDivider, Price, Rating, SectionHeading } from '@/components/ui/primitives';
import { AiSearch } from '@/components/shop/ai-search';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { ProductGrid } from '@/components/shop/product-grid';
import { filterProducts } from '@/components/shop/catalog-utils';
import { AddCourseButton } from '@/components/shop/quick-add';

export const metadata: Metadata = {
  title: 'Tienda de café especial',
  description: 'Café de origen de Caicedo, Antioquia, tostado cada semana. Accesorios de barismo, kits de regalo, catas y tours. Envíos a toda Colombia.',
  alternates: { canonical: '/tienda' },
};

export default async function TiendaPage() {
  const [products, courses, plans] = await Promise.all([getProducts(), getCourses(), getPlans('personal')]);
  const hero = products.filter((p) => p.kind === 'coffee').slice(0, 3);
  const paidCourses = courses.filter((c) => !c.isFree && c.priceCop > 0).slice(0, 3);
  const bestPlan = plans.find((p) => p.isHighlighted) ?? plans[0];
  const minPlan = plans.reduce((m, p) => Math.min(m, p.priceCop), Infinity);

  return (
    <>
      {/* Hero editorial */}
      <section className="relative overflow-hidden bg-arena">
        <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.07]" />
        <div className="container-site relative grid items-center gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div className="max-w-2xl animate-fade-up">
            <p className="eyebrow">Tienda Travesía · Tostado esta semana</p>
            <h1 className="title-xl mt-4">
              Café de montaña, <em className="text-ambar-700">del árbol a tu taza</em>
            </h1>
            <p className="lede mt-5 max-w-xl">Lotes de altura de Caicedo, Antioquia, tostados en pequeñas tandas y despachados en 48 horas. Elige tu origen, tu molienda y prepáralo como te guste.</p>
            <div className="mt-8">
              <AiSearch products={products} />
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-noche/80">
              <li className="flex items-center gap-2">
                <Truck className="size-4 text-ambar-700" aria-hidden /> Envío gratis en el Valle de Aburrá desde {formatCOP(99000)}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-ambar-700" aria-hidden /> Despacho en 48 h
              </li>
            </ul>
          </div>
          <div aria-hidden className="relative mx-auto hidden h-[420px] w-full max-w-md lg:block">
            {hero.map((p, i) => (
              <div
                key={p.id}
                className="arch absolute bottom-0 w-[46%] overflow-hidden pt-10 shadow-elevada transition duration-700 hover:-translate-y-2"
                style={{ backgroundColor: p.themeColor ?? '#111A31', left: `${i * 27}%`, height: `${78 + (i === 1 ? 22 : 0)}%`, zIndex: i === 1 ? 2 : 1, transform: `rotate(${(i - 1) * 4}deg)` }}
              >
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt="" fill sizes="180px" className="object-cover" />
                ) : (
                  <div className="relative px-4">
                    <CoffeeBag name={p.name} origin={p.originRegion} color={p.themeColor} accent={p.accentColor} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <PatternDivider />
      </section>

      {/* Catálogo */}
      <section className="container-site py-10" aria-labelledby="catalogo">
        <h2 id="catalogo" className="sr-only">
          Catálogo
        </h2>
        <Suspense fallback={<ProductGrid products={filterProducts(products, {})} />}>
          <ShopCatalog products={products} />
        </Suspense>
      </section>

      {/* Banner suscripciones */}
      {bestPlan ? (
        <section className="container-site py-10">
          <div className="relative grid overflow-hidden rounded-[2rem] bg-noche text-crema lg:grid-cols-2">
            <div aria-hidden className="bg-andino absolute inset-0 opacity-10" />
            <div className="relative z-10 p-8 sm:p-12">
              <p className="eyebrow !text-ambar-300">Suscripciones Travesía</p>
              <h2 className="title-lg mt-3 !text-crema">
                Nunca te quedes <em className="text-ambar">sin café de verdad</em>
              </h2>
              <p className="mt-4 max-w-md text-crema/75">Recibe café recién tostado cada 2 o 4 semanas, con envío gratis y hasta 25 % menos que en tienda. Pausa, salta o cancela cuando quieras.</p>
              <ul className="mt-6 space-y-2 text-sm text-crema/85">
                {bestPlan.benefits.slice(0, 3).map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <Repeat className="size-4 text-ambar" aria-hidden /> {b}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/suscripciones" className="btn-ambar">
                  Ver planes desde {formatCOP(minPlan)} <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href={`/suscripciones/${bestPlan.slug}`} className="btn-light">
                  {bestPlan.name}
                </Link>
              </div>
            </div>
            <div className="relative min-h-64">
              <Image src={bestPlan.imageUrl ?? '/brand/fotos/latte-travesia.webp'} alt="Latte preparado con café Travesía" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-noche via-noche/30 to-transparent lg:via-noche/10" />
            </div>
          </div>
        </section>
      ) : null}

      {/* Cursos */}
      {paidCourses.length ? (
        <section className="container-site py-14" aria-labelledby="cursos-tienda">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Academia Travesía" title={<span id="cursos-tienda">Cursos de la Academia</span>} intro="Aprende a preparar en casa como en barra, con Gabo y Alex. Acceso de por vida y certificado verificable." />
            <Link href="/academia" className="link text-sm">
              Ver toda la Academia
            </Link>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {paidCourses.map((c) => (
              <li key={c.id} className="card group flex flex-col overflow-hidden">
                <Link href={`/academia/${c.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-noche">
                  {c.coverUrl ? (
                    <Image src={c.coverUrl} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="grid size-full place-items-center text-ambar">
                      <div aria-hidden className="bg-andino absolute inset-0 opacity-15" />
                      <BrandIcon name="academia" className="size-16" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-crema/95 px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-noche uppercase">{LEVEL_LABEL[c.level]}</span>
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="text-xl">
                    <Link href={`/academia/${c.slug}`} className="hover:text-ambar-700">
                      {c.title}
                    </Link>
                  </h3>
                  {c.subtitle ? <p className="line-clamp-2 text-sm text-gris">{c.subtitle}</p> : null}
                  <div className="flex items-center gap-3 text-xs text-gris">
                    <Rating value={c.ratingAvg} count={c.ratingCount} />
                    <span className="flex items-center gap-1">
                      <GraduationCap className="size-3.5" aria-hidden /> {c.lessonsCount} lecciones
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <Price value={c.priceCop} compareAt={c.compareAtCop} />
                    <AddCourseButton course={c} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
