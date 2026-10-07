'use client';
import { Check, RefreshCw, RotateCcw, Star, X } from 'lucide-react';
import { formatDate } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { moderateReview, recalcAllRatings } from '@/lib/admin/actions/catalog';
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from '@/lib/admin/labels';
import { useRunAction } from '../client-ui';
import { Avatar, Badge, Empty, btn } from '../ui';

type R = { id: string; target: string; author: string; rating: number; title: string | null; body: string | null; status: string; verified: boolean; createdAt: string; kind: 'producto' | 'curso' };

export function ReviewsList({ rows }: { rows: R[] }) {
  const { pending, run } = useRunAction();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" disabled={pending} onClick={() => run(() => recalcAllRatings())} className={btn.secondary}><RefreshCw className={cn('size-4', pending && 'animate-spin')} /> Recalcular calificaciones</button>
      </div>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className={cn('rounded-xl border bg-white p-4', r.status === 'pending' ? 'border-amber-200' : 'border-noche/[0.08]')}>
              <div className="flex flex-wrap items-start gap-3">
                <Avatar name={r.author} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <strong className="text-noche">{r.author}</strong>
                    {r.verified ? <Badge tone="success">Compra verificada</Badge> : null}
                    <span className="text-gris">sobre</span> <span className="font-medium text-noche">{r.target}</span> <span className="text-xs text-gris">({r.kind})</span>
                  </p>
                  <p className="mt-1 flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('size-3.5', i < r.rating ? 'fill-ambar text-ambar' : 'text-noche/15')} />)}
                    <span className="ml-2 text-xs text-gris">{formatDate(r.createdAt)}</span>
                  </p>
                  {r.title ? <p className="mt-2 font-medium text-noche">{r.title}</p> : null}
                  <p className="mt-0.5 text-sm text-noche/80">{r.body}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge tone={REVIEW_STATUS_TONE[r.status]} dot>{REVIEW_STATUS_LABEL[r.status]}</Badge>
                  <div className="flex gap-1">
                    {r.status !== 'approved' ? <button type="button" disabled={pending} onClick={() => run(() => moderateReview(r.id, 'approved'))} className={cn(btn.primary, btn.sm)}><Check className="size-3.5" /> Aprobar</button> : null}
                    {r.status !== 'rejected' ? <button type="button" disabled={pending} onClick={() => run(() => moderateReview(r.id, 'rejected'))} className={cn(btn.danger, btn.sm)}><X className="size-3.5" /> Rechazar</button> : null}
                    {r.status !== 'pending' ? <button type="button" disabled={pending} onClick={() => run(() => moderateReview(r.id, 'pending'))} className={cn(btn.ghost, btn.sm)} title="Volver a revisión"><RotateCcw className="size-3.5" /></button> : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : <Empty title="No hay reseñas en esta vista" icon={<Star className="size-5" />} />}
    </>
  );
}
