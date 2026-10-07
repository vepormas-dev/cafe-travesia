import { connection } from 'next/server';
import { eq } from 'drizzle-orm';
import { profileSchema } from '@travesia/shared';
import { apiUser, SESSION_COOKIE } from '@/lib/auth';
import { deleteAccount } from '@/lib/account-deletion';
import { reloadMe, toMeDTO } from '@/lib/account';
import { getDb, t } from '@/lib/db';
import { apiError, cors, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';

/** GET /api/v1/me → { user: MeDTO } (cookie o Bearer) */
export async function GET() {
  await connection();
  return handle('me.get', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    return json({ user: toMeDTO(user) }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}

/** PATCH /api/v1/me (profileSchema) → { user: MeDTO } */
export async function PATCH(req: Request) {
  return handle('me.patch', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const [input, err] = await parseBody(req, profileSchema);
    if (err) return err;
    await getDb()
      .update(t.users)
      .set({
        fullName: input.fullName,
        phone: input.phone || null,
        legalIdType: input.legalIdType ?? null,
        legalId: input.legalId || null,
        marketingOptIn: input.marketingOptIn,
      })
      .where(eq(t.users.id, user.id));
    return json({ user: (await reloadMe(user.id)) ?? toMeDTO(user) });
  });
}

/**
 * DELETE /api/v1/me { confirm: "ELIMINAR" } → elimina la cuenta (exigido por App Store/Google Play
 * y por el derecho de supresión de la Ley 1581). Irreversible.
 */
export async function DELETE(req: Request) {
  return handle('me.delete', async () => {
    if (isDemoMode()) return demoBlocked();
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión', 401);
    const body = (await req.json().catch(() => ({}))) as { confirm?: string };
    if (body.confirm !== 'ELIMINAR') return apiError('Escribe ELIMINAR para confirmar', 422);
    if (user.role !== 'customer') return apiError('Las cuentas del equipo se eliminan desde el panel por otro administrador.', 403);
    await deleteAccount(user.id);
    const res = json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
