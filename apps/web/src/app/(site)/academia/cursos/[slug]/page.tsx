import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, CheckCircle2, ChevronRight, Clock, ListChecks, PlayCircle, Quote, Star, Users } from 'lucide-react';
import { brand, formatDate, formatNumber, LEVEL_LABEL } from '@travesia/shared';
import { getCourse, getCourses } from '@/lib/data/catalog';
import { getCourseReviews } from '@/lib/academy';
import { env } from '@/lib/env';
import { Markdown, Rating } from '@/components/ui/primitives';
import { BrandIcon } from '@/components/brand/logo';
import { AccessPanel, AccessPanelView, previewLessonOf } from '@/components/academy/access-panel';
import { CourseCard } from '@/components/academy/course-card';
import { courseDuration, InstructorAvatar, LevelBadge } from '@/components/academy/course-meta';
import { Syllabus } from '@/components/academy/syllabus';
import { TrailerButton } from '@/components/academy/trailer-button';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCourse(slug);
  if (!c) return { title: 'Curso no encontrado' };
  const description = c.subtitle ?? c.description?.slice(0, 155) ?? brand.claim;
  return {
    title: `${c.title} · Academia`,
    description,
    alternates: { canonical: `/academia/cursos/${c.slug}` },
    openGraph: { title: c.title, description, images: c.coverUrl ? [{ url: c.coverUrl }] : undefined },
    twitter: { card: 'summary_large_image', title: c.title, description, images: c.coverUrl ? [c.coverUrl] : undefined },
  };
}

export default function CoursePage({ params }: Props) {
  return (
    <Suspense fallback={<CourseSkeleton />}>
      <CourseDetail params={params} />
    </Suspense>
  );
}

async function CourseDetail({ params }: Props) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();
  const [reviews, all] = await Promise.all([getCourseReviews(course.id, course.slug), getCourses()]);
  const related = all.filter((c) => c.id !== course.id).sort((a, b) => Number(b.category === course.category) - Number(a.category === course.category)).slice(0, 3);
  const preview = previewLessonOf(course);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description ?? course.subtitle ?? '',
    url: `${env.siteUrl}/academia/cursos/${course.slug}`,
    image: course.coverUrl ? (course.coverUrl.startsWith('/') ? `${env.siteUrl}${course.coverUrl}` : course.coverUrl) : undefined,
    inLanguage: 'es-CO',
    educationalLevel: LEVEL_LABEL[course.level],
    teaches: course.whatYouLearn,
    coursePrerequisites: course.requirements,
    provider: { '@type': 'Organization', name: brand.name, sameAs: env.siteUrl },
    offers: { '@type': 'Offer', category: course.isFree ? 'Free' : 'Paid', price: course.isFree ? 0 : course.priceCop, priceCurrency: 'COP', availability: 'https://schema.org/InStock', url: `${env.siteUrl}/academia/cursos/${course.slug}` },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${course.durationMin}M`,
      ...(course.instructorName ? { instructor: { '@type': 'Person', name: course.instructorName, jobTitle: course.instructorTitle ?? undefined } } : {}),
    },
    ...(course.ratingCount ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: course.ratingAvg, ratingCount: course.ratingCount, bestRating: 5 } } : {}),
  };

  return (
    <div className="bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* Hero oscuro */}
      <section className="relative overflow-hidden bg-noche-950 text-crema">
        <div className="bg-andino absolute inset-0 opacity-[0.06]" aria-hidden />
        <div className="absolute -top-40 -left-40 size-[520px] rounded-full bg-ambar/10 blur-3xl" aria-hidden />
        <div className="container-site relative grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
          <div className="animate-fade-up">
            <nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-1 text-xs text-crema/60">
              <Link href="/academia" className="hover:text-ambar-300">Academia</Link>
              <ChevronRight className="size-3" aria-hidden />
              <Link href="/academia/cursos" className="hover:text-ambar-300">Cursos</Link>
              {course.category ? (
                <>
                  <ChevronRight className="size-3" aria-hidden />
                  <Link href={`/academia/cursos?categoria=${encodeURIComponent(course.category)}`} className="hover:text-ambar-300">{course.category}</Link>
                </>
              ) : null}
            </nav>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <LevelBadge level={course.level} />
              {course.isFree ? <span className="rounded-sm bg-[#c9dfa4] px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.14em] text-noche uppercase">Gratis</span> : null}
              {course.includedInSubscription && !course.isFree ? <span className="rounded-sm border border-ambar/50 px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.14em] text-ambar-300 uppercase">Incluido en Maestro Premium</span> : null}
            </div>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] text-crema italic sm:text-5xl lg:text-6xl">{course.title}</h1>
            {course.subtitle ? <p className="mt-4 max-w-xl text-lg leading-relaxed text-crema/75">{course.subtitle}</p> : null}
            <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-crema/80">
              {course.ratingAvg ? (
                <li className="inline-flex items-center gap-1.5">
                  <Star className="size-4 fill-ambar text-ambar" aria-hidden />
                  <strong className="text-crema">{course.ratingAvg.toFixed(1)}</strong>
                  <span className="text-crema/55">({formatNumber(course.ratingCount)} reseñas)</span>
                </li>
              ) : null}
              <li className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-[#a9c97a]" aria-hidden /> {formatNumber(course.studentsCount)} estudiantes
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-[#a9c97a]" aria-hidden /> {courseDuration(course.durationMin)}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4 text-[#a9c97a]" aria-hidden /> {course.lessonsCount} lecciones
              </li>
            </ul>
            {course.instructorName ? (
              <div className="mt-7 flex items-center gap-3">
                <InstructorAvatar name={course.instructorName} className="size-11 text-sm ring-ambar/40" />
                <div className="text-sm">
                  <p className="font-semibold text-crema">{course.instructorName}</p>
                  <p className="text-crema/60">{course.instructorTitle}</p>
                </div>
              </div>
            ) : null}
            {preview ? (
              <Link href={`/academia/aprender/${course.slug}/${preview}`} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ambar-300 underline decoration-ambar/40 underline-offset-4 hover:decoration-ambar">
                <PlayCircle className="size-5" aria-hidden /> Ver una lección gratis
              </Link>
            ) : null}
          </div>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 shadow-elevada lg:max-w-none">
            {course.coverUrl ? <Image src={course.coverUrl} alt={`Portada del curso ${course.title}`} fill priority sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-noche-950/80 via-noche-950/10 to-transparent" aria-hidden />
            {course.trailerUrl ? (
              <TrailerButton url={course.trailerUrl} title={course.title} />
            ) : (
              <p className="absolute right-6 bottom-6 left-6 font-script text-3xl text-crema/95">Desde Caicedo, pa’ tu taza</p>
            )}
          </div>
        </div>
      </section>

      <div className="container-site grid gap-12 py-12 lg:grid-cols-[1fr_380px] lg:py-16">
        <div className="min-w-0 space-y-14">
          {/* Precio/CTA en móvil (arriba del contenido) */}
          <div className="lg:hidden">
            <Suspense fallback={<AccessPanelView course={course} access={null} />}>
              <AccessPanel course={course} />
            </Suspense>
          </div>

          {course.whatYouLearn.length ? (
            <section aria-labelledby="aprenderas" className="rounded-3xl bg-arena/70 p-6 sm:p-8">
              <h2 id="aprenderas" className="font-display text-2xl">Lo que aprenderás</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {course.whatYouLearn.map((w) => (
                  <li key={w} className="flex gap-3 text-[0.95rem] text-noche/85">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-montana" aria-hidden /> {w}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {course.description ? (
            <section aria-labelledby="sobre">
              <p className="eyebrow">Sobre el curso</p>
              <h2 id="sobre" className="title-lg mt-2">Del grano a la técnica, sin atajos</h2>
              <Markdown className="mt-5">{course.description}</Markdown>
            </section>
          ) : null}

          <section aria-labelledby="temario">
            <p className="eyebrow">Temario</p>
            <h2 id="temario" className="title-lg mt-2 flex items-center gap-3">
              <ListChecks className="size-7 text-ambar-700" aria-hidden /> Contenido del curso
            </h2>
            <div className="mt-6">
              <Syllabus course={course} />
            </div>
          </section>

          {course.requirements.length ? (
            <section aria-labelledby="requisitos">
              <h2 id="requisitos" className="font-display text-2xl">Requisitos</h2>
              <ul className="mt-4 space-y-2 text-noche/80">
                {course.requirements.map((r) => (
                  <li key={r} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rotate-45 bg-ambar" aria-hidden /> {r}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {course.instructorName ? (
            <section aria-labelledby="instructor" className="relative overflow-hidden rounded-3xl bg-tostado p-6 text-crema sm:p-8">
              <div className="bg-andino absolute inset-0 opacity-[0.07]" aria-hidden />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <InstructorAvatar name={course.instructorName} className="size-20 text-2xl ring-4 ring-ambar/30" />
                <div>
                  <p className="eyebrow text-ambar-300">Tu instructor</p>
                  <h2 id="instructor" className="mt-1 font-display text-2xl text-crema">{course.instructorName}</h2>
                  <p className="text-sm text-crema/60">{course.instructorTitle}</p>
                  {course.instructorBio ? <p className="mt-3 max-w-xl leading-relaxed text-crema/80">{course.instructorBio}</p> : null}
                </div>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="resenas">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Reseñas</p>
                <h2 id="resenas" className="title-lg mt-2">Lo que dicen los estudiantes</h2>
              </div>
              {course.ratingAvg ? (
                <div className="flex items-center gap-3">
                  <span className="font-display text-5xl text-noche">{course.ratingAvg.toFixed(1)}</span>
                  <span>
                    <span className="flex" aria-hidden>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={i < Math.round(course.ratingAvg) ? 'size-4 fill-ambar text-ambar' : 'size-4 text-ambar/40'} />
                      ))}
                    </span>
                    <span className="text-sm text-gris">{formatNumber(course.ratingCount)} calificaciones</span>
                  </span>
                </div>
              ) : null}
            </div>
            {reviews.length ? (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <li key={r.id} className="card p-5">
                    <Rating value={r.rating} />
                    {r.title ? <p className="mt-2 font-semibold text-noche">{r.title}</p> : null}
                    {r.body ? <p className="mt-1.5 text-sm leading-relaxed text-noche/80">{r.body}</p> : null}
                    <p className="mt-3 text-xs text-gris">
                      {r.author}
                      {r.verified ? ' · Estudiante verificado' : ''} · {formatDate(r.createdAt, { month: 'short', year: 'numeric' })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card mt-6 flex items-center gap-4 p-6">
                <Quote className="size-8 shrink-0 text-ambar" aria-hidden />
                <p className="text-sm text-noche/75">Aún no hay reseñas escritas publicadas para este curso. Al terminarlo podrás contarnos cómo te fue desde <Link href="/cuenta/cursos" className="link">Mis cursos</Link>.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="hidden lg:block" aria-label="Inscripción">
          <div className="sticky top-28">
            <Suspense fallback={<AccessPanelView course={course} access={null} />}>
              <AccessPanel course={course} />
            </Suspense>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className="bg-noche-950 py-16 text-crema">
          <div className="container-site">
            <div className="flex items-end justify-between gap-4">
              <h2 className="title-lg text-crema">Sigue tu travesía</h2>
              <Link href="/academia/cursos" className="text-sm font-semibold tracking-wider text-[#a9c97a] uppercase hover:text-crema">Ver todos</Link>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <li key={c.id}>
                  <CourseCard course={c} dark />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div className="bg-crema" aria-busy="true" aria-label="Cargando curso">
      <div className="bg-noche-950">
        <div className="container-site grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-14 w-4/5 animate-pulse rounded bg-white/10" />
            <div className="h-5 w-3/5 animate-pulse rounded bg-white/10" />
          </div>
          <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-white/10" />
        </div>
      </div>
      <div className="container-site py-16">
        <BrandIcon name="academia" className="size-12 animate-pulse text-ambar" />
      </div>
    </div>
  );
}
