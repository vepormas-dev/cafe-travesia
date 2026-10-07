'use client';
import { unsubscribeNewsletter } from '@/lib/admin/actions/ops';
import { ConfirmButton, useRunAction } from '../client-ui';
import { btn } from '../ui';
import { cn } from '@/lib/cn';

export function UnsubscribeButton({ email }: { email: string }) {
  const { run } = useRunAction();
  return (
    <ConfirmButton className={cn(btn.ghost, btn.sm, 'text-cereza')} title="¿Dar de baja este correo?" description={email} confirmLabel="Dar de baja" onConfirm={() => run(() => unsubscribeNewsletter(email))}>
      Dar de baja
    </ConfirmButton>
  );
}
