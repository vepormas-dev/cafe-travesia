'use client';
import { useState } from 'react';
import { BellRing, Star } from 'lucide-react';
import { DEEP_LINKS } from '@travesia/shared';
import { adjustPoints, pushToUser } from '@/lib/admin/actions/ops';
import { Dialog, Field, useRunAction } from '../client-ui';
import { btn, inputCls, selectCls } from '../ui';

export function CustomerActions({ userId, name }: { userId: string; name: string }) {
  const { pending, run } = useRunAction();
  const [pts, setPts] = useState(false);
  const [push, setPush] = useState(false);
  const [points, setPoints] = useState(100);
  const [reason, setReason] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('/cuenta/pedidos');
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn.secondary} onClick={() => setPts(true)}><Star className="size-4" /> Ajustar puntos</button>
      <button type="button" className={btn.secondary} onClick={() => setPush(true)}><BellRing className="size-4" /> Enviar push</button>
      <Dialog open={pts} onClose={() => setPts(false)} title={`Ajustar puntos de ${name}`} footer={<><button type="button" className={btn.secondary} onClick={() => setPts(false)}>Cancelar</button><button type="button" disabled={pending} className={btn.primary} onClick={() => run(() => adjustPoints(userId, points, reason), { onOk: () => setPts(false) })}>Aplicar {points > 0 ? '+' : ''}{points}</button></>}>
        <div className="space-y-3">
          <Field label="Puntos (negativo para descontar)" hint="1 punto = $10 al redimir"><input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Motivo"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Compensación por demora en el envío" /></Field>
        </div>
      </Dialog>
      <Dialog open={push} onClose={() => setPush(false)} title={`Notificación para ${name}`} footer={<><button type="button" className={btn.secondary} onClick={() => setPush(false)}>Cancelar</button><button type="button" disabled={pending} className={btn.primary} onClick={() => run(() => pushToUser(userId, title, body, link), { onOk: () => setPush(false) })}>Enviar</button></>}>
        <div className="space-y-3">
          <Field label="Título" counter={{ value: title.length, max: 65 }}><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></Field>
          <Field label="Mensaje" counter={{ value: body.length, max: 240 }}><textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} /></Field>
          <Field label="Abre"><select value={link} onChange={(e) => setLink(e.target.value)} className={selectCls}>{DEEP_LINKS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></Field>
          <p className="text-xs text-gris">Llega a sus dispositivos con la app y a la bandeja de notificaciones de su cuenta.</p>
        </div>
      </Dialog>
    </div>
  );
}
