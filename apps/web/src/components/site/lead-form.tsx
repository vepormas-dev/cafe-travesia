'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/cn';

type Field = 'phone' | 'company' | 'interest' | 'message' | 'size';

/** Formulario de captación → POST /api/leads (leadSchema + honeypot `website`). */
export function LeadForm({
  source,
  fields = ['phone', 'interest', 'message'],
  interests,
  submitLabel = 'Enviar mensaje',
  successTitle = '¡Gracias! Ya recibimos tu mensaje',
  className,
}: {
  source: 'contacto' | 'empresas' | string;
  fields?: Field[];
  interests?: string[];
  submitLabel?: string;
  successTitle?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string[]>>({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string | null)?.trim() || null;
    const size = get('size');
    const message = [size ? `Personas: ${size}` : null, get('message')].filter(Boolean).join('\n') || null;
    setState('loading');
    setError(null);
    setIssues({});
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: get('name') ?? '',
          email: get('email') ?? '',
          phone: get('phone'),
          company: get('company'),
          interest: get('interest'),
          message,
          source,
          consent: fd.get('consent') === 'on',
          website: (fd.get('website') as string) ?? '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIssues(data.issues ?? {});
        throw new Error(res.status === 503 ? 'Modo demo: el formulario se habilita al conectar la base de datos. Mientras tanto escríbenos por WhatsApp.' : (data.error ?? 'No pudimos enviar tu mensaje'));
      }
      setState('ok');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu mensaje');
    }
  };

  if (state === 'ok')
    return (
      <div className={cn('card flex flex-col items-start gap-3 p-8', className)} role="status">
        <CheckCircle2 className="size-10 text-montana" aria-hidden />
        <h3 className="text-2xl">{successTitle}</h3>
        <p className="text-gris">Te respondemos en menos de un día hábil. Si es urgente, escríbenos por WhatsApp.</p>
        <button type="button" onClick={() => setState('idle')} className="link mt-2 text-sm">
          Enviar otro mensaje
        </button>
      </div>
    );

  const err = (k: string) => issues[k]?.[0];
  const input = (k: string) => cn('input', err(k) && 'input-error');

  return (
    <form onSubmit={onSubmit} noValidate className={cn('card grid gap-5 p-6 sm:grid-cols-2 sm:p-8', className)}>
      <div className="sm:col-span-1">
        <label htmlFor={`${source}-name`} className="label">
          Nombre completo *
        </label>
        <input id={`${source}-name`} name="name" required autoComplete="name" className={input('name')} aria-invalid={Boolean(err('name'))} />
        {err('name') ? <p className="field-error">{err('name')}</p> : null}
      </div>
      <div>
        <label htmlFor={`${source}-email`} className="label">
          Correo electrónico *
        </label>
        <input id={`${source}-email`} name="email" type="email" required autoComplete="email" className={input('email')} aria-invalid={Boolean(err('email'))} />
        {err('email') ? <p className="field-error">{err('email')}</p> : null}
      </div>
      {fields.includes('company') ? (
        <div>
          <label htmlFor={`${source}-company`} className="label">
            Empresa *
          </label>
          <input id={`${source}-company`} name="company" required autoComplete="organization" className={input('company')} />
        </div>
      ) : null}
      {fields.includes('phone') ? (
        <div>
          <label htmlFor={`${source}-phone`} className="label">
            Celular / WhatsApp
          </label>
          <input id={`${source}-phone`} name="phone" type="tel" autoComplete="tel" className={input('phone')} />
        </div>
      ) : null}
      {fields.includes('size') ? (
        <div>
          <label htmlFor={`${source}-size`} className="label">
            ¿Cuántas personas toman café?
          </label>
          <select id={`${source}-size`} name="size" className="input" defaultValue="">
            <option value="" disabled>
              Elige un rango
            </option>
            {['1 a 10', '11 a 30', '31 a 80', '81 a 200', 'Más de 200'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      ) : null}
      {fields.includes('interest') && interests?.length ? (
        <div className={cn(!fields.includes('size') && !fields.includes('company') && 'sm:col-span-1')}>
          <label htmlFor={`${source}-interest`} className="label">
            ¿En qué te ayudamos?
          </label>
          <select id={`${source}-interest`} name="interest" className="input" defaultValue={interests[0]}>
            {interests.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      ) : null}
      {fields.includes('message') ? (
        <div className="sm:col-span-2">
          <label htmlFor={`${source}-message`} className="label">
            Mensaje
          </label>
          <textarea id={`${source}-message`} name="message" rows={5} maxLength={3000} className={input('message')} placeholder="Cuéntanos lo que necesitas…" />
        </div>
      ) : null}
      {/* Honeypot: invisible para personas */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          No llenar
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-3 text-sm text-noche/80">
          <input type="checkbox" name="consent" required className="mt-1 size-4 accent-noche" />
          <span>
            Autorizo a Café Travesía a tratar mis datos para responder esta solicitud, según la{' '}
            <Link href="/privacidad" className="link">
              política de privacidad
            </Link>{' '}
            (Ley 1581 de 2012).
          </span>
        </label>
        {err('consent') ? <p className="field-error">{err('consent')}</p> : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-cereza/10 px-4 py-3 text-sm text-cereza sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === 'loading'} className="btn-primary w-full sm:w-auto">
          {state === 'loading' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
