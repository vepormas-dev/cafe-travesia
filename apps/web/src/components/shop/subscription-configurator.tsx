'use client';
/**
 * Configurador de suscripción "Diseña tu experiencia": café, molienda, dirección, titular y tarjeta
 * (tokenizada en el navegador con Wompi) → POST /api/subscriptions.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Clock, CreditCard, GraduationCap, Loader2, Lock, MessageCircle, Repeat, Truck, XCircle } from 'lucide-react';
import { addressSchema, customerSchema, FREQUENCY_LABEL, formatCOP, GRIND_LABEL, LEGAL_ID_TYPES, type PlanDTO, type ProductDTO } from '@travesia/shared';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { RegionSelect } from '@/components/cart/region-select';
import { useMe } from '@/components/account/use-me';
import { DemoNotice } from '@/components/ui/primitives';
import { api, whatsappUrl } from './fetcher';
import { themeOf } from './color';
import { BRAND_LABEL, cardBrand, digits, formatCardNumber, tokenizeCard, validateCard, type Acceptance } from './card-utils';
import { cn } from '@/lib/cn';

const GRINDS = ['grano', 'fina', 'media', 'gruesa'] as const;
type Grind = (typeof GRINDS)[number];
type Errors = Record<string, string>;
const toErrors = (issues: { path: PropertyKey[]; message: string }[], prefix: string) => {
  const e: Errors = {};
  for (const i of issues) e[prefix + i.path.map(String).join('.')] ??= i.message;
  return e;
};

export function SubscriptionConfigurator({ plan, coffees, otherPlans }: { plan: PlanDTO; coffees: ProductDTO[]; otherPlans: PlanDTO[] }) {
  const session = useMe(true);
  const me = session.me;
  const [productId, setProductId] = useState<string | null>(coffees[0]?.id ?? null);
  const [grind, setGrind] = useState<Grind>('grano');
  const [c, setC] = useState({ email: '', fullName: '', phone: '', legalIdType: 'CC', legalId: '' });
  const [a, setA] = useState({ recipient: '', phone: '', region: '', city: '', line1: '', line2: '', notes: '' });
  const [addrId, setAddrId] = useState<string>('new');
  const [card, setCard] = useState({ number: '', cvc: '', expMonth: '', expYear: '', holder: '' });
  const [accept, setAccept] = useState(false);
  const [acc, setAcc] = useState<Acceptance | null>(null);
  const [accState, setAccState] = useState<'loading' | 'ok' | 'off'>('loading');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; id: string } | null>(null);

  // ?cafe=slug desde la ficha de producto
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('cafe');
    const p = slug ? coffees.find((x) => x.slug === slug) : null;
    if (p) setProductId(p.id);
  }, [coffees]);

  useEffect(() => {
    void api<Acceptance>('/api/wompi/acceptance').then((r) => {
      if (r.ok) {
        setAcc(r.data);
        setAccState('ok');
      } else setAccState('off');
    });
  }, []);

  useEffect(() => {
    if (session.status !== 'user' || !me) return;
    setC((x) => ({ email: me.email, fullName: x.fullName || me.fullName || '', phone: x.phone || me.phone || '', legalIdType: me.legalIdType || x.legalIdType, legalId: x.legalId || me.legalId || '' }));
    setCard((x) => ({ ...x, holder: x.holder || (me.fullName ?? '').toUpperCase() }));
    const def = session.addresses.find((d) => d.isDefault) ?? session.addresses[0];
    if (def) {
      setAddrId(def.id);
      setA({ recipient: def.recipient, phone: def.phone, region: def.region, city: def.city, line1: def.line1, line2: def.line2 ?? '', notes: def.notes ?? '' });
    } else setA((x) => ({ ...x, recipient: x.recipient || me.fullName || '', phone: x.phone || me.phone || '' }));
  }, [session.status, me, session.addresses]);

  const product = coffees.find((p) => p.id === productId) ?? null;
  const saving = useMemo(() => {
    const v = product?.variants.find((x) => x.weightG === plan.bagWeightG) ?? null;
    const store = v ? v.priceCop * plan.bagsPerDelivery : (plan.compareAtCop ?? 0);
    return Math.max(0, store - plan.priceCop);
  }, [product, plan]);
  const brand = cardBrand(card.number);
  const isGuest = session.status === 'guest';
  const next = `/suscripciones/${plan.slug}${product ? `?cafe=${product.slug}` : ''}`;

  const field = (k: string, extra?: string) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `${k}-err` : undefined, className: cn('input', extra, errors[k] && 'input-error') });
  const err = (k: string) => (errors[k] ? <p id={`${k}-err`} className="field-error">{errors[k]}</p> : null);

  async function submit() {
    setBanner(null);
    const address = { ...a, line2: a.line2 || null, notes: a.notes || null };
    const e: Errors = {};
    const cr = customerSchema.safeParse(c);
    if (!cr.success) Object.assign(e, toErrors(cr.error.issues, 'customer.'));
    const ar = addressSchema.safeParse(address);
    if (!ar.success) Object.assign(e, toErrors(ar.error.issues, 'address.'));
    Object.assign(e, validateCard(card));
    if (!accept) e.accept = 'Debes aceptar los términos de Wompi y la autorización de datos';
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(Object.keys(e)[0]!)?.focus();
      return;
    }
    if (!acc) return setBanner('Los pagos con tarjeta aún no están configurados.');
    setBusy('Validando tu tarjeta con Wompi…');
    const tk = await tokenizeCard(acc, card);
    if (!tk.ok) {
      setBusy(null);
      setErrors({ 'card.number': tk.error });
      return;
    }
    setBusy('Creando tu suscripción y realizando el primer cobro…');
    const r = await api<{ subscriptionId: string; chargeStatus: string }>('/api/subscriptions', {
      body: {
        planId: plan.id,
        productId,
        grind,
        address: ar.data,
        customer: cr.data,
        cardToken: tk.token,
        acceptanceToken: acc.acceptanceToken,
        personalAuthToken: acc.personalAuthToken ?? undefined,
        channel: 'web',
      },
    });
    setBusy(null);
    if (r.ok) {
      setResult({ status: r.data.chargeStatus, id: r.data.subscriptionId });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (r.status === 422 && r.issues) {
      const ie: Errors = {};
      for (const [k, v] of Object.entries(r.issues)) ie[k] = v[0] ?? '';
      setErrors(ie);
    }
    setBanner(r.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión para suscribirte.' : r.error);
  }

  if (result) return <SubscribeResult status={result.status} plan={plan} />;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
      <div className="space-y-12">
        {/* 1. Café */}
        <section aria-labelledby="s1">
          <StepTitle n={1} id="s1">
            Elige tu café
          </StepTitle>
          <p className="mt-2 text-sm text-gris">Puedes cambiarlo antes de cada envío desde tu cuenta. ¿Sin decidir? Elige «Selección del tostador».</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Café de la suscripción">
            {coffees.map((p) => {
              const th = themeOf(p);
              const on = p.id === productId;
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setProductId(p.id)} className={cn('group flex overflow-hidden rounded-2xl border bg-hueso text-left transition', on ? 'border-noche ring-2 ring-noche' : 'border-noche/10 hover:border-noche/40')}>
                  <div className="relative w-28 shrink-0 overflow-hidden" style={{ backgroundColor: th.bg }}>
                    <div aria-hidden className="bg-andino absolute inset-0 opacity-15" />
                    <div className="absolute inset-x-3 top-4 bottom-0 transition duration-500 group-hover:-translate-y-1">
                      <CoffeeBag name={p.name} color={th.bg} accent={th.accent} />
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-lg leading-tight text-noche">{p.name}</p>
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border', on ? 'border-noche bg-noche text-crema' : 'border-noche/30')}>{on ? <Check className="size-3" aria-hidden /> : null}</span>
                    </div>
                    <p className="mt-1 text-xs text-gris">{p.tastingNotes.join(' · ') || p.subtitle}</p>
                    <p className="mt-2 text-xs font-medium text-montana">
                      {p.process} · Tueste {p.roastLevel?.toLowerCase()}
                    </p>
                  </div>
                </button>
              );
            })}
            <button type="button" role="radio" aria-checked={productId === null} onClick={() => setProductId(null)} className={cn('flex items-center gap-4 rounded-2xl border bg-hueso p-4 text-left transition', productId === null ? 'border-noche ring-2 ring-noche' : 'border-noche/10 hover:border-noche/40')}>
              <span className="grid size-12 place-items-center rounded-full bg-ambar-100 text-ambar-700">
                <Repeat className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-display text-lg text-noche">Selección del tostador</span>
                <span className="text-xs text-gris">Un origen distinto en cada entrega, elegido por Gabo.</span>
              </span>
            </button>
          </div>
        </section>

        {/* 2. Molienda */}
        <section aria-labelledby="s2" className="border-t border-noche/10 pt-10">
          <StepTitle n={2} id="s2">
            Molienda
          </StepTitle>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Molienda">
            {GRINDS.map((g) => (
              <button key={g} type="button" role="radio" aria-checked={grind === g} onClick={() => setGrind(g)} className={cn('rounded-xl border px-3 py-3 text-sm font-medium transition', grind === g ? 'border-noche bg-noche text-crema' : 'border-noche/15 bg-hueso hover:border-noche')}>
                {g === 'grano' ? 'En grano' : g[0]!.toUpperCase() + g.slice(1)}
                <span className={cn('mt-0.5 block text-[0.7rem] font-normal', grind === g ? 'text-crema/70' : 'text-gris')}>{g === 'grano' ? 'Máxima frescura' : g === 'fina' ? 'Espresso, moka' : g === 'media' ? 'V60, greca' : 'Prensa francesa'}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Dirección */}
        <section aria-labelledby="s3" className="border-t border-noche/10 pt-10">
          <StepTitle n={3} id="s3">
            ¿Dónde lo recibes?
          </StepTitle>
          {session.addresses.length ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Direcciones guardadas">
              {session.addresses.map((d) => (
                <label key={d.id} className={cn('flex cursor-pointer gap-3 rounded-xl border bg-hueso p-3 text-sm', addrId === d.id ? 'border-noche' : 'border-noche/15')}>
                  <input type="radio" name="sub-addr" className="mt-1 accent-noche" checked={addrId === d.id} onChange={() => (setAddrId(d.id), setA({ recipient: d.recipient, phone: d.phone, region: d.region, city: d.city, line1: d.line1, line2: d.line2 ?? '', notes: d.notes ?? '' }))} />
                  <span>
                    <strong className="block text-noche">{d.label}</strong>
                    {d.line1}, {d.city}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="address.region" className="label">
                Departamento
              </label>
              <RegionSelect id="address.region" value={a.region} onChange={(v) => (setA({ ...a, region: v }), setAddrId('new'))} error={errors['address.region']} />
              {err('address.region')}
            </div>
            <div>
              <label htmlFor="address.city" className="label">
                Ciudad o municipio
              </label>
              <input id="address.city" value={a.city} onChange={(e) => (setA({ ...a, city: e.target.value }), setAddrId('new'))} autoComplete="address-level2" {...field('address.city')} />
              {err('address.city')}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address.line1" className="label">
                Dirección
              </label>
              <input id="address.line1" value={a.line1} onChange={(e) => (setA({ ...a, line1: e.target.value }), setAddrId('new'))} autoComplete="address-line1" placeholder="Calle 10 # 43-12, apto 301" {...field('address.line1')} />
              {err('address.line1')}
            </div>
            <div>
              <label htmlFor="address.recipient" className="label">
                Quién recibe
              </label>
              <input id="address.recipient" value={a.recipient} onChange={(e) => setA({ ...a, recipient: e.target.value })} {...field('address.recipient')} />
              {err('address.recipient')}
            </div>
            <div>
              <label htmlFor="address.phone" className="label">
                Teléfono
              </label>
              <input id="address.phone" type="tel" value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} {...field('address.phone')} />
              {err('address.phone')}
            </div>
          </div>
        </section>

        {/* 4. Titular */}
        <section aria-labelledby="s4" className="border-t border-noche/10 pt-10">
          <StepTitle n={4} id="s4">
            Datos del titular
          </StepTitle>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customer.fullName" className="label">
                Nombre completo
              </label>
              <input id="customer.fullName" value={c.fullName} onChange={(e) => setC({ ...c, fullName: e.target.value })} autoComplete="name" {...field('customer.fullName')} />
              {err('customer.fullName')}
            </div>
            <div>
              <label htmlFor="customer.email" className="label">
                Correo
              </label>
              <input id="customer.email" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} readOnly={session.status === 'user'} autoComplete="email" {...field('customer.email')} />
              {err('customer.email')}
            </div>
            <div>
              <label htmlFor="customer.phone" className="label">
                Celular
              </label>
              <input id="customer.phone" type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} autoComplete="tel" {...field('customer.phone')} />
              {err('customer.phone')}
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <div>
                <label htmlFor="customer.legalIdType" className="label">
                  Documento
                </label>
                <select id="customer.legalIdType" value={c.legalIdType} onChange={(e) => setC({ ...c, legalIdType: e.target.value })} className="input px-3">
                  {LEGAL_ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="customer.legalId" className="label">
                  Número
                </label>
                <input id="customer.legalId" inputMode="numeric" value={c.legalId} onChange={(e) => setC({ ...c, legalId: e.target.value })} {...field('customer.legalId')} />
                {err('customer.legalId')}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Tarjeta */}
        <section aria-labelledby="s5" className="border-t border-noche/10 pt-10">
          <StepTitle n={5} id="s5">
            Tarjeta para los cobros
          </StepTitle>
          <p className="mt-2 flex items-center gap-2 text-sm text-gris">
            <Lock className="size-4 text-montana" aria-hidden /> Tus datos se cifran y van directo a Wompi (Bancolombia). Nunca guardamos el número de tu tarjeta.
          </p>
          {accState === 'off' ? (
            <div className="mt-5 space-y-3">
              <DemoNotice>Los cobros recurrentes con tarjeta aún no están configurados. Escríbenos y activamos tu suscripción con otro medio de pago.</DemoNotice>
              <a href={whatsappUrl(`Hola, quiero suscribirme al plan ${plan.name}${product ? ` con ${product.name}` : ''} (${GRIND_LABEL[grind]}).`)} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                <MessageCircle className="size-4" aria-hidden /> Suscribirme por WhatsApp
              </a>
            </div>
          ) : null}
          <div className={cn('mt-5 rounded-2xl border border-noche/10 bg-hueso p-5', accState === 'off' && 'pointer-events-none opacity-50')} aria-disabled={accState === 'off'}>
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="card.number" className="label">
                  Número de la tarjeta
                </label>
                <div className="relative">
                  <input id="card.number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} {...field('card.number', 'pr-28 tabular-nums tracking-wider')} />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center gap-1.5 text-xs font-semibold text-noche/70">
                    <CreditCard className="size-4" aria-hidden /> {brand ? BRAND_LABEL[brand] : ''}
                  </span>
                </div>
                {err('card.number')}
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="card.holder" className="label">
                  Nombre como aparece en la tarjeta
                </label>
                <input id="card.holder" autoComplete="cc-name" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value.toUpperCase() })} {...field('card.holder', 'uppercase')} />
                {err('card.holder')}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="card.expMonth" className="label">
                  Mes
                </label>
                <input id="card.expMonth" inputMode="numeric" autoComplete="cc-exp-month" placeholder="MM" maxLength={2} value={card.expMonth} onChange={(e) => setCard({ ...card, expMonth: digits(e.target.value).slice(0, 2) })} {...field('card.expMonth', 'tabular-nums')} />
                {err('card.expMonth')}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="card.expYear" className="label">
                  Año
                </label>
                <input id="card.expYear" inputMode="numeric" autoComplete="cc-exp-year" placeholder="AA" maxLength={2} value={card.expYear} onChange={(e) => setCard({ ...card, expYear: digits(e.target.value).slice(0, 2) })} {...field('card.expYear', 'tabular-nums')} />
                {err('card.expYear')}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="card.cvc" className="label">
                  CVC
                </label>
                <input id="card.cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} type="password" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: digits(e.target.value).slice(0, 4) })} {...field('card.cvc', 'tabular-nums')} />
                {err('card.cvc')}
              </div>
            </div>
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input id="accept" type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-noche" aria-invalid={Boolean(errors.accept)} />
              <span>
                Acepto los{' '}
                <a href={acc?.termsUrl ?? 'https://wompi.com/es/co/terminos-y-condiciones-usuarios'} target="_blank" rel="noopener noreferrer" className="link">
                  términos y condiciones de Wompi
                </a>
                {acc?.personalDataUrl ? (
                  <>
                    , la{' '}
                    <a href={acc.personalDataUrl} target="_blank" rel="noopener noreferrer" className="link">
                      autorización de tratamiento de datos
                    </a>
                  </>
                ) : null}{' '}
                y autorizo los cobros recurrentes de {formatCOP(plan.priceCop)} {FREQUENCY_LABEL(plan.frequencyWeeks).toLowerCase()} hasta que cancele.
              </span>
            </label>
            {err('accept')}
          </div>
        </section>
      </div>

      {/* Resumen */}
      <aside className="lg:sticky lg:top-26 lg:self-start">
        <div className="card p-7">
          <p className="eyebrow">Plan {plan.audience === 'empresa' ? 'empresarial' : 'personal'}</p>
          <h2 className="mt-1 text-3xl">Tu suscripción</h2>
          <dl className="mt-5 divide-y divide-noche/10 text-sm">
            {[
              ['Plan', plan.name],
              ['Café', product?.name ?? 'Selección del tostador'],
              ['Molienda', GRIND_LABEL[grind] ?? grind],
              ['Frecuencia', FREQUENCY_LABEL(plan.frequencyWeeks)],
              ['Cantidad', `${plan.bagsPerDelivery} × ${plan.bagWeightG} g`],
              ...(plan.includesAcademy ? [['Academia', 'Todos los cursos incluidos']] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3">
                <dt className="text-gris">{k}</dt>
                <dd className="text-right font-semibold text-noche">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 space-y-2.5 rounded-2xl bg-tostado p-5 text-sm text-crema">
            <div className="flex justify-between">
              <span className="text-crema/70">Precio por entrega</span>
              <span className="tabular-nums">{formatCOP(plan.priceCop)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-crema/70">Envío</span>
              <span className="text-ambar-300">Gratis</span>
            </div>
            {saving > 0 ? (
              <div className="flex justify-between">
                <span className="text-crema/70">Ahorro vs. tienda</span>
                <span className="text-ambar-300 tabular-nums">−{formatCOP(saving)}</span>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-crema/15 pt-3">
              <span className="font-semibold">Primer cobro hoy</span>
              <span className="font-display text-3xl font-semibold tabular-nums">{formatCOP(plan.priceCop)}</span>
            </div>
            <p className="text-xs text-crema/60">Luego {formatCOP(plan.priceCop)} {FREQUENCY_LABEL(plan.frequencyWeeks).toLowerCase()}. Despachamos en máx. 48 h tras cada cobro.</p>
          </div>

          {banner ? (
            <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-cereza/10 p-3 text-sm text-cereza">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {banner}
            </p>
          ) : null}

          {session.status === 'loading' ? (
            <div className="mt-5 h-14 animate-pulse rounded-full bg-noche/10" />
          ) : isGuest ? (
            <div className="mt-5 space-y-2">
              <Link href={`/ingresar?next=${encodeURIComponent(next)}`} className="btn-primary w-full py-4 text-base">
                Inicia sesión para suscribirte
              </Link>
              <p className="text-center text-xs text-gris">Tu suscripción se gestiona desde tu cuenta: pausa, salta envíos o cancela cuando quieras.</p>
            </div>
          ) : (
            <button type="button" onClick={submit} disabled={Boolean(busy) || accState === 'loading'} className="btn-primary mt-5 w-full py-4 text-base">
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />} {busy ? 'Procesando…' : 'Confirmar suscripción'}
            </button>
          )}
          {busy ? (
            <p className="mt-2 text-center text-xs text-gris" aria-live="polite">
              {busy}
            </p>
          ) : null}
          <ul className="mt-5 space-y-2 text-xs text-gris">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-montana" aria-hidden /> Envío gratis a toda Colombia
            </li>
            <li className="flex items-center gap-2">
              <Repeat className="size-4 text-montana" aria-hidden /> Pausa, salta o cancela sin penalidad
            </li>
            {plan.includesAcademy ? (
              <li className="flex items-center gap-2">
                <GraduationCap className="size-4 text-montana" aria-hidden /> Acceso inmediato a la Academia tras el primer cobro
              </li>
            ) : null}
          </ul>
        </div>
        {otherPlans.length ? (
          <div className="mt-5 text-sm">
            <p className="text-gris">¿Otro ritmo?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {otherPlans.map((p) => (
                <Link key={p.id} href={`/suscripciones/${p.slug}`} className="chip transition hover:border-noche">
                  {p.name} · {formatCOP(p.priceCop)}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function StepTitle({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-4 text-2xl sm:text-3xl">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-noche font-sans text-sm font-bold text-crema">{n}</span>
      {children}
    </h2>
  );
}

function SubscribeResult({ status, plan }: { status: string; plan: PlanDTO }) {
  const ok = status === 'APPROVED';
  const pending = status === 'PENDING' || status === 'pending';
  return (
    <div className="card mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-14 text-center" role="status">
      {ok ? <CheckCircle2 className="size-14 text-montana" aria-hidden /> : pending ? <Clock className="size-14 text-ambar-700" aria-hidden /> : <XCircle className="size-14 text-cereza" aria-hidden />}
      <h2 className="text-3xl sm:text-4xl">{ok ? '¡Bienvenido a tu suscripción! ☕' : pending ? 'Estamos procesando tu primer cobro' : 'Tu banco rechazó el primer cobro'}</h2>
      <p className="max-w-lg text-noche/75">
        {ok
          ? `Tu plan ${plan.name} está activo. Tostamos tu café esta semana y te avisamos cuando salga.${plan.includesAcademy ? ' Ya tienes acceso a todos los cursos de la Academia.' : ''}`
          : pending
            ? 'En unos minutos recibirás la confirmación por correo. Puedes ver el estado en tu cuenta.'
            : 'Tu suscripción quedó registrada pero el cobro no pasó. Lo intentaremos de nuevo automáticamente; si prefieres, escríbenos para cambiar la tarjeta.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/cuenta/suscripcion" className="btn-primary">
          Gestionar mi suscripción
        </Link>
        {ok && plan.includesAcademy ? (
          <Link href="/cuenta/cursos" className="btn-ambar">
            Ir a la Academia
          </Link>
        ) : null}
      </div>
    </div>
  );
}
