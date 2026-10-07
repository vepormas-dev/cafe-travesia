import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell/admin-shell';
import { Skeleton, PageSkeleton } from '@/components/admin/ui';
import { staffPage } from '@/lib/admin/guard';
import { getBadges } from '@/lib/admin/metrics';

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · Panel Travesía' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { user, demo } = await staffPage();
  const badges = await getBadges();
  return (
    <AdminShell user={{ name: user.fullName ?? user.email, email: user.email, role: user.role, avatarUrl: user.avatarUrl }} badges={badges} demo={demo}>
      {children}
    </AdminShell>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-dvh bg-[#F6F3EE]">
      <aside className="fixed inset-y-0 left-0 hidden w-[244px] bg-noche p-4 lg:block">
        <div className="mb-8 h-10 w-28 rounded bg-white/10" />
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="mb-2.5 h-7 rounded-lg bg-white/[0.06]" />
        ))}
      </aside>
      <div className="lg:pl-[244px]">
        <div className="flex h-14 items-center border-b border-noche/[0.07] px-5">
          <Skeleton className="h-9 w-full max-w-md" />
        </div>
        <div className="mx-auto max-w-[1480px] px-3 py-6 sm:px-6 lg:px-8">
          <PageSkeleton kpis={4} rows={6} />
        </div>
      </div>
    </div>
  );
}
