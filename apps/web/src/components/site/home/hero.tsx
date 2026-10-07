import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Leaf, MapPin, Truck } from 'lucide-react';
import { getSiteContent } from '@/lib/data/catalog';
import { HeroVideo } from '../hero-video';
import { Emphasis } from '../emphasis';

/** a) Hero inmersivo con el video real de Caicedo. */
export async function HomeHero() {
  const hero = await getSiteContent('home.hero');
  const poster = hero.posterUrl || hero.imageUrl;
  return (
    <section aria-labelledby="hero-title" className="relative -mt-16 overflow-hidden bg-noche text-crema lg:-mt-20">
      {/* Fondo de escritorio: póster desenfocado + patrón andino */}
      <div aria-hidden className="absolute inset-0 hidden lg:block">
        <Image src={poster} alt="" fill priority sizes="100vw" className="scale-110 object-cover opacity-45 blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgb(235_154_55/0.18),transparent_55%)]" />
        <div className="bg-andino absolute inset-0 opacity-[0.05]" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-noche/80 via-noche/45 to-noche lg:bg-gradient-to-r lg:from-noche lg:via-noche/85 lg:to-noche/30" />

      <div className="container-site relative grid min-h-[100svh] items-center gap-10 pt-28 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:pt-32 lg:pb-16">
        {/* Video: fondo a pantalla completa en móvil, arco protagonista en escritorio */}
        <div className="absolute inset-0 -z-0 lg:relative lg:inset-auto lg:order-2 lg:mx-auto lg:w-full lg:max-w-[440px]">
          <div className="absolute inset-0 lg:relative lg:aspect-[9/14] lg:overflow-hidden lg:arch lg:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)] lg:ring-1 lg:ring-crema/15">
            <HeroVideo src={hero.videoUrl} poster={poster} label="Video: un jeep cargado de café sube por las calles de Caicedo, Antioquia; recolección y caficultores" className="size-full" />
            <div aria-hidden className="absolute inset-0 bg-noche/55 lg:bg-gradient-to-t lg:from-noche/70 lg:via-transparent lg:to-transparent" />
            <p className="absolute bottom-6 left-6 hidden font-script text-3xl text-crema lg:block">Caicedo, Antioquia</p>
          </div>
          {/* Sello giratorio */}
          <div aria-hidden className="absolute -top-8 -left-10 hidden size-32 lg:block">
            <svg viewBox="0 0 120 120" className="size-full animate-[spin_24s_linear_infinite] text-ambar">
              <defs>
                <path id="hero-circle" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" />
              </defs>
              <circle cx="60" cy="60" r="58" fill="#111A31" />
              <text fontSize="10.5" fontWeight="700" letterSpacing="3.2" fill="currentColor" fontFamily="var(--font-dm-sans), sans-serif">
                <textPath href="#hero-circle">CAFÉ ESPECIAL · DE LA FINCA A TU TAZA ·</textPath>
              </text>
            </svg>
            <span className="absolute inset-0 grid place-items-center font-script text-3xl text-crema">1.900</span>
            <span className="absolute inset-x-0 bottom-[30%] text-center text-[0.55rem] font-bold tracking-[0.2em] text-crema/70">MSNM</span>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl lg:order-1">
          <p className="eyebrow mb-5 flex items-center gap-2 text-ambar-300">
            <span aria-hidden className="h-px w-8 bg-ambar" /> {hero.eyebrow}
          </p>
          <h1 id="hero-title" className="font-display text-[2.85rem] leading-[1.02] font-semibold tracking-tight text-crema text-shadow-soft sm:text-6xl lg:text-[5.2rem]">
            <Emphasis text={hero.title} word={/travesía/i} />
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-crema/85 sm:text-xl">{hero.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={hero.primaryCta.href} className="btn-ambar px-7 py-3.5 text-[0.95rem]">
              {hero.primaryCta.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href={hero.secondaryCta.href} className="btn-light px-7 py-3.5 text-[0.95rem]">
              {hero.secondaryCta.label}
            </Link>
          </div>
          <ul className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-crema/15 pt-6 text-xs text-crema/75 sm:text-sm">
            <li className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <MapPin className="size-4 text-ambar" aria-hidden /> Origen único
            </li>
            <li className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <Leaf className="size-4 text-ambar" aria-hidden /> Tueste semanal
            </li>
            <li className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <Truck className="size-4 text-ambar" aria-hidden /> Envío a toda Colombia
            </li>
          </ul>
        </div>
      </div>

      <a href="#temporada" className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] font-semibold tracking-[0.3em] text-crema/70 uppercase hover:text-crema sm:flex" aria-label="Bajar a la edición de temporada">
        <span className="flex h-10 w-6 justify-center rounded-full border border-crema/40 pt-2">
          <span className="h-2 w-1 animate-bounce rounded-full bg-ambar" />
        </span>
        Desliza
      </a>
    </section>
  );
}
