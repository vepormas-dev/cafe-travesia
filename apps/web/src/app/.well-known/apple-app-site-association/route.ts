/**
 * Universal Links de iOS. Requiere APPLE_TEAM_ID (Apple Developer › Membership).
 * La app declara ios.associatedDomains = ["applinks:cafetravesia.com"].
 */
export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  const appID = `${team ?? 'TEAMID'}.co.cafetravesia.app`;
  const body = {
    applinks: { details: [{ appIDs: [appID], components: ['/tienda/*', '/academia/*', '/cuenta/*', '/suscripciones/*'].map((p) => ({ '/': p })) }] },
    webcredentials: { apps: [appID] },
  };
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
