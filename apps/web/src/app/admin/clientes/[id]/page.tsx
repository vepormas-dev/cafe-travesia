import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ENROLL_SOURCE_LABEL, ORDER_STATUS_TONE, ROLE_LABEL, SUB_STATUS_TONE, CHAT_STATUS_LABEL } from '@/lib/admin/labels';
import { formatCOP, formatDate, ORDER_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { getCustomer } from '@/lib/admin/data/customers';
import { Avatar, Badge, KeyValue, PageHeader, PageSkeleton, Panel, Stat, relTime } from '@/components/admin/ui';
import { CustomerActions } from '@/components/admin/sales/customer-actions';

export const metadata: Metadata = { title: 'Cliente' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} kpis={4} />}>
      <Customer params={params} />
    </Suspense>
  );
}

async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await staffPage(`/admin/clientes/${id}`);
  const c = await getCustomer(id);
  if (!c) notFound();
  const u = c.user;
  return (
    <>
      <PageHeader
        back={{ href: '/admin/clientes', label: 'Clientes' }}
        title={<span className="flex items-center gap-3"><Avatar name={u.fullName ?? u.email} src={u.avatarUrl} className="size-11 text-sm" />{u.fullName ?? u.email}</span>}
        description={`${u.email} · ${ROLE_LABEL[u.role]} · cliente desde ${formatDate(u.createdAt)} · último acceso ${relTime(u.lastSeenAt)}`}
        actions={<CustomerActions userId={u.id} name={u.fullName ?? u.email} />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Panel><Stat label="LTV" value={formatCOP(c.stats.ltv)} /></Panel>
        <Panel><Stat label="Pedidos pagados" value={c.stats.orders} /></Panel>
        <Panel><Stat label="Ticket promedio" value={formatCOP(c.stats.aov)} /></Panel>
        <Panel><Stat label="Puntos" value={u.loyaltyPoints.toLocaleString('es-CO')} hint={`≈ ${formatCOP(u.loyaltyPoints * 10)}`} /></Panel>
        <Panel><Stat label="Primera compra" value={c.stats.firstOrderAt ? formatDate(c.stats.firstOrderAt, { month: 'short', year: 'numeric' }) : '—'} /></Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Panel title="Pedidos" bodyClassName="pb-2">
            {c.orders.length ? (
              <ul className="divide-y divide-noche/[0.06]">
                {c.orders.map((o) => (
                  <li key={o.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-sm sm:grid-cols-[1fr_8rem_9rem_7rem]">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-noche hover:underline">{o.number}</Link>
                    <span className="hidden text-xs text-gris sm:block">{formatDate(o.createdAt)}</span>
                    <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    <span className="text-right font-semibold tabular-nums">{formatCOP(o.totalCop)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gris">Sin pedidos.</p>}
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Suscripciones">
              {c.subscriptions.length ? c.subscriptions.map((s) => (
                <Link key={s.id} href={`/admin/suscripciones/${s.id}`} className="mb-2 flex items-center justify-between rounded-lg border border-noche/[0.08] p-3 text-sm hover:bg-crema/50">
                  <span><span className="block font-medium text-noche">{s.planName}</span><span className="text-xs text-gris">{formatCOP(s.priceCop)} · próximo {formatDate(s.nextBillingAt, { day: 'numeric', month: 'short' })}</span></span>
                  <Badge tone={SUB_STATUS_TONE[s.status]}>{SUBSCRIPTION_STATUS_LABEL[s.status]}</Badge>
                </Link>
              )) : <p className="text-sm text-gris">No tiene suscripciones.</p>}
            </Panel>
            <Panel title="Academia">
              {c.enrollments.length ? c.enrollments.map((e) => (
                <div key={e.id} className="mb-3">
                  <div className="flex justify-between text-sm"><span className="font-medium text-noche">{e.title}</span><span className="text-xs text-gris">{ENROLL_SOURCE_LABEL[e.source]} · {e.progressPct}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-noche/[0.06]"><div className="h-full rounded-full bg-montana" style={{ width: `${e.progressPct}%` }} /></div>
                </div>
              )) : <p className="text-sm text-gris">No está inscrito en cursos.</p>}
              {c.certificates.length ? <p className="mt-2 text-xs text-gris">Certificados: {c.certificates.map((x) => x.code).join(', ')}</p> : null}
            </Panel>
          </div>
          <Panel title="Movimientos de puntos">
            {c.ledger.length ? (
              <ul className="space-y-1.5 text-sm">
                {c.ledger.map((l, i) => (
                  <li key={i} className="flex justify-between"><span className="text-noche/80">{l.reason}</span><span className="flex gap-3"><span className="text-xs text-gris">{formatDate(l.createdAt, { day: 'numeric', month: 'short' })}</span><strong className={l.points < 0 ? 'text-cereza' : 'text-montana'}>{l.points > 0 ? '+' : ''}{l.points}</strong></span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-gris">Sin movimientos.</p>}
          </Panel>
        </div>
        <div className="space-y-4 xl:col-span-4">
          <Panel title="Datos">
            <KeyValue items={[['Teléfono', u.phone ?? '—'], ['Documento', u.legalId ? `${u.legalIdType ?? ''} ${u.legalId}` : '—'], ['Ingreso con', u.provider ?? '—'], ['Marketing', u.marketingOptIn ? 'Acepta' : 'No acepta'], ['Estado', u.disabledAt ? 'Deshabilitado' : 'Activo']]} />
          </Panel>
          <Panel title="Direcciones">
            {c.addresses.map((a) => (
              <address key={a.id} className="mb-2 rounded-lg bg-crema/60 p-3 text-sm text-noche not-italic">
                <strong>{a.label}</strong>{a.isDefault ? <Badge className="ml-2">Principal</Badge> : null}<br />{a.recipient} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.region}
              </address>
            ))}
            {!c.addresses.length ? <p className="text-sm text-gris">Sin direcciones guardadas.</p> : null}
          </Panel>
          <Panel title="App y soporte">
            <p className="mb-2 text-xs font-medium text-gris">Dispositivos</p>
            {c.devices.length ? c.devices.map((d, i) => <p key={i} className="text-sm text-noche">{d.platform} · v{d.appVersion ?? '?'} · {d.enabled ? 'activo' : 'deshabilitado'} · {relTime(d.updatedAt)}</p>) : <p className="text-sm text-gris">No ha instalado la app.</p>}
            <p className="mt-3 mb-2 text-xs font-medium text-gris">Conversaciones</p>
            {c.chats.length ? c.chats.map((ch) => <Link key={ch.id} href={`/admin/chat?s=${ch.id}`} className="block text-sm text-ambar-700 hover:underline">{CHAT_STATUS_LABEL[ch.status]} · {relTime(ch.lastMessageAt)}</Link>) : <p className="text-sm text-gris">Sin conversaciones.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
