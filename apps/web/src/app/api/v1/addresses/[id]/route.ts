import { apiUser } from '@/lib/auth';
import { deleteAddress, listAddresses, patchAddress } from '@/lib/account';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';
import { addressPatchSchema } from '../schema';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/v1/addresses/:id → { address, addresses } */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle('addresses.update', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const { id } = await params;
    const [input, err] = await parseBody(req, addressPatchSchema);
    if (err) return err;
    const ok = await patchAddress(user.id, id, input);
    if (!ok) return apiError('Dirección no encontrada', 404);
    const addresses = await listAddresses(user.id);
    return json({ address: addresses.find((a) => a.id === id) ?? null, addresses });
  });
}

/** DELETE /api/v1/addresses/:id → { ok, addresses } */
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle('addresses.delete', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const { id } = await params;
    const ok = await deleteAddress(user.id, id);
    if (!ok) return apiError('Dirección no encontrada', 404);
    return json({ ok: true, addresses: await listAddresses(user.id) });
  });
}
