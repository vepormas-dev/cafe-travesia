import { NextResponse } from 'next/server';
import { ORDER_STATUS_LABEL, LEAD_STATUS_LABEL } from '@travesia/shared';
import { apiStaff } from '@/lib/auth';
import { isDemoMode } from '@/lib/env';
import { audit } from '@/lib/monitor';
import { listOrders } from '@/lib/admin/data/orders';
import { listCustomers } from '@/lib/admin/data/customers';
import { listLeads, listNewsletter } from '@/lib/admin/data/ops';
import { CHANNEL_LABEL, ORDER_KIND_LABEL } from '@/lib/admin/labels';

const cell = (v: unknown) => {
  const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (head: string[], rows: unknown[][]) => '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

/** GET ?type=orders|customers|leads|newsletter (+ filtros de la vista) → CSV (UTF-8 con BOM para Excel). */
export async function GET(req: Request) {
  const u = isDemoMode() ? { id: 'demo-admin' } : await apiStaff();
  if (!u) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const type = sp.get('type') ?? 'orders';
  const f = Object.fromEntries(sp.entries());
  let body: string;
  if (type === 'orders') {
    const { rows } = await listOrders({ ...f, page: 1 }, { all: true });
    body = csv(
      ['Número', 'Creado', 'Pagado', 'Cliente', 'Correo', 'Tipo', 'Canal', 'Estado', 'Ítems', 'Ciudad', 'Medio de pago', 'Cupón', 'Total COP'],
      rows.map((r) => [r.number, r.createdAt, r.paidAt, r.customerName, r.email, ORDER_KIND_LABEL[r.kind], CHANNEL_LABEL[r.channel], ORDER_STATUS_LABEL[r.status], r.items, r.city, r.paymentMethod, r.couponCode, r.totalCop]),
    );
  } else if (type === 'customers') {
    const { rows } = await listCustomers({ ...f, page: 1 }, { all: true });
    body = csv(['Nombre', 'Correo', 'Registro', 'Último acceso', 'Pedidos', 'LTV COP', 'Suscripciones', 'Cursos', 'Puntos'], rows.map((r) => [r.fullName, r.email, r.createdAt, r.lastSeenAt, r.orders, r.ltv, r.subs, r.courses, r.loyaltyPoints]));
  } else if (type === 'leads') {
    const rows = await listLeads({ q: f.q, status: f.status });
    body = csv(['Nombre', 'Correo', 'Teléfono', 'Empresa', 'Fuente', 'Interés', 'Estado', 'Puntaje', 'Mensaje', 'Notas', 'Creado'], rows.map((r) => [r.name, r.email, r.phone, r.company, r.source, r.interest, LEAD_STATUS_LABEL[r.status], r.score, r.message, r.notes, r.createdAt]));
  } else if (type === 'newsletter') {
    const rows = await listNewsletter({ q: f.q, status: f.status });
    body = csv(['Correo', 'Fuente', 'Suscrito', 'Baja'], rows.map((r) => [r.email, r.source, r.createdAt, r.unsubscribedAt]));
  } else return NextResponse.json({ error: 'Tipo no soportado' }, { status: 422 });
  await audit(u.id, 'export.csv', type, null, { filters: f });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="travesia-${type}-${date}.csv"`, 'cache-control': 'no-store' } });
}
