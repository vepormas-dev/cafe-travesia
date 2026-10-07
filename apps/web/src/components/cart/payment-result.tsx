'use client';
/** Resultado del pago (/tienda/pago?pedido=&id=&app=1): verifica con el servidor y hace polling si está pendiente. */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, GraduationCap, Loader2, MessageCircle, Smartphone, XCircle } from 'lucide-react';
import { formatCOP } from '@travesia/shared';
import { cart } from './cart-store';
import { pushCart } from './cart-sync';
import { useMe } from '@/components/account/use-me';
import { whatsappUrl } from '@/components/shop/fetcher';
import { DemoNotice } from '@/components/ui/primitives';

type Verify = { transactionStatus: string | null; order?: { id: string; number: string; status: string; totalCop: number; kind: string; emailHint: string } };
type State = 'loading' | 'approved' | 'pending' | 'rejected' | 'timeout' | 'demo' | 'notfound' | 'error';

const APPROVED = ['paid', 'preparing', 'shipped', 'delivered'];
const POLL_MS = 4000;
const MAX_MS = 120000;

export function PaymentResult() {
  const sp = useSearchParams();
  const pedido = sp.get('pedido');
  const txId = sp.get('id');
  const isApp = sp.get('app') === '1';
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<Verify | null>(null);
  const started = useRef(0);
  const { status: session } = useMe();

  useEffect(() => {
    if (!pedido && !txId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin parámetros no hay pago que verificar
      setState('notfound');
      return;
    }
    started.current = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const qs = new URLSearchParams();
    if (txId) qs.set('id', txId);
    if (pedido) qs.set('pedido', pedido);

    const tick = async () => {
      const res = await fetch(`/api/payments/verify?${qs.toString()}`, { cache: 'no-store' }).catch(() => null);
      if (!alive) return;
      if (!res) return schedule();
      if (res.status === 503) return setState('demo');
      if (res.status === 404) return setState('notfound');
      if (!res.ok) return schedule();
      const d = (await res.json()) as Verify;
      setData(d);
      const os = d.order?.status;
      const ts = d.transactionStatus;
      if ((os && APPROVED.includes(os)) || (!d.order && ts === 'APPROVED')) return setState('approved');
      if (os === 'failed' || os === 'cancelled' || ts === 'DECLINED' || ts === 'ERROR' || ts === 'VOIDED') return setState('rejected');
      setState('pending');
      schedule();
    };
    const schedule = () => {
      if (Date.now() - started.current > MAX_MS) return setState('timeout');
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [pedido, txId]);

  const estado = state === 'approved' ? 'aprobado' : state === 'rejected' ? 'rechazado' : 'pendiente';
  const appLink = () => `cafetravesia://pago?pedido=${encodeURIComponent(pedido ?? data?.order?.id ?? '')}&estado=${estado}`;

  // Efectos al llegar a un estado final
  useEffect(() => {
    if (state === 'approved') {
      cart.clear();
      void pushCart();
    }
    if (isApp && ['approved', 'rejected', 'pending', 'timeout'].includes(state)) {
      window.location.href = appLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const o = data?.order;
  const hasCourses = o?.kind === 'course' || o?.kind === 'mixed';

  return (
    <div className="mx-auto max-w-2xl">
      {state === 'loading' ? (
        <Panel icon={<Loader2 className="size-10 animate-spin text-ambar" aria-hidden />} title="Verificando tu pago…" text="Estamos confirmando la transacción con Wompi. No cierres esta ventana." />
      ) : state === 'demo' ? (
        <div className="card space-y-4 p-8">
          <h1 className="text-3xl">Resultado del pago</h1>
          <DemoNotice>La verificación de pagos no está disponible sin base de datos ni Wompi configurados.</DemoNotice>
          <Link href="/tienda" className="btn-primary">
            Volver a la tienda
          </Link>
        </div>
      ) : state === 'notfound' ? (
        <Panel icon={<XCircle className="size-12 text-cereza" aria-hidden />} title="No encontramos ese pedido" text="Revisa el enlace del correo de confirmación o escríbenos y lo buscamos por ti.">
          <a href={whatsappUrl('Hola, necesito ayuda con un pago en cafetravesia.co')} className="btn-primary" target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" aria-hidden /> Escribir por WhatsApp
          </a>
        </Panel>
      ) : state === 'approved' ? (
        <div className="relative">
          <Confetti />
          <Panel icon={<CheckCircle2 className="size-14 text-montana" aria-hidden />} title="¡Pago aprobado! ☕" text={o ? `Tu pedido ${o.number} por ${formatCOP(o.totalCop)} está confirmado. Enviamos el detalle a ${o.emailHint}.` : 'Tu pago fue aprobado.'}>
            <div className="w-full space-y-4 text-left">
              <ol className="grid gap-3 sm:grid-cols-3">
                {(hasCourses && o?.kind === 'course'
                  ? ['Pago confirmado', 'Acceso activado en tu cuenta', 'Empieza tu primera lección']
                  : ['Pago confirmado', 'Tostamos y empacamos (máx. 48 h)', 'Te enviamos la guía de rastreo']
                ).map((s, i) => (
                  <li key={s} className="rounded-xl bg-arena/70 p-3 text-sm">
                    <span className="mb-1 block text-xs font-bold text-ambar-700">Paso {i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {hasCourses ? (
                  <Link href="/cuenta/cursos" className="btn-ambar">
                    <GraduationCap className="size-4" aria-hidden /> Ir a mis cursos
                  </Link>
                ) : null}
                {session === 'user' ? (
                  <Link href={o ? `/cuenta/pedidos/${o.id}` : '/cuenta/pedidos'} className="btn-primary">
                    Ver mi pedido
                  </Link>
                ) : null}
                <Link href="/tienda" className="btn-outline">
                  Seguir comprando
                </Link>
              </div>
              {session === 'guest' ? (
                <div className="rounded-2xl border border-noche/10 bg-hueso p-5 text-center">
                  <p className="font-display text-lg text-noche">Crea tu cuenta y sigue tu pedido</p>
                  <p className="mt-1 text-sm text-gris">Usa el mismo correo ({o?.emailHint ?? 'de tu compra'}) y verás este pedido, tus Puntos Travesía {hasCourses ? 'y tus cursos ' : ''}en un solo lugar.</p>
                  <Link href="/ingresar?next=/cuenta/pedidos" className="btn-primary btn-sm mt-4">
                    Crear mi cuenta
                  </Link>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      ) : state === 'pending' || state === 'timeout' ? (
        <Panel
          icon={state === 'pending' ? <Loader2 className="size-12 animate-spin text-ambar" aria-hidden /> : <Clock className="size-12 text-ambar-700" aria-hidden />}
          title={state === 'pending' ? 'Tu pago está en proceso' : 'Tu pago sigue pendiente'}
          text={
            state === 'pending'
              ? 'Algunos medios (PSE, Nequi, Bancolombia) tardan unos minutos en confirmar. Actualizamos esta página automáticamente.'
              : `Aún no recibimos la confirmación del banco. Te avisaremos por correo${o ? ` (${o.emailHint})` : ''} apenas se apruebe; no necesitas pagar de nuevo.`
          }
        >
          {o ? <p className="text-sm text-gris">Pedido {o.number}</p> : null}
          {state === 'timeout' ? (
            <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
              Volver a verificar
            </button>
          ) : null}
        </Panel>
      ) : state === 'rejected' ? (
        <Panel icon={<XCircle className="size-14 text-cereza" aria-hidden />} title="El pago no fue aprobado" text="Tu banco rechazó la transacción o se canceló el pago. No se hizo ningún cobro. Tu carrito sigue guardado para que lo intentes de nuevo.">
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/tienda/checkout" className="btn-primary">
              Reintentar el pago
            </Link>
            <a href={whatsappUrl(`Hola, mi pago del pedido ${o?.number ?? ''} fue rechazado. ¿Me ayudan?`)} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <MessageCircle className="size-4" aria-hidden /> Pedir ayuda
            </a>
          </div>
        </Panel>
      ) : (
        <Panel icon={<XCircle className="size-12 text-cereza" aria-hidden />} title="No pudimos verificar el pago" text="Inténtalo de nuevo en un momento." />
      )}

      {isApp && state !== 'loading' && state !== 'demo' ? (
        <div className="mt-6 text-center">
          <a href={appLink()} className="btn-ambar">
            <Smartphone className="size-4" aria-hidden /> Volver a la app
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Panel({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="card relative flex flex-col items-center gap-4 overflow-hidden px-6 py-12 text-center sm:px-10" role="status" aria-live="polite">
      <div aria-hidden className="bg-andino absolute inset-x-0 top-0 h-3 opacity-60" />
      {icon}
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <p className="max-w-lg text-noche/75">{text}</p>
      {children}
    </div>
  );
}

const COLORS = ['#EB9A37', '#111A31', '#4D6630', '#B23A2E', '#F5C27A'];
function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 z-10 h-0">
      <style>{`@keyframes ct-confetti{0%{transform:translate3d(0,0,0) rotate(0);opacity:1}100%{transform:translate3d(var(--x),340px,0) rotate(540deg);opacity:0}}`}</style>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-[2px] motion-reduce:hidden"
          style={
            {
              left: `${(i * 37) % 100}%`,
              backgroundColor: COLORS[i % COLORS.length],
              animation: `ct-confetti ${1.6 + (i % 5) * 0.25}s cubic-bezier(.2,.7,.3,1) ${(i % 7) * 0.08}s both`,
              '--x': `${((i * 53) % 120) - 60}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
