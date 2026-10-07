'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { signOutEverywhere } from '@/lib/firebase/client';

/** Zona de peligro: eliminación de cuenta (DELETE /api/v1/me). */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const res = await fetch('/api/v1/me', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: text.trim() }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return toast.error(data.error ?? 'No pudimos eliminar tu cuenta');
    await signOutEverywhere();
    window.location.href = '/?cuenta=eliminada';
  }
  return (
    <div>
      <p className="text-sm text-gris">
        Elimina tu cuenta y tus datos personales: cancelamos tus suscripciones, anulamos tus tarjetas guardadas y pierdes el acceso a tus cursos y puntos. Conservamos solo el registro de compras que exige la ley contable. Esta acción no se puede deshacer.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn mt-4 border border-cereza/40 text-cereza hover:bg-cereza hover:text-white">
          <Trash2 className="size-4" aria-hidden /> Eliminar mi cuenta
        </button>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl border border-cereza/30 bg-cereza/5 p-4">
          <label className="label" htmlFor="del-confirm">
            Escribe <strong>ELIMINAR</strong> para confirmar
          </label>
          <input id="del-confirm" className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <div className="flex gap-2">
            <button type="button" disabled={text.trim() !== 'ELIMINAR' || busy} onClick={submit} className="btn bg-cereza text-white hover:brightness-110">
              {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
