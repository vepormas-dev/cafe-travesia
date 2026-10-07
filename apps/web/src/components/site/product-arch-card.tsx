import Image from 'next/image';
import Link from 'next/link';
import type { ProductDTO } from '@travesia/shared';
import { formatCOP } from '@travesia/shared';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { cn } from '@/lib/cn';

/** Tarjeta en ARCO estilo empaque (referente Pergamino): fondo del color de origen + bolsa o foto. */
export function ProductArchCard({ product, className, priority }: { product: ProductDTO; className?: string; priority?: boolean }) {
  const p = product;
  const bg = p.themeColor ?? '#111A31';
  const isCoffee = p.kind === 'coffee';
  return (
    <Link href={`/tienda/${p.slug}`} className={cn('group block focus-visible:outline-none', className)} aria-label={`${p.name}, desde ${formatCOP(p.priceFromCop)}`}>
      <div className="arch relative aspect-[4/5] overflow-hidden ring-offset-4 ring-offset-crema transition group-focus-visible:ring-2 group-focus-visible:ring-ambar" style={{ backgroundColor: bg }}>
        <div aria-hidden className="bg-andino absolute inset-x-0 bottom-0 h-16 opacity-25" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgb(255_255_255/0.22),transparent_60%)]" />
        {isCoffee ? (
          <div className="absolute inset-x-[16%] top-[14%] bottom-[6%] transition duration-500 ease-out group-hover:-translate-y-2 group-hover:-rotate-2">
            <CoffeeBag color={p.themeColor} accent={p.accentColor} name={p.name} origin={p.originRegion} />
          </div>
        ) : p.imageUrl ? (
          <Image src={p.imageUrl} alt={p.name} fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 75vw" priority={priority} className="object-cover transition duration-700 group-hover:scale-105" />
        ) : null}
        {p.badges[0] ? <span className="absolute top-[18%] left-4 rounded-full bg-crema/95 px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-noche uppercase shadow-suave">{p.badges[0]}</span> : null}
      </div>
      <div className="mt-4 border-b border-noche/15 pb-4">
        <h3 className="font-display text-xl leading-tight text-noche transition group-hover:text-ambar-700">{p.name}</h3>
        <p className="mt-0.5 text-sm text-gris">{isCoffee ? (p.originRegion ?? p.subtitle) : p.subtitle}</p>
        {isCoffee && p.tastingNotes.length ? <p className="mt-2 text-xs tracking-wide text-noche/70">{p.tastingNotes.join(' · ')}</p> : null}
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="leading-none">
            <span className="block text-[0.65rem] font-semibold tracking-[0.18em] text-gris uppercase">Desde</span>
            <span className="mt-1 block font-display text-2xl text-noche tabular-nums">{formatCOP(p.priceFromCop)}</span>
          </p>
          {p.subscriptionEligible ? (
            <span className="text-right text-[0.7rem] leading-tight text-noche/70">
              Disponible para <strong className="font-semibold text-noche">suscripción</strong>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
