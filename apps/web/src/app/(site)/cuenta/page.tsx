import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Bell, CalendarClock, Coins, GraduationCap, Package, Repeat } from 'lucide-react';
import { FREQUENCY_LABEL, GRIND_LABEL, LOYALTY, formatCOP, formatDate, formatDateTime, formatNumber } from '@travesia/shared';
import { requireUser } from '@/lib/auth';
import { currentEnrollment, listNotifications, listOrders, listSubscriptions } from '@/lib/account';
import { isDemoMode } from '@/lib/env';
import { DemoNotice } from '@/components/ui/primitives';
import { OrderTimeline, SectionSkeleton, StatusPill } from '@/components/account/ui';

export const metadata: Metadata = { title: 'Resumen' };

export default function CuentaPage() {
  return (
    <Suspense fallback={<SectionSkeleton rows={4} />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await requireUser('/cuenta');
  const [subs, orders, enrollment, notif] = await Promise.all([listSubscriptions(user.id), listOrders(user.id, 3), currentEnrollment(user.id), listNotifications(user.id, 4)]);
  const sub = subs.find((s) => s.status !== 'cancelled') ?? null;
  const last = orders[0] ?? null;
  const first = (user.fullName ?? '').split(' ')[0];

  return (
    <div className="space-y-6">
      <header className="mb-2">
        <h1 className="title-lg">Hola{first ? `, ${first}` : ''} ☕</h1>
        <p className="mt-2 text-noche/70">Tu suscripción, tus pedidos y tu progreso en la Academia, en un solo lugar.</p>
      </header>
      {isDemoMode() ? <DemoNotice /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Suscripción */}
        <section className="card relative flex flex-col overflow-hidden p-6 sm:p-7" aria-labelledby="ov-sub">
          {sub ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <StatusPill status={sub.status} kind="subscription" />
                  <h2 id="ov-sub" className="mt-3 text-2xl">
                    Plan {sub.plan.name}
                  </h2>
                  <p className="text-sm text-gris">
                    {sub.plan.bagsPerDelivery} × {sub.plan.bagWeightG} g · {formatCOP(sub.priceCop)} por entrega
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-gris uppercase">{sub.status === 'paused' ? 'En pausa hasta' : 'Próximo envío'}</p>
                  <p className="font-display text-2xl text-noche">{formatDate(sub.status === 'paused' ? sub.pausedUntil : sub.nextBillingAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ['Frecuencia', FREQUENCY_LABEL(sub.plan.frequencyWeeks)],
                  ['Molienda', GRIND_LABEL[sub.grind] ?? sub.grind],
                  ['Café actual', sub.product?.name ?? 'Selección del tostador'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-arena/70 px-4 py-3">
                    <dt className="text-xs text-gris">{k}</dt>
                    <dd className="font-semibold text-noche">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex flex-wrap gap-3 border-t border-noche/10 pt-5 sm:mt-8">
                <Link href="/cuenta/suscripcion#cambiar" className="btn-primary btn-sm">
                  Cambiar café
                </Link>
                <Link href="/cuenta/suscripcion#pausar" className="btn-outline btn-sm">
                  {sub.status === 'paused' ? 'Reanudar' : 'Pausar o saltar'}
                </Link>
                <Link href="/cuenta/suscripcion" className="btn-ghost btn-sm">
                  Gestionar
                </Link>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <Repeat className="size-8 text-ambar-700" aria-hidden />
                <h2 id="ov-sub" className="mt-3 text-2xl">
                  Café recién tostado, sin preocuparte
                </h2>
                <p className="mt-1 text-sm text-gris">Suscríbete y recibe tu origen favorito cada 2 o 4 semanas con envío gratis.</p>
              </div>
              <Link href="/suscripciones" className="btn-primary shrink-0">
                Ver planes
              </Link>
            </div>
          )}
        </section>

        {/* Curso en progreso */}
        <section className="card flex flex-col p-6" aria-labelledby="ov-curso">
          <h2 id="ov-curso" className="text-xl">
            Curso en progreso
          </h2>
          {enrollment ? (
            <>
              <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-xl bg-noche">
                {enrollment.course.coverUrl ? <Image src={enrollment.course.coverUrl} alt="" fill sizes="(min-width:1280px) 30vw, 90vw" className="object-cover" /> : <GraduationCap className="absolute inset-0 m-auto size-10 text-ambar" aria-hidden />}
              </div>
              <p className="mt-4 font-display text-lg text-noche">{enrollment.course.title}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gris">Progreso</span>
                <span className="font-display text-2xl text-montana">{enrollment.progressPct} %</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-noche/10" role="progressbar" aria-valuenow={enrollment.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del curso">
                <div className="h-full rounded-full bg-montana" style={{ width: `${enrollment.progressPct}%` }} />
              </div>
              <Link href={`/academia/${enrollment.course.slug}`} className="btn-primary btn-sm mt-5 bg-montana hover:bg-montana/90">
                Continuar aula <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-3 py-4">
              <p className="text-sm text-gris">Aprende a preparar como en barra con los cursos de la Academia Travesía.</p>
              <Link href="/academia" className="btn-outline btn-sm w-fit">
                Explorar cursos
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Último pedido */}
      <section className="card p-6 sm:p-7" aria-labelledby="ov-pedido">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ov-pedido" className="flex items-center gap-2 text-xl">
            <Package className="size-5 text-ambar-700" aria-hidden /> Último pedido
          </h2>
          <Link href="/cuenta/pedidos" className="text-xs font-semibold tracking-[0.18em] text-montana uppercase hover:underline">
            Ver historial completo
          </Link>
        </div>
        {last ? (
          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div>
              <p className="font-display text-xl text-noche">#{last.number}</p>
              <p className="text-sm text-gris">
                {formatDate(last.createdAt)} · {last.items.length} {last.items.length === 1 ? 'producto' : 'productos'} · {formatCOP(last.totalCop)}
              </p>
              <div className="mt-2">
                <StatusPill status={last.status} />
              </div>
              <Link href={`/cuenta/pedidos/${last.id}`} className="link mt-3 inline-block text-sm">
                Ver detalle
              </Link>
            </div>
            <OrderTimeline order={last} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-gris">
            Aún no tienes pedidos.{' '}
            <Link href="/tienda" className="link">
              Descubre nuestros cafés
            </Link>
          </p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Puntos */}
        <section className="relative overflow-hidden rounded-2xl bg-noche p-6 text-crema shadow-suave" aria-labelledby="ov-puntos">
          <div aria-hidden className="bg-andino absolute inset-0 opacity-10" />
          <div className="relative">
            <h2 id="ov-puntos" className="flex items-center gap-2 text-xl !text-crema">
              <Coins className="size-5 text-ambar" aria-hidden /> Puntos Travesía
            </h2>
            <p className="mt-4 font-display text-5xl tabular-nums">{formatNumber(user.loyaltyPoints)}</p>
            <p className="text-sm text-crema/70">Equivalen a {formatCOP(user.loyaltyPoints * LOYALTY.valueCop)} en tu próxima compra.</p>
            <Link href="/cuenta/puntos" className="btn-ambar btn-sm mt-5">
              Ver movimientos
            </Link>
          </div>
        </section>

        {/* Notificaciones */}
        <section className="card p-6" aria-labelledby="ov-notif">
          <div className="flex items-center justify-between">
            <h2 id="ov-notif" className="flex items-center gap-2 text-xl">
              <Bell className="size-5 text-ambar-700" aria-hidden /> Notificaciones
            </h2>
            {notif.unread ? <span className="rounded-full bg-ambar px-2 py-0.5 text-xs font-bold text-noche">{notif.unread} nuevas</span> : null}
          </div>
          {notif.notifications.length ? (
            <ul className="mt-4 divide-y divide-noche/10">
              {notif.notifications.map((n) => (
                <li key={n.id} className="flex gap-3 py-3">
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? 'bg-noche/15' : 'bg-ambar'}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-noche">{n.title}</p>
                    <p className="line-clamp-1 text-xs text-gris">{n.body}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-gris">
                      <CalendarClock className="size-3" aria-hidden /> {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gris">Aquí verás avisos de tus pedidos, cobros y nuevos cursos.</p>
          )}
          <Link href="/cuenta/notificaciones" className="link mt-3 inline-block text-sm">
            Ver todas
          </Link>
        </section>
      </div>
    </div>
  );
}
