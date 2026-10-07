import { apiError, handle } from '@/lib/api';
import { getCertificate } from '@/lib/academy';
import { renderCertificatePdf } from '@/lib/certificates';

/** GET /api/certificates/:code → PDF del certificado (inline). En demo, 'DEMO' genera una muestra. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle('certificates.pdf', async () => {
    const { code } = await ctx.params;
    const cert = await getCertificate(code);
    if (!cert) return apiError('Certificado no encontrado', 404);
    if (cert.revokedAt) return apiError('Este certificado fue revocado', 410);
    const pdf = await renderCertificatePdf(cert);
    const download = new URL(req.url).searchParams.get('descargar') === '1';
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="certificado-${cert.code}.pdf"`,
        'Cache-Control': cert.sample ? 'public, max-age=3600' : 'private, max-age=300',
      },
    });
  });
}
