'use server';
import { formatCOP } from '@travesia/shared';
import { aiEnabled, businessInsights } from '@/lib/ai';
import { runAction, ok } from '../guard';
import { getDashboard, summarizeForAi } from '../metrics';
import { parseRange } from '../range';
import type { DashboardData } from '../types';

export type Insights = { headline: string; insights: string[]; actions: string[]; ai: boolean };

/** Análisis con IA del periodo (con respaldo por reglas si la IA no está configurada). */
export async function generateInsights(rangeKey: string) {
  return runAction<Insights>({ allowDemo: true }, async () => {
    const data = await getDashboard(parseRange(rangeKey));
    const summary = summarizeForAi(data);
    const r = aiEnabled() ? await businessInsights(summary) : null;
    if (r?.headline) return ok('Análisis listo', { headline: r.headline, insights: (r.insights ?? []).slice(0, 5), actions: (r.actions ?? []).slice(0, 3), ai: true });
    return ok('Análisis por reglas listo', { ...ruleInsights(data), ai: false });
  });
}

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const sign = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')} %`;
const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];

function ruleInsights(d: DashboardData): Omit<Insights, 'ai'> {
  const k = d.kpis;
  const rev = pct(k.revenue.value, k.revenue.prev);
  const insights: string[] = [];
  const actions: string[] = [];
  insights.push(`Ingresos de ${formatCOP(k.revenue.value)} (${sign(rev)} vs. periodo anterior) con ${k.orders.value} pedidos y ticket promedio de ${formatCOP(k.aov.value)}.`);
  const top = d.categories[0];
  const total = d.categories.reduce((s, c) => s + c.value, 0);
  if (top && total) insights.push(`${top.name} concentra el ${Math.round((top.value / total) * 100)} % de las ventas; ${d.topProducts[0]?.name ?? 'el producto líder'} es el más vendido (${d.topProducts[0]?.units ?? 0} unidades).`);
  insights.push(`MRR de ${formatCOP(k.mrr.value)} con ${k.subscribers.value} suscriptores activos; churn de ${d.subs.churnPct.toString().replace('.', ',')} % (antes ${d.subs.churnPrevPct.toString().replace('.', ',')} %).`);
  const peak = d.heatmap.flatMap((row, di) => row.map((v, h) => ({ di, h, v }))).sort((a, b) => b.v - a.v)[0];
  if (peak?.v) insights.push(`Las compras pican los ${DAYS[peak.di]} hacia las ${peak.h}:00; ${d.cities[0]?.city ?? 'Medellín'} lidera por ciudad.`);
  insights.push(`Conversión de ${k.conversion.value.toString().replace('.', ',')} % (antes ${k.conversion.prev.toString().replace('.', ',')} %) sobre ${d.funnel.visits.toLocaleString('es-CO')} visitas.`);

  if (d.subs.charges.declined > 0 || d.subs.charges.retrying > 0) actions.push(`Contacta a los ${d.subs.charges.retrying} suscriptores con pago pendiente antes del próximo reintento: cada uno vale ~${formatCOP(k.subscribers.value ? Math.round(k.mrr.value / k.subscribers.value) : 0)}/mes.`);
  if (peak?.v) actions.push(`Programa la próxima campaña push el ${DAYS[peak.di].replace(/s$/, '')} a las ${Math.max(6, peak.h - 1)}:00 (una hora antes del pico) con ${d.topProducts[0]?.name ?? 'el café más vendido'}.`);
  const carts = d.funnel.carts - d.funnel.created;
  if (carts > 0) actions.push(`Hay ~${carts} carritos sin checkout: refuerza el recordatorio de carrito abandonado con un cupón de envío gratis.`);
  if (actions.length < 3) actions.push('Destaca la edición de temporada en la home y en la app para subir el ticket promedio.');
  return {
    headline: rev >= 0 ? `Vas ${sign(rev)} en ingresos: ${top?.name ?? 'la tienda'} y las suscripciones empujan el crecimiento.` : `Ingresos ${sign(rev)}: revisa conversión y recupera cobros fallidos para compensar.`,
    insights: insights.slice(0, 5),
    actions: actions.slice(0, 3),
  };
}
