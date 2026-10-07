'use client';
import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Save } from 'lucide-react';
import { initialActionState } from '@/lib/admin/action-state';
import { changeOrderStatus, markOrderPaidManual, saveOrderNotes } from '@/lib/admin/actions/orders';
import { CARRIERS, CARRIER_TRACKING } from '@/lib/admin/labels';
import { Dialog, Field, SubmitButton, useActionToast, useRunAction } from '../client-ui';
import { btn, inputCls, selectCls } from '../ui';

const NEXT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  paid: [
    { value: 'preparing', label: 'En preparación (tostando / empacando)' },
    { value: 'shipped', label: 'Enviado' },
    { value: 'cancelled', label: 'Cancelar (devuelve stock)' },
    { value: 'refunded', label: 'Reembolsado' },
  ],
  preparing: [
    { value: 'shipped', label: 'Enviado' },
    { value: 'delivered', label: 'Entregado (sin envío / recogido)' },
    { value: 'cancelled', label: 'Cancelar (devuelve stock)' },
    { value: 'refunded', label: 'Reembolsado' },
  ],
  shipped: [
    { value: 'delivered', label: 'Entregado' },
    { value: 'shipped', label: 'Actualizar guía' },
    { value: 'refunded', label: 'Reembolsado' },
  ],
  delivered: [{ value: 'refunded', label: 'Reembolsado' }],
  pending: [{ value: 'cancelled', label: 'Cancelar' }],
  failed: [{ value: 'cancelled', label: 'Cancelar' }],
};

export function OrderStatusForm({ orderId, status, carrier, trackingNumber, trackingUrl, requiresShipping }: { orderId: string; status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; requiresShipping: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(changeOrderStatus.bind(null, orderId), initialActionState);
  useActionToast(state, () => router.refresh());
  const options = NEXT_OPTIONS[status] ?? [];
  const [next, setNext] = useState(options[0]?.value ?? '');
  const [c, setC] = useState(carrier ?? (requiresShipping ? 'Servientrega' : ''));
  const [guide, setGuide] = useState(trackingNumber ?? '');
  const [url, setUrl] = useState(trackingUrl ?? '');
  if (!options.length) return <p className="text-sm text-gris">Este pedido no tiene más cambios de estado disponibles.</p>;
  const autoUrl = (carrierName: string, g: string) => (CARRIER_TRACKING[carrierName] && g ? `${CARRIER_TRACKING[carrierName]}${encodeURIComponent(g)}` : '');
  const shipping = next === 'shipped';
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="payload" value={JSON.stringify({ status: next, carrier: shipping ? c || null : c || null, trackingNumber: guide, trackingUrl: url })} />
      <Field label="Nuevo estado" name="status" errors={state.errors}>
        <select value={next} onChange={(e) => setNext(e.target.value)} className={selectCls}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      {shipping ? (
        <>
          <Field label="Transportadora" name="carrier" errors={state.errors}>
            <select
              value={c}
              onChange={(e) => {
                setC(e.target.value);
                if (!url || url === autoUrl(c, guide)) setUrl(autoUrl(e.target.value, guide));
              }}
              className={selectCls}
            >
              <option value="">Elige…</option>
              {CARRIERS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Número de guía" name="trackingNumber" errors={state.errors}>
            <input
              value={guide}
              onChange={(e) => {
                const g = e.target.value;
                if (!url || url === autoUrl(c, guide)) setUrl(autoUrl(c, g));
                setGuide(g);
              }}
              className={inputCls}
              placeholder="Ej. 9123456789"
            />
          </Field>
          <Field label="URL de rastreo" name="trackingUrl" errors={state.errors} hint="Se arma sola según la transportadora; puedes editarla.">
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} placeholder="https://…" />
          </Field>
        </>
      ) : null}
      {shipping || next === 'delivered' ? <p className="text-xs text-gris">El cliente recibe correo y notificación push automáticamente.</p> : null}
      <SubmitButton className="w-full">{next === 'cancelled' ? 'Cancelar pedido' : 'Actualizar estado'}</SubmitButton>
    </form>
  );
}

export function MarkPaidButton({ orderId, totalLabel }: { orderId: string; totalLabel: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const { pending, run } = useRunAction();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn.ambar}>
        <Banknote className="size-4" /> Marcar pagado
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar pago manual"
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" disabled={pending} className={btn.primary} onClick={() => run(() => markOrderPaidManual(orderId, note), { onOk: () => setOpen(false) })}>
              Confirmar pago de {totalLabel}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-noche/80">Úsalo para transferencias o consignaciones verificadas. Se aplicarán todos los efectos del pago (stock, cupón, puntos, inscripciones, correo y push) con método <strong>MANUAL</strong>.</p>
        <Field label="Referencia / nota (opcional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Ej. Transferencia Bancolombia #12345" />
        </Field>
      </Dialog>
    </>
  );
}

export function NotesEditor({ orderId, initial }: { orderId: string; initial: string }) {
  const [v, setV] = useState(initial);
  const { pending, run } = useRunAction();
  return (
    <div className="space-y-2">
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={4} className={inputCls} placeholder="Solo visibles para el equipo (p. ej. «cliente pidió molienda extra fina»)." />
      <button type="button" disabled={pending || v === initial} onClick={() => run(() => saveOrderNotes(orderId, v))} className={`${btn.secondary} ${btn.sm}`}>
        <Save className="size-3.5" /> Guardar notas
      </button>
    </div>
  );
}
