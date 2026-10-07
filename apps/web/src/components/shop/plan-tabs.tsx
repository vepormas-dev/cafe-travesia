'use client';
/** Selector Personas/Empresas con las tarjetas de plan (destacado en azul noche). */
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, GraduationCap } from 'lucide-react';
import { FREQUENCY_LABEL, formatCOP, monthlyValue, type PlanDTO } from '@travesia/shared';
import { cn } from '@/lib/cn';

export function PlanTabs({ plans }: { plans: PlanDTO[] }) {
  const [aud, setAud] = useState<'personal' | 'empresa'>('personal');
  const [qs, setQs] = useState('');
  useEffect(() => {
    const cafe = new URLSearchParams(window.location.search).get('cafe');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee la URL actual (solo en el navegador)
    if (cafe) setQs(`?cafe=${encodeURIComponent(cafe)}`);
    if (window.location.hash === '#empresas') setAud('empresa');
  }, []);
  const list = plans.filter((p) => p.audience === aud);
  const tabs = [
    { v: 'personal' as const, l: 'Para ti y tu casa' },
    { v: 'empresa' as const, l: 'Para empresas' },
  ];
  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full border border-noche/15 bg-hueso p-1" role="tablist" aria-label="Tipo de plan">
        {tabs.map((t) => (
          <button
            key={t.v}
            type="button"
            role="tab"
            id={`tab-${t.v}`}
            aria-selected={aud === t.v}
            aria-controls="planes-panel"
            onClick={() => setAud(t.v)}
            className={cn('rounded-full px-5 py-2.5 text-sm font-semibold transition', aud === t.v ? 'bg-noche text-crema shadow-suave' : 'text-noche/70 hover:text-noche')}
          >
            {t.l}
          </button>
        ))}
      </div>
      <div id="planes-panel" role="tabpanel" aria-labelledby={`tab-${aud}`} className={cn('mt-10 grid gap-6', list.length >= 3 ? 'lg:grid-cols-3' : 'mx-auto max-w-4xl md:grid-cols-2')}>
        {list.map((p) => {
          const hl = p.isHighlighted;
          const save = p.compareAtCop ? Math.round((1 - p.priceCop / p.compareAtCop) * 100) : 0;
          return (
            <article key={p.id} className={cn('relative flex flex-col overflow-hidden rounded-[1.75rem] border transition duration-300 hover:-translate-y-1', hl ? 'border-noche bg-noche text-crema shadow-elevada' : 'border-noche/10 bg-hueso shadow-suave')}>
              {hl ? <span className="absolute top-5 right-5 z-10 rounded-full bg-ambar px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-noche uppercase">Más elegido</span> : null}
              <div className="relative h-40 overflow-hidden">
                {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" /> : null}
                <div aria-hidden className={cn('absolute inset-0 bg-gradient-to-t', hl ? 'from-noche via-noche/40 to-transparent' : 'from-hueso via-hueso/30 to-transparent')} />
              </div>
              <div className="flex flex-1 flex-col p-7 pt-2">
                <p className={cn('text-xs font-semibold tracking-[0.18em] uppercase', hl ? 'text-ambar-300' : 'text-ambar-700')}>{FREQUENCY_LABEL(p.frequencyWeeks)}</p>
                <h3 className={cn('mt-1 text-3xl', hl && '!text-crema')}>{p.name}</h3>
                {p.tagline ? <p className={cn('mt-1 text-sm', hl ? 'text-crema/75' : 'text-gris')}>{p.tagline}</p> : null}
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-semibold tabular-nums">{formatCOP(p.priceCop)}</span>
                  <span className={cn('text-sm', hl ? 'text-crema/70' : 'text-gris')}>/ entrega</span>
                </div>
                <p className={cn('text-xs', hl ? 'text-crema/60' : 'text-gris')}>
                  ≈ {formatCOP(monthlyValue(p.priceCop, p.frequencyWeeks))} al mes
                  {p.compareAtCop ? (
                    <>
                      {' '}
                      · <s>{formatCOP(p.compareAtCop)}</s> <strong className={hl ? 'text-ambar-300' : 'text-montana'}>ahorras {save} %</strong>
                    </>
                  ) : null}
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.benefits.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <Check className={cn('mt-0.5 size-4 shrink-0', hl ? 'text-ambar' : 'text-montana')} aria-hidden /> {b}
                    </li>
                  ))}
                  {p.includesAcademy ? (
                    <li className="flex gap-2.5 font-semibold">
                      <GraduationCap className={cn('mt-0.5 size-4 shrink-0', hl ? 'text-ambar' : 'text-montana')} aria-hidden /> Academia Travesía incluida
                    </li>
                  ) : null}
                </ul>
                <Link href={`/suscripciones/${p.slug}${qs}`} className={cn('mt-8 w-full', hl ? 'btn-ambar' : 'btn-primary')}>
                  Elegir {p.name} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      {aud === 'empresa' ? (
        <p className="mt-8 text-center text-sm text-gris">
          ¿Más de 30 personas o necesitas máquina en comodato?{' '}
          <Link href="/contacto?interes=empresas" className="link">
            Hablemos de un plan a la medida
          </Link>
        </p>
      ) : null}
    </div>
  );
}
