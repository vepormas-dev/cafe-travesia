'use client';
import { useState } from 'react';
import { setUserRole } from '@/lib/admin/actions/ops';
import { ROLE_LABEL } from '@/lib/admin/labels';
import { ConfirmButton, useRunAction } from '../client-ui';
import { btn, selectCls } from '../ui';
import { cn } from '@/lib/cn';

export function RoleSelect({ userId, email, role, isSelf }: { userId: string; email: string; role: 'customer' | 'editor' | 'admin'; isSelf: boolean }) {
  const [next, setNext] = useState(role);
  const { run } = useRunAction();
  return (
    <div className="flex items-center justify-end gap-2">
      <select value={next} disabled={isSelf} onChange={(e) => setNext(e.target.value as typeof role)} className={cn(selectCls, 'w-40')} aria-label={`Rol de ${email}`} title={isSelf ? 'No puedes cambiar tu propio rol' : undefined}>
        {(['customer', 'editor', 'admin'] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
      {next !== role ? (
        <ConfirmButton danger={next === 'customer'} className={cn(btn.primary, btn.sm)} title="¿Cambiar el rol?" description={<>«{email}» pasará de <strong>{ROLE_LABEL[role]}</strong> a <strong>{ROLE_LABEL[next]}</strong>. Se actualiza el claim en Firebase y se cierran sus sesiones abiertas.</>} confirmLabel="Cambiar rol" onConfirm={() => run(() => setUserRole(userId, next), { onOk: () => undefined })}>
          Aplicar
        </ConfirmButton>
      ) : null}
    </div>
  );
}
