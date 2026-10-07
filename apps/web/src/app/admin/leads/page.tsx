import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Download, Kanban, List } from 'lucide-react';
import { staffPage } from '@/lib/admin/guard';
import { listLeads } from '@/lib/admin/data/ops';
import { flat, type SPromise } from '@/lib/admin/sp';
import { PageHeader, PageSkeleton, Panel, Stat, btn, hrefWith } from '@/components/admin/ui';
import { SearchBox } from '@/components/admin/client-ui';
import { LeadsBoard } from '@/components/admin/marketing/leads-board';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Leads y CRM' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} kpis={4} />}>
      <Leads searchParams={searchParams} />
    </Suspense>
  );
}

async function Leads({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/leads');
  const sp = flat(await searchParams);
  const view = sp.view === 'tabla' ? 'tabla' : 'kanban';
  const rows = await listLeads({ q: sp.q });
  const won = rows.filter((l) => l.status === 'won').length;
  const closed = won + rows.filter((l) => l.status === 'lost').length;
  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Leads y CRM"
        description="Solicitudes de empresas, horeca, regalos corporativos y academia. Arrastra las tarjetas para avanzar en el embudo."
        actions={
          <>
            <div className="flex rounded-lg border border-noche/10 bg-white p-0.5">
              <Link href={hrefWith('/admin/leads', sp, { view: null })} className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm', view === 'kanban' ? 'bg-noche text-crema' : 'text-gris')}><Kanban className="size-4" /> Kanban</Link>
              <Link href={hrefWith('/admin/leads', sp, { view: 'tabla' })} className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm', view === 'tabla' ? 'bg-noche text-crema' : 'text-gris')}><List className="size-4" /> Tabla</Link>
            </div>
            <a href={hrefWith('/api/admin/export', sp, { type: 'leads', view: null })} className={btn.secondary}><Download className="size-4" /> CSV</a>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><Stat label="Leads nuevos" value={rows.filter((l) => l.status === 'new').length} /></Panel>
        <Panel><Stat label="En proceso" value={rows.filter((l) => l.status === 'contacted' || l.status === 'qualified').length} /></Panel>
        <Panel><Stat label="Ganados" value={won} /></Panel>
        <Panel><Stat label="Tasa de cierre" value={`${closed ? Math.round((won / closed) * 100) : 0} %`} hint="ganados / cerrados" /></Panel>
      </div>
      <div className="mb-4 max-w-md"><SearchBox placeholder="Nombre, correo o empresa…" /></div>
      <LeadsBoard view={view} leads={rows.map((l) => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, company: l.company, source: l.source, interest: l.interest, message: l.message, status: l.status, score: l.score, notes: l.notes, createdAt: l.createdAt.toISOString() }))} />
    </>
  );
}
