'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, t } from '@/lib/db';
import { audit } from '@/lib/monitor';
import { aiEnabled, generatePushCopy, scoreLead } from '@/lib/ai';
import { createCampaign, resolveAudience } from '@/lib/push';
import { isDemoMode } from '@/lib/env';
import { ActionError, bogotaLocalToDate, ok, parsePayload, runAction, zs } from '../guard';
import { demoPushStats } from '../demo-data';
import { findUserByEmail } from '../data/customers';

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------
const audienceSchema = z.object({
  audience: z.string().regex(/^(all|subscribers|students|customers|inactive|course:[\w-]{1,36}|user:[\w-]{1,36}|email:.+)$/, 'Audiencia inválida'),
  platform: z.enum(['all', 'ios', 'android']),
});

async function resolveEmailAudience(audience: string) {
  if (!audience.startsWith('email:')) return audience;
  const u = await findUserByEmail(audience.slice(6).trim());
  if (!u) throw new ActionError('No encontramos un usuario con ese correo', { userEmail: ['No encontramos un usuario con ese correo'] });
  return `user:${u.id}`;
}

export async function estimateAudience(audience: string, platform: string) {
  return runAction<{ count: number }>({ allowDemo: true }, async () => {
    const a = audienceSchema.parse({ audience, platform });
    if (isDemoMode()) {
      const st = demoPushStats();
      const base = a.platform === 'ios' ? st.ios : a.platform === 'android' ? st.android : st.ios + st.android;
      const factor: Record<string, number> = { all: 1, subscribers: 0.18, students: 0.42, customers: 0.66, inactive: 0.21 };
      const f = a.audience.startsWith('course:') ? 0.12 : a.audience.startsWith('user:') || a.audience.startsWith('email:') ? 0 : (factor[a.audience] ?? 1);
      return ok('Estimado', { count: a.audience.startsWith('email:') ? 1 : Math.round(base * f) });
    }
    const resolved = await resolveEmailAudience(a.audience);
    const targets = await resolveAudience(resolved, a.platform);
    return ok('Estimado', { count: targets.length });
  });
}

const campaignSchema = z
  .object({
    title: zs.req('El título', 65),
    body: zs.req('El mensaje', 240),
    imageUrl: zs.url(),
    deepLink: z.string().trim().max(300).refine((v) => !v || v.startsWith('/'), 'La ruta debe empezar por /').nullish(),
    audience: audienceSchema.shape.audience,
    platform: audienceSchema.shape.platform,
    when: z.enum(['now', 'later']),
    scheduledAt: zs.opt(20),
  })
  .superRefine((c, ctx) => {
    if (c.when === 'later') {
      const d = bogotaLocalToDate(c.scheduledAt);
      if (!d) ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Elige fecha y hora' });
      else if (d.getTime() < Date.now() + 2 * 60000) ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Debe ser al menos 2 minutos en el futuro' });
    }
  });
export type CampaignForm = z.input<typeof campaignSchema>;

export async function sendPushCampaign(_prev: unknown, fd: FormData) {
  return runAction({}, async ({ user }) => {
    const c = parsePayload(campaignSchema, fd);
    const audience = await resolveEmailAudience(c.audience);
    const scheduledAt = c.when === 'later' ? bogotaLocalToDate(c.scheduledAt) : null;
    const id = await createCampaign({ title: c.title, body: c.body, imageUrl: c.imageUrl, deepLink: c.deepLink || '/', audience, platform: c.platform, scheduledAt }, user.id);
    await audit(user.id, scheduledAt ? 'push.schedule' : 'push.send', 'push_campaign', id, { audience, platform: c.platform, title: c.title });
    revalidatePath('/admin/notificaciones');
    if (scheduledAt) return ok('Campaña programada (la envía el cron de cPanel en su hora)');
    const [row] = await getDb().select({ sent: t.pushCampaigns.sentCount, errors: t.pushCampaigns.errorCount, target: t.pushCampaigns.targetCount, status: t.pushCampaigns.status }).from(t.pushCampaigns).where(eq(t.pushCampaigns.id, id)).limit(1);
    return ok(row?.target ? `Enviada a ${row.sent} de ${row.target} dispositivos${row.errors ? ` · ${row.errors} errores` : ''}` : 'Campaña creada: no hay dispositivos en esa audiencia');
  });
}

export async function cancelCampaign(id: string) {
  return runAction({}, async ({ user }) => {
    await getDb().update(t.pushCampaigns).set({ status: 'cancelled' }).where(and(eq(t.pushCampaigns.id, id), inArray(t.pushCampaigns.status, ['scheduled', 'draft'])));
    await audit(user.id, 'push.cancel', 'push_campaign', id);
    revalidatePath('/admin/notificaciones');
    return ok('Campaña cancelada');
  });
}

export async function aiPushSuggestions(goal: string, audience: string, link: string) {
  return runAction<{ options: { title: string; body: string }[] }>({ allowDemo: true }, async () => {
    if (!aiEnabled()) throw new ActionError('La IA no está configurada (OPENAI_API_KEY).');
    const g = z.string().trim().min(4, 'Cuéntale a la IA el objetivo (mín. 4 caracteres)').max(300).parse(goal);
    const r = await generatePushCopy({ goal: g, audience, link });
    if (!r?.options?.length) throw new ActionError('La IA no respondió.');
    return ok('3 propuestas listas', { options: r.options.slice(0, 3).map((o) => ({ title: o.title.slice(0, 65), body: o.body.slice(0, 240) })) });
  });
}

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
export async function setLeadStatus(id: string, status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost') {
  return runAction({}, async ({ user }) => {
    z.enum(['new', 'contacted', 'qualified', 'won', 'lost']).parse(status);
    await getDb().update(t.leads).set({ status }).where(eq(t.leads.id, id));
    await audit(user.id, 'lead.status', 'lead', id, { to: status });
    revalidatePath('/admin/leads');
    return ok('Lead actualizado');
  });
}

export async function saveLeadNotes(id: string, notes: string) {
  return runAction({}, async ({ user }) => {
    await getDb().update(t.leads).set({ notes: z.string().max(5000).parse(notes) || null }).where(eq(t.leads.id, id));
    await audit(user.id, 'lead.notes', 'lead', id);
    revalidatePath('/admin/leads');
    return ok('Notas guardadas');
  });
}

export async function aiScoreLead(id: string) {
  return runAction<{ score: number; segment: string; nextStep: string; replyDraft: string }>({ allowDemo: true }, async ({ user, demo }) => {
    if (!aiEnabled()) throw new ActionError('La IA no está configurada (OPENAI_API_KEY).');
    if (demo) throw new ActionError('Modo demo: conecta la base de datos para calificar leads reales.');
    const db = getDb();
    const [l] = await db.select().from(t.leads).where(eq(t.leads.id, id)).limit(1);
    if (!l) throw new ActionError('Lead no encontrado');
    const r = await scoreLead({ name: l.name, company: l.company, source: l.source, interest: l.interest, message: l.message, createdAt: l.createdAt });
    if (!r) throw new ActionError('La IA no respondió.');
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    await db.update(t.leads).set({ score, notes: `${l.notes ? `${l.notes}\n` : ''}[IA] ${r.segment} · ${r.nextStep}`.slice(0, 5000) }).where(eq(t.leads.id, id));
    await audit(user.id, 'lead.ai_score', 'lead', id, { score });
    revalidatePath('/admin/leads');
    return ok(`Puntaje ${score}/100`, { ...r, score });
  });
}
