/**
 * App Links de Android. ANDROID_SHA256_FINGERPRINTS = huellas SHA-256 del certificado de firma
 * (EAS: `eas credentials` › Android; Play Console › Integridad de la app), separadas por coma.
 */
export function GET() {
  const fps = (process.env.ANDROID_SHA256_FINGERPRINTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const body = [
    { relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'co.cafetravesia.app', sha256_cert_fingerprints: fps } },
  ];
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
