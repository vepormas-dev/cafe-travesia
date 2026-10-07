import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Award, Check, Quote, Sparkles, Star } from 'lucide-react';
import { formatCOP, formatNumber } from '@travesia/shared';
import { getCourses, getPlans, getPosts } from '@/lib/data/catalog';
import { BrandIcon } from '@/components/brand/logo';
import { PatternDivider } from '@/components/ui/primitives';
import { CourseCard } from '@/components/academy/course-card';
import { CATEGORY_ICON, courseDuration, InstructorAvatar } from '@/components/academy/course-meta';
import { ContinueLearning } from '@/components/academy/continue-learning';

export const metadata: Metadata = {
  title: 'Academia · Aprende el arte del café en Caicedo',
  description: 'Cursos de café especial con los baristas y tostadores de Café Travesía: origen, espresso, tueste y métodos en casa. Empieza gratis y certifícate.',
  alternates: { canonical: '/academia' },
};

const TESTIMONIOS = [
  { quote: 'Pasé de comprar café de paquete a calibrar mi espresso en casa. Alex explica como si estuvieras en la barra con él.', name: 'Laura M.', place: 'Envigado', course: 'Maestría en Extracción' },
  { quote: 'Entender los procesos lavado, honey y natural me cambió la forma de elegir café. Y el curso es gratis, ¡qué nivel!', name: 'Santiago R.', place: 'Bogotá', course: 'Fundamentos del Grano' },
  { quote: 'Lo hicimos con todo el equipo de la oficina. Ahora el V60 de las 3 p. m. es sagrado.', name: 'Catalina P.', place: 'Medellín', course: 'Métodos de Filtrado' },
];

export default async function AcademiaPage() {
  const [courses, plans, posts] = await Promise.all([getCourses(), getPlans('personal'), getPosts({ limit: 1 })]);
  const featured = courses.filter((c) => c.isFeatured);
  const premium = plans.find((p) => p.includesAcademy) ?? null;
  const free = courses.find((c) => c.isFree);
  const categories = [...new Set(courses.map((c) => c.category).filter(Boolean) as string[])].map((name) => ({ name, count: courses.filter((c) => c.category === name).length }));
  const instructors = [...new Map(courses.filter((c) => c.instructorName).map((c) => [c.instructorName!, c])).values()].map((c) => ({
    name: c.instructorName!,
    title: c.instructorTitle,
    bio: c.instructorBio,
    cover: c.coverUrl,
    courses: courses.filter((x) => x.instructorName === c.instructorName),
  }));
  const totals = {
    lessons: courses.reduce((n, c) => n + c.lessonsCount, 0),
    students: courses.reduce((n, c) => n + c.studentsCount, 0),
    rating: courses.length ? courses.reduce((n, c) => n + c.ratingAvg, 0) / courses.length : 0,
  };
  const post = posts[0];

  return (
    <div className="bg-noche-950 text-crema">
      {/* Hero */}
      <section className="relative isolate min-h-[640px] overflow-hidden lg:min-h-[720px]">
        <Image src="/brand/fotos/barra-travesia.webp" alt="Barista de Café Travesía preparando café en la barra" fill priority sizes="100vw" className="-z-20 object-cover object-[50%_35%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-noche-950 via-noche-950/75 to-noche-950/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-noche-950 to-transparent" aria-hidden />
        <div className="container-site flex min-h-[640px] flex-col justify-center py-20 lg:min-h-[720px]">
          <div className="max-w-2xl animate-fade-up">
            <p className="text-[0.75rem] font-bold tracking-[0.24em] text-[#c9dfa4] uppercase">Academia Travesía · Experiencia Caicedo</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] text-crema sm:text-6xl lg:text-7xl">
              Aprende el arte del café en <em className="text-ambar-300">Caicedo</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-crema/80">
              Sumérgete en el corazón de las montañas antioqueñas. Formación técnica y sensorial, de la finca a la barra, con quienes cultivan, tuestan y sirven nuestro café.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/academia/cursos" className="btn rounded-md bg-crema px-7 py-3.5 text-noche hover:bg-white">
                Ver cursos <ArrowRight className="size-4" aria-hidden />
              </Link>
              {free ? (
                <Link href={`/academia/cursos/${free.slug}`} className="btn-light rounded-md px-7 py-3.5">
                  Empieza gratis
                </Link>
              ) : null}
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {[
                { k: 'Lecciones', v: formatNumber(totals.lessons) },
                { k: 'Estudiantes', v: `${formatNumber(totals.students)}+` },
                { k: 'Calificación', v: totals.rating ? `${totals.rating.toFixed(1)} ★` : '—' },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.18em] text-crema/55 uppercase">{s.k}</dt>
                  <dd className="mt-1 font-display text-3xl text-crema">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <ContinueLearning />
      </Suspense>

      {/* Destacados */}
      <section className="py-20" aria-labelledby="destacados">
        <div className="container-site">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-ambar-300">Cursos destacados</p>
              <h2 id="destacados" className="title-lg mt-2 text-crema">Tu campus editorial</h2>
              <p className="mt-3 max-w-xl text-crema/65">Un viaje curado por la historia, la técnica y la pasión por el café de especialidad.</p>
            </div>
            <Link href="/academia/cursos" className="text-sm font-semibold tracking-[0.16em] text-[#a9c97a] uppercase hover:text-crema">
              Ver todos →
            </Link>
          </div>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length ? featured : courses).slice(0, 3).map((c) => (
              <li key={c.id}>
                <CourseCard course={c} dark />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Categorías */}
      <section className="bg-crema py-20 text-noche" aria-labelledby="categorias">
        <div className="container-site">
          <p className="eyebrow">Categorías</p>
          <h2 id="categorias" className="title-lg mt-2">¿Por dónde quieres empezar?</h2>
          <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((cat) => (
              <li key={cat.name}>
                <Link
                  href={`/academia/cursos?categoria=${encodeURIComponent(cat.name)}`}
                  className="group flex h-full flex-col gap-6 rounded-2xl border border-noche/10 bg-hueso p-6 transition hover:-translate-y-1 hover:border-noche hover:bg-noche hover:text-crema"
                >
                  <BrandIcon name={CATEGORY_ICON[cat.name] ?? 'academia'} className="size-12 text-ambar-700 transition group-hover:text-ambar-300" />
                  <span>
                    <span className="block font-display text-2xl">{cat.name}</span>
                    <span className="text-sm text-gris group-hover:text-crema/60">
                      {cat.count} {cat.count === 1 ? 'curso' : 'cursos'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <PatternDivider className="bg-crema" />

      {/* Instructores */}
      <section className="py-20" aria-labelledby="instructores">
        <div className="container-site">
          <p className="eyebrow text-ambar-300">Instructores</p>
          <h2 id="instructores" className="title-lg mt-2 text-crema">Aprende con quienes lo hacen todos los días</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {instructors.map((i) => (
              <li key={i.name} className="group relative overflow-hidden rounded-3xl border border-white/10">
                {i.cover ? <Image src={i.cover} alt="" fill sizes="(min-width: 768px) 45vw, 92vw" className="object-cover opacity-40 transition duration-700 group-hover:scale-105 group-hover:opacity-50" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-noche-950 via-noche-950/80 to-noche-950/30" aria-hidden />
                <div className="relative flex min-h-[320px] flex-col justify-end p-7">
                  <InstructorAvatar name={i.name} className="size-14 text-base" />
                  <h3 className="mt-4 font-display text-3xl text-crema">{i.name}</h3>
                  <p className="text-sm font-medium text-ambar-300">{i.title}</p>
                  {i.bio ? <p className="mt-3 max-w-md text-sm leading-relaxed text-crema/75">{i.bio}</p> : null}
                  <p className="mt-4 flex flex-wrap gap-2">
                    {i.courses.map((c) => (
                      <Link key={c.id} href={`/academia/cursos/${c.slug}`} className="rounded-full border border-white/20 px-3 py-1 text-xs text-crema/85 transition hover:border-ambar hover:text-ambar-300">
                        {c.title}
                      </Link>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Membresía */}
      {premium ? (
        <section className="pb-20" aria-labelledby="membresia">
          <div className="container-site">
            <div className="relative overflow-hidden rounded-[2rem] bg-tostado">
              <div className="bg-andino absolute inset-0 opacity-[0.08]" aria-hidden />
              <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-ambar/15 px-3 py-1 text-xs font-semibold text-ambar-300">
                    <Sparkles className="size-3.5" aria-hidden /> Membresía
                  </p>
                  <h2 id="membresia" className="mt-4 font-display text-4xl text-crema sm:text-5xl">
                    {premium.name}: <em className="text-ambar-300">café + Academia</em>
                  </h2>
                  <p className="mt-4 max-w-lg text-crema/75">{premium.description} Todos los cursos incluidos, certificados y las ediciones de temporada antes que nadie.</p>
                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {premium.benefits.map((b) => (
                      <li key={b} className="flex gap-2 text-sm text-crema/85">
                        <Check className="mt-0.5 size-4 shrink-0 text-[#a9c97a]" aria-hidden /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-white/10 bg-noche-950/70 p-7 text-center backdrop-blur">
                  <BrandIcon name="academia" className="mx-auto size-14 text-ambar" />
                  <p className="mt-4 text-sm text-crema/60">Desde</p>
                  <p className="font-display text-5xl text-crema">{formatCOP(premium.priceCop)}</p>
                  <p className="text-sm text-crema/60">al mes · cancela cuando quieras</p>
                  {premium.compareAtCop ? <p className="mt-1 text-xs text-crema/45">Valor por separado {formatCOP(premium.compareAtCop)}</p> : null}
                  <Link href={`/suscripciones?plan=${premium.slug}`} className="btn-ambar mt-6 w-full py-3.5">
                    Suscribirme a {premium.name}
                  </Link>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-crema/55">
                    <Award className="size-3.5" aria-hidden /> Incluye {courses.filter((c) => c.includedInSubscription).length} cursos ·{' '}
                    {courseDuration(courses.filter((c) => c.includedInSubscription).reduce((n, c) => n + c.durationMin, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Testimonios */}
      <section className="bg-crema py-20 text-noche" aria-labelledby="testimonios">
        <div className="container-site">
          <p className="eyebrow">Testimonios</p>
          <h2 id="testimonios" className="title-lg mt-2">Tazas que cambiaron</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIOS.map((t) => (
              <li key={t.name} className="card flex flex-col p-7">
                <Quote className="size-8 text-ambar" aria-hidden />
                <blockquote className="mt-4 flex-1 font-display text-lg leading-snug text-noche italic">“{t.quote}”</blockquote>
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-noche/10 pt-4 text-sm">
                  <span>
                    <strong className="block text-noche">{t.name}</strong>
                    <span className="text-gris">
                      {t.place} · {t.course}
                    </span>
                  </span>
                  <span className="flex" aria-label="5 de 5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className="size-3.5 fill-ambar text-ambar" aria-hidden />
                    ))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Editorial */}
      {post ? (
        <section className="bg-crema pb-24 text-noche" aria-labelledby="editorial">
          <div className="container-site grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-[0.72rem] font-bold tracking-[0.24em] text-montana uppercase">Notas de café · Diarios de origen</p>
              <h2 id="editorial" className="title-lg mt-3">{post.title}</h2>
              {post.excerpt ? <p className="lede mt-4">{post.excerpt}</p> : null}
              <Link href={`/blog/${post.slug}`} className="mt-7 inline-block border-b-2 border-noche pb-1 text-sm font-semibold tracking-wider uppercase hover:border-ambar hover:text-ambar-700">
                Leer artículo completo
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -top-4 -left-4 h-28 w-28 rounded-xl bg-[#e5efd3]" aria-hidden />
              <div className="absolute -right-4 -bottom-4 h-40 w-40 rounded-xl border-2 border-noche/15" aria-hidden />
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-elevada">
                <Image src={post.coverUrl ?? '/brand/fotos/manos-cafe-caicedo.webp'} alt="" fill sizes="(min-width: 1024px) 45vw, 92vw" className="object-cover" />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
