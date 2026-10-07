import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCourses } from '@/lib/data/catalog';
import { CourseCard } from '@/components/academy/course-card';
import { CourseExplorer } from '@/components/academy/course-explorer';
import { courseDuration, LevelBadge } from '@/components/academy/course-meta';

export const metadata: Metadata = {
  title: 'Explorar cursos · Academia',
  description: 'Cursos de barismo, origen, tueste y métodos de filtrado de la Academia Café Travesía. Filtra por nivel, categoría y precio.',
  alternates: { canonical: '/academia/cursos' },
};

export default async function ExplorarCursosPage() {
  const courses = await getCourses();
  const spotlight = courses.find((c) => c.level === 'avanzado') ?? courses[0];

  return (
    <div className="bg-crema">
      <div className="container-site pt-8 pb-20 lg:pt-12">
        {spotlight ? (
          <section className="relative overflow-hidden rounded-[1.75rem] bg-tostado text-crema shadow-elevada">
            <div className="bg-andino absolute inset-0 opacity-[0.05]" aria-hidden />
            <div className="relative grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:p-14">
              <div>
                <p className="text-[0.7rem] font-semibold tracking-[0.22em] text-crema/60 uppercase">Masterclass destacada</p>
                <h1 className="mt-4 font-display text-4xl leading-[1.04] text-crema sm:text-5xl lg:text-6xl">{spotlight.title}</h1>
                {spotlight.description ? <p className="mt-5 max-w-xl leading-relaxed text-crema/70">{spotlight.description}</p> : null}
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-crema/70">
                  <LevelBadge level={spotlight.level} />
                  <span>{courseDuration(spotlight.durationMin)}</span>
                  <span aria-hidden>·</span>
                  <span>{spotlight.instructorName}</span>
                </div>
                <Link href={`/academia/cursos/${spotlight.slug}`} className="btn mt-8 rounded-md bg-[#f6d9cf] px-7 py-3.5 text-noche-950 hover:bg-crema">
                  Ver la masterclass <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-xl border border-white/10 lg:max-w-sm">
                {spotlight.coverUrl ? <Image src={spotlight.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 30vw, 80vw" className="object-cover" /> : null}
              </div>
            </div>
          </section>
        ) : null}

        <header className="mt-16 mb-8 max-w-2xl">
          <h2 className="title-lg">Tu campus editorial</h2>
          <p className="mt-3 text-noche/70">Un viaje curado por la historia, la técnica y la pasión por el café de especialidad: del cafetal en Caicedo a la barra en Florida.</p>
        </header>

        <Suspense
          fallback={
            <ul className="grid gap-6 sm:grid-cols-2 lg:ml-[270px] xl:grid-cols-3">
              {courses.map((c) => (
                <li key={c.id}>
                  <CourseCard course={c} />
                </li>
              ))}
            </ul>
          }
        >
          <CourseExplorer courses={courses} />
        </Suspense>
      </div>
    </div>
  );
}
