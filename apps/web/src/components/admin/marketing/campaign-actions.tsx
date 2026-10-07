'use client';
import { cancelCampaign } from '@/lib/admin/actions/marketing';
import { ConfirmButton, useRunAction } from '../client-ui';

export function CancelCampaignButton({ id }: { id: string }) {
  const { run } = useRunAction();
  return (
    <ConfirmButton className="ml-1 text-cereza underline" title="¿Cancelar la campaña programada?" confirmLabel="Cancelar campaña" onConfirm={() => run(() => cancelCampaign(id))}>
      cancelar
    </ConfirmButton>
  );
}
