import { sql } from 'drizzle-orm';
import { bogotaDay } from '@travesia/shared';
import { getDb, t } from '@/lib/db';
import { env, isDemoMode } from '@/lib/env';

const BOTS = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|go-http/i;

const SOURCES: [RegExp, string][] = [
  [/google\./, 'google'],
  [/bing\.|duckduckgo|yahoo|ecosia/, 'buscadores'],
  [/instagram|l\.instagram/, 'instagram'],
  [/facebook|fb\.com|m\.facebook|l\.facebook/, 'facebook'],
  [/tiktok/, 'tiktok'],
  [/wa\.me|whatsapp/, 'whatsapp'],
  [/youtube|youtu\.be/, 'youtube'],
  [/t\.co|twitter|x\.com/, 'x'],
  [/linkedin|lnkd/, 'linkedin'],
  [/chatgpt|openai|perplexity|gemini|copilot/, 'ia'],
];

function sourceOf(referrer: string, path: string) {
  try {
    const utm = new URL(path, 'https://x').searchParams.get('utm_source');
    if (utm) return utm.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60) || 'campaña';
  } catch {
    /* ignore */
  }
  if (!referrer) return 'directo';
  let host = '';
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'directo';
  }
  const own = new URL(env.siteUrl).hostname.replace(/^www\./, '');
  if (host.endsWith(own) || host === 'localhost' || host === '127.0.0.1') return 'interno';
  if (/wompi|checkout\.wompi/.test(host)) return 'wompi';
  for (const [re, name] of SOURCES) if (re.test(host)) return name;
  return host.replace(/^www\./, '').slice(0, 60);
}

/**
 * Analítica propia sin cookies: POST { path, referrer, device } → 204.
 * Agrega por día (hora de Bogotá), ruta, fuente y dispositivo. Nunca falla al cliente.
 */
export async function POST(req: Request) {
  const noContent = new Response(null, { status: 204 });
  try {
    if (isDemoMode()) return noContent;
    const ua = req.headers.get('user-agent') ?? '';
    if (!ua || BOTS.test(ua)) return noContent;
    const body = (await req.json().catch(() => null)) as { path?: unknown; referrer?: unknown; device?: unknown } | null;
    if (!body || typeof body.path !== 'string' || !body.path.startsWith('/')) return noContent;
    const rawPath = body.path.slice(0, 500);
    if (/^\/(api|admin|_next)\b/.test(rawPath)) return noContent;
    const path = (rawPath.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
    const source = sourceOf(typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : '', rawPath);
    const device = body.device === 'app' ? 'app' : body.device === 'mobile' ? 'mobile' : 'desktop';
    await getDb()
      .insert(t.pageViews)
      .values({ day: bogotaDay(), path: path.slice(0, 191), source, device, views: 1 })
      .onDuplicateKeyUpdate({ set: { views: sql`${t.pageViews.views} + 1` } });
  } catch {
    /* la analítica nunca rompe la navegación */
  }
  return noContent;
}
