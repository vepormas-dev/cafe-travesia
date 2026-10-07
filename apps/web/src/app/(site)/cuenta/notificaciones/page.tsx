import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { listNotifications } from '@/lib/account';
import { NotificationsList } from '@/components/account/notifications-list';
import { PageTitle, SectionSkeleton } from '@/components/account/ui';

export const metadata: Metadata = { title: 'Notificaciones' };

export default function NotificacionesPage() {
  return (
    <>
      <PageTitle title="Notificaciones" intro="Avisos de pedidos, cobros, cursos y novedades. También llegan a la app." />
      <Suspense fallback={<SectionSkeleton rows={3} />}>
        <Inbox />
      </Suspense>
    </>
  );
}

async function Inbox() {
  const user = await requireUser('/cuenta/notificaciones');
  const { notifications } = await listNotifications(user.id, 100);
  return <NotificationsList initial={notifications} />;
}
