import { connection } from 'next/server';
import { eq } from 'drizzle-orm';
import { profileSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
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

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
