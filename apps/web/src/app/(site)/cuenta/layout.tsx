import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { listNotifications } from '@/lib/account';
import { AccountNav, LoginRedirect } from '@/components/account/account-nav';
import { SectionSkeleton } from '@/components/account/ui';

export const metadata: Metadata = { title: { default: 'Mi cuenta', template: '%s · Mi cuenta · Café Travesía' }, robots: { index: false, follow: false } };

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-site py-6 lg:py-12">
      <Suspense fallback={<ShellSkeleton />}>
        <AccountShell>{children}</AccountShell>
      </Suspense>
    </div>
  );
}

/**
 * Protege todo /cuenta: sin sesión no se muestra la navegación; cada página llama
 * requireUser(su ruta) para redirigir a /ingresar?next=<ruta> (y LoginRedirect cubre el resto).
 */
async function AccountShell({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getSessionUser();
  if (!user) {
    return (
      <>
        <LoginRedirect />
        {children}
      </>
    );
  }
  const { unread } = await listNotifications(user.id, 1).catch(() => ({ unread: 0 }));
  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr] lg:gap-12">
      <AccountNav name={user.fullName} email={user.email} avatarUrl={user.avatarUrl} points={user.loyaltyPoints} unread={unread} isStaff={user.role === 'admin' || user.role === 'editor'} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr] lg:gap-12">
      <div className="hidden space-y-3 lg:block">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-noche/5" />
        ))}
      </div>
      <SectionSkeleton />
    </div>
  );
}
