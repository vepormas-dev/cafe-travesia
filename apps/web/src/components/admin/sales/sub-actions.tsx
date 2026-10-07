'use client';
import { useState } from 'react';
import { CreditCard, Pause, Play, SkipForward, XCircle } from 'lucide-react';
import { chargeSubscriptionNow, subscriptionAction } from '@/lib/admin/actions/ops';
import { ConfirmButton, Dialog, Field, useRunAction } from '../client-ui';
import { btn, inputCls } from '../ui';

export function SubscriptionActions({ id, status, isAdmin }: { id: string; status: string; isAdmin: boolean }) {
  const { pending, run } = useRunAction();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  if (status === 'cancelled') return <p className="text-sm text-gris">Suscripción cancelada: no hay acciones disponibles.</p>;
  return (
    <div className="grid gap-2">
      {status === 'paused' ? (
        <button type="button" disabled={pending} onClick={() => run(() => subscriptionAction(id, { action: 'resume' }))} className={btn.primary}><Play className="size-4" /> Reanudar</button>
      ) : (
        <button type="button" disabled={pending} onClick={() => setPauseOpen(true)} className={btn.secondary}><Pause className="size-4" /> Pausar</button>
      )}
      <button type="button" disabled={pending} onClick={() => run(() => subscriptionAction(id, { action: 'skip' }))} className={btn.secondary}><SkipForward className="size-4" /> Saltar próximo envío</button>
      {isAdmin && status !== 'paused' ? (
        <ConfirmButton danger={false} className={btn.ambar} title="¿Cobrar ahora?" description="Se cobra el valor del plan a la tarjeta guardada. Si se aprueba, se crea el pedido de despacho." confirmLabel="Cobrar ahora" onConfirm={() => run(() => chargeSubscriptionNow(id))}>
          <CreditCard className="size-4" /> Cobrar ahora
        </ConfirmButton>
      ) : null}
      <ConfirmButton className={btn.danger} title="¿Cancelar la suscripción?" description={<div className="space-y-3"><p>Se desvincula la tarjeta en Wompi y no habrá más cobros.</p><Field label="Motivo"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Solicitud del cliente por WhatsApp" /></Field></div>} confirmLabel="Cancelar suscripción" onConfirm={() => run(() => subscriptionAction(id, { action: 'cancel', reason: reason || 'Cancelada desde el panel' }))}>
        <XCircle className="size-4" /> Cancelar
      </ConfirmButton>
      <Dialog open={pauseOpen} onClose={() => setPauseOpen(false)} title="Pausar suscripción" footer={<><button type="button" className={btn.secondary} onClick={() => setPauseOpen(false)}>Cancelar</button><button type="button" className={btn.primary} onClick={() => { setPauseOpen(false); run(() => subscriptionAction(id, { action: 'pause', until: until || undefined })); }}>Pausar</button></>}>
        <Field label="Reanudar automáticamente el" hint="Si lo dejas vacío, se pausa 30 días.">
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={inputCls} />
        </Field>
      </Dialog>
    </div>
  );
}
