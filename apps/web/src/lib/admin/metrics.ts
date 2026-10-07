import 'server-only';
import { cache } from 'react';
/**
 * Métricas agregadas del dashboard y la analítica.
 *  - Con BD: SQL agregado en MySQL/MariaDB (GROUP BY, día de Bogotá con CONVERT_TZ) en
 *    pocas consultas que corren en paralelo (Promise.all) a través de la pasarela.
 *  - Modo demo: se calculan sobre el dataset determinista de demo-data.ts.
 */
import { desc, eq, inArray, and, lte, asc, count } from 'drizzle-orm';
import { monthlyValue } from '@travesia/shared';
import { seedCourses, seedPlans, seedProducts, seedVariants } from '@travesia/db';
import { getDb, rawQuery, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { runHealthChecks } from '@/lib/monitor';
import { CATEGORY_LABEL, CHANNEL_LABEL, DEVICE_LABEL, SOURCE_LABEL } from './labels';
import { addDays, dayOf, resolveRange, startOfDay, weekOf, type RangeKey, type ResolvedRange } from './range';
import type { AnalyticsData, Badges, DashboardData, Kpi, NameValue, OpsData } from './types';
import { demoCampaigns, demoChats, demoDataset, demoLeads, demoPushStats, isPaidStatus, type DemoDataset } from './demo-data';

const PAID = `('paid','preparing','shipped','delivered')`;
const BOG = (col: string) => `CONVERT_TZ(${col},'+00:00','-05:00')`;
const DAYF = (col: string) => `DATE_FORMAT(${BOG(col)},'%Y-%m-%d')`;
const num = (v: unknown) => Number(v ?? 0) || 0;
const str = (v: unknown) => (v == null ? '' : String(v));
const WEEKS = 12;
const DAY_MS = 86400000;

const kpi = (value: number, prev: number, spark: number[]): Kpi => ({ value, prev, spark });
const sumBy = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + f(x), 0);
const toNV = (m: Map<string, number>, labels: Record<string, string> = {}, limit = 12): NameValue[] =>
  [...m.entries()].map(([k, v]) => ({ name: labels[k] ?? k, value: v })).sort((a, b) => b.value - a.value).slice(0, limit);
const bump = (m: Map<string, number>, k: string, v = 1) => m.set(k, (m.get(k) ?? 0) + v);

function weekStarts(now = new Date()) {
  const thisWeek = weekOf(dayOf(now));
  return Array.from({ length: WEEKS }, (_, i) => addDays(thisWeek, -(WEEKS - 1 - i) * 7));
}

type SubLite = { status: string; priceCop: number; frequencyWeeks: number; plan: string; startedAt: Date | null; cancelledAt: Date | null };
function subscriptionSeries(subs: SubLite[], range: ResolvedRange, now: Date) {
  const weeks = weekStarts(now);
  const activeAt = (tms: number) => subs.filter((s) => s.startedAt && s.startedAt.getTime() <= tms && (!s.cancelledAt || s.cancelledAt.getTime() > tms));
  const mrrAt = (tms: number) => sumBy(activeAt(tms), (s) => monthlyValue(s.priceCop, s.frequencyWeeks));
  const mrrWeekly = weeks.map((w, i) => {
    const end = i === weeks.length - 1 ? now.getTime() : startOfDay(addDays(w, 7)).getTime();
    return { week: w, mrr: mrrAt(end), active: activeAt(end).length };
  });
  const movements = weeks.map((w) => {
    const a = startOfDay(w).getTime();
    const b = a + 7 * DAY_MS;
    return {
      week: w,
      altas: subs.filter((s) => s.startedAt && s.startedAt.getTime() >= a && s.startedAt.getTime() < b).length,
      bajas: -subs.filter((s) => s.cancelledAt && s.cancelledAt.getTime() >= a && s.cancelledAt.getTime() < b).length,
    };
  });
  const churn = (from: Date, to: Date) => {
    const base = activeAt(from.getTime()).length;
    const lost = subs.filter((s) => s.cancelledAt && s.cancelledAt >= from && s.cancelledAt < to).length;
    return base ? Math.round((lost / base) * 1000) / 10 : 0;
  };
  const current = subs.filter((s) => s.status === 'active' || s.status === 'past_due' || s.status === 'paused');
  const byPlanMap = new Map<string, { count: number; mrr: number }>();
  for (const s of current) {
    const e = byPlanMap.get(s.plan) ?? { count: 0, mrr: 0 };
    e.count++;
    e.mrr += monthlyValue(s.priceCop, s.frequencyWeeks);
    byPlanMap.set(s.plan, e);
  }
  const mrrNow = sumBy(current.filter((s) => s.status !== 'paused'), (s) => monthlyValue(s.priceCop, s.frequencyWeeks));
  return {
    mrrWeekly,
    movements,
    churnPct: churn(range.from, range.to),
    churnPrevPct: churn(range.prevFrom, range.prevTo),
    byPlan: [...byPlanMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.mrr - a.mrr),
    mrrNow,
    mrrPrev: mrrAt(range.from.getTime()),
    activeNow: current.filter((s) => s.status !== 'paused').length,
    activePrev: activeAt(range.from.getTime()).length,
  };
}

function trafficShape(visits: number) {
  const pages: [string, number][] = [['/', 27], ['/tienda', 18], ['/tienda/travesia-caicedo', 9], ['/academia', 8], ['/suscripciones', 7], ['/tienda/cima-del-viento', 6], ['/blog/como-preparar-chemex', 4], ['/nosotros', 3]];
  const sources: [string, number][] = [['google', 34], ['instagram', 24], ['directo', 18], ['whatsapp', 9], ['facebook', 6], ['tiktok', 5], ['email', 4]];
  const devices: [string, number][] = [['mobile', 61], ['desktop', 27], ['app', 12]];
  const split = (arr: [string, number][]) => arr.map(([k, w]) => [k, Math.round((visits * w) / 100)] as const);
  return {
    topPages: split(pages).map(([path, views]) => ({ path, views })),
    sources: split(sources).map(([k, v]) => ({ name: SOURCE_LABEL[k] ?? k, value: v })),
    devices: split(devices).map(([k, v]) => ({ name: DEVICE_LABEL[k] ?? k, value: v })),
  };
}

// ===========================================================================
// DASHBOARD
// ===========================================================================
/** Memoizado por petición (varias secciones de la misma página comparten el resultado). */
export const getDashboard = cache(async (key: RangeKey): Promise<DashboardData> => {
  const now = new Date();
  const range = resolveRange(key, now);
  return isDemoMode() ? demoDashboard(range, now) : dbDashboard(range, now);
});

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------
function demoDashboard(range: ResolvedRange, now: Date): DashboardData {
  const ds = demoDataset(now);
  const inRange = (d: Date | null, a: Date, b: Date) => Boolean(d && d >= a && d < b);
  const paid = ds.orders.filter((o) => isPaidStatus(o.status) && o.paidAt);
  const cur = paid.filter((o) => inRange(o.paidAt, range.from, range.to));
  const prev = paid.filter((o) => inRange(o.paidAt, range.prevFrom, range.prevTo));

  const byDay = new Map<string, { store: number; subs: number; courses: number; orders: number }>();
  for (const o of [...cur, ...prev]) {
    const d = dayOf(o.paidAt!);
    const e = byDay.get(d) ?? { store: 0, subs: 0, courses: 0, orders: 0 };
    if (o.kind === 'subscription') e.subs += o.totalCop;
    else if (o.kind === 'course') e.courses += o.totalCop;
    else e.store += o.totalCop;
    e.orders++;
    byDay.set(d, e);
  }
  const daily = buildDaily(range, byDay);

  const revenue = sumBy(cur, (o) => o.totalCop);
  const revenuePrev = sumBy(prev, (o) => o.totalCop);
  const cats = new Map<string, number>();
  const prodAgg = new Map<string, { name: string; units: number; revenue: number }>();
  const cityAgg = new Map<string, { city: string; region: string; revenue: number; orders: number }>();
  const channels = new Map<string, number>();
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const o of cur) {
    bump(channels, o.channel, 1);
    const local = new Date(o.paidAt!.getTime() - 5 * 3600000);
    heat[(local.getUTCDay() + 6) % 7]![local.getUTCHours()]!++;
    if (o.shippingAddress) {
      const k = o.shippingAddress.city;
      const e = cityAgg.get(k) ?? { city: k, region: o.shippingAddress.region, revenue: 0, orders: 0 };
      e.revenue += o.totalCop;
      e.orders++;
      cityAgg.set(k, e);
    }
    for (const it of o.items) {
      const kind = it.itemKind === 'product' ? (seedProducts.find((p) => p.id === it.productId)?.kind ?? 'coffee') : it.itemKind;
      bump(cats, kind, it.totalCop);
      if (it.itemKind === 'product') {
        const e = prodAgg.get(it.productId!) ?? { name: it.name, units: 0, revenue: 0 };
        e.units += it.quantity;
        e.revenue += it.totalCop;
        prodAgg.set(it.productId!, e);
      }
    }
  }

  // Suscripciones
  const subs: SubLite[] = ds.subscriptions.map((s) => {
    const plan = seedPlans.find((p) => p.id === s.planId)!;
    return { status: s.status, priceCop: s.priceCop, frequencyWeeks: plan.frequencyWeeks, plan: plan.name, startedAt: s.startedAt, cancelledAt: s.cancelledAt };
  });
  const ss = subscriptionSeries(subs, range, now);
  const chargesCur = ds.charges.filter((c) => inRange(c.createdAt, range.from, range.to));

  // Clientes
  const customersByDay = new Map<string, number>();
  for (const c of ds.customers) if (c.role === 'customer') bump(customersByDay, dayOf(c.createdAt));
  const newCur = sumBy(range.dayList, (d) => customersByDay.get(d) ?? 0);
  const newPrev = sumBy(range.dayList.map((_, i) => addDays(range.prevFromDay, i)), (d) => customersByDay.get(d) ?? 0);

  // Academia
  const studentsIn = (a: Date, b: Date) => new Set(ds.enrollments.filter((e) => inRange(e.updatedAt, a, b)).map((e) => e.userId)).size;
  const weeks = weekStarts(now);
  const enrollWeekly = weeks.map((w) => {
    const a = startOfDay(w);
    const b = new Date(a.getTime() + 7 * DAY_MS);
    return { week: w, n: ds.enrollments.filter((e) => inRange(e.createdAt, a, b)).length };
  });
  const completion = seedCourses.map((c) => {
    const es = ds.enrollments.filter((e) => e.courseId === c.id);
    return { title: String(c.base.title), students: es.length, avgProgress: es.length ? Math.round(sumBy(es, (e) => e.progressPct) / es.length) : 0, completed: es.filter((e) => e.status === 'completed').length };
  });
  const certCur = ds.certificates.filter((c) => inRange(c.issuedAt, range.from, range.to)).length;
  const certPrev = ds.certificates.filter((c) => inRange(c.issuedAt, range.prevFrom, range.prevTo)).length;

  // Tráfico y embudo
  const pvCur = ds.pageViews.filter((p) => p.day >= range.fromDay && p.day <= range.toDay);
  const pvPrev = ds.pageViews.filter((p) => p.day >= range.prevFromDay && p.day < range.fromDay);
  const visits = sumBy(pvCur, (p) => p.views);
  const visitsPrev = sumBy(pvPrev, (p) => p.views);
  const created = ds.orders.filter((o) => inRange(o.createdAt, range.from, range.to)).length;
  const shape = trafficShape(visits);

  const campaigns = demoCampaigns(now);
  const last = campaigns.find((c) => c.status === 'sent');
  const sent7 = campaigns.filter((c) => c.sentAt && c.sentAt.getTime() > now.getTime() - 7 * DAY_MS);
  const push = demoPushStats();

  const orderSpark = daily.map((d) => d.orders);
  return {
    demo: true,
    range: { key: range.key, label: range.label, fromDay: range.fromDay, toDay: range.toDay, days: range.days },
    kpis: {
      revenue: kpi(revenue, revenuePrev, daily.map((d) => d.total)),
      orders: kpi(cur.length, prev.length, orderSpark),
      aov: kpi(cur.length ? Math.round(revenue / cur.length) : 0, prev.length ? Math.round(revenuePrev / prev.length) : 0, daily.map((d) => (d.orders ? Math.round(d.total / d.orders) : 0))),
      mrr: kpi(ss.mrrNow, ss.mrrPrev, ss.mrrWeekly.map((w) => w.mrr)),
      subscribers: kpi(ss.activeNow, ss.activePrev, ss.mrrWeekly.map((w) => w.active)),
      newCustomers: kpi(newCur, newPrev, range.dayList.map((d) => customersByDay.get(d) ?? 0)),
      activeStudents: kpi(studentsIn(range.from, range.to), studentsIn(range.prevFrom, range.prevTo), enrollWeekly.map((w) => w.n)),
      conversion: kpi(visits ? Math.round((cur.length / visits) * 10000) / 100 : 0, visitsPrev ? Math.round((prev.length / visitsPrev) * 10000) / 100 : 0, range.dayList.map((d) => {
        const v = pvCur.find((p) => p.day === d)?.views ?? 0;
        const n = daily.find((x) => x.day === d)?.orders ?? 0;
        return v ? Math.round((n / v) * 10000) / 100 : 0;
      })),
    },
    daily,
    categories: toNV(cats, CATEGORY_LABEL),
    channels: toNV(channels, CHANNEL_LABEL),
    heatmap: heat,
    topProducts: [...prodAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    cities: [...cityAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    subs: {
      mrrWeekly: ss.mrrWeekly,
      movements: ss.movements,
      churnPct: ss.churnPct,
      churnPrevPct: ss.churnPrevPct,
      byPlan: ss.byPlan,
      charges: {
        approved: chargesCur.filter((c) => c.status === 'approved').length,
        declined: chargesCur.filter((c) => c.status === 'declined' || c.status === 'error').length,
        retrying: ds.subscriptions.filter((s) => s.status === 'past_due').length,
        recovered: chargesCur.filter((c) => c.status === 'approved' && c.attempt > 1).length,
      },
    },
    academy: {
      enrollWeekly,
      completion,
      certificates: kpi(certCur, certPrev, []),
      mostViewed: seedCourses.map((c) => ({ title: String(c.base.title), views: ds.lessonViews[c.id] ?? 0 })).sort((a, b) => b.views - a.views),
    },
    funnel: { visits, carts: sumBy(pvCur, (p) => p.carts), created, paid: cur.length },
    traffic: { ...shape, daily: pvCur.map((p) => ({ day: p.day, views: p.views })) },
    push: {
      platforms: [{ name: 'Android', value: push.android }, { name: 'iOS', value: push.ios }],
      delivered7d: sumBy(sent7, (c) => c.sentCount),
      errors7d: sumBy(sent7, (c) => c.errorCount),
      lastCampaign: last ? { title: last.title, sentAt: last.sentAt?.toISOString() ?? null, sentCount: last.sentCount, errorCount: last.errorCount, openCount: last.openCount, targetCount: last.targetCount } : null,
    },
  };
}

function buildDaily(range: ResolvedRange, byDay: Map<string, { store: number; subs: number; courses: number; orders: number }>) {
  return range.dayList.map((day, i) => {
    const e = byDay.get(day) ?? { store: 0, subs: 0, courses: 0, orders: 0 };
    const p = byDay.get(addDays(range.prevFromDay, i));
    return { day, store: e.store, subs: e.subs, courses: e.courses, total: e.store + e.subs + e.courses, prevTotal: p ? p.store + p.subs + p.courses : 0, orders: e.orders };
  });
}

// ---------------------------------------------------------------------------
// Base de datos (MySQL/MariaDB)
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;
async function dbDashboard(range: ResolvedRange, now: Date): Promise<DashboardData> {
  const { from, to, prevFrom, prevTo } = range;
  const twelveWeeksAgo = startOfDay(weekStarts(now)[0]!);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const db = getDb();
  const [daily, cats, heat, top, cities, subsRows, charges, custs, scalars, traffic, enrollDaily, completion, viewed, push, lastCampaign] = await Promise.all([
    rawQuery<Row>(
      `SELECT ${DAYF('paid_at')} d, kind, channel, COUNT(*) n, COALESCE(SUM(total_cop),0) s
       FROM orders WHERE status IN ${PAID} AND paid_at >= ? AND paid_at < ? GROUP BY d, kind, channel`,
      [prevFrom, to],
    ),
    rawQuery<Row>(
      `SELECT CASE WHEN oi.item_kind = 'product' THEN COALESCE(p.kind, 'coffee') ELSE oi.item_kind END k, COALESCE(SUM(oi.total_cop),0) s
       FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.status IN ${PAID} AND o.paid_at >= ? AND o.paid_at < ? GROUP BY k`,
      [from, to],
    ),
    rawQuery<Row>(
      `SELECT WEEKDAY(${BOG('paid_at')}) dw, HOUR(${BOG('paid_at')}) h, COUNT(*) n
       FROM orders WHERE status IN ${PAID} AND paid_at >= ? AND paid_at < ? GROUP BY dw, h`,
      [from, to],
    ),
    rawQuery<Row>(
      `SELECT oi.product_id pid, MAX(oi.name) name, SUM(oi.quantity) u, SUM(oi.total_cop) s
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE oi.item_kind = 'product' AND o.status IN ${PAID} AND o.paid_at >= ? AND o.paid_at < ?
       GROUP BY oi.product_id ORDER BY s DESC LIMIT 6`,
      [from, to],
    ),
    rawQuery<Row>(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(shipping_address, '$.city')) city, JSON_UNQUOTE(JSON_EXTRACT(shipping_address, '$.region')) region, COUNT(*) n, SUM(total_cop) s
       FROM orders WHERE status IN ${PAID} AND paid_at >= ? AND paid_at < ? AND shipping_address IS NOT NULL AND shipping_address <> 'null'
       GROUP BY city, region ORDER BY s DESC LIMIT 8`,
      [from, to],
    ),
    rawQuery<Row>(
      `SELECT s.status, s.price_cop, s.started_at, s.cancelled_at, p.frequency_weeks, p.name
       FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id WHERE s.started_at IS NOT NULL`,
    ),
    rawQuery<Row>(
      `SELECT status, (attempt > 1) retry, COUNT(*) n FROM subscription_charges WHERE created_at >= ? AND created_at < ? GROUP BY status, retry`,
      [from, to],
    ),
    rawQuery<Row>(`SELECT ${DAYF('created_at')} d, COUNT(*) n FROM users WHERE role = 'customer' AND created_at >= ? AND created_at < ? GROUP BY d`, [prevFrom, to]),
    rawQuery<Row>(
      `SELECT
        (SELECT COUNT(DISTINCT user_id) FROM lesson_progress WHERE updated_at >= ? AND updated_at < ?) st_cur,
        (SELECT COUNT(DISTINCT user_id) FROM lesson_progress WHERE updated_at >= ? AND updated_at < ?) st_prev,
        (SELECT COUNT(*) FROM certificates WHERE issued_at >= ? AND issued_at < ? AND revoked_at IS NULL) cert_cur,
        (SELECT COUNT(*) FROM certificates WHERE issued_at >= ? AND issued_at < ?) cert_prev,
        (SELECT COUNT(*) FROM carts WHERE updated_at >= ? AND updated_at < ?) carts_cur,
        (SELECT COUNT(*) FROM orders WHERE created_at >= ? AND created_at < ?) created_cur,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'past_due') past_due,
        (SELECT COUNT(*) FROM enrollments WHERE updated_at >= ? AND updated_at < ?) enr_cur`,
      [from, to, prevFrom, prevTo, from, to, prevFrom, prevTo, from, to, from, to, from, to],
    ),
    rawQuery<Row>(
      `SELECT 'd' t, day k, SUM(views) v FROM page_views WHERE day >= ? AND day <= ? GROUP BY day
       UNION ALL SELECT 's' t, source k, SUM(views) v FROM page_views WHERE day >= ? AND day <= ? GROUP BY source
       UNION ALL SELECT 'v' t, device k, SUM(views) v FROM page_views WHERE day >= ? AND day <= ? GROUP BY device
       UNION ALL (SELECT 'p' t, path k, SUM(views) v FROM page_views WHERE day >= ? AND day <= ? GROUP BY path ORDER BY v DESC LIMIT 8)`,
      [range.prevFromDay, range.toDay, range.fromDay, range.toDay, range.fromDay, range.toDay, range.fromDay, range.toDay],
    ),
    rawQuery<Row>(`SELECT ${DAYF('created_at')} d, COUNT(*) n FROM enrollments WHERE created_at >= ? GROUP BY d`, [twelveWeeksAgo]),
    rawQuery<Row>(
      `SELECT c.title, COUNT(e.id) n, COALESCE(AVG(e.progress_pct),0) avgp, COALESCE(SUM(e.status = 'completed'),0) done
       FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id AND e.status <> 'revoked'
       GROUP BY c.id, c.title ORDER BY n DESC LIMIT 8`,
    ),
    rawQuery<Row>(
      `SELECT c.title, COUNT(*) v FROM lesson_progress lp JOIN courses c ON c.id = lp.course_id
       WHERE lp.updated_at >= ? AND lp.updated_at < ? GROUP BY c.id, c.title ORDER BY v DESC LIMIT 5`,
      [from, to],
    ),
    rawQuery<Row>(
      `SELECT 'p' t, platform k, COUNT(*) n FROM push_tokens WHERE enabled = 1 GROUP BY platform
       UNION ALL SELECT 'd' t, status k, COUNT(*) n FROM push_deliveries WHERE created_at >= ? GROUP BY status`,
      [since7],
    ),
    db.select().from(t.pushCampaigns).where(eq(t.pushCampaigns.status, 'sent')).orderBy(desc(t.pushCampaigns.sentAt)).limit(1),
  ]);

  // Serie diaria
  const byDay = new Map<string, { store: number; subs: number; courses: number; orders: number }>();
  const channels = new Map<string, number>();
  let revenue = 0, revenuePrev = 0, ordersCur = 0, ordersPrev = 0;
  for (const r of daily) {
    const d = str(r.d);
    const e = byDay.get(d) ?? { store: 0, subs: 0, courses: 0, orders: 0 };
    const s = num(r.s);
    const n = num(r.n);
    if (r.kind === 'subscription') e.subs += s;
    else if (r.kind === 'course') e.courses += s;
    else e.store += s;
    e.orders += n;
    byDay.set(d, e);
    if (d >= range.fromDay) {
      revenue += s;
      ordersCur += n;
      bump(channels, str(r.channel), n);
    } else {
      revenuePrev += s;
      ordersPrev += n;
    }
  }
  const dailySeries = buildDaily(range, byDay);

  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const r of heat) heatmap[num(r.dw)]![num(r.h)] = num(r.n);

  const subs: SubLite[] = subsRows.map((r) => ({ status: str(r.status), priceCop: num(r.price_cop), frequencyWeeks: num(r.frequency_weeks) || 4, plan: str(r.name), startedAt: r.started_at ? new Date(`${str(r.started_at).replace(' ', 'T')}Z`) : null, cancelledAt: r.cancelled_at ? new Date(`${str(r.cancelled_at).replace(' ', 'T')}Z`) : null }));
  const ss = subscriptionSeries(subs, range, now);

  const custByDay = new Map(custs.map((r) => [str(r.d), num(r.n)]));
  const newCur = sumBy(range.dayList, (d) => custByDay.get(d) ?? 0);
  const newPrev = sumBy(range.dayList.map((_, i) => addDays(range.prevFromDay, i)), (d) => custByDay.get(d) ?? 0);

  const sc = scalars[0] ?? {};
  const pv = { d: new Map<string, number>(), s: new Map<string, number>(), v: new Map<string, number>(), p: [] as { path: string; views: number }[] };
  for (const r of traffic) {
    const tt = str(r.t);
    if (tt === 'p') pv.p.push({ path: str(r.k), views: num(r.v) });
    else pv[tt as 'd' | 's' | 'v'].set(str(r.k), num(r.v));
  }
  const visits = sumBy(range.dayList, (d) => pv.d.get(d) ?? 0);
  const visitsPrev = sumBy(range.dayList.map((_, i) => addDays(range.prevFromDay, i)), (d) => pv.d.get(d) ?? 0);

  const weeks = weekStarts(now);
  const enrByDay = new Map(enrollDaily.map((r) => [str(r.d), num(r.n)]));
  const enrollWeekly = weeks.map((w) => ({ week: w, n: Array.from({ length: 7 }, (_, i) => enrByDay.get(addDays(w, i)) ?? 0).reduce((a, b) => a + b, 0) }));

  const chargeAgg = { approved: 0, declined: 0, retrying: num(sc.past_due), recovered: 0 };
  for (const r of charges) {
    if (r.status === 'approved') {
      chargeAgg.approved += num(r.n);
      if (num(r.retry)) chargeAgg.recovered += num(r.n);
    } else if (r.status === 'declined' || r.status === 'error') chargeAgg.declined += num(r.n);
  }
  const pushAgg = { p: new Map<string, number>(), d: new Map<string, number>() };
  for (const r of push) pushAgg[str(r.t) as 'p' | 'd'].set(str(r.k), num(r.n));
  const lc = lastCampaign[0];

  return {
    demo: false,
    range: { key: range.key, label: range.label, fromDay: range.fromDay, toDay: range.toDay, days: range.days },
    kpis: {
      revenue: kpi(revenue, revenuePrev, dailySeries.map((d) => d.total)),
      orders: kpi(ordersCur, ordersPrev, dailySeries.map((d) => d.orders)),
      aov: kpi(ordersCur ? Math.round(revenue / ordersCur) : 0, ordersPrev ? Math.round(revenuePrev / ordersPrev) : 0, dailySeries.map((d) => (d.orders ? Math.round(d.total / d.orders) : 0))),
      mrr: kpi(ss.mrrNow, ss.mrrPrev, ss.mrrWeekly.map((w) => w.mrr)),
      subscribers: kpi(ss.activeNow, ss.activePrev, ss.mrrWeekly.map((w) => w.active)),
      newCustomers: kpi(newCur, newPrev, range.dayList.map((d) => custByDay.get(d) ?? 0)),
      activeStudents: kpi(num(sc.st_cur), num(sc.st_prev), enrollWeekly.map((w) => w.n)),
      conversion: kpi(visits ? Math.round((ordersCur / visits) * 10000) / 100 : 0, visitsPrev ? Math.round((ordersPrev / visitsPrev) * 10000) / 100 : 0, range.dayList.map((d) => {
        const v = pv.d.get(d) ?? 0;
        return v ? Math.round(((byDay.get(d)?.orders ?? 0) / v) * 10000) / 100 : 0;
      })),
    },
    daily: dailySeries,
    categories: cats.map((r) => ({ name: CATEGORY_LABEL[str(r.k)] ?? str(r.k), value: num(r.s) })).sort((a, b) => b.value - a.value),
    channels: toNV(channels, CHANNEL_LABEL),
    heatmap,
    topProducts: top.map((r) => ({ name: str(r.name), units: num(r.u), revenue: num(r.s) })),
    cities: cities.map((r) => ({ city: str(r.city) || 'Sin ciudad', region: str(r.region), revenue: num(r.s), orders: num(r.n) })),
    subs: { mrrWeekly: ss.mrrWeekly, movements: ss.movements, churnPct: ss.churnPct, churnPrevPct: ss.churnPrevPct, byPlan: ss.byPlan, charges: chargeAgg },
    academy: {
      enrollWeekly,
      completion: completion.map((r) => ({ title: str(r.title), students: num(r.n), avgProgress: Math.round(num(r.avgp)), completed: num(r.done) })),
      certificates: kpi(num(sc.cert_cur), num(sc.cert_prev), []),
      mostViewed: viewed.map((r) => ({ title: str(r.title), views: num(r.v) })),
    },
    funnel: { visits, carts: num(sc.carts_cur), created: num(sc.created_cur), paid: ordersCur },
    traffic: {
      topPages: pv.p,
      sources: toNV(pv.s, SOURCE_LABEL, 8),
      devices: toNV(pv.v, DEVICE_LABEL),
      daily: range.dayList.map((d) => ({ day: d, views: pv.d.get(d) ?? 0 })),
    },
    push: {
      platforms: toNV(pushAgg.p, { ios: 'iOS', android: 'Android', web: 'Web' }),
      delivered7d: pushAgg.d.get('ok') ?? 0,
      errors7d: pushAgg.d.get('error') ?? 0,
      lastCampaign: lc ? { title: lc.title, sentAt: lc.sentAt?.toISOString() ?? null, sentCount: lc.sentCount, errorCount: lc.errorCount, openCount: lc.openCount, targetCount: lc.targetCount } : null,
    },
  };
}

// ===========================================================================
// OPERACIÓN (lista accionable del dashboard)
// ===========================================================================
export const getOps = cache((): Promise<OpsData> => getOpsImpl(new Date()));
async function getOpsImpl(now: Date): Promise<OpsData> {
  if (isDemoMode()) {
    const ds = demoDataset(now);
    const toPrepare = ds.orders.filter((o) => o.status === 'paid' && o.requiresShipping).sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime());
    const lowStock = seedVariants
      .map((v) => ({ v, sold: 0 }))
      .map(({ v }) => ({ productId: v.productId, product: seedProducts.find((p) => p.id === v.productId)!.name, variant: v.name, stock: demoStock(v.id, v.stock), sku: v.sku }))
      .filter((x) => x.stock <= 5)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8);
    const chats = demoChats(now).filter((c) => c.status === 'human_requested');
    return {
      toPrepare: toPrepare.slice(0, 7).map((o) => ({ id: o.id, number: o.number, customer: o.customerName, city: o.shippingAddress?.city ?? null, totalCop: o.totalCop, paidAt: o.paidAt?.toISOString() ?? null, items: o.items.reduce((s, i) => s + i.quantity, 0) })),
      toPrepareCount: toPrepare.length,
      lowStock,
      chatsWaiting: chats.map((c) => ({ id: c.id, name: c.name ?? 'Visitante', lastMessageAt: c.lastMessageAt.toISOString(), preview: c.messages.filter((m) => m.role === 'user').at(-1)?.content ?? '' })),
      newLeads: demoLeads(now).filter((l) => l.status === 'new').slice(0, 5).map((l) => ({ id: l.id, name: l.name, interest: l.interest, source: l.source, createdAt: l.createdAt.toISOString() })),
      health: await runHealthChecks(),
    };
  }
  const db = getDb();
  const [prep, [{ n: prepCount }], low, chats, leads, health] = await Promise.all([
    db
      .select({ id: t.orders.id, number: t.orders.number, customer: t.orders.customerName, address: t.orders.shippingAddress, totalCop: t.orders.totalCop, paidAt: t.orders.paidAt })
      .from(t.orders)
      .where(and(eq(t.orders.status, 'paid'), eq(t.orders.requiresShipping, true)))
      .orderBy(asc(t.orders.paidAt))
      .limit(7),
    db.select({ n: count() }).from(t.orders).where(and(eq(t.orders.status, 'paid'), eq(t.orders.requiresShipping, true))),
    db
      .select({ productId: t.products.id, product: t.products.name, variant: t.productVariants.name, stock: t.productVariants.stock, sku: t.productVariants.sku })
      .from(t.productVariants)
      .innerJoin(t.products, eq(t.products.id, t.productVariants.productId))
      .where(and(eq(t.productVariants.isActive, true), eq(t.products.isActive, true), lte(t.productVariants.stock, 5)))
      .orderBy(asc(t.productVariants.stock))
      .limit(8),
    db.select().from(t.chatSessions).where(eq(t.chatSessions.status, 'human_requested')).orderBy(asc(t.chatSessions.lastMessageAt)).limit(6),
    db.select().from(t.leads).where(eq(t.leads.status, 'new')).orderBy(desc(t.leads.createdAt)).limit(5),
    runHealthChecks(),
  ]);
  const ids = prep.map((p) => p.id);
  const [itemCounts, lastMsgs] = await Promise.all([
    ids.length ? rawQuery<Row>(`SELECT order_id, SUM(quantity) n FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) GROUP BY order_id`, ids) : Promise.resolve([] as Row[]),
    chats.length
      ? db.select({ sessionId: t.chatMessages.sessionId, content: t.chatMessages.content, createdAt: t.chatMessages.createdAt }).from(t.chatMessages).where(and(inArray(t.chatMessages.sessionId, chats.map((c) => c.id)), eq(t.chatMessages.role, 'user'))).orderBy(desc(t.chatMessages.createdAt)).limit(60)
      : Promise.resolve([]),
  ]);
  return {
    toPrepare: prep.map((p) => ({ id: p.id, number: p.number, customer: p.customer, city: p.address?.city ?? null, totalCop: p.totalCop, paidAt: p.paidAt?.toISOString() ?? null, items: num(itemCounts.find((r) => r.order_id === p.id)?.n) })),
    toPrepareCount: prepCount,
    lowStock: low,
    chatsWaiting: chats.map((c) => ({ id: c.id, name: c.name ?? c.email ?? 'Visitante', lastMessageAt: c.lastMessageAt.toISOString(), preview: lastMsgs.find((m) => m.sessionId === c.id)?.content ?? '' })),
    newLeads: leads.map((l) => ({ id: l.id, name: l.name, interest: l.interest, source: l.source, createdAt: l.createdAt.toISOString() })),
    health,
  };
}

/** Stock simulado en demo: algunas variantes quedan bajas para que la alerta se vea. */
export function demoStock(variantId: string, base: number) {
  const h = [...variantId].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
  return h % 5 === 0 ? h % 6 : base;
}

// ===========================================================================
// BADGES del menú
// ===========================================================================
export async function getBadges(): Promise<Badges> {
  if (isDemoMode()) {
    const ds = demoDataset();
    return { toPrepare: ds.orders.filter((o) => o.status === 'paid' && o.requiresShipping).length, chatsWaiting: demoChats().filter((c) => c.status === 'human_requested').length, errors24h: 3 };
  }
  try {
    const [r] = await rawQuery<Row>(
      `SELECT (SELECT COUNT(*) FROM orders WHERE status = 'paid' AND requires_shipping = 1) a,
              (SELECT COUNT(*) FROM chat_sessions WHERE status = 'human_requested') b,
              (SELECT COUNT(*) FROM integration_events WHERE status = 'error' AND created_at >= ?) c`,
      [new Date(Date.now() - DAY_MS)],
    );
    return { toPrepare: num(r?.a), chatsWaiting: num(r?.b), errors24h: num(r?.c) };
  } catch {
    return { toPrepare: 0, chatsWaiting: 0, errors24h: 0 };
  }
}

// ===========================================================================
// ANALÍTICA (tráfico, embudo y cohortes de recompra)
// ===========================================================================
const COHORT_MONTHS = 6;
const ymOf = (d: Date) => dayOf(d).slice(0, 7);
const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
function cohortMonths(now: Date) {
  const cur = ymOf(now);
  return Array.from({ length: COHORT_MONTHS }, (_, i) => {
    const total = Number(cur.slice(0, 4)) * 12 + Number(cur.slice(5, 7)) - 1 - (COHORT_MONTHS - 1 - i);
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });
}

export async function getAnalytics(key: RangeKey, now = new Date()): Promise<AnalyticsData> {
  const range = resolveRange(key, now);
  const dash = await getDashboard(key);
  const months = cohortMonths(now);
  if (isDemoMode()) {
    const ds = demoDataset(now);
    return { ...demoAnalytics(ds, range, now, months), demo: true, range: dash.range, funnel: dash.funnel, daily: dash.daily, traffic: { ...dash.traffic, ...demoBySource(ds, range) } };
  }
  const [prevScalars, bySource, cohortRows, repeat] = await Promise.all([
    rawQuery<Row>(
      `SELECT (SELECT COALESCE(SUM(views),0) FROM page_views WHERE day >= ? AND day < ?) visits,
              (SELECT COUNT(*) FROM carts WHERE updated_at >= ? AND updated_at < ?) carts,
              (SELECT COUNT(*) FROM orders WHERE created_at >= ? AND created_at < ?) created,
              (SELECT COUNT(*) FROM orders WHERE status IN ${PAID} AND paid_at >= ? AND paid_at < ?) paid`,
      [range.prevFromDay, range.fromDay, range.prevFrom, range.prevTo, range.prevFrom, range.prevTo, range.prevFrom, range.prevTo],
    ),
    rawQuery<Row>(`SELECT day, source, SUM(views) v FROM page_views WHERE day >= ? AND day <= ? GROUP BY day, source`, [range.fromDay, range.toDay]),
    rawQuery<Row>(
      `SELECT f.cm cohort, PERIOD_DIFF(DATE_FORMAT(${BOG('o.paid_at')}, '%Y%m'), f.cmn) m, COUNT(DISTINCT o.email) n
       FROM orders o
       JOIN (SELECT email, DATE_FORMAT(MIN(${BOG('paid_at')}), '%Y-%m') cm, DATE_FORMAT(MIN(${BOG('paid_at')}), '%Y%m') cmn
             FROM orders WHERE status IN ${PAID} AND paid_at IS NOT NULL AND kind <> 'subscription' GROUP BY email) f ON f.email = o.email
       WHERE o.status IN ${PAID} AND o.kind <> 'subscription' AND o.paid_at >= ? AND f.cm >= ?
       GROUP BY f.cm, m`,
      [startOfDay(`${months[0]}-01`), months[0]],
    ),
    rawQuery<Row>(
      `SELECT COUNT(*) total, COALESCE(SUM(n > 1),0) rep, COALESCE(AVG(n),0) avgn
       FROM (SELECT email, COUNT(*) n FROM orders WHERE status IN ${PAID} AND kind <> 'subscription' GROUP BY email) x`,
    ),
  ]);
  const p = prevScalars[0] ?? {};
  const sources = new Set<string>();
  const sourceDays = new Map<string, Record<string, number | string>>();
  for (const r of bySource) {
    const s = SOURCE_LABEL[str(r.source)] ?? str(r.source);
    sources.add(s);
    const e = sourceDays.get(str(r.day)) ?? { day: str(r.day) };
    e[s] = num(r.v);
    sourceDays.set(str(r.day), e);
  }
  const cohorts = months.map((m) => {
    const rows = cohortRows.filter((r) => str(r.cohort) === m);
    const size = num(rows.find((r) => num(r.m) === 0)?.n);
    const span = monthsBetween(m, ymOf(now));
    return { cohort: m, size, values: Array.from({ length: COHORT_MONTHS }, (_, i) => (i > span ? null : size ? Math.round((num(rows.find((r) => num(r.m) === i)?.n) / size) * 1000) / 10 : 0)) };
  });
  const rp = repeat[0] ?? {};
  return {
    demo: false,
    range: dash.range,
    funnel: dash.funnel,
    funnelPrev: { visits: num(p.visits), carts: num(p.carts), created: num(p.created), paid: num(p.paid) },
    traffic: { ...dash.traffic, bySource: range.dayList.map((d) => ({ day: d, ...(sourceDays.get(d) ?? {}) })), sourceKeys: [...sources] },
    cohorts,
    repeatRate: num(rp.total) ? Math.round((num(rp.rep) / num(rp.total)) * 1000) / 10 : 0,
    avgOrdersPerCustomer: Math.round(num(rp.avgn) * 100) / 100,
    daily: dash.daily,
  };
}

function demoBySource(ds: DemoDataset, range: ResolvedRange) {
  const keys = ['Google', 'Instagram', 'Directo', 'WhatsApp', 'Facebook', 'TikTok', 'Correo'];
  const w = [34, 24, 18, 9, 6, 5, 4];
  const bySource = range.dayList.map((d, i) => {
    const v = ds.pageViews.find((p) => p.day === d)?.views ?? 0;
    const row: Record<string, number | string> = { day: d };
    keys.forEach((k, j) => (row[k] = Math.round((v * w[j]! * (0.9 + (((i * 7 + j * 13) % 10) / 50))) / 100)));
    return row as { day: string; [k: string]: number | string };
  });
  return { bySource, sourceKeys: keys };
}

function demoAnalytics(ds: DemoDataset, range: ResolvedRange, now: Date, months: string[]) {
  const inRange = (d: Date | null, a: Date, b: Date) => Boolean(d && d >= a && d < b);
  const pvPrev = ds.pageViews.filter((p) => p.day >= range.prevFromDay && p.day < range.fromDay);
  const funnelPrev = {
    visits: sumBy(pvPrev, (p) => p.views),
    carts: sumBy(pvPrev, (p) => p.carts),
    created: ds.orders.filter((o) => inRange(o.createdAt, range.prevFrom, range.prevTo)).length,
    paid: ds.orders.filter((o) => isPaidStatus(o.status) && inRange(o.paidAt, range.prevFrom, range.prevTo)).length,
  };
  const paid = ds.orders.filter((o) => isPaidStatus(o.status) && o.paidAt && o.kind !== 'subscription');
  const first = new Map<string, string>();
  const monthsByEmail = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  for (const o of [...paid].sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime())) {
    const ym = ymOf(o.paidAt!);
    if (!first.has(o.email)) first.set(o.email, ym);
    (monthsByEmail.get(o.email) ?? monthsByEmail.set(o.email, new Set()).get(o.email)!).add(ym);
    bump(counts, o.email);
  }
  const cohorts = months.map((m) => {
    const members = [...first.entries()].filter(([, c]) => c === m).map(([e]) => e);
    const span = monthsBetween(m, ymOf(now));
    return {
      cohort: m,
      size: members.length,
      values: Array.from({ length: COHORT_MONTHS }, (_, i) => {
        if (i > span) return null;
        if (i === 0) return 100;
        const target = months[months.indexOf(m) + i] ?? null;
        const ymTarget = target ?? (() => {
          const total = Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1 + i;
          return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
        })();
        const n = members.filter((e) => monthsByEmail.get(e)?.has(ymTarget)).length;
        return members.length ? Math.round((n / members.length) * 1000) / 10 : 0;
      }),
    };
  });
  const totals = [...counts.values()];
  return {
    funnelPrev,
    cohorts,
    repeatRate: totals.length ? Math.round((totals.filter((n) => n > 1).length / totals.length) * 1000) / 10 : 0,
    avgOrdersPerCustomer: totals.length ? Math.round((sumBy(totals, (n) => n) / totals.length) * 100) / 100 : 0,
  };
}

/** Métricas resumidas para la IA (sin datos personales). */
export function summarizeForAi(d: DashboardData) {
  const pct = (k: Kpi) => (k.prev ? Math.round(((k.value - k.prev) / k.prev) * 1000) / 10 : null);
  return {
    periodo: d.range.label,
    ingresos: { valor: d.kpis.revenue.value, variacionPct: pct(d.kpis.revenue) },
    pedidos: { valor: d.kpis.orders.value, variacionPct: pct(d.kpis.orders) },
    ticketPromedio: { valor: d.kpis.aov.value, variacionPct: pct(d.kpis.aov) },
    mrr: { valor: d.kpis.mrr.value, variacionPct: pct(d.kpis.mrr) },
    suscriptoresActivos: d.kpis.subscribers.value,
    churnPct: d.subs.churnPct,
    churnPrevPct: d.subs.churnPrevPct,
    cobrosFallidos: d.subs.charges.declined,
    nuevosClientes: { valor: d.kpis.newCustomers.value, variacionPct: pct(d.kpis.newCustomers) },
    conversionPct: { valor: d.kpis.conversion.value, anterior: d.kpis.conversion.prev },
    embudo: d.funnel,
    categorias: d.categories.slice(0, 6),
    canales: d.channels,
    topProductos: d.topProducts.slice(0, 5).map((p) => ({ nombre: p.name, unidades: p.units, ingresos: p.revenue })),
    ciudades: d.cities.slice(0, 5).map((c) => ({ ciudad: c.city, ingresos: c.revenue })),
    academia: { estudiantesActivos: d.kpis.activeStudents.value, certificados: d.academy.certificates.value, finalizacion: d.academy.completion.slice(0, 4) },
    fuentesTrafico: d.traffic.sources.slice(0, 5),
  };
}
