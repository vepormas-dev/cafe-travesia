import { Suspense } from 'react';
import type { Metadata } from 'next';
import { formatCOP } from '@travesia/shared';
import { adminPage } from '@/lib/admin/guard';
import { listCoupons } from '@/lib/admin/data/catalog';
import { toBogotaLocal } from '@/lib/admin/range';
import { PageHeader, PageSkeleton, Panel, Stat } from '@/components/admin/ui';
import { CouponsManager } from '@/components/admin/sales/coupons-manager';

export const metadata: Metadata = { title: 'Cupones' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Coupons />
    </Suspense>
  );
}

async function Coupons() {
  await adminPage('/admin/cupones');
  const rows = await listCoupons();
  return (
    <>
      <PageHeader eyebrow="Ventas" title="Cupones" description="Descuentos por porcentaje, valor fijo o envío gratis, con vigencia y límites de uso." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><Stat label="Vigentes" value={rows.filter((r) => r.state === 'vigente').length} /></Panel>
        <Panel><Stat label="Programados" value={rows.filter((r) => r.state === 'programado').length} /></Panel>
        <Panel><Stat label="Usos totales" value={rows.reduce((s, r) => s + r.uses, 0).toLocaleString('es-CO')} /></Panel>
        <Panel><Stat label="Total descontado" value={formatCOP(rows.reduce((s, r) => s + r.discountTotal, 0))} /></Panel>
      </div>
      <Panel>
        <CouponsManager rows={rows.map((c) => ({ id: c.id, code: c.code, description: c.description, kind: c.kind, value: c.value, scope: c.scope, minSubtotalCop: c.minSubtotalCop, maxUses: c.maxUses, maxUsesPerUser: c.maxUsesPerUser, isActive: c.isActive, startsAt: toBogotaLocal(c.startsAt), endsAt: toBogotaLocal(c.endsAt), uses: c.uses, state: c.state, discountTotal: c.discountTotal }))} />
      </Panel>
    </>
  );
}
