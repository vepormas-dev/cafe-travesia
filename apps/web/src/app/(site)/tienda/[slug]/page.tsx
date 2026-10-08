import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, ChevronRight, Droplets, Flame, Leaf, Mountain, Sprout, Thermometer, Timer } from 'lucide-react';
import { PRODUCT_KIND_LABEL, brand, formatDate, formatNumber, type ProductDTO } from '@travesia/shared';
import { getPlans, getProduct, getProducts } from '@/lib/data/catalog';
import { getApprovedReviews, getProductSeo } from '@/lib/shop';
import { env } from '@/lib/env';
import { BrandIcon } from '@/components/brand/logo';
import { Markdown, PatternDivider, Rating, SectionHeading } from '@/components/ui/primitives';
import { themeOf } from '@/components/shop/color';
import { SensoryProfile } from '@/components/shop/sensory-profile';
import { ProductGallery } from '@/components/shop/product-gallery';
import { ProductPurchase } from '@/components/shop/product-purchase';
import { ReviewForm } from '@/components/shop/review-form';
import { guideFor } from '@/components/shop/brew-guides';
import { Recommendations } from '@/components/cart/recommendations';
import { cn } from '@/lib/cn';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const products = await getProducts();
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: 'travesia-caicedo' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Producto no encontrado' };
  const seo = await getProductSeo(slug);
  const description = seo.description ?? plain(p.description).slice(0, 160);
  const image = p.imageUrl ?? p.gallery[0];
  return {
    title: seo.title ? { absolute: seo.title } : `${p.name}${p.subtitle ? ` · ${p.subtitle}` : ''}`,
    description,
    alternates: { canonical: `/tienda/${p.slug}` },
    openGraph: { title: seo.title ?? p.name, description, images: image ? [{ url: image }] : undefined, type: 'website' },
    twitter: { card: 'summary_large_image', title: seo.title ?? p.name, description, images: image ? [image] : undefined },
  };
}

const plain = (md: string | null | undefined) => (md ?? '').replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const [reviews, plans] = await Promise.all([getApprovedReviews(p.id, p.slug), getPlans('personal')]);
  const th = themeOf(p);
  const dark = th.tone === 'dark';
  const isCoffee = p.kind === 'coffee';
  const photos = [...new Set([p.imageUrl, ...p.gallery].filter(Boolean) as string[])];
  const savingPct = plans.reduce((m, pl) => (pl.compareAtCop ? Math.max(m, Math.round((1 - pl.priceCop / pl.compareAtCop) * 100)) : m), 0);
  const firstPara = plain(p.description?.split(/\n\s*\n/)[0]);
  const storyPhotos = [...photos, '/brand/video/caicedo-jeep.webp', '/brand/fotos/manos-cafe-caicedo.webp'].filter((x, i, a) => a.indexOf(x) === i);

  const specs: { label: string; value: string; icon: React.ReactNode }[] = [
    p.originRegion ? { label: 'Origen', value: p.originRegion, icon: <Sprout className="size-4" aria-hidden /> } : null,
    p.process ? { label: 'Proceso', value: p.process, icon: <Droplets className="size-4" aria-hidden /> } : null,
    p.variety ? { label: 'Variedad', value: p.variety, icon: <Leaf className="size-4" aria-hidden /> } : null,
    p.altitudeM ? { label: 'Altitud', value: `${formatNumber(p.altitudeM)} msnm`, icon: <Mountain className="size-4" aria-hidden /> } : null,
    p.roastLevel ? { label: 'Tueste', value: p.roastLevel, icon: <Flame className="size-4" aria-hidden /> } : null,
  ].filter(Boolean) as { label: string; value: string; icon: React.ReactNode }[];

  const prices = p.variants.map((v) => v.priceCop);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: plain(p.description) || p.subtitle,
    image: photos.map((x) => (x.startsWith('http') ? x : `${env.siteUrl}${x}`)),
    sku: p.id,
    brand: { '@type': 'Brand', name: brand.name },
    category: PRODUCT_KIND_LABEL[p.kind],
    ...(p.ratingCount ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount, bestRating: 5, worstRating: 1 } } : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'COP',
      lowPrice: prices.length ? Math.min(...prices) : p.priceFromCop,
      highPrice: prices.length ? Math.max(...prices) : p.priceFromCop,
      offerCount: p.variants.length,
      availability: p.variants.some((v) => v.inStock) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${env.siteUrl}/tienda/${p.slug}`,
      seller: { '@type': 'Organization', name: brand.name },
    },
    ...(reviews.length
      ? { review: reviews.slice(0, 5).map((r) => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating }, author: { '@type': 'Person', name: r.author }, reviewBody: r.body })) }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* Bloque superior a todo color */}
      <section className="relative overflow-hidden" style={{ backgroundColor: th.bg, color: th.ink }}>
        <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.07]" />
        <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(118deg, transparent 0 52%, ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,26,49,0.05)'} 52% 100%)` }} />
        <div className="container-site relative pt-6 pb-14 lg:pb-20">
          <nav aria-label="Ruta de navegación" className="mb-8 text-xs font-semibold tracking-[0.18em] uppercase">
            <ol className="flex flex-wrap items-center gap-2 opacity-80">
              <li>
                <Link href="/tienda" className="hover:underline">
                  Tienda
                </Link>
              </li>
              <ChevronRight className="size-3" aria-hidden />
              <li>
                <Link href={`/tienda?tipo=${p.kind}`} className="hover:underline">
                  {PRODUCT_KIND_LABEL[p.kind]}
                </Link>
              </li>
              <ChevronRight className="size-3" aria-hidden />
              <li aria-current="page" className="opacity-100">
                {p.name}
              </li>
            </ol>
          </nav>

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            {/* Perfil */}
            <aside className="order-3 lg:order-1 lg:col-span-3" aria-label={isCoffee ? 'Perfil sensorial' : 'Detalles'}>
              <p className="font-display text-6xl leading-none italic sm:text-7xl" style={{ color: th.tone === 'dark' ? th.accent : th.ink }}>
                Perfil
              </p>
              {p.tastingNotes.length ? (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label="Notas de cata">
                  {p.tastingNotes.map((n) => (
                    <li key={n} className={cn('rounded-full border px-3 py-1 text-sm font-medium', dark ? 'border-crema/40' : 'border-noche/25')}>
                      {n}
                    </li>
                  ))}
                </ul>
              ) : null}
              {p.profile ? (
                <SensoryProfile profile={p.profile} tone={th.tone} className="mt-8" />
              ) : (
                <div className={cn('mt-6 text-[0.95rem] leading-relaxed', dark ? 'opacity-90' : 'text-noche/80')}>
                  <Markdown dark={dark} className="prose-base">
                    {p.description}
                  </Markdown>
                </div>
              )}
              {p.brewMethods.length ? (
                <div className="mt-8">
                  <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">Ideal para</p>
                  <p className="mt-2 text-sm">{p.brewMethods.join(' · ')}</p>
                </div>
              ) : null}
            </aside>

            {/* Galería */}
            <div className="order-1 lg:order-2 lg:col-span-5">
              <ProductGallery name={p.name} origin={p.originRegion} color={th.bg} accent={th.accent} photos={photos} showBag={photos.length === 0} tone={th.tone} />
            </div>

            {/* Compra */}
            <div className="order-2 lg:order-3 lg:col-span-4">
              {p.badges.length ? (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {p.badges.map((b) => (
                    <li key={b} className={cn('rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] uppercase', dark ? 'bg-crema/15' : 'bg-noche/10')}>
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}
              <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl" style={{ color: th.ink }}>
                {p.name}
              </h1>
              {p.subtitle ? <p className="mt-2 font-display text-lg italic opacity-85">{p.subtitle}</p> : null}
              <div className="mt-3">
                <Rating value={p.ratingAvg} count={p.ratingCount} className={dark ? '!text-crema/90 [&_.text-gris]:!text-crema/70' : ''} />
              </div>
              {firstPara && p.profile ? <p className="mt-4 text-[0.95rem] leading-relaxed opacity-90">{firstPara}</p> : null}
              {specs.length ? (
                <dl className={cn('mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border', dark ? 'border-crema/20 bg-crema/20' : 'border-noche/10 bg-noche/10')}>
                  {specs.map((s) => (
                    <div key={s.label} className="p-3" style={{ backgroundColor: th.bg }}>
                      <dt className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wider uppercase opacity-75">
                        {s.icon} {s.label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="mt-7">
                <ProductPurchase product={p} tone={th.tone} savingPct={savingPct} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <PatternDivider />

      {/* Historia de origen */}
      {p.story || p.producer || p.kind !== 'coffee' ? <OriginStory p={p} photos={storyPhotos} /> : null}

      {/* Métodos de preparación */}
      {p.brewMethods.length ? (
        <section className="bg-arena py-16" aria-labelledby="preparacion">
          <div className="container-site">
            <SectionHeading eyebrow="Cómo prepararlo" title={<span id="preparacion">Métodos recomendados</span>} intro={`Recetas base de nuestra barra para sacarle todo a ${p.name}. Ajusta a tu gusto: el mejor café es el que te gusta a vos.`} />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {p.brewMethods.slice(0, 6).map((m) => {
                const g = guideFor(m);
                return (
                  <li key={m} className="card flex flex-col p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl">{m}</h3>
                      <BrandIcon name={/espresso/i.test(m) ? 'maquina-espresso' : 'granos'} className="size-9 text-ambar-700" />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-gris">Proporción</dt>
                        <dd className="font-semibold">
                          {g.ratio} · {g.dose}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gris">Molienda</dt>
                        <dd className="font-semibold">{g.grind}</dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1 text-xs text-gris">
                          <Thermometer className="size-3" aria-hidden /> Agua
                        </dt>
                        <dd className="font-semibold">{g.temp}</dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1 text-xs text-gris">
                          <Timer className="size-3" aria-hidden /> Tiempo
                        </dt>
                        <dd className="font-semibold">{g.time}</dd>
                      </div>
                    </dl>
                    <ol className="mt-5 space-y-2 border-t border-noche/10 pt-4 text-sm text-noche/80">
                      {g.steps.map((s, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-noche text-[0.65rem] font-bold text-crema">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
            <p className="mt-8 text-sm text-noche/80">
              ¿Quieres dominar cada método?{' '}
              <Link href="/academia" className="link">
                Aprende con Gabo y Alex en la Academia
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* Combina con */}
      <section className="container-site py-16">
        <Recommendations context="product" productSlug={p.slug} title="Combina con ✨" exclude={[p.id, p.slug]} />
      </section>

      {/* Reseñas */}
      <section id="resenas" className="container-site scroll-mt-24 pb-24" aria-labelledby="resenas-t">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <div>
            <h2 id="resenas-t" className="title-lg">
              Reseñas
            </h2>
            {p.ratingCount ? (
              <div className="mt-4">
                <p className="font-display text-6xl text-noche">{p.ratingAvg.toFixed(1)}</p>
                <Rating value={p.ratingAvg} count={p.ratingCount} />
                <p className="mt-1 text-sm text-gris">{formatNumber(p.ratingCount)} calificaciones de clientes</p>
              </div>
            ) : (
              <p className="mt-4 text-gris">Aún no hay calificaciones.</p>
            )}
            <div className="mt-6">
              <ReviewForm productId={p.id} slug={p.slug} />
            </div>
          </div>
          <div>
            {reviews.length ? (
              <ul className="divide-y divide-noche/10">
                {reviews.map((r) => (
                  <li key={r.id} className="py-6 first:pt-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex" aria-label={`${r.rating} de 5 estrellas`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} aria-hidden className={n <= r.rating ? 'text-ambar' : 'text-noche/20'}>
                            ★
                          </span>
                        ))}
                      </span>
                      <span className="font-semibold text-noche">{r.author}</span>
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-montana">
                          <BadgeCheck className="size-3.5" aria-hidden /> Compra verificada
                        </span>
                      ) : null}
                      <span className="text-xs text-gris">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.title ? <p className="mt-2 font-display text-lg text-noche">{r.title}</p> : null}
                    {r.body ? <p className="mt-1 text-noche/80">{r.body}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-noche/20 p-8 text-center">
                <p className="font-display text-xl text-noche">Cuéntanos cómo te supo</p>
                <p className="mt-1 text-sm text-gris">Las reseñas de clientes aparecerán aquí después de una revisión rápida de nuestro equipo.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function OriginStory({ p, photos }: { p: ProductDTO; photos: string[] }) {
  const isCoffee = p.kind === 'coffee';
  return (
    <section className="container-site py-16 lg:py-24" aria-labelledby="origen">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <div className="arch relative aspect-[4/5] max-w-[240px] overflow-hidden shadow-suave">
            <Image src={photos[0]!} alt={`Origen de ${p.name}`} fill sizes="240px" className="object-cover" />
          </div>
          {p.producer ? (
            <div className="mt-5 max-w-[240px] border-b border-noche/15 pb-5">
              <p className="text-sm text-gris">Productor(es)</p>
              <p className="font-display text-xl text-noche">{p.producer}</p>
              {p.originFarm ? <p className="text-sm text-gris">{p.originFarm}</p> : null}
            </div>
          ) : null}
          {p.altitudeM ? (
            <div className="mt-5 flex items-center gap-3">
              <Mountain className="size-9 text-noche" strokeWidth={1.4} aria-hidden />
              <div>
                <p className="text-sm text-gris">Altitud</p>
                <p className="font-display text-2xl text-noche">{formatNumber(p.altitudeM)} m</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid gap-8 lg:col-span-9 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] lg:col-span-2 lg:aspect-[16/7]">
            <Image src={photos[1] ?? photos[0]!} alt={`Paisaje cafetero de ${p.originRegion ?? brand.origin}`} fill sizes="(min-width:1024px) 70vw, 100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche/50 to-transparent" />
            <p className="absolute bottom-5 left-6 font-script text-3xl text-crema sm:text-4xl">{p.originRegion ?? brand.origin}</p>
          </div>
          <div>
            <p className="eyebrow">{isCoffee ? 'Historia de origen' : 'Sobre este producto'}</p>
            <h2 id="origen" className="title-lg mt-3">
              {isCoffee ? (
                <>
                  Un pedazo de <em className="text-ambar-700">montaña</em> en cada bolsa
                </>
              ) : (
                p.name
              )}
            </h2>
            <Markdown className="mt-5 prose-base">{p.story ?? null}</Markdown>
          </div>
          <div>
            <Markdown className="prose-base">{p.description}</Markdown>
            {photos[2] ? (
              <div className="relative mt-6 aspect-[4/5] max-w-xs overflow-hidden rounded-[1.5rem]">
                <Image src={photos[2]} alt="Café Travesía en taza" fill sizes="320px" className="object-cover" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
