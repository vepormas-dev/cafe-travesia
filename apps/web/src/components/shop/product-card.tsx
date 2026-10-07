import Image from 'next/image';
import Link from 'next/link';
import { Repeat } from 'lucide-react';
import { PRODUCT_KIND_LABEL, type ProductDTO } from '@travesia/shared';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { Price, Rating } from '@/components/ui/primitives';
import { QuickAdd } from './quick-add';
import { themeOf } from './color';
import { cn } from '@/lib/cn';

/** Tarjeta de producto en forma de arco (empaque Pergamino) con el color del origen. */
export function ProductCard({ product: p, priority, className }: { product: ProductDTO; priority?: boolean; className?: string }) {
  const th = themeOf(p);
  const isCoffee = p.kind === 'coffee';
  const notes = p.tastingNotes.slice(0, 3).join(' · ');
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <Link
        href={`/tienda/${p.slug}`}
        className="arch relative block aspect-[4/5] overflow-hidden ring-1 ring-noche/5 transition duration-500 group-hover:-translate-y-1 group-hover:shadow-elevada"
        style={{ backgroundColor: th.bg }}
        aria-label={`${p.name}${p.subtitle ? `, ${p.subtitle}` : ''}`}
      >
        <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.12]" />
        {isCoffee || !p.imageUrl ? (
          <>
            {p.imageUrl ? (
              <Image
                src={p.imageUrl}
                alt=""
                fill
                priority={priority}
                sizes="(min-width:1024px) 25vw, (min-width:640px) 45vw, 90vw"
                className="object-cover opacity-0 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
              />
            ) : null}
            <div className="absolute inset-x-[18%] top-[14%] bottom-[6%] transition duration-700 group-hover:translate-y-[4%] group-hover:scale-[0.92] group-hover:opacity-0">
              <CoffeeBag name={p.name} origin={p.originRegion} color={th.bg} accent={th.accent} className="h-full" />
            </div>
          </>
        ) : (
          <>
            <Image src={p.imageUrl} alt="" fill priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 45vw, 90vw" className="object-cover transition duration-700 group-hover:scale-105" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche-950/35 via-transparent to-transparent" />
          </>
        )}
        {p.badges[0] ? (
          <span className="absolute top-[18%] left-4 rounded-full bg-crema/95 px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-noche uppercase shadow-suave">{p.badges[0]}</span>
        ) : null}
        {p.compareAtCop && p.compareAtCop > p.priceFromCop ? (
          <span className="absolute top-[18%] right-4 rounded-full bg-cereza px-2.5 py-1 text-[0.65rem] font-bold text-crema">−{Math.round((1 - p.priceFromCop / p.compareAtCop) * 100)} %</span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 px-1 pt-4">
        <p className="eyebrow !text-[0.65rem]">{isCoffee ? (p.process ?? p.category ?? 'Café de origen') : PRODUCT_KIND_LABEL[p.kind]}</p>
        <h3 className="text-xl leading-snug">
          <Link href={`/tienda/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {p.name}
          </Link>
        </h3>
        <p className="line-clamp-1 text-sm text-gris italic">{notes || p.subtitle}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Rating value={p.ratingAvg} count={p.ratingCount} />
          {p.subscriptionEligible ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-montana">
              <Repeat className="size-3.5" aria-hidden /> Disponible para suscripción
            </span>
          ) : null}
        </div>
        <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-3">
          <Price value={p.priceFromCop} compareAt={p.compareAtCop} from={p.variants.length > 1} />
          <QuickAdd product={p} />
        </div>
      </div>
    </article>
  );
}
