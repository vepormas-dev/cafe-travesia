/** Tipos compartidos del panel (servidor ↔ componentes cliente). Solo datos serializables. */
import type { RangeKey } from './range';

export type Kpi = { value: number; prev: number; spark: number[] };
export type NameValue = { name: string; value: number };

export type HealthItem = { key: string; label: string; status: 'ok' | 'warn' | 'error' | 'off'; detail: string; ms?: number };

export type DashboardData = {
  demo: boolean;
  range: { key: RangeKey; label: string; fromDay: string; toDay: string; days: number };
  kpis: {
    revenue: Kpi;
    orders: Kpi;
    aov: Kpi;
    mrr: Kpi;
    subscribers: Kpi;
    newCustomers: Kpi;
    activeStudents: Kpi;
    conversion: Kpi; // porcentaje (0-100) con 2 decimales
  };
  daily: { day: string; store: number; subs: number; courses: number; total: number; prevTotal: number; orders: number }[];
  categories: NameValue[];
  channels: NameValue[];
  heatmap: number[][]; // [dow lunes..domingo][hora 0..23]
  topProducts: { name: string; units: number; revenue: number }[];
  cities: { city: string; region: string; revenue: number; orders: number }[];
  subs: {
    mrrWeekly: { week: string; mrr: number; active: number }[];
    movements: { week: string; altas: number; bajas: number }[];
    churnPct: number;
    churnPrevPct: number;
    byPlan: { name: string; count: number; mrr: number }[];
    charges: { approved: number; declined: number; retrying: number; recovered: number };
  };
  academy: {
    enrollWeekly: { week: string; n: number }[];
    completion: { title: string; students: number; avgProgress: number; completed: number }[];
    certificates: Kpi;
    mostViewed: { title: string; views: number }[];
  };
  funnel: { visits: number; carts: number; created: number; paid: number };
  traffic: {
    topPages: { path: string; views: number }[];
    sources: NameValue[];
    devices: NameValue[];
    daily: { day: string; views: number }[];
  };
  push: {
    platforms: NameValue[];
    delivered7d: number;
    errors7d: number;
    lastCampaign: { title: string; sentAt: string | null; sentCount: number; errorCount: number; openCount: number; targetCount: number } | null;
  };
};

export type OpsData = {
  toPrepare: { id: string; number: string; customer: string; city: string | null; totalCop: number; paidAt: string | null; items: number }[];
  toPrepareCount: number;
  lowStock: { productId: string; product: string; variant: string; stock: number; sku: string | null }[];
  chatsWaiting: { id: string; name: string; lastMessageAt: string; preview: string }[];
  newLeads: { id: string; name: string; interest: string | null; source: string; createdAt: string }[];
  health: HealthItem[];
};

export type AnalyticsData = {
  demo: boolean;
  range: DashboardData['range'];
  funnel: DashboardData['funnel'];
  funnelPrev: DashboardData['funnel'];
  traffic: DashboardData['traffic'] & { bySource: { day: string; [source: string]: number | string }[]; sourceKeys: string[] };
  cohorts: { cohort: string; size: number; values: (number | null)[] }[];
  repeatRate: number;
  avgOrdersPerCustomer: number;
  daily: DashboardData['daily'];
};

export type Badges = { toPrepare: number; chatsWaiting: number; errors24h: number };
