'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LEGAL_ID_TYPES, profileSchema, type MeDTO } from '@travesia/shared';
import { api } from '@/components/shop/fetcher';
import { cn } from '@/lib/cn';

export function ProfileForm({ me }: { me: MeDTO }) {
  const router = useRouter();
  const [f, setF] = useState({ fullName: me.fullName ?? '', phone: me.phone ?? '', legalIdType: me.legalIdType ?? 'CC', legalId: me.legalId ?? '', marketingOptIn: me.marketingOptIn });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...f, phone: f.phone || null, legalId: f.legalId || null, legalIdType: (f.legalIdType || null) as 'CC' | null };
    const r = profileSchema.safeParse(data);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] ??= i.path[0] === 'fullName' ? 'Escribe tu nombre (mínimo 2 letras)' : i.message;
      return setErrors(errs);
    }
    setErrors({});
    setBusy(true);
    const res = await api('/api/v1/me', { method: 'PATCH', body: r.data });
    setBusy(false);
    if (res.ok) {
      toast.success('Guardamos tus datos');
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <label htmlFor="pf-email" className="label">
          Correo
        </label>
        <input id="pf-email" className="input" value={me.email} readOnly disabled />
      </div>
      <div>
        <label htmlFor="pf-name" className="label">
          Nombre completo
        </label>
        <input id="pf-name" className={cn('input', errors.fullName && 'input-error')} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoComplete="name" aria-invalid={Boolean(errors.fullName)} />
        {errors.fullName ? <p className="field-error">{errors.fullName}</p> : null}
      </div>
      <div>
        <label htmlFor="pf-phone" className="label">
          Celular
        </label>
        <input id="pf-phone" type="tel" className={cn('input', errors.phone && 'input-error')} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
        {errors.phone ? <p className="field-error">{errors.phone}</p> : null}
      </div>
      <div>
        <label htmlFor="pf-idt" className="label">
          Tipo de documento
        </label>
        <select id="pf-idt" className="input" value={f.legalIdType} onChange={(e) => setF({ ...f, legalIdType: e.target.value })}>
          {LEGAL_ID_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="pf-id" className="label">
          Número de documento
        </label>
        <input id="pf-id" inputMode="numeric" className={cn('input', errors.legalId && 'input-error')} value={f.legalId} onChange={(e) => setF({ ...f, legalId: e.target.value })} />
        {errors.legalId ? <p className="field-error">{errors.legalId}</p> : null}
      </div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" checked={f.marketingOptIn} onChange={(e) => setF({ ...f, marketingOptIn: e.target.checked })} className="mt-0.5 size-4 accent-noche" />
        <span>Quiero recibir novedades, ediciones de temporada y promociones por correo y notificaciones.</span>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Guardar cambios
        </button>
      </div>
    </form>
  );
}
