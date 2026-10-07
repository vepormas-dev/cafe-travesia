import { normalizePlace, type ProductDTO } from '@travesia/shared';

const SYN: Record<string, string[]> = {
  frutal: ['frutal', 'frutos', 'mandarina', 'citric', 'fresa', 'frutos rojos', 'honey', 'jazmin', 'floral'],
  floral: ['floral', 'jazmin', 'flores'],
  chocolate: ['chocolate', 'cacao', 'panela', 'nuez'],
  dulce: ['dulce', 'panela', 'caramelo', 'miel', 'honey'],
  suave: ['suave', 'descafeinado', 'balanceado'],
  regalo: ['regalo', 'kit', 'caja'],
  cata: ['cata', 'tour', 'experiencia'],
};

/** Búsqueda local de respaldo (sin IA): palabras clave, sinónimos y tope de precio («menos de 60 mil»). */
export function localSearch(products: ProductDTO[], query: string) {
  const q = normalizePlace(query);
  let max: number | null = null;
  const m = q.match(/(?:menos de|hasta|maximo|max|<)\s*\$?\s*([\d.]+)\s*(mil|k)?/);
  if (m) {
    const n = Number(m[1]!.replace(/\./g, ''));
    max = m[2] || n < 1000 ? n * 1000 : n;
  }
  const words = q
    .replace(/(?:menos de|hasta|maximo|max)\s*\$?\s*[\d.]+\s*(mil|k)?/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !['algo', 'para', 'que', 'con', 'por', 'cafe', 'una', 'uno', 'los', 'las', 'del', 'mas', 'muy'].includes(w));
  const expanded = words.flatMap((w) => [w, ...(SYN[w] ?? [])]);
  const scored = products
    .map((p) => {
      const hay = normalizePlace([p.name, p.subtitle, p.category, p.process, p.variety, p.roastLevel, p.description, ...p.tastingNotes, ...p.brewMethods].filter(Boolean).join(' '));
      const score = expanded.reduce((s, w) => s + (hay.includes(w) ? (words.includes(w) ? 3 : 1) : 0), 0);
      return { p, score };
    })
    .filter(({ p, score }) => (max == null || p.priceFromCop <= max) && (score > 0 || (!expanded.length && max != null)))
    .sort((a, b) => b.score - a.score || a.p.priceFromCop - b.p.priceFromCop);
  return { items: scored.map((s) => s.p), max };
}
