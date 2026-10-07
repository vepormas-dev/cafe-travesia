import { connection } from 'next/server';
import { apiUser } from '@/lib/auth';
import { listAddresses, saveAddress } from '@/lib/account';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';
import { addressInputSchema } from './schema';

/** GET /api/v1/addresses → { addresses } */
export async function GET() {
  await connection();
  return handle('addresses.list', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    return json({ addresses: await listAddresses(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}

/** POST /api/v1/addresses (addressSchema + { label?, isDefault? }) → 201 { address, addresses } */
export async function POST(req: Request) {
  return handle('addresses.create', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const [input, err] = await parseBody(req, addressInputSchema);
    if (err) return err;
    const current = await listAddresses(user.id);
    if (current.length >= 10) return apiError('Puedes guardar hasta 10 direcciones.', 409);
    const id = await saveAddress(user.id, input);
    const addresses = await listAddresses(user.id);
    return json({ address: addresses.find((a) => a.id === id) ?? null, addresses }, 201);
  });
}
