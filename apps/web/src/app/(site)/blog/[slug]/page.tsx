import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock } from 'lucide-react';
import { brand, formatDate, readingMinutes } from '@travesia/shared';
import { env } from '@/lib/env';
import { getPost, getPosts } from '@/lib/data/catalog';
import { Markdown } from '@/components/ui/primitives';
import { BrandIcon } from '@/components/brand/logo';
import { Breadcrumbs } from '@/components/site/page-hero';
import { PostCard } from '@/components/site/post-card';
import { ShareButtons } from '@/components/site/share-buttons';
import { JsonLd } from '@/components/site/json-ld';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Nota no encontrada' };
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title, description, publishedTime: post.publishedAt, authors: post.authorName ? [post.authorName] : undefined, images: post.coverUrl ? [{ url: post.coverUrl }] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: post.coverUrl ? [post.coverUrl] : undefined },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const all = await getPosts();
  const related = [...all.filter((p) => p.slug !== post.slug && p.category === post.category), ...all.filter((p) => p.slug !== post.slug && p.category !== post.category)].slice(0, 3);
  const minutes = post.readingMin || readingMinutes(post.content);
  const url = `${env.siteUrl}/blog/${post.slug}`;
  const isBrew = /prepar|receta|chemex|v60|espresso|metodo/i.test(`${post.category} ${post.title} ${post.tags.join(' ')}`);

  return (
    <article>
      <header className="container-site pt-10 pb-10 lg:pt-14">
        <Breadcrumbs items={[{ label: 'Notas de café', href: '/blog' }, { label: post.title }]} />
        <div className="mx-auto mt-10 max-w-3xl text-center">
          <Link href={`/blog?categoria=${encodeURIComponent(post.category ?? '')}`} className="eyebrow hover:underline">
            {post.category}
          </Link>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] tracking-tight sm:text-6xl">{post.title}</h1>
          {post.excerpt ? <p className="lede mx-auto mt-6 max-w-2xl">{post.excerpt}</p> : null}
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gris">
            <span className="font-semibold text-noche">{post.authorName ?? 'Equipo Travesía'}</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span className="flex items-center gap-1">
              <Clock className="size-4" aria-hidden /> {minutes} min de lectura
            </span>
          </p>
        </div>
      </header>

      {post.coverUrl ? (
        <div className="container-site">
          <div className="relative mx-auto aspect-[16/8] max-w-5xl overflow-hidden rounded-[2rem] bg-arena">
            <Image src={post.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 64rem, 100vw" className="object-cover object-top" />
          </div>
        </div>
      ) : null}

      <div className="container-site">
        <div className="mx-auto max-w-3xl py-14">
          <Markdown className="first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.85] first-letter:text-ambar-700">{post.content}</Markdown>
          {post.tags.length ? (
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Etiquetas">
              {post.tags.map((t) => (
                <li key={t} className="chip">
                  #{t}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-y border-noche/10 py-6">
            <ShareButtons url={url} title={post.title} />
            <Link href="/blog" className="link text-sm">
              ← Todas las notas
            </Link>
          </div>

          {/* CTA */}
          <aside className="relative mt-12 overflow-hidden rounded-[2rem] bg-noche p-8 text-crema sm:p-10">
            <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.06]" />
            <BrandIcon name={isBrew ? 'academia' : 'granos'} className="relative size-10 text-ambar" />
            <p className="relative mt-4 font-display text-3xl text-crema">{isBrew ? 'Aprende la receta con Alex, paso a paso' : '¿Se te antojó? Pruébalo en casa'}</p>
            <p className="relative mt-2 text-crema/70">{isBrew ? 'En la Academia Travesía tienes video, guías y certificado. Gratis para empezar.' : 'Café de origen de Caicedo, tostado cada semana y enviado recién empacado.'}</p>
            <div className="relative mt-6 flex flex-wrap gap-3">
              <Link href={isBrew ? '/academia' : '/tienda?tipo=coffee'} className="btn-ambar">
                {isBrew ? 'Ir a la Academia' : 'Ver cafés de origen'} <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href={isBrew ? '/tienda?tipo=coffee' : '/academia'} className="btn-light">
                {isBrew ? 'Comprar café' : 'Cursos de la Academia'}
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby="rel-title" className="border-t border-noche/10 bg-hueso/60 py-16">
          <div className="container-site">
            <h2 id="rel-title" className="title-lg mb-10">
              Sigue leyendo
            </h2>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt ?? undefined,
          image: post.coverUrl ? [post.coverUrl.startsWith('http') ? post.coverUrl : `${env.siteUrl}${post.coverUrl}`] : undefined,
          datePublished: post.publishedAt,
          author: { '@type': post.authorName && !/equipo/i.test(post.authorName) ? 'Person' : 'Organization', name: post.authorName ?? brand.name },
          publisher: { '@type': 'Organization', name: brand.name, logo: { '@type': 'ImageObject', url: `${env.siteUrl}/brand/logo.png` } },
          mainEntityOfPage: url,
          keywords: post.tags.join(', '),
          articleSection: post.category ?? undefined,
          inLanguage: 'es-CO',
        }}
      />
    </article>
  );
}
