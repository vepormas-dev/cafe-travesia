import { NextResponse } from 'next/server';
import { like, or, desc, eq } from 'drizzle-orm';
import { formatCOP, ORDER_STATUS_LABEL } from '@travesia/shared';
import { seedCourses, seedProducts } from '@travesia/db';
import { apiStaff } from '@/lib/auth';
import { getDb, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { demoDataset } from '@/lib/admin/demo-data';

type Hit = { type: 'order' | 'product' | 'customer' | 'course'; id: string; title: string; subtitle?: string; href: string };

/** GET ?q= → búsqueda global del panel (⌘K): pedidos por número/correo, productos, clientes, cursos. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const ql = q.toLowerCase();
  const results: Hit[] = [];
  if (isDemoMode()) {
    const ds = demoDataset();
    for (const o of ds.orders.filter((o) => o.number.toLowerCase().includes(ql) || o.email.includes(ql)).slice(0, 5))
      results.push({ type: 'order', id: o.id, title: o.number, subtitle: `${o.customerName} · ${formatCOP(o.totalCop)} · ${ORDER_STATUS_LABEL[o.status]}`, href: `/admin/pedidos/${o.id}` });
    for (const c of ds.customers.filter((c) => c.email.includes(ql) || c.fullName.toLowerCase().includes(ql)).slice(0, 5)) results.push({ type: 'customer', id: c.id, title: c.fullName, subtitle: c.email, href: `/admin/clientes/${c.id}` });
    for (const p of seedProducts.filter((p) => p.name.toLowerCase().includes(ql) || p.slug.includes(ql)).slice(0, 5)) results.push({ type: 'product', id: p.id, title: p.name, subtitle: p.subtitle ?? p.slug, href: `/admin/productos/${p.id}` });
    for (const c of seedCourses.filter((c) => String(c.base.title).toLowerCase().includes(ql)).slice(0, 4)) results.push({ type: 'course', id: c.id, title: String(c.base.title), subtitle: String(c.base.level), href: `/admin/cursos/${c.id}` });
    return NextResponse.json({ results });
  }
  const u = await apiStaff();
  if (!u) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const s = `%${q}%`;
  const db = getDb();
  const [orders, customers, products, courses] = await Promise.all([
    db.select({ id: t.orders.id, number: t.orders.number, name: t.orders.customerName, total: t.orders.totalCop, status: t.orders.status }).from(t.orders).where(or(like(t.orders.number, s), like(t.orders.email, s))).orderBy(desc(t.orders.createdAt)).limit(5),
    db.select({ id: t.users.id, name: t.users.fullName, email: t.users.email }).from(t.users).where(or(like(t.users.email, s), like(t.users.fullName, s), like(t.users.phone, s))).limit(5),
    db.select({ id: t.products.id, name: t.products.name, slug: t.products.slug, active: t.products.isActive }).from(t.products).where(or(like(t.products.name, s), like(t.products.slug, s))).limit(5),
    db.select({ id: t.courses.id, title: t.courses.title, level: t.courses.level }).from(t.courses).where(like(t.courses.title, s)).limit(4),
  ]);
  void eq;
  for (const o of orders) results.push({ type: 'order', id: o.id, title: o.number, subtitle: `${o.name} · ${formatCOP(o.total)} · ${ORDER_STATUS_LABEL[o.status]}`, href: `/admin/pedidos/${o.id}` });
  for (const c of customers) results.push({ type: 'customer', id: c.id, title: c.name ?? c.email, subtitle: c.email, href: `/admin/clientes/${c.id}` });
  for (const p of products) results.push({ type: 'product', id: p.id, title: p.name, subtitle: `${p.slug}${p.active ? '' : ' · inactivo'}`, href: `/admin/productos/${p.id}` });
  for (const c of courses) results.push({ type: 'course', id: c.id, title: c.title, subtitle: c.level, href: `/admin/cursos/${c.id}` });
  return NextResponse.json({ results });
}
