'use client';
import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Suscripción al boletín (POST /api/newsletter). */
export function NewsletterForm({ source = 'footer', dark, className }: { source?: string; dark?: boolean; className?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const id = `nl-${source}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, source }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 503 ? 'La suscripción se habilita al conectar la base de datos (modo demo).' : (data.error ?? 'No pudimos suscribirte'));
      setState('ok');
      setMsg('¡Listo! Te escribiremos con lo mejor de cada cosecha.');
      setEmail('');
    } catch (err) {
      setState('error');
      setMsg(err instanceof Error ? err.message : 'No pudimos suscribirte');
    }
  };

  return (
    <form onSubmit={submit} className={cn('w-full', className)} noValidate>
      <label htmlFor={id} className="sr-only">
        Correo electrónico
      </label>
      <div className={cn('flex items-center gap-1 rounded-full border p-1.5 pl-5 transition focus-within:ring-2 focus-within:ring-ambar/50', dark ? 'border-crema/20 bg-crema/5' : 'border-noche/15 bg-white')}>
        <input
          id={id}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
          className={cn('min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] focus:outline-none', dark ? 'text-crema placeholder:text-crema/45' : 'text-tinta placeholder:text-gris/70')}
        />
        <button type="submit" disabled={state === 'loading' || !email} className={cn('btn btn-sm shrink-0 py-2.5', dark ? 'bg-ambar text-noche hover:bg-ambar-300' : 'bg-noche text-crema hover:bg-noche-800')}>
          {state === 'loading' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : state === 'ok' ? <Check className="size-4" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
          <span>Suscribirme</span>
        </button>
      </div>
      <p role="status" aria-live="polite" className={cn('mt-2 min-h-5 text-xs', state === 'error' ? (dark ? 'text-ambar-300' : 'text-cereza') : dark ? 'text-crema/60' : 'text-gris')}>
        {msg || 'Recetas, lanzamientos de temporada y descuentos. Sin spam.'}
      </p>
    </form>
  );
}
