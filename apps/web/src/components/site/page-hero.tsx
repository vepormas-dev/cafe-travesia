import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, dark }: { items: Crumb[]; dark?: boolean }) {
  return (
    <nav aria-label="Ruta de navegación" className={cn('text-xs', dark ? 'text-crema/60' : 'text-gris')}>
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:underline">
            Inicio
          </Link>
        </li>
        {items.map((c) => (
          <li key={c.label} className="flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden />
            {c.href ? (
              <Link href={c.href} className="hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className={dark ? 'text-crema/90' : 'text-noche'}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Encabezado editorial de páginas internas (con foto opcional en arco). */
export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  imageAlt = '',
  crumbs,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('relative overflow-hidden border-b border-noche/10', className)}>
      <div aria-hidden className="bg-grano absolute inset-0" />
      <div className={cn('container-site relative grid gap-10 py-14 lg:py-20', image && 'lg:grid-cols-[1.2fr_0.8fr] lg:items-center')}>
        <div>
          {crumbs ? (
            <div className="mb-8">
              <Breadcrumbs items={crumbs} />
            </div>
          ) : null}
          {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
          <h1 className="font-display text-[2.6rem] leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">{title}</h1>
          {intro ? <p className="lede mt-6 max-w-2xl">{intro}</p> : null}
          {children}
        </div>
        {image ? (
          <div className="relative mx-auto w-full max-w-sm">
            <div className="arch relative aspect-[4/5] overflow-hidden shadow-elevada">
              <Image src={image} alt={imageAlt} fill priority sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover" />
            </div>
            <div aria-hidden className="divider-andino absolute -bottom-5 left-1/2 w-2/3 -translate-x-1/2" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
