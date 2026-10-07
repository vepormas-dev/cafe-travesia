'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@travesia/shared';
import { api } from '@/components/shop/fetcher';
import { cn } from '@/lib/cn';

type N = { id: string; title: string; body: string; deepLink: string | null; kind: string; readAt: string | null; createdAt: string };

export function NotificationsList({ initial }: { initial: N[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => !n.readAt).length;

  async function mark(ids?: string[]) {
    if (!ids) setBusy(true);
    const r = await api('/api/v1/notifications/read', { body: ids ? { ids } : {} });
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    const now = new Date().toISOString();
    setItems((xs) => xs.map((n) => (!ids || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n)));
    router.refresh();
  }

  if (!items.length)
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Bell className="size-10 text-ambar" aria-hidden />
        <h2 className="text-xl">Tu bandeja está vacía</h2>
        <p className="max-w-md text-gris">Te avisaremos cuando tu pedido salga, se renueve tu suscripción o haya un curso nuevo.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gris" aria-live="polite">
          {unread ? `${unread} sin leer` : 'Todo al día'}
        </p>
        <button type="button" className="btn-outline btn-sm" disabled={!unread || busy} onClick={() => mark()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CheckCheck className="size-3.5" aria-hidden />} Marcar todas como leídas
        </button>
      </div>
      <ul className="card divide-y divide-noche/10 overflow-hidden">
        {items.map((n) => {
          const body = (
            <>
              <span aria-hidden className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', n.readAt ? 'bg-noche/15' : 'bg-ambar')} />
              <span className="min-w-0 flex-1">
                <span className={cn('block text-noche', !n.readAt && 'font-semibold')}>{n.title}</span>
                <span className="block text-sm text-noche/75">{n.body}</span>
                <span className="mt-1 block text-xs text-gris">{formatDateTime(n.createdAt)}</span>
              </span>
              {!n.readAt ? <span className="sr-only">(sin leer)</span> : null}
            </>
          );
          const cls = cn('flex gap-4 px-5 py-4 transition hover:bg-arena/40', !n.readAt && 'bg-ambar-100/30');
          return (
            <li key={n.id}>
              {n.deepLink?.startsWith('/') ? (
                <Link href={n.deepLink} className={cls} onClick={() => !n.readAt && void mark([n.id])}>
                  {body}
                </Link>
              ) : (
                <button type="button" className={cn(cls, 'w-full text-left')} onClick={() => !n.readAt && void mark([n.id])}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
