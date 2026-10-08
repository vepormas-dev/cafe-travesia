'use client';
/** Gestión de la suscripción: pausar, saltar, reanudar, cambiar café/molienda/plan/dirección y cancelar con encuesta. */
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarClock, Check, CreditCard, Loader2, MapPin, PauseCircle, PlayCircle, Repeat, SkipForward, X } from 'lucide-react';
import { toast } from 'sonner';
import { addressSchema, FREQUENCY_LABEL, formatCOP, formatDate, GRIND_LABEL, type PlanDTO, type SubscriptionDTO } from '@travesia/shared';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { RegionSelect } from '@/components/cart/region-select';
import { api } from '@/components/shop/fetcher';
import type { AddressLite } from './use-me';
import { StatusPill } from './ui';
import { cn } from '@/lib/cn';

type Coffee = { id: string; name: string; themeColor: string | null; accentColor: string | null; tastingNotes: string[]; imageUrl: string | null };
type Panel = null | 'pausar' | 'cambiar' | 'plan' | 'direccion' | 'cancelar';
const REASONS = ['Tengo demasiado café', 'Es muy costoso para mí', 'No me gustó el café', 'Problemas con las entregas', 'Me voy a mudar o de viaje', 'Otro motivo'];
const GRINDS = ['grano', 'fina', 'media', 'gruesa'] as const;

export function SubscriptionManager({ sub, plans, coffees, addresses }: { sub: SubscriptionDTO; plans: PlanDTO[]; coffees: Coffee[]; addresses: AddressLite[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [until, setUntil] = useState('');
  const [range, setRange] = useState({ min: '', max: '' });
  const [coffee, setCoffee] = useState<string>(sub.product?.id ?? coffees[0]?.id ?? '');
  const [grind, setGrind] = useState<string>(sub.grind);
  const [planId, setPlanId] = useState(sub.plan.id);
  const [addrSel, setAddrSel] = useState<string>(addresses[0]?.id ?? 'new');
  const [addr, setAddr] = useState({ recipient: sub.address?.recipient ?? '', phone: sub.address?.phone ?? '', region: sub.address?.region ?? '', city: sub.address?.city ?? '', line1: sub.address?.line1 ?? '', line2: '', notes: '' });
  const [addrErr, setAddrErr] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelled = sub.status === 'cancelled';
  const paused = sub.status === 'paused';

  useEffect(() => {
    const d = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fechas relativas a hoy: se calculan en el cliente para no desfasar la hidratación
    setRange({ min: d(1), max: d(180) });
    setUntil(d(30));
    const h = window.location.hash.slice(1) as Panel;
    if (h && ['pausar', 'cambiar', 'plan', 'direccion', 'cancelar'].includes(h)) setPanel(h);
  }, []);

  async function act(label: string, body: Record<string, unknown>, ok: string) {
    setBusy(label);
    const r = await api<{ subscription: SubscriptionDTO }>(`/api/subscriptions/${sub.id}`, { method: 'PATCH', body });
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success(ok);
    setPanel(null);
    router.refresh();
    return true;
  }

  const toggle = (p: Panel) => setPanel((x) => (x === p ? null : p));
  const tile = 'rounded-xl bg-arena/70 px-4 py-3';

  return (
    <article className="card overflow-hidden" aria-labelledby={`sub-${sub.id}`}>
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <StatusPill status={sub.status} kind="subscription" />
            <h2 id={`sub-${sub.id}`} className="mt-3 text-3xl">
              Plan {sub.plan.name}
            </h2>
            <p className="mt-1 text-gris">
              {sub.plan.bagsPerDelivery} × {sub.plan.bagWeightG} g {FREQUENCY_LABEL(sub.plan.frequencyWeeks).toLowerCase()} · {formatCOP(sub.priceCop)} por entrega
            </p>
          </div>
          {!cancelled ? (
            <div className="text-right">
              <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-gris uppercase">{paused ? 'En pausa hasta' : 'Próximo envío'}</p>
              <p className="font-display text-3xl text-noche">{formatDate(paused ? sub.pausedUntil : sub.nextBillingAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          ) : null}
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={tile}>
            <dt className="text-xs text-gris">Café actual</dt>
            <dd className="font-semibold text-noche">{sub.product?.name ?? 'Selección del tostador'}</dd>
          </div>
          <div className={tile}>
            <dt className="text-xs text-gris">Molienda</dt>
            <dd className="font-semibold text-noche">{GRIND_LABEL[sub.grind] ?? sub.grind}</dd>
          </div>
          <div className={tile}>
            <dt className="flex items-center gap-1 text-xs text-gris">
              <CreditCard className="size-3" aria-hidden /> Tarjeta
            </dt>
            <dd className="font-semibold text-noche">{sub.cardLast4 ? `${sub.cardBrand ?? 'Tarjeta'} •••• ${sub.cardLast4}` : '—'}</dd>
          </div>
          <div className={tile}>
            <dt className="flex items-center gap-1 text-xs text-gris">
              <MapPin className="size-3" aria-hidden /> Entrega
            </dt>
            <dd className="truncate font-semibold text-noche">{sub.address ? `${sub.address.line1}, ${sub.address.city}` : '—'}</dd>
          </div>
        </dl>

        {!cancelled ? (
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-noche/10 pt-6">
            <button type="button" className={cn('btn-sm', panel === 'cambiar' ? 'btn-primary' : 'btn-outline')} onClick={() => toggle('cambiar')} aria-expanded={panel === 'cambiar'}>
              <Repeat className="size-3.5" aria-hidden /> Cambiar café
            </button>
            <button type="button" className={cn('btn-sm', panel === 'plan' ? 'btn-primary' : 'btn-outline')} onClick={() => toggle('plan')} aria-expanded={panel === 'plan'}>
              Cambiar plan
            </button>
            {paused ? (
              <button type="button" className="btn-primary btn-sm" disabled={Boolean(busy)} onClick={() => act('resume', { action: 'resume' }, 'Reanudamos tu suscripción ☕')}>
                {busy === 'resume' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <PlayCircle className="size-3.5" aria-hidden />} Reanudar
              </button>
            ) : (
              <button type="button" className={cn('btn-sm', panel === 'pausar' ? 'btn-primary' : 'btn-outline')} onClick={() => toggle('pausar')} aria-expanded={panel === 'pausar'}>
                <PauseCircle className="size-3.5" aria-hidden /> Pausar o saltar
              </button>
            )}
            <button type="button" className={cn('btn-sm', panel === 'direccion' ? 'btn-primary' : 'btn-outline')} onClick={() => toggle('direccion')} aria-expanded={panel === 'direccion'}>
              <MapPin className="size-3.5" aria-hidden /> Dirección
            </button>
            <button type="button" className="ml-auto text-xs font-semibold tracking-[0.18em] text-cereza uppercase hover:underline" onClick={() => toggle('cancelar')} aria-expanded={panel === 'cancelar'}>
              Cancelar
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gris">Esta suscripción fue cancelada. Puedes volver cuando quieras desde la página de planes.</p>
        )}
      </div>

      {panel ? (
        <div className="relative animate-fade-up border-t border-noche/10 bg-crema/60 p-6 sm:p-8">
          <button type="button" onClick={() => setPanel(null)} className="absolute top-4 right-4 grid size-8 place-items-center rounded-full hover:bg-noche/5" aria-label="Cerrar">
            <X className="size-4" aria-hidden />
          </button>

          {panel === 'pausar' ? (
            <div id="pausar" className="grid gap-6 md:grid-cols-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act('pause', { action: 'pause', until }, `Pausamos tu suscripción hasta el ${formatDate(`${until}T12:00:00Z`)}`);
                }}
                className="space-y-3"
              >
                <h3 className="flex items-center gap-2 text-xl">
                  <CalendarClock className="size-5 text-ambar-700" aria-hidden /> Pausar hasta una fecha
                </h3>
                <p className="text-sm text-gris">No te cobraremos ni enviaremos café hasta esa fecha. Se reanuda sola.</p>
                <label htmlFor="pause-until" className="label">
                  Reanudar el
                </label>
                <input id="pause-until" type="date" className="input" value={until} min={range.min} max={range.max} onChange={(e) => setUntil(e.target.value)} required />
                <button type="submit" className="btn-primary btn-sm" disabled={Boolean(busy) || !until}>
                  {busy === 'pause' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Pausar suscripción
                </button>
              </form>
              <div className="space-y-3 md:border-l md:border-noche/10 md:pl-6">
                <h3 className="flex items-center gap-2 text-xl">
                  <SkipForward className="size-5 text-ambar-700" aria-hidden /> Saltar el próximo envío
                </h3>
                <p className="text-sm text-gris">
                  ¿Todavía tienes café? Movemos tu próximo cobro {FREQUENCY_LABEL(sub.plan.frequencyWeeks).toLowerCase() === 'mensual' ? 'un mes' : `${sub.plan.frequencyWeeks} semanas`} más adelante.
                </p>
                <button type="button" className="btn-outline btn-sm" disabled={Boolean(busy)} onClick={() => act('skip', { action: 'skip' }, 'Listo: saltamos tu próximo envío')}>
                  {busy === 'skip' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Saltar envío
                </button>
              </div>
            </div>
          ) : null}

          {panel === 'cambiar' ? (
            <div id="cambiar" className="space-y-5">
              <h3 className="text-xl">Cambia tu café y molienda</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Café">
                {coffees.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={coffee === c.id} onClick={() => setCoffee(c.id)} className={cn('flex items-center gap-3 rounded-xl border bg-hueso p-2 text-left transition', coffee === c.id ? 'border-noche ring-2 ring-noche' : 'border-noche/10 hover:border-noche/40')}>
                    <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: c.themeColor ?? '#111A31' }}>
                      {c.imageUrl ? (
                        <Image src={c.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <span className="absolute inset-x-1.5 top-2 bottom-0">
                          <CoffeeBag name={c.name} color={c.themeColor} accent={c.accentColor} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-noche">{c.name}</span>
                      <span className="block truncate text-xs text-gris">{c.tastingNotes.join(' · ')}</span>
                    </span>
                    {coffee === c.id ? <Check className="ml-auto size-4 shrink-0" aria-hidden /> : null}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Molienda">
                {GRINDS.map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={grind === g} onClick={() => setGrind(g)} className={cn('chip px-4 py-2 text-sm', grind === g && 'chip-active')}>
                    {GRIND_LABEL[g]}
                  </button>
                ))}
              </div>
              <button type="button" className="btn-primary btn-sm" disabled={Boolean(busy) || !coffee} onClick={() => act('coffee', { action: 'change_coffee', productId: coffee, grind }, 'Actualizamos tu café para el próximo envío')}>
                {busy === 'coffee' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Guardar cambios
              </button>
            </div>
          ) : null}

          {panel === 'plan' ? (
            <div className="space-y-4">
              <h3 className="text-xl">Cambia de plan</h3>
              <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Plan">
                {plans.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={planId === p.id} onClick={() => setPlanId(p.id)} className={cn('rounded-xl border bg-hueso p-4 text-left transition', planId === p.id ? 'border-noche ring-2 ring-noche' : 'border-noche/10 hover:border-noche/40')}>
                    <span className="flex items-center justify-between">
                      <span className="font-display text-lg text-noche">{p.name}</span>
                      {p.id === sub.plan.id ? <span className="text-[0.65rem] font-bold text-gris uppercase">Actual</span> : null}
                    </span>
                    <span className="block text-sm text-gris">
                      {p.bagsPerDelivery} × {p.bagWeightG} g · {FREQUENCY_LABEL(p.frequencyWeeks)}
                    </span>
                    <span className="mt-1 block font-semibold text-noche tabular-nums">{formatCOP(p.priceCop)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gris">El nuevo precio aplica desde el próximo cobro. Si el plan incluye la Academia, el acceso se activa de inmediato.</p>
              <button type="button" className="btn-primary btn-sm" disabled={Boolean(busy) || planId === sub.plan.id} onClick={() => act('plan', { action: 'change_plan', planId }, 'Cambiamos tu plan')}>
                {busy === 'plan' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Cambiar plan
              </button>
            </div>
          ) : null}

          {panel === 'direccion' ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const src = addrSel !== 'new' ? addresses.find((x) => x.id === addrSel) : null;
                const data = src ? { recipient: src.recipient, phone: src.phone, region: src.region, city: src.city, line1: src.line1, line2: src.line2, notes: src.notes } : { ...addr, line2: addr.line2 || null, notes: addr.notes || null };
                const r = addressSchema.safeParse(data);
                if (!r.success) {
                  const errs: Record<string, string> = {};
                  for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
                  setAddrErr(errs);
                  return;
                }
                setAddrErr({});
                void act('addr', { action: 'change_address', address: r.data }, 'Actualizamos la dirección de entrega');
              }}
            >
              <h3 className="text-xl">Dirección de entrega</h3>
              {addresses.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {addresses.map((d) => (
                    <label key={d.id} className={cn('flex cursor-pointer gap-3 rounded-xl border bg-hueso p-3 text-sm', addrSel === d.id ? 'border-noche' : 'border-noche/15')}>
                      <input type="radio" name="sub-addr" checked={addrSel === d.id} onChange={() => setAddrSel(d.id)} className="mt-1 accent-noche" />
                      <span>
                        <strong className="block text-noche">{d.label}</strong>
                        {d.line1}, {d.city}
                      </span>
                    </label>
                  ))}
                  <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl border bg-hueso p-3 text-sm', addrSel === 'new' ? 'border-noche' : 'border-noche/15')}>
                    <input type="radio" name="sub-addr" checked={addrSel === 'new'} onChange={() => setAddrSel('new')} className="accent-noche" /> Otra dirección
                  </label>
                </div>
              ) : null}
              {addrSel === 'new' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['recipient', 'Quién recibe'],
                      ['phone', 'Teléfono'],
                    ] as const
                  ).map(([k, l]) => (
                    <div key={k}>
                      <label htmlFor={`sa-${k}`} className="label">
                        {l}
                      </label>
                      <input id={`sa-${k}`} className={cn('input', addrErr[k] && 'input-error')} value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} />
                      {addrErr[k] ? <p className="field-error">{addrErr[k]}</p> : null}
                    </div>
                  ))}
                  <div>
                    <label htmlFor="sa-region" className="label">
                      Departamento
                    </label>
                    <RegionSelect id="sa-region" value={addr.region} onChange={(v) => setAddr({ ...addr, region: v })} error={addrErr.region} />
                    {addrErr.region ? <p className="field-error">{addrErr.region}</p> : null}
                  </div>
                  <div>
                    <label htmlFor="sa-city" className="label">
                      Ciudad
                    </label>
                    <input id="sa-city" className={cn('input', addrErr.city && 'input-error')} value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                    {addrErr.city ? <p className="field-error">{addrErr.city}</p> : null}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="sa-line1" className="label">
                      Dirección
                    </label>
                    <input id="sa-line1" className={cn('input', addrErr.line1 && 'input-error')} value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
                    {addrErr.line1 ? <p className="field-error">{addrErr.line1}</p> : null}
                  </div>
                </div>
              ) : null}
              <button type="submit" className="btn-primary btn-sm" disabled={Boolean(busy)}>
                {busy === 'addr' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Guardar dirección
              </button>
            </form>
          ) : null}

          {panel === 'cancelar' ? (
            <form
              className="max-w-xl space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!confirmCancel) return;
                const r = [reason, reasonText.trim()].filter(Boolean).join(': ').slice(0, 300);
                void act('cancel', { action: 'cancel', reason: r || undefined }, 'Cancelamos tu suscripción. ¡Gracias por viajar con nosotros!');
              }}
            >
              <h3 className="text-xl">¿Por qué quieres cancelar?</h3>
              <p className="text-sm text-gris">Tu respuesta nos ayuda a mejorar. Recuerda que también puedes pausar hasta 6 meses o saltar un envío.</p>
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Motivo</legend>
                {REASONS.map((r) => (
                  <label key={r} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border bg-hueso px-3 py-2.5 text-sm', reason === r ? 'border-noche' : 'border-noche/15')}>
                    <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-noche" /> {r}
                  </label>
                ))}
              </fieldset>
              <textarea className="input" rows={2} placeholder="Cuéntanos más (opcional)" value={reasonText} onChange={(e) => setReasonText(e.target.value)} maxLength={250} aria-label="Comentario" />
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmCancel} onChange={(e) => setConfirmCancel(e.target.checked)} className="mt-0.5 accent-cereza" />
                Entiendo que no recibiré más envíos ni cobros y que mi tarjeta se desvinculará.
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn bg-cereza text-crema hover:bg-cereza/90" disabled={!confirmCancel || !reason || Boolean(busy)}>
                  {busy === 'cancel' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Cancelar suscripción
                </button>
                {!paused ? (
                  <button type="button" className="btn-outline" onClick={() => setPanel('pausar')}>
                    Mejor la pauso
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
