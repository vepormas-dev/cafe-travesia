import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import { leadSchema } from '@travesia/shared';
import { getDb, t } from '@/lib/db';
import { apiError, demoBlocked, handle, json } from '@/lib/api';
import { env, isDemoMode } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmail, layout, escapeHtml } from '@/lib/email';
import { aiEnabled, scoreLead } from '@/lib/ai';

/** POST leadSchema → 201 { ok, id }. Honeypot `website`: si viene lleno, se responde ok sin guardar. */
export async function POST(req: Request) {
  return handle('leads', async () => {
    const limited = await rateLimit(req, 'leads', 5, 600);
    if (limited) return limited;
    let raw: Record<string, unknown>;
    try {
      raw = (await req.json()) as Record<string, unknown>;
    } catch {
      return apiError('El cuerpo de la solicitud no es JSON válido');
    }
    if (typeof raw?.website === 'string' && raw.website.length > 0) return json({ ok: true }, 201);
    const r = leadSchema.safeParse(raw);
    if (!r.success) {
      const issues: Record<string, string[]> = {};
      for (const i of r.error.issues) (issues[i.path.join('.') || '_'] ??= []).push(i.message);
      return apiError(r.error.issues[0]?.message ?? 'Datos inválidos', 422, issues);
    }
    if (isDemoMode()) return demoBlocked();
    const { consent: _c, website: _w, ...lead } = r.data;
    const id = crypto.randomUUID();
    const db = getDb();
    await db.insert(t.leads).values({
      id,
      name: lead.name,
      email: lead.email.toLowerCase(),
      phone: lead.phone ?? null,
      company: lead.company ?? null,
      source: lead.source,
      interest: lead.interest ?? null,
      message: lead.message ?? null,
      status: 'new',
    });

    after(async () => {
      let scoreNote = '';
      if (aiEnabled()) {
        const s = await scoreLead(lead);
        if (s) {
          await db
            .update(t.leads)
            .set({ score: Math.max(0, Math.min(100, Math.round(s.score))), notes: `IA · ${s.segment}: ${s.nextStep}\n\nBorrador de respuesta:\n${s.replyDraft}` })
            .where(eq(t.leads.id, id))
            .catch(() => undefined);
          scoreNote = `<p><strong>Calificación IA:</strong> ${Math.round(s.score)}/100 · ${escapeHtml(s.segment)} — ${escapeHtml(s.nextStep)}</p>`;
        }
      }
      if (env.smtp.adminNotify) {
        const row = (k: string, v?: string | null) => (v ? `<strong>${k}:</strong> ${escapeHtml(v)}<br>` : '');
        await sendEmail(
          env.smtp.adminNotify,
          `Nuevo contacto (${lead.source}): ${lead.name}${lead.company ? ` · ${lead.company}` : ''}`,
          layout({
            title: `Nuevo lead desde ${lead.source}`,
            preheader: lead.message?.slice(0, 90) ?? lead.name,
            body: `<p>${row('Nombre', lead.name)}${row('Correo', lead.email)}${row('Teléfono', lead.phone)}${row('Empresa', lead.company)}${row('Interés', lead.interest)}</p>${lead.message ? `<p style="background:#F8F3EA;padding:12px;border-radius:12px">${escapeHtml(lead.message).replace(/\n/g, '<br>')}</p>` : ''}${scoreNote}`,
            cta: { label: 'Ver en el CRM', href: `${env.siteUrl}/admin/leads` },
          }),
          { replyTo: lead.email },
        );
      }
    });
    return json({ ok: true, id }, 201);
  });
}
