import { connection } from 'next/server';
import { env, isWompiConfigured } from '@/lib/env';
import { getAcceptanceTokens } from '@/lib/wompi';
import { apiError, handle, json } from '@/lib/api';

/** GET /api/wompi/acceptance → tokens de aceptación y llave pública para tokenizar tarjetas en el cliente. */
export async function GET() {
  await connection();
  return handle('wompi.acceptance', async () => {
    if (!isWompiConfigured()) return apiError('Los pagos con tarjeta aún no están configurados.', 503);
    const tokens = await getAcceptanceTokens();
    return json({ publicKey: env.wompi.publicKey!, env: env.wompi.env, ...tokens }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  });
}
