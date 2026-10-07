import 'server-only';
/**
 * Motor de IA de Café Travesía (OpenAI o cualquier API compatible: OPENAI_BASE_URL).
 * Todas las funciones devuelven null si la IA no está configurada o falla, para que
 * cada llamador use su respaldo por reglas. Nunca lanzan.
 */
import { brand } from '@travesia/shared';
import { env, isAiConfigured } from '@/lib/env';
import { logEvent } from '@/lib/monitor';

export const aiEnabled = isAiConfigured;

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const BRAND_VOICE = `Eres parte del equipo de ${brand.name} ("${brand.tagline}"), marca de café especial de ${brand.origin}, Colombia, con punto en el Parque Comercial Florida (Medellín).
Cultivamos, tostamos y servimos café especial: "${brand.claim}".
Tono: cálido, cercano y experto; español de Colombia con un toque paisa natural (sin exagerar ni caricaturizar). Frases cortas, nada de relleno.
Nunca inventes precios, stock, fechas de envío ni políticas: usa solo los datos que te den. Si no sabes algo, dilo y ofrece hablar con un asesor.`;

async function callModel(model: string, messages: AiMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number }) {
  const res = await fetch(`${env.ai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.ai.apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 700,
      ...(env.ai.reasoningEffort ? { reasoning_effort: env.ai.reasoningEffort } : {}),
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(25000),
  });
  // Gemini (API compatible con OpenAI) a veces devuelve el error dentro de un arreglo.
  const raw = (await res.json().catch(() => ({}))) as unknown;
  const data = (Array.isArray(raw) ? raw[0] : raw) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message ?? `IA respondió ${res.status}`) as Error & { retryable?: boolean };
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw Object.assign(new Error('Respuesta vacía de la IA'), { retryable: true });
  return content;
}

export async function aiChat(messages: AiMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number; feature?: string } = {}): Promise<string | null> {
  if (!isAiConfigured()) return null;
  const t0 = Date.now();
  // Modelo principal y, si está saturado o falla de forma transitoria, el de respaldo.
  const models = [env.ai.model, env.ai.fallbackModel].filter((m, i, a): m is string => Boolean(m) && a.indexOf(m) === i);
  let lastError = '';
  for (const model of models) {
    try {
      const content = await callModel(model, messages, opts);
      void logEvent('ai', opts.feature ?? 'chat', 'ok', { payload: { model }, durationMs: Date.now() - t0 });
      return content;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      const retryable = (e as { retryable?: boolean }).retryable || (e instanceof Error && e.name === 'TimeoutError');
      if (!retryable) break;
    }
  }
  void logEvent('ai', opts.feature ?? 'chat', 'error', { message: lastError, durationMs: Date.now() - t0 });
  return null;
}

export async function aiJson<T>(system: string, user: string, opts: { maxTokens?: number; temperature?: number; feature?: string } = {}): Promise<T | null> {
  const out = await aiChat(
    [
      { role: 'system', content: `${system}\nResponde SOLO con un objeto JSON válido, sin texto adicional.` },
      { role: 'user', content: user },
    ],
    { ...opts, json: true },
  );
  if (!out) return null;
  try {
    return JSON.parse(out.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Funciones del CMS (redacción asistida)
// ---------------------------------------------------------------------------
export type ProductCopy = { subtitle: string; description: string; story: string; tastingNotes: string[]; seoTitle: string; seoDescription: string };
export function generateProductCopy(input: Record<string, unknown>) {
  return aiJson<ProductCopy>(
    `${BRAND_VOICE}\nEres redactor de e-commerce de café especial. Escribe fichas sensoriales evocadoras pero precisas (origen, proceso, notas). description y story en Markdown (2-3 párrafos cada uno). seoTitle ≤ 60 caracteres, seoDescription ≤ 155.`,
    `Datos del producto:\n${JSON.stringify(input)}\nDevuelve {subtitle, description, story, tastingNotes (3-5), seoTitle, seoDescription}.`,
    { feature: 'cms.product', maxTokens: 1100 },
  );
}

export type CourseOutline = { subtitle: string; description: string; whatYouLearn: string[]; modules: { title: string; lessons: { title: string; summary: string }[] }[] };
export function generateCourseOutline(input: { title: string; level?: string; notes?: string }) {
  return aiJson<CourseOutline>(
    `${BRAND_VOICE}\nEres diseñador instruccional de la Academia Travesía (barismo, cata, origen, tueste). Propón temarios prácticos y progresivos.`,
    `Curso: ${input.title}. Nivel: ${input.level ?? 'principiante'}. Notas: ${input.notes ?? '—'}.\nDevuelve {subtitle, description (Markdown), whatYouLearn (4-6), modules: [{title, lessons: [{title, summary}]}]} con 3-5 módulos de 2-4 lecciones.`,
    { feature: 'cms.course', maxTokens: 1600 },
  );
}

export type BlogDraft = { title: string; excerpt: string; content: string; tags: string[]; seoTitle: string; seoDescription: string };
export function generateBlogDraft(input: { topic: string; category?: string; keywords?: string }) {
  return aiJson<BlogDraft>(
    `${BRAND_VOICE}\nEres editor del blog "Notas de Café" (cultura cafetera, preparación, origen, sostenibilidad). Escribe con subtítulos (##), listas cuando ayuden y un cierre que invite a la tienda o la academia. 600-900 palabras.`,
    `Tema: ${input.topic}. Categoría: ${input.category ?? '—'}. Palabras clave: ${input.keywords ?? '—'}.\nDevuelve {title, excerpt (≤ 200), content (Markdown), tags (3-5), seoTitle, seoDescription}.`,
    { feature: 'cms.blog', maxTokens: 2200, temperature: 0.7 },
  );
}

export function generateSeo(input: { title: string; content: string }) {
  return aiJson<{ seoTitle: string; seoDescription: string }>(
    `${BRAND_VOICE}\nEres especialista SEO. seoTitle ≤ 60 caracteres con la palabra clave al inicio; seoDescription ≤ 155 con llamado a la acción.`,
    `Título: ${input.title}\nContenido:\n${input.content.slice(0, 4000)}`,
    { feature: 'cms.seo', maxTokens: 300 },
  );
}

export function generateSiteCopy(section: string, current: unknown, instructions: string) {
  return aiJson<Record<string, unknown>>(
    `${BRAND_VOICE}\nEres copywriter de la web. Mejora los textos de la sección conservando EXACTAMENTE la misma estructura JSON, claves, URLs e imágenes. Solo cambia textos.`,
    `Sección: ${section}\nInstrucciones: ${instructions || 'Hazlo más evocador y claro.'}\nJSON actual:\n${JSON.stringify(current)}`,
    { feature: 'cms.site', maxTokens: 1500 },
  );
}

export function generatePushCopy(input: { goal: string; audience: string; link?: string }) {
  return aiJson<{ options: { title: string; body: string }[] }>(
    `${BRAND_VOICE}\nEres experto en notificaciones push. Títulos ≤ 45 caracteres (puede llevar 1 emoji), cuerpo ≤ 120, claros y accionables.`,
    `Objetivo: ${input.goal}. Audiencia: ${input.audience}. Enlace: ${input.link ?? '/'}.\nDevuelve {options: [3 x {title, body}]}.`,
    { feature: 'cms.push', maxTokens: 400, temperature: 0.8 },
  );
}

// ---------------------------------------------------------------------------
// CRM, soporte y negocio
// ---------------------------------------------------------------------------
export function scoreLead(lead: Record<string, unknown>) {
  return aiJson<{ score: number; segment: string; nextStep: string; replyDraft: string }>(
    `${BRAND_VOICE}\nEres ejecutivo comercial B2B/B2C. Califica de 0 a 100 la probabilidad de compra y el valor potencial. segment: hogar | oficina | horeca | evento | distribuidor | otro.`,
    `Lead:\n${JSON.stringify(lead)}\nDevuelve {score, segment, nextStep (1 frase), replyDraft (correo breve, cordial, con próximos pasos)}.`,
    { feature: 'crm.lead', maxTokens: 600 },
  );
}

export function summarizeChat(transcript: string) {
  return aiJson<{ summary: string; intent: string; sentiment: 'positivo' | 'neutral' | 'negativo'; suggestedReply: string }>(
    `${BRAND_VOICE}\nEres supervisor de servicio al cliente. Resume en 2 frases, detecta intención y sentimiento y propone la siguiente respuesta del asesor humano.`,
    transcript.slice(-6000),
    { feature: 'support.summary', maxTokens: 500 },
  );
}

export function businessInsights(metrics: Record<string, unknown>) {
  return aiJson<{ headline: string; insights: string[]; actions: string[] }>(
    `${BRAND_VOICE}\nEres analista de negocio de e-commerce y suscripciones. Sé concreto: cita cifras, compara periodos y propone acciones priorizadas con impacto esperado.`,
    `Métricas (COP):\n${JSON.stringify(metrics)}\nDevuelve {headline (1 frase), insights (3-5), actions (3)}.`,
    { feature: 'admin.insights', maxTokens: 800, temperature: 0.4 },
  );
}
