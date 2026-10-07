'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Lightbulb, Loader2, RefreshCw, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/cn';
import { generateInsights, type Insights } from '@/lib/admin/actions/dashboard';

export function InsightsCard({ rangeKey, aiReady }: { rangeKey: string; aiReady: boolean }) {
  const [data, setData] = useState<Insights | null>(null);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const r = await generateInsights(rangeKey);
      if (r.ok && r.data) setData(r.data);
      else toast.error(r.message);
    });
  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-xl bg-noche p-5 text-crema shadow-[0_20px_50px_-24px_rgba(10,16,34,0.7)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-andino opacity-[0.07]" />
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-ambar/25 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.18em] text-ambar-300 uppercase">
            <Sparkles className="size-3.5" /> Análisis con IA
          </p>
          <h2 className="mt-1 font-display text-xl text-crema">¿Qué está pasando en tu negocio?</h2>
        </div>
        {data ? (
          <button type="button" onClick={run} disabled={pending} className="rounded-lg p-2 text-crema/60 hover:bg-white/10 hover:text-crema" aria-label="Regenerar análisis">
            <RefreshCw className={cn('size-4', pending && 'animate-spin')} />
          </button>
        ) : null}
      </div>
      {!aiReady ? <p className="relative mt-2 rounded-md bg-white/[0.06] px-2.5 py-1.5 text-[0.7rem] text-crema/70">IA sin configurar (OPENAI_API_KEY): el análisis se genera con reglas sobre tus métricas.</p> : null}
      <div className="relative mt-4 flex-1">
        {pending && !data ? (
          <div className="space-y-2.5">
            {[90, 75, 82, 60].map((w, i) => (
              <div key={i} className="h-3.5 animate-pulse rounded bg-white/10" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : data ? (
          <div className={cn('space-y-4 transition-opacity', pending && 'opacity-50')}>
            <p className="font-display text-[1.05rem] leading-snug text-ambar-300 italic">“{data.headline}”</p>
            <ul className="space-y-2">
              {data.insights.map((s, i) => (
                <li key={i} className="flex gap-2 text-[0.82rem] leading-relaxed text-crema/85">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-ambar-300" />
                  {s}
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="mb-2 text-[0.65rem] font-semibold tracking-[0.16em] text-crema/50 uppercase">Acciones sugeridas</p>
              <ol className="space-y-2">
                {data.actions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[0.82rem] text-crema">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ambar text-[0.65rem] font-bold text-noche">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-[0.65rem] text-crema/40">{data.ai ? 'Generado con IA sobre métricas agregadas (sin datos personales).' : 'Generado por reglas sobre tus métricas.'}</p>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between gap-4">
            <ul className="space-y-2 text-[0.82rem] text-crema/70">
              <li className="flex gap-2"><Target className="mt-0.5 size-3.5 text-ambar-300" />Resume ventas, suscripciones, academia y tráfico del periodo.</li>
              <li className="flex gap-2"><Target className="mt-0.5 size-3.5 text-ambar-300" />Detecta cambios frente al periodo anterior y oportunidades.</li>
              <li className="flex gap-2"><Target className="mt-0.5 size-3.5 text-ambar-300" />Propone 3 acciones priorizadas con impacto esperado.</li>
            </ul>
            <button type="button" onClick={run} disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ambar px-4 py-2.5 text-sm font-semibold text-noche transition hover:bg-ambar-300 active:scale-[0.98]">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {pending ? 'Analizando métricas…' : 'Generar análisis'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
