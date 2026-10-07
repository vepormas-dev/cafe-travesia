import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPosts } from '@/lib/data/catalog';
import { Breadcrumbs } from '@/components/site/page-hero';
import { PostCard } from '@/components/site/post-card';
import { NewsletterForm } from '@/components/site/newsletter-form';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Notas de café: blog de cultura cafetera',
  description: 'Recetas, origen, cultura cafetera y noticias de Café Travesía. Aprende a preparar y disfrutar café de especialidad.',
  alternates: { canonical: '/blog' },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

async function BlogContent({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = typeof sp.categoria === 'string' ? sp.categoria : undefined;
  const all = await getPosts();
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))] as string[];
  const posts = category ? all.filter((p) => p.category === category) : all;
  const featured = !category ? (all.find((p) => p.isFeatured) ?? all[0]) : undefined;
  const rest = posts.filter((p) => p.slug !== featured?.slug);

  return (
    <>
      {featured ? (
        <section aria-label="Artículo destacado" className="container-site pb-16">
          <Link href={`/blog/${featured.slug}`} className="group grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16">
            <div className="relative aspect-[16/11] overflow-hidden rounded-[2rem] bg-arena">
              {featured.coverUrl ? <Image src={featured.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 55vw, 92vw" className="object-cover object-top transition duration-700 group-hover:scale-[1.03]" /> : null}
              <span className="absolute top-5 left-5 rounded-full bg-crema px-3 py-1 text-[0.65rem] font-bold tracking-widest text-noche uppercase">Destacado</span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-gris uppercase">
                {featured.category} — {featured.readingMin} min de lectura
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-noche transition group-hover:text-ambar-700 sm:text-5xl">{featured.title}</h2>
              {featured.excerpt ? <p className="lede mt-5">{featured.excerpt}</p> : null}
              <span className="mt-8 inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-noche uppercase">
                Leer artículo completo <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
              </span>
            </div>
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="archivo-title" className="border-t border-noche/10 bg-hueso/60 py-14 lg:py-20">
        <div className="container-site">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 id="archivo-title" className="title-lg">
              {category ?? 'Todas las notas'}
            </h2>
            <nav aria-label="Filtrar por categoría">
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Link href="/blog" scroll={false} className={cn('chip px-4 py-1.5', !category && 'chip-active')} aria-current={!category ? 'page' : undefined}>
                    Todas
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c}>
                    <Link href={`/blog?categoria=${encodeURIComponent(c)}`} scroll={false} className={cn('chip px-4 py-1.5', category === c && 'chip-active')} aria-current={category === c ? 'page' : undefined}>
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          {rest.length ? (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-gris">Pronto publicaremos más notas en esta categoría.</p>
          )}
        </div>
      </section>
    </>
  );
}

function BlogSkeleton() {
  return (
    <div className="container-site pb-16" aria-busy aria-label="Cargando artículos">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
        <div className="aspect-[16/11] animate-pulse rounded-[2rem] bg-arena" />
        <div className="space-y-4">
          <div className="h-4 w-40 animate-pulse rounded bg-arena" />
          <div className="h-12 w-full animate-pulse rounded bg-arena" />
          <div className="h-12 w-2/3 animate-pulse rounded bg-arena" />
          <div className="h-20 w-full animate-pulse rounded bg-arena/70" />
        </div>
      </div>
    </div>
  );
}

export default function BlogPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <header className="container-site pt-12 pb-14 lg:pt-16 lg:pb-20">
        <Breadcrumbs items={[{ label: 'Notas de café' }]} />
        <p className="eyebrow mt-10 mb-4 text-montana">Notas de café · Crónicas del grano</p>
        <h1 className="max-w-4xl font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">
          Explorando la cultura del <em className="font-normal">café consciente</em>.
        </h1>
      </header>
      <Suspense fallback={<BlogSkeleton />}>
        <BlogContent searchParams={searchParams} />
      </Suspense>
      <section className="container-site py-16">
        <div className="grid gap-8 rounded-[2rem] bg-noche p-8 text-crema sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-script text-3xl text-ambar">Una carta al mes</p>
            <h2 className="mt-1 font-display text-3xl text-crema sm:text-4xl">Recibe las Notas de café en tu correo</h2>
          </div>
          <NewsletterForm dark source="blog" />
        </div>
      </section>
    </>
  );
}
