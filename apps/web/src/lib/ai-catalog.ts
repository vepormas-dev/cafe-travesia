import 'server-only';
/**
 * Búsqueda en lenguaje natural y recomendaciones sobre el catálogo (productos, cursos, planes).
 * Siempre funciona por heurística (sin IA). Si hay IA configurada, reordena los candidatos y
 * redacta el resumen/razones con aiJson; si la IA falla, se conserva la heurística.
 */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { formatCOP, type AiRecommendation, type CourseDTO, type PlanDTO, type ProductDTO } from '@travesia/shared';
import { getCourses, getPlans, getProducts } from '@/lib/data/catalog';
import { aiEnabled, aiJson, BRAND_VOICE } from '@/lib/ai';
import { getDb, isDbConfigured, t } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

export const norm = (s: string | null | undefined) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

type Entry =
  | { kind: 'product'; item: ProductDTO; text: string }
  | { kind: 'course'; item: CourseDTO; text: string }
  | { kind: 'plan'; item: PlanDTO; text: string };

export async function catalogEntries(): Promise<Entry[]> {
  const [products, courses, plans] = await Promise.all([getProducts(), getCourses(), getPlans()]);
  return [
    ...products.map((p) => ({
      kind: 'product' as const,
      item: p,
      text: norm([p.name, p.subtitle, p.category, p.description, p.originRegion, p.process, p.variety, p.roastLevel, ...p.tastingNotes, ...p.brewMethods, ...p.badges].join(' ')),
    })),
    ...courses.map((c) => ({
      kind: 'course' as const,
      item: c,
      text: norm([c.title, c.subtitle, c.description, c.category, c.level, c.instructorName, ...c.whatYouLearn].join(' ')),
    })),
    ...plans.map((p) => ({
      kind: 'plan' as const,
      item: p,
      text: norm([p.name, p.tagline, p.description, p.audience, ...p.benefits].join(' ')),
    })),
  ];
}

export function toRecommendation(e: Entry, reason: string): AiRecommendation {
  if (e.kind === 'product') {
    const p = e.item;
    return { kind: 'product', id: p.id, slug: p.slug, title: p.name, subtitle: p.subtitle, imageUrl: p.imageUrl, priceCop: p.priceFromCop, reason, href: `/tienda/${p.slug}` };
  }
  if (e.kind === 'course') {
    const c = e.item;
    return { kind: 'course', id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, imageUrl: c.coverUrl, priceCop: c.isFree ? 0 : c.priceCop, reason, href: `/academia/cursos/${c.slug}` };
  }
  const p = e.item;
  return { kind: 'plan', id: p.id, slug: p.slug, title: `Plan ${p.name}`, subtitle: p.tagline, imageUrl: p.imageUrl, priceCop: p.priceCop, reason, href: `/suscripciones/${p.slug}` };
}

// ---------------------------------------------------------------------------
// Intenciones (sinónimos → reglas de puntuación)
// ---------------------------------------------------------------------------
type Intent = {
  key: string;
  re: RegExp;
  label: string;
  score: (e: Entry) => number;
};

const has = (list: string[], re: RegExp) => list.some((x) => re.test(norm(x)));
const product = (e: Entry) => (e.kind === 'product' ? e.item : null);
const coffee = (e: Entry) => (e.kind === 'product' && e.item.kind === 'coffee' ? e.item : null);

const INTENTS: Intent[] = [
  {
    key: 'filtrado',
    re: /\b(v ?60|chemex|filtrad\w*|aeropress|goteo|pour ?over|kalita|hario|metodos? de filtrado|cafe filtrado)\b/,
    label: 'métodos de filtrado',
    score: (e) => {
      const p = product(e);
      if (p) return has(p.brewMethods, /v60|chemex|aeropress/) ? (p.kind === 'coffee' ? 4 : 3) : 0;
      if (e.kind === 'course') return /filtrad|v60|chemex/.test(e.text) ? 3 : 0;
      return 0;
    },
  },
  {
    key: 'espresso',
    re: /\b(espress?o|expreso|capuchino|cappuccino|latte|moka|maquina|crema|barra)\b/,
    label: 'espresso',
    score: (e) => {
      const p = product(e);
      if (p) return has(p.brewMethods, /espresso|moka/) ? 4 : 0;
      if (e.kind === 'course') return /espresso|extraccion|leche/.test(e.text) ? 3 : 0;
      return 0;
    },
  },
  { key: 'prensa', re: /\b(prensa|french press|inmersion)\b/, label: 'prensa francesa', score: (e) => (product(e) && has(product(e)!.brewMethods, /prensa/) ? 4 : 0) },
  { key: 'greca', re: /\b(greca|cafetera italiana|olleta|tinto)\b/, label: 'greca', score: (e) => (product(e) && has(product(e)!.brewMethods, /greca|moka/) ? 4 : 0) },
  { key: 'cold', re: /\b(cold ?brew|frio|helado|frappe)\b/, label: 'cold brew', score: (e) => (product(e) && has(product(e)!.brewMethods, /cold/) ? 4 : 0) },
  {
    key: 'frutal',
    re: /\b(frut\w*|frutos rojos|fresa|cereza|berr\w*|mora)\b/,
    label: 'perfil frutal',
    score: (e) => {
      const c = coffee(e);
      return c ? (has(c.tastingNotes, /frut|mandarina|cereza|fresa|mora|naranja/) ? 4 : 0) + (c.profile && c.profile.acidez >= 6 ? 1 : 0) : 0;
    },
  },
  { key: 'floral', re: /\b(flor\w*|jazmin|aromatic\w*|elegante)\b/, label: 'notas florales', score: (e) => (coffee(e) && has(coffee(e)!.tastingNotes, /jazmin|flor/) ? 4 : 0) },
  {
    key: 'citrico',
    re: /\b(citric\w*|mandarina|naranja|limon|acid\w*|brillante)\b/,
    label: 'acidez cítrica',
    score: (e) => {
      const c = coffee(e);
      return c ? (has(c.tastingNotes, /mandarina|naranja|limon|citric/) ? 3 : 0) + (c.profile && c.profile.acidez >= 7 ? 2 : 0) : 0;
    },
  },
  { key: 'chocolate', re: /\b(chocolat\w*|cacao|achocolatad\w*|nuez|avellana)\b/, label: 'notas a chocolate', score: (e) => (coffee(e) && has(coffee(e)!.tastingNotes, /chocolate|cacao|nuez|avellana/) ? 4 : 0) },
  {
    key: 'dulce',
    re: /\b(dulce|panela|miel|caramel\w*|azucar)\b/,
    label: 'perfil dulce',
    score: (e) => {
      const c = coffee(e);
      return c ? (has(c.tastingNotes, /panela|miel|caramelo/) ? 2 : 0) + (c.profile && c.profile.dulzor >= 8 ? 2 : 0) : 0;
    },
  },
  {
    key: 'intenso',
    re: /\b(intens\w*|fuerte|cuerpo|oscuro|amargo|cargado)\b/,
    label: 'taza intensa',
    score: (e) => {
      const c = coffee(e);
      return c?.profile ? (c.profile.cuerpo >= 7 ? 2 : 0) + (c.profile.tueste >= 6 ? 2 : 0) : 0;
    },
  },
  {
    key: 'suave',
    re: /\b(suave|ligero|claro|delicado|poco amargo)\b/,
    label: 'taza suave',
    score: (e) => {
      const c = coffee(e);
      return c?.profile ? (c.profile.amargor <= 3 ? 2 : 0) + (c.profile.tueste <= 4 ? 1 : 0) : 0;
    },
  },
  { key: 'descafeinado', re: /\b(descaf\w*|sin cafeina|de noche|desvel\w*)\b/, label: 'descafeinado', score: (e) => (coffee(e) && /descaf/.test(e.text) ? 6 : 0) },
  { key: 'temporada', re: /\b(temporada|edicion limitada|microlote|exclusiv\w*|nuevo|especial)\b/, label: 'ediciones especiales', score: (e) => (product(e)?.isSeasonal ? 4 : product(e)?.badges.some((b) => /nuevo|limitad/i.test(b)) ? 2 : 0) },
  {
    key: 'regalo',
    re: /\b(regal\w*|obsequi\w*|cumplea\w*|detalle|navidad|amigo secreto|aniversario)\b/,
    label: 'regalo',
    score: (e) => (product(e)?.kind === 'kit' ? 6 : product(e)?.kind === 'merch' ? 2 : product(e)?.kind === 'experience' ? 2 : 0),
  },
  {
    key: 'principiante',
    re: /\b(principiante\w*|empezar|comenzar|inici\w*|basico|novato|primera vez|aprender desde cero)\b/,
    label: 'principiantes',
    score: (e) => (e.kind === 'course' && e.item.level === 'principiante' ? 4 : product(e)?.slug === 'kit-v60-travesia' ? 2 : coffee(e)?.isFeatured && coffee(e)!.slug === 'travesia-caicedo' ? 1 : 0),
  },
  {
    key: 'curso',
    re: /\b(curso\w*|academia|aprend\w*|clase\w*|barismo|barista|certificad\w*|tueste|catar|cata)\b/,
    label: 'formación',
    score: (e) => (e.kind === 'course' ? 4 : 0),
  },
  {
    key: 'suscripcion',
    re: /\b(suscri\w*|cada mes|mensual\w*|quincenal|plan\w*|recurrente|todos los meses)\b/,
    label: 'suscripción',
    score: (e) => (e.kind === 'plan' && e.item.audience === 'personal' ? 5 : coffee(e)?.subscriptionEligible ? 1 : 0),
  },
  {
    key: 'empresa',
    re: /\b(empresa\w*|oficina\w*|equipo de trabajo|negocio\w*|corporativ\w*|restaurante|hotel|cafeteria|por mayor|mayorista|personas)\b/,
    label: 'empresas',
    score: (e) => (e.kind === 'plan' && e.item.audience === 'empresa' ? 6 : 0),
  },
  {
    key: 'experiencia',
    re: /\b(tour\w*|finca|visita\w*|experiencia\w*|viaje|recorrido|plan con)\b/,
    label: 'experiencias',
    score: (e) => (product(e)?.kind === 'experience' ? 5 : 0),
  },
  {
    key: 'accesorio',
    re: /\b(accesorio\w*|molino|filtros?|gotero|balanza|equipo|cafetera|prensa francesa)\b/,
    label: 'barismo en casa',
    score: (e) => (product(e)?.kind === 'accessory' ? 4 : 0),
  },
  { key: 'merch', re: /\b(gorra|mug|pocillo|taza|ropa|camiseta|merch\w*|termo)\b/, label: 'ropa y merch', score: (e) => (product(e)?.kind === 'merch' ? 5 : 0) },
  { key: 'cafe', re: /\b(cafe\w*|grano|molido|bolsa|libra)\b/, label: 'café', score: (e) => (coffee(e) ? 1 : 0) },
];

/** Presupuesto en COP: "menos de 50 mil", "hasta $60.000", "50k", "bajo 100 lucas". */
export function parseBudget(q: string): number | null {
  const s = norm(q);
  const m =
    s.match(/(?:menos de|hasta|maximo|max|bajo|por debajo de|no mas de|inferior a|<|presupuesto de|por)\s*\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(mil|k|lucas|barras)?/) ??
    s.match(/\$\s*(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(mil|k)?/) ??
    s.match(/\b(\d+)\s*(mil|k|lucas)\b/);
  if (!m) return null;
  let n = Number(m[1]!.replace(/[.,]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (m[2] || n < 1000) n *= 1000;
  return n;
}

const STOP = new Set('para con que por una uno unos unas los las del de la el en mi me quiero busco algo algun alguna tienen tienes hay como cual sea mas menos muy pero sin y o a al lo le se su sus tu tus es son mil'.split(' '));

function scoreEntries(entries: Entry[], query: string, kind?: 'all' | 'product' | 'course' | 'plan') {
  const q = norm(query);
  const intents = INTENTS.filter((i) => i.re.test(q));
  const budget = parseBudget(query);
  const tokens = q
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));

  const scored = entries
    .filter((e) => !kind || kind === 'all' || e.kind === kind)
    .map((e) => {
      let score = 0;
      const matched: string[] = [];
      for (const i of intents) {
        const s = i.score(e);
        if (s > 0) {
          score += s;
          matched.push(i.label);
        }
      }
      for (const w of tokens) if (e.text.includes(w)) score += 1;
      const price = e.kind === 'product' ? e.item.priceFromCop : e.kind === 'course' ? (e.item.isFree ? 0 : e.item.priceCop) : e.item.priceCop;
      const overBudget = budget !== null && price > budget;
      if (budget !== null && !overBudget && score > 0) score += 1;
      // Pequeño empuje a destacados para desempatar
      if (e.kind === 'product' && e.item.isFeatured) score += 0.3;
      if (e.kind === 'course' && e.item.isFeatured) score += 0.3;
      if (e.kind === 'plan' && e.item.isHighlighted) score += 0.2;
      return { e, score, matched, price, overBudget };
    });

  const anySignal = intents.length > 0 || tokens.length > 0;
  let list = scored.filter((x) => (anySignal ? x.score >= 1 : true) && !x.overBudget);
  // Si el presupuesto deja todo por fuera, mostrar lo más cercano (y decirlo en el resumen)
  const budgetRelaxed = budget !== null && list.length === 0 && scored.some((x) => x.score >= 1);
  if (budgetRelaxed) list = scored.filter((x) => x.score >= 1).sort((a, b) => a.price - b.price).slice(0, 4);
  list.sort((a, b) => b.score - a.score || a.price - b.price);
  return { list, intents, budget, budgetRelaxed };
}

const METHOD_RE: [string, RegExp][] = [
  ['métodos de filtrado', /v60|chemex|aeropress/],
  ['espresso', /espresso|moka/],
  ['prensa francesa', /prensa/],
  ['greca', /greca|moka/],
  ['cold brew', /cold/],
];

function reasonFor(x: { e: Entry; matched: string[]; price: number }, budget: number | null) {
  const parts: string[] = [];
  const e = x.e;
  if (e.kind === 'product') {
    const p = e.item;
    if (p.kind === 'coffee') {
      const wanted = METHOD_RE.filter(([label]) => x.matched.includes(label)).map(([, re]) => re);
      const methods = wanted.length ? p.brewMethods.filter((m) => wanted.some((re) => re.test(norm(m)))) : [];
      if (methods.length) parts.push(`Ideal para ${methods.slice(0, 2).join(' y ')}`);
      if (p.tastingNotes.length) parts.push(`notas de ${p.tastingNotes.slice(0, 3).join(', ').toLowerCase()}`);
    } else if (p.subtitle) parts.push(p.subtitle);
  } else if (e.kind === 'course') {
    parts.push(`${e.item.level === 'principiante' ? 'Para empezar' : `Nivel ${e.item.level}`} · ${e.item.durationMin} min con ${e.item.instructorName ?? 'el equipo Travesía'}`);
  } else {
    parts.push(e.item.tagline ?? e.item.description ?? 'Plan de suscripción');
  }
  if (budget !== null && x.price <= budget) parts.push(`dentro de tu presupuesto (${formatCOP(x.price)})`);
  const s = parts.join(' · ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type SearchResult = { summary: string; items: AiRecommendation[]; ai: boolean };

export async function searchCatalog(query: string, kind?: 'all' | 'product' | 'course' | 'plan'): Promise<SearchResult> {
  const entries = await catalogEntries();
  const { list, intents, budget, budgetRelaxed } = scoreEntries(entries, query, kind);
  let top = list.slice(0, 8);
  let items = top.map((x) => toRecommendation(x.e, reasonFor(x, budget)));

  const labels = [...new Set(intents.filter((i) => i.key !== 'cafe').map((i) => i.label))];
  let summary: string;
  if (!items.length) summary = 'No encontramos algo exacto, pero te dejamos nuestros favoritos. También puedes preguntarle a nuestro asistente.';
  else if (budgetRelaxed) summary = `Nada entra en ${formatCOP(budget!)}, así que te mostramos lo más cercano a tu presupuesto.`;
  else
    summary = `${items.length === 1 ? 'Encontramos 1 opción' : `Encontramos ${items.length} opciones`}${labels.length ? ` para ${labels.slice(0, 3).join(', ')}` : ''}${budget ? ` por menos de ${formatCOP(budget)}` : ''}.`;

  if (!items.length) {
    const fallback = entries.filter((e) => (e.kind === 'product' && e.item.isFeatured) || (e.kind === 'course' && e.item.isFeatured)).slice(0, 6);
    items = fallback.map((e) => toRecommendation(e, e.kind === 'product' ? (e.item.subtitle ?? 'Favorito de la casa') : 'Curso destacado de la Academia'));
    top = [];
  }

  let ai = false;
  if (aiEnabled() && items.length) {
    const candidates = (top.length ? top.map((x) => x.e) : entries.slice(0, 12)).slice(0, 12);
    const out = await aiJson<{ summary?: string; order?: string[]; reasons?: Record<string, string> }>(
      `${BRAND_VOICE}\nEres el buscador inteligente de la tienda. Ordena los candidatos según lo que pide el cliente y escribe una razón breve (≤ 90 caracteres) por ítem. summary: 1 frase cálida (≤ 160 caracteres). No inventes productos ni precios.`,
      `Búsqueda: "${query}"\nCandidatos:\n${candidates.map((e) => compactLine(e)).join('\n')}\nDevuelve {summary, order: [ids], reasons: {id: razón}}.`,
      { feature: 'ai.search', maxTokens: 600, temperature: 0.3 },
    );
    if (out?.order?.length) {
      const byId = new Map(candidates.map((e) => [e.item.id, e]));
      const ordered = out.order.map((id) => byId.get(id)).filter(Boolean) as Entry[];
      if (ordered.length) {
        const prev = new Map(items.map((i) => [i.id, i.reason]));
        items = ordered.slice(0, 8).map((e) => toRecommendation(e, out.reasons?.[e.item.id]?.slice(0, 140) || prev.get(e.item.id) || ''));
        if (out.summary) summary = out.summary.slice(0, 220);
        ai = true;
      }
    }
  }
  return { summary, items, ai };
}

export function compactLine(e: Entry) {
  if (e.kind === 'product') {
    const p = e.item;
    return `[${p.id}] producto ${p.kind} "${p.name}" ${formatCOP(p.priceFromCop)}${p.tastingNotes.length ? ` notas: ${p.tastingNotes.join(', ')}` : ''}${p.brewMethods.length ? ` métodos: ${p.brewMethods.join(', ')}` : ''} → /tienda/${p.slug}`;
  }
  if (e.kind === 'course') {
    const c = e.item;
    return `[${c.id}] curso "${c.title}" ${c.level} ${c.isFree ? 'gratis' : formatCOP(c.priceCop)}${c.includedInSubscription ? ' (incluido en Maestro Premium)' : ''} → /academia/cursos/${c.slug}`;
  }
  const p = e.item;
  return `[${p.id}] plan ${p.audience} "${p.name}" ${formatCOP(p.priceCop)} cada ${p.frequencyWeeks} semanas, ${p.bagsPerDelivery}×${p.bagWeightG} g${p.includesAcademy ? ', incluye Academia' : ''} → /suscripciones/${p.slug}`;
}

// ---------------------------------------------------------------------------
// Recomendaciones por contexto
// ---------------------------------------------------------------------------
export type RecommendInput = {
  context: 'home' | 'product' | 'cart' | 'course' | 'account';
  productSlug?: string;
  courseSlug?: string;
  cart?: { kind: 'product' | 'course'; id: string }[];
};

const profileDistance = (a: ProductDTO, b: ProductDTO) => {
  if (!a.profile || !b.profile) return 99;
  const k = Object.keys(a.profile) as (keyof NonNullable<ProductDTO['profile']>)[];
  return Math.sqrt(k.reduce((n, key) => n + (a.profile![key] - b.profile![key]) ** 2, 0));
};

const LEVEL_ORDER = { principiante: 0, intermedio: 1, avanzado: 2 } as const;

function courseForMethods(courses: CourseDTO[], methods: string[]) {
  const m = norm(methods.join(' '));
  if (/v60|chemex|aeropress|prensa/.test(m)) return courses.find((c) => /filtrad/.test(norm(c.title + c.slug))) ?? null;
  if (/espresso|moka/.test(m)) return courses.find((c) => /espresso/.test(norm(c.title + c.slug))) ?? null;
  return courses.find((c) => c.isFree) ?? null;
}

export async function recommend(input: RecommendInput, user: SessionUser | null): Promise<{ items: AiRecommendation[]; ai: boolean }> {
  const [products, courses, plans] = await Promise.all([getProducts(), getCourses(), getPlans()]);
  const coffees = products.filter((p) => p.kind === 'coffee');
  const accessories = products.filter((p) => p.kind === 'accessory');
  const P = (p: ProductDTO, reason: string) => toRecommendation({ kind: 'product', item: p, text: '' }, reason);
  const C = (c: CourseDTO, reason: string) => toRecommendation({ kind: 'course', item: c, text: '' }, reason);
  const L = (p: PlanDTO, reason: string) => toRecommendation({ kind: 'plan', item: p, text: '' }, reason);
  const notes = (p: ProductDTO) => (p.tastingNotes.length ? `Notas de ${p.tastingNotes.slice(0, 3).join(', ').toLowerCase()}` : (p.subtitle ?? ''));
  const highlighted = plans.find((p) => p.audience === 'personal' && p.isHighlighted) ?? plans.find((p) => p.audience === 'personal');
  const items: AiRecommendation[] = [];

  const homeSet = () => {
    const seasonal = coffees.find((p) => p.isSeasonal);
    if (seasonal) items.push(P(seasonal, `Edición de temporada · ${notes(seasonal)}`));
    for (const p of coffees.filter((x) => x.isFeatured && !x.isSeasonal).slice(0, 2)) items.push(P(p, p.badges[0] ? `${p.badges[0]} · ${notes(p)}` : notes(p)));
    const course = courses.find((c) => c.isFree && c.isFeatured) ?? courses.find((c) => c.isFeatured);
    if (course) items.push(C(course, course.isFree ? 'Gratis: entiende qué hace especial a tu café' : (course.subtitle ?? 'Curso destacado')));
  };

  if (input.context === 'home') homeSet();
  else if (input.context === 'product') {
    const base = products.find((p) => p.slug === input.productSlug);
    if (!base) homeSet();
    else if (base.kind === 'coffee') {
      const similar = coffees
        .filter((p) => p.id !== base.id)
        .map((p) => ({ p, d: profileDistance(base, p) - p.brewMethods.filter((m) => base.brewMethods.includes(m)).length * 0.8 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { p } of similar) items.push(P(p, `Si te gusta ${base.name}: ${notes(p).toLowerCase()}`));
      const acc = accessories.find((a) => a.brewMethods.some((m) => base.brewMethods.includes(m))) ?? accessories[0];
      if (acc) items.push(P(acc, `Para prepararlo en casa${acc.brewMethods[0] ? ` con ${acc.brewMethods[0]}` : ''}`));
      const course = courseForMethods(courses, base.brewMethods);
      if (course) items.push(C(course, 'Saca lo mejor de este café con la receta correcta'));
    } else if (base.kind === 'accessory') {
      for (const p of coffees.filter((c) => c.brewMethods.some((m) => base.brewMethods.includes(m))).slice(0, 2)) items.push(P(p, `Brilla en ${base.brewMethods[0] ?? 'tu método'} · ${notes(p).toLowerCase()}`));
      const course = courseForMethods(courses, base.brewMethods);
      if (course) items.push(C(course, 'Aprende la receta paso a paso'));
    } else {
      for (const p of coffees.filter((c) => c.isFeatured).slice(0, 2)) items.push(P(p, notes(p)));
      const kit = products.find((p) => p.kind === 'kit' && p.id !== base.id);
      if (kit) items.push(P(kit, 'Perfecto para regalar origen'));
    }
    if (highlighted && items.length < 4) items.push(L(highlighted, 'Recíbelo cada mes y ahorra'));
  } else if (input.context === 'cart') {
    const ids = new Set((input.cart ?? []).map((l) => l.id));
    const inCart = products.filter((p) => ids.has(p.id));
    const hasCoffee = inCart.some((p) => p.kind === 'coffee');
    const hasAcc = inCart.some((p) => p.kind === 'accessory');
    const hasCourse = courses.some((c) => ids.has(c.id));
    if (!hasCoffee) for (const p of coffees.filter((c) => c.isFeatured && !ids.has(c.id)).slice(0, 2)) items.push(P(p, `Café recién tostado · ${notes(p).toLowerCase()}`));
    else {
      const methods = inCart.flatMap((p) => p.brewMethods);
      if (!hasAcc) {
        const acc = accessories.find((a) => !ids.has(a.id) && a.brewMethods.some((m) => methods.includes(m))) ?? accessories.find((a) => !ids.has(a.id));
        if (acc) items.push(P(acc, 'Completa tu ritual en casa'));
      }
      const other = coffees.find((c) => !ids.has(c.id) && c.isFeatured);
      if (other) items.push(P(other, `Para alternar · ${notes(other).toLowerCase()}`));
    }
    if (!hasCourse) {
      const course = courseForMethods(courses, inCart.flatMap((p) => p.brewMethods)) ?? courses[0];
      if (course && !ids.has(course.id)) items.push(C(course, course.isFree ? 'Gratis: aprende a disfrutarlo más' : 'Aprende a prepararlo como en la barra'));
    }
    if (hasCoffee && highlighted) items.push(L(highlighted, 'Con suscripción pagas menos y el envío es gratis'));
  } else if (input.context === 'course') {
    const base = courses.find((c) => c.slug === input.courseSlug);
    const next = courses
      .filter((c) => c.id !== base?.id)
      .sort((a, b) => {
        const lv = base ? LEVEL_ORDER[base.level] : 0;
        const da = LEVEL_ORDER[a.level] - lv, db = LEVEL_ORDER[b.level] - lv;
        return (da < 0 ? 10 : da) - (db < 0 ? 10 : db);
      })
      .slice(0, 2);
    for (const c of next) items.push(C(c, base ? `Siguiente paso después de ${base.title}` : (c.subtitle ?? '')));
    const methodsHint = base ? norm(base.title + ' ' + (base.category ?? '')) : '';
    const coffeePick = /espresso|barismo/.test(methodsHint)
      ? coffees.find((p) => p.brewMethods.includes('Espresso') && p.slug !== 'descafeinado-natural')
      : /filtrad/.test(methodsHint)
        ? coffees.find((p) => p.brewMethods.includes('V60') && p.isSeasonal) ?? coffees.find((p) => p.brewMethods.includes('V60'))
        : coffees.find((p) => p.isFeatured);
    if (coffeePick) items.push(P(coffeePick, `El café para practicar · ${notes(coffeePick).toLowerCase()}`));
    const maestro = plans.find((p) => p.includesAcademy && p.audience === 'personal');
    if (maestro) items.push(L(maestro, 'Todos los cursos incluidos + café cada mes'));
  } else if (input.context === 'account') {
    if (!user || !isDbConfigured()) homeSet();
    else {
      const db = getDb();
      const orders = await db.select({ id: t.orders.id }).from(t.orders).where(and(eq(t.orders.userId, user.id), inArray(t.orders.status, ['paid', 'preparing', 'shipped', 'delivered']))).orderBy(desc(t.orders.createdAt)).limit(10);
      const bought = orders.length
        ? await db.select({ name: t.orderItems.name, productId: t.orderItems.productId, courseId: t.orderItems.courseId }).from(t.orderItems).where(inArray(t.orderItems.orderId, orders.map((o) => o.id)))
        : [];
      const enrolled = await db.select({ courseId: t.enrollments.courseId }).from(t.enrollments).where(eq(t.enrollments.userId, user.id));
      const boughtIds = new Set(bought.map((b) => b.productId).filter(Boolean) as string[]);
      const enrolledIds = new Set(enrolled.map((e) => e.courseId));
      const favs = coffees.filter((c) => boughtIds.has(c.id));
      if (favs.length) {
        const candidates = coffees
          .filter((c) => !boughtIds.has(c.id))
          .map((c) => ({ c, d: Math.min(...favs.map((f) => profileDistance(f, c))) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 2);
        for (const { c } of candidates) items.push(P(c, `Porque te gustó ${favs[0]!.name} · ${notes(c).toLowerCase()}`));
      } else for (const p of coffees.filter((c) => c.isFeatured).slice(0, 2)) items.push(P(p, notes(p)));
      const course = courses.find((c) => !enrolledIds.has(c.id) && c.isFree) ?? courses.find((c) => !enrolledIds.has(c.id));
      if (course) items.push(C(course, course.isFree ? 'Gratis para ti' : 'Tu siguiente curso en la Academia'));
    }
  }

  // Únicos y máximo 6
  const seen = new Set<string>();
  let out = items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true))).slice(0, 6);

  let ai = false;
  if (aiEnabled() && out.length) {
    const res = await aiJson<{ reasons?: Record<string, string> }>(
      `${BRAND_VOICE}\nRedacta una razón de recomendación breve (≤ 80 caracteres) y cálida para cada ítem, coherente con el contexto. No inventes datos.`,
      `Contexto: ${input.context}${input.productSlug ? ` (producto ${input.productSlug})` : ''}${input.courseSlug ? ` (curso ${input.courseSlug})` : ''}\nÍtems:\n${out.map((i) => `[${i.id}] ${i.kind} "${i.title}" ${formatCOP(i.priceCop)} — ${i.reason}`).join('\n')}\nDevuelve {reasons: {id: razón}}.`,
      { feature: 'ai.recommend', maxTokens: 400, temperature: 0.5 },
    );
    if (res?.reasons) {
      out = out.map((i) => ({ ...i, reason: res.reasons?.[i.id]?.slice(0, 120) || i.reason }));
      ai = true;
    }
  }
  return { items: out, ai };
}
