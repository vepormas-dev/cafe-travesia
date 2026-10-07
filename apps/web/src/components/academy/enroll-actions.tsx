'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShoppingBag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseAccessDTO } from '@travesia/shared';
import { useCart } from '@/components/cart/cart-store';
import { cn } from '@/lib/cn';

export type CourseLite = { id: string; slug: string; title: string; coverUrl: string | null; priceCop: number; includedInSubscription: boolean; isFree: boolean };

/** Botón de inscripción (gratis o incluido en la suscripción) → POST /api/courses/:id/enroll. */
export function EnrollButton({ course, label, firstLessonId, className }: { course: CourseLite; label: string; firstLessonId: string | null; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${course.id}/enroll`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string; firstLessonId?: string | null; purchase?: boolean };
      if (res.status === 401) return router.push(`/ingresar?next=${encodeURIComponent(`/academia/cursos/${course.slug}`)}`);
      if (res.status === 402) {
        toast.info(data.error ?? 'Este curso requiere compra');
        return router.refresh();
      }
      if (!res.ok) throw new Error(data.error ?? 'No pudimos inscribirte');
      toast.success('¡Listo! Ya estás inscrito. Arranquemos 🙌');
      const lesson = data.firstLessonId ?? firstLessonId;
      router.push(lesson ? `/academia/aprender/${course.slug}/${lesson}` : `/academia/cursos/${course.slug}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos inscribirte');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={go} disabled={busy} className={cn('btn-ambar w-full py-3.5', className)}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
      {label}
    </button>
  );
}

/** Comprar ahora / Agregar al carrito (useCart kind 'course'). */
export function BuyButtons({ course, enrolledHint }: { course: CourseLite; enrolledHint?: boolean }) {
  const { add, lines } = useCart();
  const router = useRouter();
  const inCart = lines.some((l) => l.kind === 'course' && l.id === course.id);
  const line = { kind: 'course' as const, id: course.id, quantity: 1, name: course.title, slug: course.slug, imageUrl: course.coverUrl, unitPriceCop: course.priceCop, variantName: 'Curso online · Academia Travesía' };
  return (
    <div className="grid gap-2.5">
      <button
        type="button"
        className="btn-ambar w-full py-3.5"
        disabled={enrolledHint}
        onClick={() => {
          if (!inCart) add(line);
          router.push('/tienda/carrito');
        }}
      >
        Comprar ahora <ArrowRight className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className="btn-light w-full"
        onClick={() => {
          if (inCart) return toast.info('Este curso ya está en tu carrito');
          add(line);
          toast.success('Curso agregado al carrito');
        }}
      >
        <ShoppingBag className="size-4" aria-hidden /> {inCart ? 'Ya está en tu carrito' : 'Agregar al carrito'}
      </button>
    </div>
  );
}

/** Conjunto de CTAs según CourseAccessDTO (usado en ficha y en pantallas bloqueadas del reproductor). */
export function AccessActions({ course, access, firstLessonId, previewLessonId }: { course: CourseLite; access: CourseAccessDTO; firstLessonId: string | null; previewLessonId?: string | null }) {
  const learnHref = (id: string | null) => (id ? `/academia/aprender/${course.slug}/${id}` : `/academia/cursos/${course.slug}`);
  if (access.enrolled) {
    return (
      <div className="grid gap-2.5">
        <Link href={learnHref(access.lastLessonId ?? firstLessonId)} className="btn-ambar w-full py-3.5">
          {access.completed ? 'Repasar el curso' : access.progressPct > 0 ? 'Continuar' : 'Empezar el curso'} <ArrowRight className="size-4" aria-hidden />
        </Link>
        {access.certificateCode ? (
          <Link href={`/certificados/${access.certificateCode}`} className="btn-light w-full">
            Ver mi certificado
          </Link>
        ) : null}
      </div>
    );
  }
  if (access.reason === 'free') return <EnrollButton course={course} label="Inscribirme gratis" firstLessonId={firstLessonId} />;
  if (access.reason === 'subscription') return <EnrollButton course={course} label="Incluido en tu suscripción · Empezar" firstLessonId={firstLessonId} />;
  if (access.reason === 'login_required')
    return (
      <div className="grid gap-2.5">
        <Link href={`/ingresar?next=${encodeURIComponent(`/academia/cursos/${course.slug}`)}`} className="btn-ambar w-full py-3.5">
          <Sparkles className="size-4" aria-hidden /> Inscribirme gratis
        </Link>
        {previewLessonId ? (
          <Link href={learnHref(previewLessonId)} className="btn-light w-full">
            Ver una lección de muestra
          </Link>
        ) : null}
      </div>
    );
  return (
    <div className="grid gap-2.5">
      <BuyButtons course={course} />
      {course.includedInSubscription ? (
        <Link href="/suscripciones?plan=maestro-premium" className="group mt-1 rounded-xl border border-ambar/30 bg-ambar/10 px-4 py-3 text-left text-sm text-crema/85 transition hover:border-ambar/60">
          <span className="font-semibold text-ambar-300">Suscríbete a Maestro Premium</span> y accede a este y todos los cursos de la Academia, con café de Caicedo en tu casa cada mes.
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ambar-300 group-hover:gap-2">Ver el plan <ArrowRight className="size-3" aria-hidden /></span>
        </Link>
      ) : null}
    </div>
  );
}
