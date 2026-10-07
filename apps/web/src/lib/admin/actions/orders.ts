'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, t } from '@/lib/db';
import { audit } from '@/lib/monitor';
import { markOrderPaid, updateOrderStatus } from '@/lib/commerce/orders';
import { ActionError, ok, parsePayload, runAction, zs } from '../guard';
import { CARRIERS } from '../labels';

const NEXT = ['preparing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

const statusSchema = z.object({
  status: z.enum(NEXT, { message: 'Elige un estado' }),
  carrier: z.enum(CARRIERS).nullish(),
  trackingNumber: zs.opt(80),
  trackingUrl: zs.url(),
  internalNotes: zs.opt(4000),
});

export async function changeOrderStatus(orderId: string, _prev: unknown, fd: FormData) {
  return runAction({}, async ({ user, isAdmin }) => {
    const data = parsePayload(statusSchema, fd);
    if (data.status === 'refunded' && !isAdmin) throw new ActionError('Solo un administrador puede marcar reembolsos.');
    if (data.status === 'shipped' && !data.carrier) throw new ActionError('Elige la transportadora', { carrier: ['Elige la transportadora'] });
    await updateOrderStatus(orderId, data.status, { carrier: data.carrier ?? null, trackingNumber: data.trackingNumber, trackingUrl: data.trackingUrl, internalNotes: data.internalNotes });
    await audit(user.id, 'order.status', 'order', orderId, { to: data.status, carrier: data.carrier, tracking: data.trackingNumber });
    revalidatePath('/admin/pedidos');
    revalidatePath(`/admin/pedidos/${orderId}`);
    return ok(data.status === 'shipped' ? 'Pedido enviado: le avisamos al cliente por correo y push' : 'Estado actualizado');
  });
}

export async function bulkOrderStatus(ids: string[], status: 'preparing' | 'shipped' | 'delivered') {
  return runAction({}, async ({ user }) => {
    const list = z.array(z.string().min(1)).min(1, 'Selecciona pedidos').max(200).parse(ids);
    z.enum(['preparing', 'shipped', 'delivered']).parse(status);
    let n = 0;
    for (const id of list) {
      try {
        await updateOrderStatus(id, status);
        n++;
      } catch {
        /* sigue con el resto */
      }
    }
    await audit(user.id, 'order.bulk_status', 'order', null, { ids: list, to: status });
    revalidatePath('/admin/pedidos');
    return ok(`${n} pedido(s) actualizados`);
  });
}

export async function markOrderPaidManual(orderId: string, note: string) {
  return runAction({ admin: true }, async ({ user }) => {
    const db = getDb();
    const [o] = await db.select({ status: t.orders.status, internalNotes: t.orders.internalNotes }).from(t.orders).where(eq(t.orders.id, orderId)).limit(1);
    if (!o) throw new ActionError('Pedido no encontrado');
    if (!['pending', 'failed'].includes(o.status)) throw new ActionError('Solo se pueden marcar como pagados los pedidos pendientes o rechazados.');
    const applied = await markOrderPaid(orderId, { method: 'MANUAL', transactionId: null });
    if (!applied) throw new ActionError('El pedido ya había sido procesado.');
    const stamp = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC] Pago manual registrado por ${user.email}${note ? `: ${note.slice(0, 300)}` : ''}`;
    await db.update(t.orders).set({ internalNotes: `${o.internalNotes ? `${o.internalNotes}\n` : ''}${stamp}` }).where(eq(t.orders.id, orderId));
    await audit(user.id, 'order.mark_paid', 'order', orderId, { method: 'MANUAL', note });
    revalidatePath(`/admin/pedidos/${orderId}`);
    revalidatePath('/admin/pedidos');
    return ok('Pago registrado: se aplicaron stock, puntos, inscripciones y se notificó al cliente');
  });
}

export async function saveOrderNotes(orderId: string, notes: string) {
  return runAction({}, async ({ user }) => {
    const v = z.string().max(4000, 'Máximo 4.000 caracteres').parse(notes);
    await getDb().update(t.orders).set({ internalNotes: v || null }).where(eq(t.orders.id, orderId));
    await audit(user.id, 'order.notes', 'order', orderId);
    revalidatePath(`/admin/pedidos/${orderId}`);
    return ok('Notas guardadas');
  });
}

