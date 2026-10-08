import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Clock, GraduationCap, MapPin, Phone, Quote, Star } from 'lucide-react';
import { FREQUENCY_LABEL, formatCOP, formatDate, LEVEL_LABEL, type PlanDTO } from '@travesia/shared';
import { BrandIcon } from '@/components/brand/logo';
import { getCourses, getPlans, getPosts, getProducts, getSiteContent, getStores } from '@/lib/data/catalog';
import { publicPhone } from '@/lib/public-contact';
import { cn } from '@/lib/cn';
import { ProductArchCard } from '../product-arch-card';
import { ScrollRail } from '../scroll-rail';
import { StoreIllustration } from '../store-illustration';
import { Emphasis } from '../emphasis';
import { NewsletterForm } from '../newsletter-form';
import { FaqList } from '../faq-list';
import { ChatOpenButton } from '../chat-open-button';
import { AppBadges } from '../app-badges';

// ---------------------------------------------------------------------------
// c) Café fresco
// ---------------------------------------------------------------------------
export async function HomeFreshCoffee() {
  const coffees = await getProducts({ kind: 'coffee' });
  if (!coffees.length) return null;
  return (
    <section aria-labelledby="fresco-title" className="overflow-hidden py-20 lg:py-28">
      <div className="container-site">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 id="fresco-title" className="font-display text-5xl tracking-tight uppercase sm:text-6xl">
            Café <span className="font-black">fresco</span>
          </h2>
          <p className="lede mt-4">Lotes de altura de Caicedo, tostados cada semana en pequeñas cantidades y enviados recién empacados.</p>
          <Link href="/tienda?tipo=coffee" className="btn-outline btn-sm mt-6">
            Ver todos nuestros cafés <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <ScrollRail label="Cafés de origen">
          {coffees.map((p, i) => (
            <div key={p.id} className="w-[76%] shrink-0 snap-start sm:w-[44%] lg:w-[calc(25%-15px)]">
              <ProductArchCard product={p} priority={i < 2} />
            </div>
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// d) Del grano a tu taza
// ---------------------------------------------------------------------------
export async function HomeStory() {
  const story = await getSiteContent('home.story');
  return (
    <section aria-labelledby="historia-title" className="relative overflow-hidden bg-arena py-20 lg:py-28">
      <div aria-hidden className="bg-grano absolute inset-0" />
      <div className="container-site relative grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative mx-auto w-full max-w-md">
          <div className="arch relative aspect-[4/5] overflow-hidden shadow-elevada">
            <Image src="/brand/fotos/barra-travesia.webp" alt="Barista de Café Travesía preparando bebidas en la barra" fill sizes="(min-width: 1024px) 34vw, 90vw" className="object-cover" />
          </div>
          <div className="absolute -right-4 -bottom-6 w-40 rotate-3 rounded-2xl bg-hueso p-4 shadow-elevada sm:-right-10">
            <p className="font-script text-2xl leading-none text-ambar-700">48 h</p>
            <p className="mt-1 text-xs leading-snug text-noche/80">del tueste a tu puerta en el Valle de Aburrá</p>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-3">Así trabajamos</p>
          <h2 id="historia-title" className="title-xl">
            <Emphasis text={story.title} word={/sin escalas/i} className="text-ambar-700" />
          </h2>
          <p className="lede mt-5 max-w-xl">{story.body}</p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {story.pillars.map((p, i) => (
              <li key={p.title} className="group">
                <span className="relative grid size-20 place-items-center rounded-full bg-hueso text-tostado shadow-suave transition group-hover:bg-noche group-hover:text-ambar">
                  <BrandIcon name={p.icon} className="size-11" />
                  <span className="absolute -top-1 -right-1 grid size-7 place-items-center rounded-full bg-ambar text-xs font-bold text-noche">0{i + 1}</span>
                </span>
                <h3 className="mt-4 text-xl">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gris">{p.text}</p>
              </li>
            ))}
          </ol>
          <Link href="/tienda" className="btn-primary mt-10">
            Comprar ahora <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// f) Suscripciones
// ---------------------------------------------------------------------------
export function PlanCard({ plan, cta }: { plan: PlanDTO; cta?: { label: string; href: string } }) {
  const hi = plan.isHighlighted;
  const save = plan.compareAtCop && plan.compareAtCop > plan.priceCop ? Math.round((1 - plan.priceCop / plan.compareAtCop) * 100) : 0;
  return (
    <article className={cn('relative flex h-full flex-col rounded-[2rem] p-8 transition duration-300 hover:-translate-y-1', hi ? 'bg-noche text-crema shadow-elevada lg:-my-4 lg:py-12' : 'border border-noche/10 bg-hueso shadow-suave')}>
      {hi ? <span className="absolute -top-3.5 left-8 rounded-full bg-ambar px-3.5 py-1 text-xs font-bold tracking-wider text-noche uppercase">El más elegido</span> : null}
      {hi ? <div aria-hidden className="bg-andino pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.06]" /> : null}
      <p className={cn('eyebrow relative', hi && 'text-ambar-300')}>{FREQUENCY_LABEL(plan.frequencyWeeks)}</p>
      <h3 className={cn('relative mt-2 text-3xl', hi && 'text-crema')}>{plan.name}</h3>
      <p className={cn('relative mt-1 text-sm', hi ? 'text-crema/70' : 'text-gris')}>{plan.tagline}</p>
      <p className="relative mt-6 flex items-baseline gap-2">
        <span className="font-display text-5xl tabular-nums">{formatCOP(plan.priceCop)}</span>
        <span className={cn('text-sm', hi ? 'text-crema/60' : 'text-gris')}>/ entrega</span>
      </p>
      {save ? (
        <p className={cn('relative mt-1 text-sm', hi ? 'text-ambar-300' : 'text-montana')}>
          <s className="opacity-70">{formatCOP(plan.compareAtCop)}</s> · ahorras {save} %
        </p>
      ) : (
        <p className="mt-1 h-5" />
      )}
      <ul className="relative mt-6 flex-1 space-y-3 text-[0.95rem]">
        {plan.benefits.map((b) => (
          <li key={b} className="flex gap-3">
            <Check className={cn('mt-0.5 size-4 shrink-0', hi ? 'text-ambar' : 'text-montana')} aria-hidden /> {b}
          </li>
        ))}
        {plan.includesAcademy ? (
          <li className="flex gap-3 font-semibold">
            <GraduationCap className={cn('mt-0.5 size-4 shrink-0', hi ? 'text-ambar' : 'text-montana')} aria-hidden /> Academia Travesía incluida
          </li>
        ) : null}
      </ul>
      <Link href={cta?.href ?? `/suscripciones/${plan.slug}`} className={cn('relative mt-8 w-full', hi ? 'btn-ambar' : 'btn-primary')}>
        {cta?.label ?? `Elegir ${plan.name}`} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}

export async function HomePlans() {
  const plans = (await getPlans('personal')).slice(0, 3);
  if (!plans.length) return null;
  // El destacado al centro
  const sorted = [...plans].sort((a, b) => Number(a.isHighlighted) - Number(b.isHighlighted));
  if (sorted.length === 3) sorted.splice(1, 0, sorted.pop()!);
  return (
    <section aria-labelledby="planes-title" className="relative py-20 lg:py-28">
      <div className="container-site">
        <div className="mb-14 grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="eyebrow mb-3">Suscripción Travesía</p>
            <h2 id="planes-title" className="title-xl">
              Suscríbete y viaja <em className="font-normal text-ambar-700">cada mes</em>
            </h2>
          </div>
          <p className="lede lg:pb-2">Recibe una bolsa recién tostada en tu puerta, descubre perfiles exclusivos y ahorra hasta un 15 %. Sin ataduras: pausa, salta un envío o cancela cuando quieras.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3 lg:items-center">
          {sorted.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-gris">
          ¿Para tu oficina?{' '}
          <Link href="/empresas" className="link">
            Conoce los planes para empresas
          </Link>
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// g) Academia
// ---------------------------------------------------------------------------
export async function HomeAcademy() {
  const courses = (await getCourses({ featured: true })).slice(0, 3);
  if (!courses.length) return null;
  return (
    <section aria-labelledby="academia-title" className="relative overflow-hidden bg-noche-950 py-20 text-crema lg:py-28">
      <Image src="/brand/fotos/latte-travesia.webp" alt="" fill sizes="100vw" className="object-cover opacity-[0.12]" aria-hidden />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-noche-950 via-noche-950/90 to-noche-950" />
      <div className="container-site relative">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4 flex items-center gap-2 text-hoja">
              <BrandIcon name="academia" className="size-5 text-hoja" /> Academia Travesía
            </p>
            <h2 id="academia-title" className="font-display text-4xl leading-[1.05] text-crema sm:text-5xl lg:text-6xl">
              Aprende el arte del café <em className="font-normal text-ambar-300">con quienes lo cultivan</em>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-crema/70">Formación técnica y sensorial con Gabo y Alex: del cafeto a la extracción perfecta, a tu ritmo y con certificado verificable.</p>
          </div>
          <Link href="/academia" className="btn bg-crema text-noche hover:bg-ambar-300">
            Ver cursos <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {courses.map((c, i) => (
            <li key={c.id} className={cn(i === 1 && 'md:translate-y-10')}>
              <Link href={`/academia/cursos/${c.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-noche-800">
                  {c.coverUrl ? <Image src={c.coverUrl} alt="" fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover object-top opacity-90 transition duration-700 group-hover:scale-105 group-hover:opacity-100" /> : null}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche-950 via-noche-950/30 to-transparent" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="rounded-full bg-crema/95 px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-noche uppercase">{LEVEL_LABEL[c.level]}</span>
                    {c.isFree ? <span className="rounded-full bg-hoja px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-noche uppercase">Gratis</span> : null}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-xs font-semibold tracking-[0.18em] text-ambar-300 uppercase">{c.category}</p>
                    <h3 className="mt-2 font-display text-2xl leading-tight text-crema">{c.title}</h3>
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-crema/70">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden /> {c.durationMin} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-ambar text-ambar" aria-hidden /> {c.ratingAvg.toFixed(1)}
                      </span>
                      <span>{c.instructorName}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold tabular-nums">{c.isFree ? 'Gratis' : formatCOP(c.priceCop)}</span>
                  {c.includedInSubscription && !c.isFree ? <span className="text-xs text-crema/60">Incluido en Maestro Premium</span> : null}
                  <ArrowUpRight className="size-5 text-crema/40 transition group-hover:text-ambar" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// h) Origen
// ---------------------------------------------------------------------------
export async function HomeOrigin() {
  const [about, impact] = await Promise.all([getSiteContent('about'), getSiteContent('impact')]);
  const families = impact.stats.find((s) => /familias/i.test(s.label));
  return (
    <section aria-labelledby="origen-title" className="py-20 lg:py-28">
      <div className="container-site grid gap-14 lg:grid-cols-2 lg:items-center">
        <div className="relative grid grid-cols-[1.4fr_1fr] gap-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem]">
            <Image src="/brand/fotos/manos-cafe-caicedo.webp" alt="Manos de un caficultor de Caicedo sosteniendo café pergamino" fill sizes="(min-width: 1024px) 28vw, 55vw" className="object-cover object-top" />
          </div>
          <div className="flex flex-col gap-4 pt-16">
            <div className="arch relative aspect-[3/4] overflow-hidden">
              <Image src="/brand/video/caicedo-jeep.webp" alt="Jeep cargado de bultos de café en una calle de Caicedo" fill sizes="(min-width: 1024px) 18vw, 38vw" className="object-cover" />
            </div>
            <div className="rounded-2xl bg-noche p-5 text-crema">
              <p className="font-display text-4xl">1.900</p>
              <p className="text-xs tracking-wide text-crema/70">metros sobre el nivel del mar</p>
            </div>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-3">Nuestro origen</p>
          <h2 id="origen-title" className="title-xl">
            Venimos de Caicedo, donde el café <em className="font-normal text-ambar-700">no solo se cultiva: se vive</em>
          </h2>
          <p className="lede mt-6">{about.intro}</p>
          <figure className="relative mt-10 rounded-[1.75rem] border border-noche/10 bg-hueso p-8 shadow-suave">
            <Quote className="absolute -top-4 left-8 size-9 rounded-full bg-ambar p-2 text-noche" aria-hidden />
            <blockquote className="font-display text-2xl leading-snug text-noche italic">“Cultivamos, tostamos y servimos café especial. Porque si vas a tomar café… que sea de verdad.”</blockquote>
            <figcaption className="mt-4 flex items-center gap-3 text-sm">
              <span className="grid size-10 place-items-center rounded-full bg-noche font-script text-lg text-ambar">G</span>
              <span>
                <strong className="block text-noche">Gabriel “Gabo”</strong>
                <span className="text-gris">Fundador y tostador</span>
              </span>
            </figcaption>
          </figure>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link href="/nosotros" className="btn-primary">
              Conoce nuestra historia <ArrowRight className="size-4" aria-hidden />
            </Link>
            {families ? (
              <p className="text-sm text-gris">
                <strong className="font-display text-2xl text-noche">{families.value}</strong> {families.label}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// i) Notas de café (blog)
// ---------------------------------------------------------------------------
export async function HomeNotes() {
  const posts = await getPosts({ limit: 3 });
  if (!posts.length) return null;
  return (
    <section aria-labelledby="notas-title" className="grid lg:grid-cols-2">
      <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-noche-800 p-8 text-crema sm:p-12 lg:p-16">
        <Image src="/brand/fotos/taza-frase.webp" alt="" fill sizes="50vw" className="object-cover opacity-[0.14] mix-blend-luminosity" aria-hidden />
        <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.06]" />
        <h2 id="notas-title" className="relative leading-[0.85] text-crema">
          <span className="block font-display text-[5.5rem] font-black tracking-tight uppercase sm:text-[8rem] lg:text-[9rem]">Notas</span>
          <span className="flex items-baseline gap-4">
            <span className="font-display text-4xl uppercase sm:text-5xl">de</span>
            <span className="font-display text-[5.5rem] font-normal italic text-ambar-300 sm:text-[8rem] lg:text-[9rem]">café</span>
          </span>
        </h2>
        <div className="relative mt-10">
          <p className="max-w-sm text-sm font-semibold tracking-[0.18em] text-crema/80 uppercase">Nuestros apuntes sobre el mundo del café de especialidad</p>
          <Link href="/blog" className="btn-light btn-sm mt-6">
            Ver todas las notas <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="bg-crema p-8 sm:p-12 lg:p-16">
        <p className="eyebrow mb-3">Blog Travesía</p>
        <p className="font-display text-3xl text-noche sm:text-4xl">Conocimiento, historias y recetas para tomar mejor café.</p>
        <ul className="mt-8 divide-y divide-noche/10">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="group flex gap-5 py-5">
                <span className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-arena">
                  {p.coverUrl ? <Image src={p.coverUrl} alt="" fill sizes="96px" className="object-cover transition duration-500 group-hover:scale-110" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="text-[0.68rem] font-semibold tracking-[0.18em] text-ambar-700 uppercase">
                    {p.category} · {p.readingMin} min
                  </span>
                  <span className="mt-1 block font-display text-xl leading-snug text-noche group-hover:text-ambar-700">{p.title}</span>
                  <span className="mt-1 block text-xs text-gris">{formatDate(p.publishedAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-3xl bg-arena/70 p-6">
          <p className="font-display text-xl text-noche">Recibe las Notas de café en tu correo</p>
          <p className="mb-4 text-sm text-gris">Una carta al mes: recetas, cosechas y lanzamientos de temporada.</p>
          <NewsletterForm source="home-notas" />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// j) Nuestro propósito
// ---------------------------------------------------------------------------
export async function HomePurpose() {
  const impact = await getSiteContent('impact');
  return (
    <section aria-labelledby="proposito-title" className="relative overflow-hidden bg-ambar py-20 text-noche">
      <div aria-hidden className="divider-andino absolute inset-x-0 top-0 h-4 opacity-100 [filter:brightness(0.3)]" />
      <div className="container-site relative text-center">
        <p className="text-xs font-bold tracking-[0.3em] uppercase">Nuestro propósito</p>
        <h2 id="proposito-title" className="mx-auto mt-4 max-w-3xl font-display text-3xl leading-tight sm:text-4xl">
          {impact.title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-noche/80">{impact.intro}</p>
        <dl className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-8 lg:grid-cols-4">
          {impact.stats.map((s) => (
            <div key={s.label} className="border-t-2 border-noche/80 pt-4">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block font-display text-5xl font-semibold tabular-nums sm:text-6xl">{s.value}</span>
                <span className="mt-2 block text-sm leading-snug text-noche/80">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
        <Link href="/impacto" className="btn-primary mt-12">
          Conoce más <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// k) Nuestras tiendas
// ---------------------------------------------------------------------------
export { GoogleG } from '@/components/auth/google-g';
import { GoogleG } from '@/components/auth/google-g';

export async function HomeStores() {
  const [stores, experiences] = await Promise.all([getStores(), getProducts({ kind: 'experience' })]);
  if (!stores.length) return null;
  const tour = experiences.find((e) => /tour|caicedo/.test(e.slug)) ?? experiences[0];
  return (
    <section aria-labelledby="tiendas-title" className="py-20 lg:py-28">
      <div className="container-site">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 id="tiendas-title" className="font-display text-5xl leading-[0.95] sm:text-6xl">
            Nuestras
            <br />
            <span className="font-black">tiendas</span>
          </h2>
          <Link href="/tiendas" className="btn-outline btn-sm">
            Ver más información <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-6 md:grid-cols-2">
          {stores.map((s) => (
            <li key={s.slug} className="group grid overflow-hidden rounded-[2rem] border border-noche/10 bg-hueso shadow-suave sm:grid-cols-[1fr_1.1fr]">
              <div className="relative flex flex-col items-center justify-center gap-4 bg-arena/60 p-8">
                <StoreIllustration kind={s.kind} className="max-w-[220px] transition duration-500 group-hover:scale-105" />
                {s.imageUrl ? (
                  <span className="relative hidden h-24 w-20 overflow-hidden rounded-t-full sm:block">
                    <Image src={s.imageUrl} alt="" fill sizes="80px" className="object-cover object-bottom" />
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col p-7">
                <p className="eyebrow">{s.kind === 'finca' ? 'Origen · visitas con reserva' : 'Barra y tienda'}</p>
                <h3 className="mt-2 text-2xl">{s.name}</h3>
                <p className="mt-2 text-sm text-gris">{s.description}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-noche/85">
                  <li className="flex gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-ambar-700" aria-hidden /> {s.address}
                  </li>
                  {s.hours.map((h) => (
                    <li key={h} className="flex gap-2.5">
                      <Clock className="mt-0.5 size-4 shrink-0 text-ambar-700" aria-hidden /> {h}
                    </li>
                  ))}
                  {publicPhone(s.phone) ? (
                    <li className="flex gap-2.5">
                      <Phone className="mt-0.5 size-4 shrink-0 text-ambar-700" aria-hidden /> {publicPhone(s.phone)}
                    </li>
                  ) : null}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  {s.mapUrl ? (
                    <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm bg-white">
                      Ir con Google <GoogleG />
                    </a>
                  ) : null}
                  {s.kind === 'finca' && tour ? (
                    <Link href={`/tienda/${tour.slug}`} className="btn-primary btn-sm">
                      Reservar experiencia <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ) : s.menuUrl ? (
                    <a href={s.menuUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                      Ver carta y más <ArrowRight className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <Link href="/tiendas" className="btn-primary btn-sm">
                      Ver carta y más <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// l) Catas & tours
// ---------------------------------------------------------------------------
export async function HomeExperiences() {
  const experiences = await getProducts({ kind: 'experience' });
  if (!experiences.length) return null;
  return (
    <section aria-labelledby="experiencias-title" className="relative overflow-hidden bg-montana py-20 text-crema lg:py-28">
      <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.07]" />
      <div className="container-site relative">
        <div className="mb-12 grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="eyebrow mb-3 text-ambar-300">Catas & tours</p>
            <h2 id="experiencias-title" className="font-display text-4xl leading-tight text-crema sm:text-5xl">
              Vive el café <em className="font-normal text-ambar-300">con los cinco sentidos</em>
            </h2>
          </div>
          <p className="text-lg text-crema/75">Únete a nuestras catas sensoriales en Medellín o vive una travesía de un día por las fincas de Caicedo: recolecta, conoce el beneficio y tuesta tu propio lote.</p>
        </div>
        <ul className="grid gap-6 md:grid-cols-2">
          {experiences.map((e) => {
            const next = e.variants.filter((v) => v.eventAt && v.inStock).sort((a, b) => a.eventAt!.localeCompare(b.eventAt!))[0];
            return (
              <li key={e.id}>
                <Link href={`/tienda/${e.slug}`} className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[2rem]">
                  {e.imageUrl ? <Image src={e.imageUrl} alt="" fill sizes="(min-width: 768px) 45vw, 92vw" className="z-0 object-cover transition duration-700 group-hover:scale-105" /> : null}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche-950/95 via-noche-950/40 to-transparent" />
                  <div className="relative p-7 sm:p-9">
                    {e.badges[0] ? <span className="mb-3 inline-block rounded-full bg-ambar px-3 py-1 text-[0.65rem] font-bold tracking-wider text-noche uppercase">{e.badges[0]}</span> : null}
                    <h3 className="font-display text-3xl text-crema">{e.name}</h3>
                    <p className="mt-1 text-crema/75">{e.subtitle}</p>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-crema/20 pt-5">
                      <span className="flex items-center gap-2 text-sm text-crema/85">
                        <CalendarDays className="size-4 text-ambar" aria-hidden />
                        {next ? `Próxima fecha: ${next.name.split('·')[0]!.trim()}` : 'Nuevas fechas pronto'}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-display text-2xl text-crema tabular-nums">{formatCOP(e.priceFromCop)}</span>
                        <span className="btn-ambar btn-sm">Reservar</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// m) App, FAQ
// ---------------------------------------------------------------------------
export async function HomeApp() {
  const apps = await getSiteContent('app_links');
  const features = ['Pide y repite tu café favorito en dos toques', 'Gestiona tu suscripción: pausa, salta o cambia de café', 'Tus cursos de la Academia, también sin conexión', 'Puntos Travesía y beneficios exclusivos', 'Avisos de envío y lanzamientos de temporada'];
  return (
    <section aria-labelledby="app-title" className="py-20 lg:py-28">
      <div className="container-site">
        <div className="relative grid overflow-hidden rounded-[2.5rem] bg-noche text-crema lg:grid-cols-[1.1fr_0.9fr]">
          <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.05]" />
          <div className="relative p-8 sm:p-12 lg:p-16">
            <p className="font-script text-3xl text-ambar">Travesía en tu bolsillo</p>
            <h2 id="app-title" className="mt-2 font-display text-4xl leading-tight text-crema sm:text-5xl">
              La app de Café Travesía
            </h2>
            <p className="mt-4 max-w-md text-crema/70">Una sola cuenta para la tienda, la Academia y la app. Todo sincronizado: tu carrito, tus pedidos y tu progreso.</p>
            <ul className="mt-8 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex gap-3 text-[0.95rem] text-crema/85">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-ambar text-noche">
                    <Check className="size-3" aria-hidden />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <AppBadges ios={apps.ios} android={apps.android} className="mt-10" />
          </div>
          {/* Teléfono ilustrado */}
          <div className="relative flex items-end justify-center px-8 pt-4 lg:pt-16">
            <div aria-hidden className="absolute bottom-0 left-1/2 size-[420px] -translate-x-1/2 translate-y-1/3 rounded-full bg-ambar/25 blur-3xl" />
            <div aria-hidden className="relative w-[270px] translate-y-10 rounded-[2.6rem] border-[10px] border-noche-950 bg-crema shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6)] ring-1 ring-crema/20">
              <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-noche-950" />
              <div className="space-y-3 px-4 pt-4 pb-16 text-noche">
                <div className="flex items-center justify-between">
                  <span className="font-script text-xl">Café Travesía</span>
                  <span className="size-7 rounded-full bg-ambar" />
                </div>
                <div className="rounded-2xl border border-noche/10 bg-hueso p-3">
                  <p className="text-[0.55rem] font-bold tracking-[0.2em] text-gris uppercase">Plan activo</p>
                  <p className="font-display text-lg">Maestro Premium</p>
                  <p className="mt-2 text-[0.65rem] text-gris">Próxima entrega</p>
                  <p className="text-xs font-semibold">En 6 días · Café Travesía Especial</p>
                </div>
                <div className="relative h-28 overflow-hidden rounded-2xl">
                  <Image src="/brand/fotos/latte-travesia.webp" alt="" fill sizes="240px" className="object-cover" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-crema/90 px-2 py-0.5 text-[0.6rem] font-semibold">Academia · 68 %</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-noche p-3 text-crema">
                  <span className="text-xs">Puntos Travesía</span>
                  <span className="font-display text-lg text-ambar-300">1.240</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function HomeFaq() {
  const faq = await getSiteContent('faq');
  if (!faq.items.length) return null;
  return (
    <section aria-labelledby="faq-title" className="bg-hueso py-20 lg:py-28">
      <div className="container-site grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <BrandIcon name="faq" className="size-14 text-ambar-700" />
          <h2 id="faq-title" className="title-lg mt-4">
            Preguntas frecuentes
          </h2>
          <p className="lede mt-4">Lo que más nos preguntan en la barra y por WhatsApp.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ChatOpenButton className="btn-primary">Preguntarle al asistente</ChatOpenButton>
            <Link href="/preguntas-frecuentes" className="btn-ghost">
              Ver todas <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <FaqList items={faq.items} />
      </div>
    </section>
  );
}
