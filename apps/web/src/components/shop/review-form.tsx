'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { reviewSchema } from '@travesia/shared';
import { useMe } from '@/components/account/use-me';
import { api } from './fetcher';
import { cn } from '@/lib/cn';

/** Formulario de reseña (requiere sesión; queda en moderación). */
export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { status } = useMe();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (status === 'loading') return <div className="h-11 w-48 animate-pulse rounded-full bg-noche/10" />;
  if (status === 'guest')
    return (
      <Link href={`/ingresar?next=${encodeURIComponent(`/tienda/${slug}#resenas`)}`} className="btn-outline">
        Inicia sesión para escribir una reseña
      </Link>
    );
  if (sent)
    return (
      <div className="rounded-2xl border border-montana/30 bg-montana/10 p-5 text-montana">
        <p className="font-semibold">¡Gracias por tu reseña! ☕</p>
        <p className="text-sm">La publicaremos en cuanto la revise nuestro equipo.</p>
      </div>
    );
  if (!open)
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Escribir una reseña
      </button>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ rating, title: title || undefined, body });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.path[0] === 'rating' ? 'Elige de 1 a 5 estrellas' : i.message;
      return setErrors(errs);
    }
    setErrors({});
    setBusy(true);
    const r = await api('/api/reviews', { body: { productId, ...parsed.data } });
    setBusy(false);
    if (r.ok) setSent(true);
    else toast.error(r.error);
  }

  return (
    <form onSubmit={submit} className="card max-w-xl space-y-4 p-6" noValidate>
      <fieldset>
        <legend className="label">Tu calificación</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`} aria-pressed={rating === n} className="rounded p-0.5">
              <Star className={cn('size-7 transition', (hover || rating) >= n ? 'fill-ambar text-ambar' : 'text-noche/25')} aria-hidden />
            </button>
          ))}
        </div>
        {errors.rating ? <p className="field-error">{errors.rating}</p> : null}
      </fieldset>
      <div>
        <label htmlFor="rv-title" className="label">
          Título (opcional)
        </label>
        <input id="rv-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
      </div>
      <div>
        <label htmlFor="rv-body" className="label">
          Tu experiencia
        </label>
        <textarea id="rv-body" rows={4} className={cn('input', errors.body && 'input-error')} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} aria-invalid={Boolean(errors.body)} aria-describedby={errors.body ? 'rv-body-err' : undefined} placeholder="¿Cómo lo preparaste? ¿Qué notas encontraste?" />
        {errors.body ? (
          <p id="rv-body-err" className="field-error">
            {errors.body}
          </p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Enviar reseña
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
