/** Hooks de datos (TanStack Query). 'catalog' = público y persistido; 'me' = cuenta del usuario. */
import { useQuery } from '@tanstack/react-query';
import type {
  AiRecommendation,
  CartLineInput,
  CourseAccessDTO,
  CourseDTO,
  LessonDTO,
  MeDTO,
  OrderDTO,
  PlanDTO,
  ProductDTO,
  SubscriptionDTO,
} from '@travesia/shared';

import { api, isDemo, read, useApiMode } from './api';
import { useAuth } from './auth';
import * as demo from './demo';

export type Enrollment = { course: CourseDTO; progressPct: number; lastLessonId: string | null; status: string; completedAt: string | null };
export type Certificate = { code: string; courseTitle: string; issuedAt: string; url: string };
export type AcademyMe = { enrollments: Enrollment[]; certificates: Certificate[] };
export type Address = { id: string; label?: string | null; recipient: string; phone: string; region: string; city: string; line1: string; line2?: string | null; notes?: string | null; isDefault?: boolean };
export type NotificationItem = { id: string; title: string; body: string; deepLink: string | null; kind: string; readAt: string | null; createdAt: string };
export type Quiz = { id: string; title: string; passScore: number; questions: { id: string; prompt: string; options: string[] }[] };

const qs = (p: Record<string, string | number | undefined | null>) => {
  const s = Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
};

/* ---------------- Catálogo ---------------- */
export function useProducts(params: { kind?: string; featured?: boolean; seasonal?: boolean } = {}) {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['catalog', 'products', params, mode],
    enabled: mode !== 'checking',
    queryFn: () =>
      read<{ products: ProductDTO[] }>(`/api/v1/products${qs({ kind: params.kind, featured: params.featured ? 1 : undefined, seasonal: params.seasonal ? 1 : undefined })}`, () => ({
        products: demo.demoProducts.filter(
          (p) => (!params.kind || p.kind === params.kind) && (!params.featured || p.isFeatured) && (!params.seasonal || p.isSeasonal),
        ),
      })).then((r) => r.products),
  });
}

export function useProduct(slug: string | undefined) {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['catalog', 'product', slug, mode],
    enabled: !!slug && mode !== 'checking',
    queryFn: async () => {
      const r = await read<{ product: ProductDTO | null }>(`/api/v1/products/${encodeURIComponent(slug!)}`, () => ({
        product: demo.demoProducts.find((p) => p.slug === slug) ?? null,
      }));
      if (!r.product) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      return r.product;
    },
  });
}

export function usePlans(audience?: 'personal' | 'empresa') {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['catalog', 'plans', audience, mode],
    enabled: mode !== 'checking',
    queryFn: () =>
      read<{ plans: PlanDTO[] }>(`/api/v1/plans${qs({ audience })}`, () => ({ plans: demo.demoPlans.filter((p) => !audience || p.audience === audience) })).then((r) => r.plans),
  });
}

export function useCourses(featured?: boolean) {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['catalog', 'courses', !!featured, mode],
    enabled: mode !== 'checking',
    queryFn: () =>
      read<{ courses: CourseDTO[] }>(`/api/v1/courses${qs({ featured: featured ? 1 : undefined })}`, () => ({
        courses: demo.demoCourses.filter((c) => !featured || c.isFeatured),
      })).then((r) => r.courses),
  });
}

export function useCourse(slug: string | undefined) {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['catalog', 'course', slug, mode],
    enabled: !!slug && mode !== 'checking',
    queryFn: async () => {
      const r = await read<{ course: CourseDTO | null }>(`/api/v1/courses/${encodeURIComponent(slug!)}`, () => ({
        course: demo.demoCourses.find((c) => c.slug === slug) ?? null,
      }));
      if (!r.course) throw Object.assign(new Error('Curso no encontrado'), { status: 404 });
      return r.course;
    },
  });
}

/* ---------------- Academia ---------------- */
function demoAccess(slug: string): CourseAccessDTO {
  const e = demo.demoAcademyMe.enrollments.find((x) => x.course.slug === slug);
  const c = demo.demoCourses.find((x) => x.slug === slug);
  if (e) return { enrolled: true, canEnrollFree: true, reason: 'enrolled', progressPct: e.progressPct, lastLessonId: e.lastLessonId, completed: false, certificateCode: null };
  if (c?.isFree) return { enrolled: false, canEnrollFree: true, reason: 'free', progressPct: 0, lastLessonId: null, completed: false, certificateCode: null };
  return { enrolled: false, canEnrollFree: true, reason: 'subscription', progressPct: 0, lastLessonId: null, completed: false, certificateCode: null };
}

export function useCourseAccess(slug: string | undefined) {
  const mode = useApiMode();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'access', slug, user?.uid ?? 'anon', mode],
    enabled: !!slug && mode !== 'checking',
    queryFn: () => read<CourseAccessDTO>(`/api/v1/courses/${encodeURIComponent(slug!)}/access`, () => demoAccess(slug!), { fallbackOnError: false }),
  });
}

export function useLesson(id: string | undefined) {
  const mode = useApiMode();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'lesson', id, user?.uid ?? 'anon', mode],
    enabled: !!id && mode !== 'checking',
    queryFn: async () => {
      const r = await read<LessonDTO | null>(`/api/v1/lessons/${encodeURIComponent(id!)}`, () => demo.demoLesson(id!), { fallbackOnError: false });
      if (!r) throw Object.assign(new Error('Lección no encontrada'), { status: 404 });
      return r;
    },
  });
}

export function useQuiz(id: string | undefined) {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['me', 'quiz', id, mode],
    enabled: !!id && mode !== 'checking',
    queryFn: async () => {
      const r = await read<{ quiz: Quiz | null }>(`/api/v1/quizzes/${encodeURIComponent(id!)}`, () => {
        const q = demo.demoQuizzes.get(id!);
        return { quiz: q ? { id: q.id, title: q.title, passScore: q.passScore, questions: q.questions.map((x, i) => ({ id: `${q.id}-${i}`, prompt: x.prompt, options: x.options })) } : null };
      });
      if (!r.quiz) throw Object.assign(new Error('Evaluación no encontrada'), { status: 404 });
      return r.quiz;
    },
  });
}

/* ---------------- Cuenta ---------------- */
function useAccountQuery<T>(key: string, path: string, demoValue: () => T) {
  const mode = useApiMode();
  const { user, canUseAccount } = useAuth();
  return useQuery({
    queryKey: ['me', key, user?.uid ?? 'demo', mode],
    enabled: canUseAccount && mode !== 'checking',
    queryFn: () => read<T>(path, demoValue, { fallbackOnError: false }),
  });
}

export const useAcademyMe = () => useAccountQuery<AcademyMe>('academy', '/api/v1/academy/me', () => demo.demoAcademyMe);
export const useSubscriptions = () =>
  useAccountQuery<{ subscriptions: SubscriptionDTO[] }>('subscriptions', '/api/v1/subscriptions', () => ({ subscriptions: demo.demoSubscriptions }));
export const useOrders = () => useAccountQuery<{ orders: OrderDTO[] }>('orders', '/api/v1/orders', () => ({ orders: demo.demoOrders }));
export const useOrder = (id: string | undefined) =>
  useAccountQuery<{ order: OrderDTO }>(`order-${id}`, `/api/v1/orders/${encodeURIComponent(id ?? '')}`, () => ({ order: demo.demoOrders.find((o) => o.id === id) ?? demo.demoOrders[0]! }));
export const useAddresses = () => useAccountQuery<{ addresses: Address[] }>('addresses', '/api/v1/addresses', () => ({ addresses: demo.demoAddresses }));
export const useLoyalty = () =>
  useAccountQuery<{ points: number; ledger: { points: number; reason: string; createdAt: string }[] }>('loyalty', '/api/v1/loyalty', () => demo.demoLoyalty);
export const useNotifications = () =>
  useAccountQuery<{ notifications: NotificationItem[]; unread: number }>('notifications', '/api/v1/notifications', () => demo.demoNotifications);
export const useMeQuery = () => useAccountQuery<{ user: MeDTO }>('profile', '/api/v1/me', () => ({ user: demo.demoMe }));

/* ---------------- IA ---------------- */
export function useRecommend(context: 'home' | 'product' | 'cart' | 'course' | 'account', extra: { productSlug?: string; courseSlug?: string; cart?: CartLineInput[] } = {}) {
  const mode = useApiMode();
  return useQuery({
    queryKey: ['ai', 'recommend', context, extra, mode],
    enabled: mode !== 'checking',
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (isDemo()) return { items: demo.demoRecommend(extra.productSlug), ai: false };
      try {
        return await api.post<{ items: AiRecommendation[]; ai: boolean }>('/api/ai/recommend', { context, ...extra });
      } catch {
        return { items: demo.demoRecommend(extra.productSlug), ai: false };
      }
    },
  });
}
