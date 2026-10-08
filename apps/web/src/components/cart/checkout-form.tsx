'use client';
/**
 * Checkout en una página: Contacto → Envío → Pago (pasos colapsables) + resumen fijo.
 * Totales en vivo con /api/cart/quote; POST /api/checkout → Wompi Web Checkout.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Loader2, Lock, MessageCircle, Pencil, ShieldCheck, Tag, X } from 'lucide-react';
import { addressSchema, checkoutSchema, customerSchema, formatCOP, formatNumber, LEGAL_ID_TYPES, LOYALTY, type CheckoutResultDTO } from '@travesia/shared';
import { useCart } from './cart-store';
import { getPrefs, setPrefs } from './prefs';
import { toInput, useQuote } from './use-quote';
import { TotalsList } from './totals';
import { LineThumb } from './line-thumb';
import { RegionSelect } from './region-select';
import { FreeShippingBar } from './free-shipping';
import { useMe } from '@/components/account/use-me';
import { api, whatsappUrl } from '@/components/shop/fetcher';
import { DemoNotice } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';

type Step = 1 | 2 | 3;
type Errors = Record<string, string>;
const issuesToErrors = (issues: { path: PropertyKey[]; message: string }[], prefix = '') => {
  const e: Errors = {};
  for (const i of issues) e[prefix + i.path.map(String).join('.')] ??= i.message;
  return e;
};

export const TERMS_URL = '/terminos';
export const PRIVACY_URL = '/privacidad';
export const SECURITY_URL = '/compra-segura';

/** Mensaje de error de un campo (fuera del render para no recrearlo en cada tecla). */
function FieldError({ k, errors }: { k: string; errors: Record<string, string | undefined> }) {
  return errors[k] ? (
    <p id={`${k}-err`} className="field-error">
      {errors[k]}
    </p>
  ) : null;
}

export function CheckoutForm() {
  const router = useRouter();
  const { lines } = useCart();
  const session = useMe(true);
  const me = session.me;
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState<Set<Step>>(new Set());
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<{ kind: 'error' | 'demo' | 'stock'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [c, setC] = useState({ email: '', fullName: '', phone: '', legalIdType: 'CC', legalId: '' });
  const [a, setA] = useState({ recipient: '', phone: '', region: '', city: '', line1: '', line2: '', notes: '' });
  const [addrId, setAddrId] = useState<string | 'new'>('new');
  const [saveAddr, setSaveAddr] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [notes, setNotes] = useState('');
  const [accept, setAccept] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    const p = getPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prellenado desde localStorage/sesión: solo disponible en el navegador
    setA((x) => ({ ...x, region: p.region ?? '', city: p.city ?? '' }));
    setCoupon(p.couponCode ?? null);
    setCouponInput(p.couponCode ?? '');
    setUsePoints(Boolean(p.redeemPoints));
    setHydrated(true);
  }, []);

  // Prellenado desde la sesión y la dirección predeterminada
  useEffect(() => {
    if (session.status !== 'user' || !me || prefilled.current) return;
    prefilled.current = true;
    setC((x) => ({
      email: x.email || me.email,
      fullName: x.fullName || me.fullName || '',
      phone: x.phone || me.phone || '',
      legalIdType: me.legalIdType || x.legalIdType,
      legalId: x.legalId || me.legalId || '',
    }));
    const def = session.addresses.find((d) => d.isDefault) ?? session.addresses[0];
    if (def) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prellenado desde localStorage/sesión: solo disponible en el navegador
      setAddrId(def.id);
      setA({ recipient: def.recipient, phone: def.phone, region: def.region, city: def.city, line1: def.line1, line2: def.line2 ?? '', notes: def.notes ?? '' });
    } else setA((x) => ({ ...x, recipient: x.recipient || me.fullName || '', phone: x.phone || me.phone || '' }));
  }, [session.status, me, session.addresses]);

  const points = me?.loyaltyPoints ?? 0;
  const q = useQuote(hydrated ? lines : [], { region: a.region, city: a.city, couponCode: coupon, email: c.email.includes('@') ? c.email : null, redeemPoints: usePoints ? points : 0 }, 450);
  const totals = q.data?.totals ?? null;
  const cr = q.data?.coupon ?? null;
  const requiresShipping = totals?.requiresShipping ?? true;

  useEffect(() => {
    if (hydrated) setPrefs({ region: a.region, city: a.city, couponCode: coupon, redeemPoints: usePoints });
  }, [hydrated, a.region, a.city, coupon, usePoints]);

  const input = useMemo(
    () => ({
      items: toInput(lines),
      customer: { ...c, email: c.email.trim() },
      address: requiresShipping ? { ...a, line2: a.line2 || null, notes: a.notes || null } : null,
      couponCode: coupon && cr?.ok ? coupon : null,
      redeemPoints: usePoints && session.status === 'user' ? points : 0,
      notes: notes || null,
      channel: 'web' as const,
      acceptTerms: accept as true,
    }),
    [lines, c, a, requiresShipping, coupon, cr, usePoints, session.status, points, notes, accept],
  );

  const err = (k: string) => errors[k];
  const field = (k: string) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `${k}-err` : undefined, className: cn('input', errors[k] && 'input-error') });

  function next(from: Step) {
    if (from === 1) {
      const r = customerSchema.safeParse(c);
      if (!r.success) return setErrors((e) => ({ ...strip(e, 'customer.'), ...issuesToErrors(r.error.issues, 'customer.') }));
      setErrors((e) => strip(e, 'customer.'));
    }
    if (from === 2 && requiresShipping) {
      const r = addressSchema.safeParse({ ...a, line2: a.line2 || null, notes: a.notes || null });
      if (!r.success) return setErrors((e) => ({ ...strip(e, 'address.'), ...issuesToErrors(r.error.issues, 'address.') }));
      setErrors((e) => strip(e, 'address.'));
    }
    setDone((d) => new Set(d).add(from));
    setStep((from + 1) as Step);
  }

  async function pay() {
    setBanner(null);
    const r = checkoutSchema.safeParse(input);
    if (!r.success) {
      const e = issuesToErrors(r.error.issues);
      setErrors(e);
      const firstKey = Object.keys(e)[0] ?? '';
      setStep(firstKey.startsWith('customer') ? 1 : firstKey.startsWith('address') ? 2 : 3);
      return;
    }
    setBusy(true);
    if (session.status === 'user' && requiresShipping && addrId === 'new' && saveAddr) {
      void api('/api/v1/addresses', { body: { ...r.data.address, label: 'Casa' } });
    }
    const res = await api<CheckoutResultDTO>('/api/checkout', { body: r.data });
    if (res.ok) {
      const d = res.data;
      if (d.paid) {
        router.push(`/tienda/pago?pedido=${encodeURIComponent(d.orderId)}`);
        return;
      }
      if (d.wompi?.checkoutUrl) {
        window.location.assign(d.wompi.checkoutUrl);
        return;
      }
      setBanner({ kind: 'demo', text: 'Tu pedido quedó creado, pero los pagos en línea aún no están configurados. Escríbenos por WhatsApp para completarlo.' });
    } else if (res.status === 409) {
      setBanner({ kind: 'stock', text: res.error });
    } else if (res.status === 422) {
      if (res.issues) {
        const e: Errors = {};
        for (const [k, v] of Object.entries(res.issues)) e[k] = v[0] ?? 'Revisa este campo';
        setErrors(e);
        const k = Object.keys(e)[0] ?? '';
        setStep(k.startsWith('customer') ? 1 : k.startsWith('address') ? 2 : 3);
      }
      setBanner({ kind: 'error', text: res.error });
    } else if (res.status === 503) {
      setBanner({ kind: 'demo', text: res.error });
    } else setBanner({ kind: 'error', text: res.error });
    setBusy(false);
  }

  if (!hydrated) return <div className="h-[60vh] animate-pulse rounded-2xl bg-noche/5" aria-label="Cargando checkout" />;
  if (!lines.length)
    return (
      <div className="card mx-auto max-w-lg px-6 py-14 text-center">
        <h2 className="text-2xl">Tu carrito está vacío</h2>
        <p className="mt-2 text-gris">Agrega algo rico antes de pagar.</p>
        <Link href="/tienda" className="btn-primary mt-6">
          Ir a la tienda
        </Link>
      </div>
    );

  const waText = `Hola Café Travesía, quiero completar mi pedido: ${lines.map((l) => `${l.quantity}× ${l.name}${l.variantName ? ` (${l.variantName})` : ''}`).join(', ')}${totals ? `. Total ${formatCOP(totals.totalCop)}` : ''}.`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        {session.status === 'guest' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-noche/10 bg-arena/70 px-5 py-4 text-sm">
            <p>
              Estás comprando como <strong>invitado</strong>. Crea tu cuenta para seguir tus pedidos y ganar Puntos Travesía.
            </p>
            <Link href="/ingresar?next=/tienda/checkout" className="btn-outline btn-sm">
              Iniciar sesión o crear cuenta
            </Link>
          </div>
        ) : null}

        {banner ? (
          <div role="alert" className={cn('rounded-2xl border p-4 text-sm', banner.kind === 'demo' ? 'border-ambar/40 bg-ambar-100' : 'border-cereza/30 bg-cereza/10 text-cereza')}>
            {banner.kind === 'demo' ? (
              <div className="space-y-3 text-noche">
                <DemoNotice>{banner.text}</DemoNotice>
                <a href={whatsappUrl(waText)} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                  <MessageCircle className="size-4" aria-hidden /> Completar por WhatsApp
                </a>
              </div>
            ) : (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {banner.text}
                  {banner.kind === 'stock' ? (
                    <>
                      {' '}
                      <Link href="/tienda/carrito" className="font-semibold underline">
                        Ajustar mi carrito
                      </Link>
                    </>
                  ) : null}
                </span>
              </p>
            )}
          </div>
        ) : null}

        {/* 1. Contacto */}
        <StepBox n={1} title="Contacto" open={step === 1} done={done.has(1)} onEdit={() => setStep(1)} summary={c.email ? `${c.fullName} · ${c.email}` : undefined}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="customer.email" className="label">
                Correo electrónico
              </label>
              <input id="customer.email" type="email" autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} {...field('customer.email')} readOnly={session.status === 'user'} />
              <FieldError k="customer.email" errors={errors} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="customer.fullName" className="label">
                Nombre completo
              </label>
              <input id="customer.fullName" autoComplete="name" value={c.fullName} onChange={(e) => setC({ ...c, fullName: e.target.value })} {...field('customer.fullName')} />
              <FieldError k="customer.fullName" errors={errors} />
            </div>
            <div>
              <label htmlFor="customer.phone" className="label">
                Celular
              </label>
              <input id="customer.phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 000 0000" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} {...field('customer.phone')} />
              <FieldError k="customer.phone" errors={errors} />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
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
                <FieldError k="customer.legalId" errors={errors} />
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gris">Lo usamos para tu factura electrónica y para avisarte del despacho.</p>
          <button type="button" className="btn-primary mt-5" onClick={() => next(1)}>
            Continuar a envío
          </button>
        </StepBox>

        {/* 2. Envío */}
        <StepBox
          n={2}
          title={requiresShipping ? 'Envío' : 'Entrega'}
          open={step === 2}
          done={done.has(2)}
          onEdit={() => (done.has(1) ? setStep(2) : undefined)}
          summary={requiresShipping ? (a.line1 ? `${a.line1}, ${a.city} (${a.region})` : undefined) : 'Productos digitales: acceso inmediato'}
        >
          {requiresShipping ? (
            <>
              {session.addresses.length ? (
                <fieldset className="mb-5 grid gap-2 sm:grid-cols-2">
                  <legend className="label">Tus direcciones</legend>
                  {session.addresses.map((d) => (
                    <label key={d.id} className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition', addrId === d.id ? 'border-noche bg-noche/[0.03]' : 'border-noche/15 hover:border-noche/40')}>
                      <input
                        type="radio"
                        name="addr"
                        className="mt-1 accent-noche"
                        checked={addrId === d.id}
                        onChange={() => {
                          setAddrId(d.id);
                          setA({ recipient: d.recipient, phone: d.phone, region: d.region, city: d.city, line1: d.line1, line2: d.line2 ?? '', notes: d.notes ?? '' });
                        }}
                      />
                      <span>
                        <strong className="block text-noche">{d.label}</strong>
                        {d.line1}, {d.city}
                      </span>
                    </label>
                  ))}
                  <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm', addrId === 'new' ? 'border-noche' : 'border-noche/15')}>
                    <input type="radio" name="addr" className="accent-noche" checked={addrId === 'new'} onChange={() => (setAddrId('new'), setA({ recipient: c.fullName, phone: c.phone, region: a.region, city: '', line1: '', line2: '', notes: '' }))} />
                    Otra dirección
                  </label>
                </fieldset>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="address.region" className="label">
                    Departamento
                  </label>
                  <RegionSelect id="address.region" value={a.region} onChange={(v) => (setA({ ...a, region: v }), setAddrId('new'))} error={err('address.region')} />
                  <FieldError k="address.region" errors={errors} />
                </div>
                <div>
                  <label htmlFor="address.city" className="label">
                    Ciudad o municipio
                  </label>
                  <input id="address.city" autoComplete="address-level2" value={a.city} onChange={(e) => (setA({ ...a, city: e.target.value }), setAddrId('new'))} {...field('address.city')} />
                  <FieldError k="address.city" errors={errors} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address.line1" className="label">
                    Dirección
                  </label>
                  <input id="address.line1" autoComplete="address-line1" placeholder="Calle 10 # 43-12" value={a.line1} onChange={(e) => (setA({ ...a, line1: e.target.value }), setAddrId('new'))} {...field('address.line1')} />
                  <FieldError k="address.line1" errors={errors} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address.line2" className="label">
                    Apartamento, torre, barrio <span className="font-normal text-gris">(opcional)</span>
                  </label>
                  <input id="address.line2" autoComplete="address-line2" value={a.line2} onChange={(e) => setA({ ...a, line2: e.target.value })} className="input" />
                </div>
                <div>
                  <label htmlFor="address.recipient" className="label">
                    Quién recibe
                  </label>
                  <input id="address.recipient" autoComplete="name" value={a.recipient} onChange={(e) => setA({ ...a, recipient: e.target.value })} {...field('address.recipient')} />
                  <FieldError k="address.recipient" errors={errors} />
                </div>
                <div>
                  <label htmlFor="address.phone" className="label">
                    Teléfono de contacto
                  </label>
                  <input id="address.phone" type="tel" autoComplete="tel" value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} {...field('address.phone')} />
                  <FieldError k="address.phone" errors={errors} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address.notes" className="label">
                    Indicaciones para el mensajero <span className="font-normal text-gris">(opcional)</span>
                  </label>
                  <input id="address.notes" value={a.notes} onChange={(e) => setA({ ...a, notes: e.target.value })} className="input" maxLength={300} />
                </div>
              </div>
              {session.status === 'user' && addrId === 'new' ? (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="accent-noche" /> Guardar esta dirección en mi cuenta
                </label>
              ) : null}
              {totals?.zone ? (
                <p className="mt-4 rounded-xl bg-arena px-4 py-3 text-sm">
                  Envío <strong>{totals.zone.name}</strong> · {totals.zone.etaDays} · {totals.shippingCop === 0 ? <strong className="text-montana">gratis</strong> : formatCOP(totals.shippingCop)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gris">Tu compra no requiere envío: recibirás el acceso en tu correo y en tu cuenta apenas se apruebe el pago.</p>
          )}
          <button type="button" className="btn-primary mt-5" onClick={() => next(2)}>
            Continuar al pago
          </button>
        </StepBox>

        {/* 3. Pago */}
        <StepBox n={3} title="Pago" open={step === 3} done={false} onEdit={() => (done.has(2) ? setStep(3) : undefined)}>
          <div className="space-y-5">
            <CouponBox input={couponInput} setInput={setCouponInput} coupon={coupon} setCoupon={setCoupon} result={cr} loading={q.loading} />
            {session.status === 'user' && points > 0 ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ambar/40 bg-ambar-100/60 p-3 text-sm">
                <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="mt-0.5 size-4 accent-noche" />
                <span>
                  Usar mis <strong>{formatNumber(points)} puntos</strong> (equivalen a {formatCOP(points * LOYALTY.valueCop)}; máximo {LOYALTY.maxRedeemPct} % del pedido)
                </span>
              </label>
            ) : null}
            <div>
              <label htmlFor="notes" className="label">
                Notas del pedido <span className="font-normal text-gris">(opcional)</span>
              </label>
              <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" maxLength={500} placeholder="¿Es un regalo? ¿Molienda especial?" />
            </div>
            <div className="rounded-xl border border-noche/10 bg-arena/50 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-noche">
                <Lock className="size-4" aria-hidden /> Pagarás en Wompi (Bancolombia)
              </p>
              <p className="mt-1 text-gris">Tarjeta de crédito o débito, PSE, Nequi, botón Bancolombia o Daviplata. Te redirigimos a la pasarela segura y volverás aquí al terminar.</p>
              <p className="mt-2 text-xs text-gris">
                Nunca te pediremos por WhatsApp ni por llamada la clave de tu tarjeta ni códigos de verificación.{' '}
                <Link href={SECURITY_URL} target="_blank" className="link">
                  Consejos de seguridad en compras
                </Link>
              </p>
            </div>
            <div>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-noche" aria-invalid={Boolean(errors.acceptTerms)} aria-describedby={errors.acceptTerms ? 'acceptTerms-err' : undefined} />
                <span>
                  Acepto los{' '}
                  <Link href={TERMS_URL} target="_blank" className="link">
                    términos y condiciones
                  </Link>{' '}
                  y autorizo el{' '}
                  <Link href={PRIVACY_URL} target="_blank" className="link">
                    tratamiento de mis datos personales
                  </Link>
                  .
                </span>
              </label>
              <FieldError k="acceptTerms" errors={errors} />
            </div>
            <button type="button" onClick={pay} disabled={busy || q.loading || !totals} className="btn-primary w-full py-4 text-base">
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
              {busy ? 'Creando tu pedido…' : totals ? `Pagar ${formatCOP(totals.totalCop)}` : 'Calculando…'}
            </button>
            {Object.keys(errors).length ? <p className="text-center text-xs text-cereza">Revisa los campos marcados.</p> : null}
          </div>
        </StepBox>
      </div>

      {/* Resumen */}
      <aside className="order-first lg:order-none lg:sticky lg:top-26 lg:self-start">
        <details className="group card overflow-hidden lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
            <span className="flex items-center gap-2 text-sm font-semibold">
              Ver resumen <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
            </span>
            <span className="font-display text-xl tabular-nums">{totals ? formatCOP(totals.totalCop) : '—'}</span>
          </summary>
          <div className="border-t border-noche/10 p-5">
            <Summary lines={lines} q={q} cr={cr} />
          </div>
        </details>
        <div className="card hidden p-6 lg:block">
          <h2 className="mb-5 text-2xl">Tu pedido</h2>
          <Summary lines={lines} q={q} cr={cr} />
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-gris">
            <ShieldCheck className="size-4 text-montana" aria-hidden /> Pago 100 % seguro · Tus datos viajan cifrados
          </p>
        </div>
      </aside>
    </div>
  );
}

function strip(e: Errors, prefix: string) {
  return Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(prefix)));
}

function Summary({ lines, q, cr }: { lines: ReturnType<typeof useCart>['lines']; q: ReturnType<typeof useQuote>; cr: { ok: true; code: string } | { ok: false } | null }) {
  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {lines.map((l) => {
          const s = q.data?.lines.find((x) => x.key === `${l.kind}:${l.id}:${l.variantId ?? ''}`);
          return (
            <li key={`${l.kind}:${l.id}:${l.variantId ?? ''}`} className="flex items-center gap-3">
              <div className="relative">
                <LineThumb name={l.name} imageUrl={l.imageUrl} themeColor={l.themeColor} kind={l.kind} className="size-14" />
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-noche text-[0.65rem] font-bold text-crema">{l.quantity}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-noche">{l.name}</p>
                {l.variantName ? <p className="truncate text-xs text-gris">{l.variantName}</p> : null}
              </div>
              <span className="text-sm text-noche tabular-nums">{formatCOP((s?.unitPriceCop ?? l.unitPriceCop) * l.quantity)}</span>
            </li>
          );
        })}
      </ul>
      <FreeShippingBar totals={q.data?.totals} />
      {q.error && q.status !== 0 ? <p className="rounded-xl bg-cereza/10 px-3 py-2 text-sm text-cereza">{q.error}</p> : null}
      <TotalsList totals={q.data?.totals ?? null} couponCode={cr?.ok ? cr.code : null} loading={q.loading} shippingHint="Según tu ciudad" />
    </div>
  );
}

function CouponBox({ input, setInput, coupon, setCoupon, result, loading }: { input: string; setInput: (v: string) => void; coupon: string | null; setCoupon: (v: string | null) => void; result: { ok: true; code: string; description: string | null } | { ok: false; error: string } | null; loading: boolean }) {
  return (
    <div>
      <label htmlFor="co-cupon" className="label flex items-center gap-1.5">
        <Tag className="size-4 text-ambar-700" aria-hidden /> ¿Tienes un cupón?
      </label>
      {coupon && result?.ok ? (
        <div className="flex items-center justify-between rounded-xl border border-montana/30 bg-montana/10 px-4 py-2.5 text-sm text-montana">
          <span>
            <Check className="mr-1 inline size-4" aria-hidden />
            <strong>{result.code}</strong> {result.description ? `· ${result.description}` : 'aplicado'}
          </span>
          <button type="button" onClick={() => (setCoupon(null), setInput(''))} className="grid size-7 place-items-center rounded-full hover:bg-montana/10" aria-label="Quitar cupón">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            id="co-cupon"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setCoupon(input.trim() || null);
              }
            }}
            className={cn('input uppercase', coupon && result && !result.ok && 'input-error')}
            maxLength={40}
            aria-describedby="co-cupon-msg"
          />
          <button type="button" className="btn-outline shrink-0 px-4" disabled={!input.trim()} onClick={() => setCoupon(input.trim() || null)}>
            {loading && coupon ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Aplicar'}
          </button>
        </div>
      )}
      <p id="co-cupon-msg" className="field-error" aria-live="polite">
        {coupon && result && !result.ok ? result.error : ''}
      </p>
    </div>
  );
}

function StepBox({ n, title, open, done, onEdit, summary, children }: { n: Step; title: string; open: boolean; done: boolean; onEdit: () => void; summary?: string; children: React.ReactNode }) {
  return (
    <section className={cn('card transition', open ? 'p-6 ring-1 ring-noche/10' : 'p-5')} aria-labelledby={`step-${n}`}>
      <div className="flex items-center gap-4">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold', done && !open ? 'bg-montana text-crema' : open ? 'bg-noche text-crema' : 'bg-noche/10 text-noche/60')}>{done && !open ? <Check className="size-4" aria-hidden /> : n}</span>
        <div className="min-w-0 flex-1">
          <h2 id={`step-${n}`} className={cn('text-xl', !open && !done && 'text-noche/50')}>
            {title}
          </h2>
          {!open && summary && done ? <p className="truncate text-sm text-gris">{summary}</p> : null}
        </div>
        {!open && done ? (
          <button type="button" onClick={onEdit} className="btn-ghost btn-sm" aria-label={`Editar ${title}`}>
            <Pencil className="size-3.5" aria-hidden /> Editar
          </button>
        ) : null}
      </div>
      {open ? <div className="mt-6 animate-fade-up">{children}</div> : null}
    </section>
  );
}
