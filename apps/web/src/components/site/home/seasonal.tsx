import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mountain } from 'lucide-react';
import { formatCOP, formatNumber, PROFILE_LABELS } from '@travesia/shared';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { getProduct, getSiteContent } from '@/lib/data/catalog';

const isLight = (hex: string) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 165;
};

/** Aclara (amt > 0) u oscurece (amt < 0) un color hex. */
const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const f = (c: number) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f);
  return `#${((1 << 24) | (r! << 16) | (g! << 8) | b!).toString(16).slice(1)}`;
};

/** b) "Edición temporada" a todo color (referente Pergamino). */
export async function HomeSeasonal() {
  const s = await getSiteContent('home.seasonal');
  if (!s.enabled) return null;
  const p = await getProduct(s.productSlug);
  if (!p) return null;
  const bg = p.themeColor ?? s.color ?? '#4D6630';
  const light = isLight(bg);
  const ink = light ? 'text-noche' : 'text-crema';
  const accent = p.accentColor ?? '#F5C27A';
  const bars = p.profile ? (['acidez', 'dulzor', 'cuerpo', 'complejidad'] as const).map((k) => ({ k, v: p.profile![k] })) : [];

  return (
    <section id="temporada" aria-labelledby="temporada-title" className={`relative scroll-mt-16 overflow-hidden ${ink}`} style={{ backgroundColor: bg }}>
      {/* Diagonal de luz y patrón */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(160deg,transparent_55%,rgb(255_255_255/0.08)_55%)]" />
      <div aria-hidden className="bg-andino absolute inset-x-0 bottom-0 h-10 opacity-30" />
      <div className="container-site relative grid items-center gap-x-10 gap-y-8 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
        <h2 id="temporada-title" className={`leading-[0.82] lg:col-span-2 ${ink}`}>
            <span className="block font-display text-6xl font-normal italic sm:text-8xl lg:text-[8.5rem]" style={{ color: accent }}>
              Edición
            </span>
            <span className="-mt-1 block font-display text-[3.4rem] font-black tracking-tight uppercase sm:text-[6.5rem] lg:text-[9.5rem]" style={{ color: accent }}>
              Temporada
            </span>
          </h2>
        <div>
          <p className="font-display text-3xl sm:text-4xl">{p.name}</p>
          <p className="mt-2 max-w-lg text-lg opacity-85">{s.subtitle || p.subtitle}</p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Notas de cata">
            {p.tastingNotes.map((n) => (
              <li key={n} className="rounded-full border border-current/30 px-3.5 py-1 text-sm">
                {n}
              </li>
            ))}
          </ul>
          <dl className="mt-8 grid max-w-xl grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {bars.map((b) => (
              <div key={b.k}>
                <dt className="text-xs font-semibold tracking-wider uppercase opacity-75">{PROFILE_LABELS[b.k]?.replace('Nivel de ', '')}</dt>
                <dd className="mt-2 flex gap-0.5" aria-label={`${b.v} de 10`}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <span key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i < b.v ? accent : 'currentColor', opacity: i < b.v ? 1 : 0.18 }} />
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link href={`/tienda/${p.slug}`} className="btn px-8 py-3.5 text-[0.95rem] text-noche shadow-elevada hover:brightness-105" style={{ backgroundColor: accent }}>
              Comprar ahora <ArrowRight className="size-4" aria-hidden />
            </Link>
            <p className="text-sm opacity-85">
              Desde <strong className="font-display text-2xl">{formatCOP(p.priceFromCop)}</strong>
            </p>
            {p.altitudeM ? (
              <p className="flex items-center gap-2 text-sm opacity-85">
                <Mountain className="size-4" aria-hidden /> {formatNumber(p.altitudeM)} msnm · {p.process}
              </p>
            ) : null}
          </div>
        </div>
        <div className="relative mx-auto w-[72%] max-w-[400px] lg:-mt-6 lg:w-[88%]">
          <div aria-hidden className="absolute inset-[8%] rounded-full blur-3xl" style={{ backgroundColor: accent, opacity: 0.35 }} />
          <div className="arch relative aspect-[4/5] overflow-hidden shadow-elevada ring-1 ring-black/10">
            {p.imageUrl ? (
              <Image src={p.imageUrl} alt={p.name} fill sizes="(min-width:1024px) 36vw, 80vw" className="object-cover" priority />
            ) : (
              <div className="absolute inset-x-[12%] top-[8%] bottom-[4%]">
                <CoffeeBag color={light ? shade(bg, -0.35) : shade(bg, -0.32)} accent={accent} name={p.name} origin={p.originRegion} className="drop-shadow-[0_40px_50px_rgba(0,0,0,0.4)]" />
              </div>
            )}
          </div>
          <p className="relative mt-6 rotate-[-4deg] text-center font-script text-3xl sm:text-4xl" style={{ color: accent }}>
            ¡Cuando se acaba, se acaba!
          </p>
        </div>
      </div>
    </section>
  );
}
