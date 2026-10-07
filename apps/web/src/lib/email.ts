import 'server-only';
/**
 * Correo transaccional por SMTP (cuenta de correo del cPanel, p. ej. hola@cafetravesia.co,
 * o cualquier SMTP: Brevo, SES, Resend SMTP…). Plantilla con la identidad de marca.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { brand, formatCOP } from '@travesia/shared';
import { env, isEmailConfigured } from '@/lib/env';
import { logEvent } from '@/lib/monitor';

let transporter: Transporter | null = null;
function tx() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user!, pass: env.smtp.pass! },
      pool: false,
      connectionTimeout: 10_000,
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string, opts: { replyTo?: string; text?: string } = {}) {
  if (!isEmailConfigured()) {
    await logEvent('email', 'send.skipped', 'ignored', { message: `${subject} → ${to} (SMTP sin configurar)` });
    return false;
  }
  const t0 = Date.now();
  try {
    const info = await tx().sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
      text: opts.text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      replyTo: opts.replyTo ?? env.smtp.replyTo,
    });
    await logEvent('email', 'send', 'ok', { message: subject, externalId: info.messageId, durationMs: Date.now() - t0 });
    return true;
  } catch (e) {
    await logEvent('email', 'send', 'error', { message: `${subject}: ${e instanceof Error ? e.message : e}` });
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Plantilla base del correo (tablas e inline styles para compatibilidad con clientes de correo). */
export function layout(opts: { title: string; preheader?: string; body: string; cta?: { label: string; href: string } }) {
  const c = brand.colors;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(opts.title)}</title></head>
<body style="margin:0;background:${c.crema};font-family:Helvetica,Arial,sans-serif;color:${c.tinta}">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader ?? '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.crema};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:${c.noche};padding:28px;text-align:center"><img src="${env.siteUrl}/brand/logo-claro.png" alt="${brand.name}" width="150" style="display:inline-block;height:auto"></td></tr>
<tr><td style="height:6px;background:${c.ambar}"></td></tr>
<tr><td style="padding:32px 32px 8px"><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:${c.noche}">${esc(opts.title)}</h1>
<div style="font-size:15px;line-height:1.65;color:#3a3a3a">${opts.body}</div></td></tr>
${opts.cta ? `<tr><td style="padding:12px 32px 32px"><a href="${opts.cta.href}" style="display:inline-block;background:${c.noche};color:${c.crema};text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;font-size:14px">${esc(opts.cta.label)}</a></td></tr>` : ''}
<tr><td style="padding:22px 32px;background:${c.arena};font-size:12px;color:#6b6560;line-height:1.6">${brand.claim}<br>${brand.origin} · <a href="${env.siteUrl}" style="color:${c.noche}">${brand.domain}</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function itemsTable(items: { name: string; variantName?: string | null; quantity: number; totalCop: number }[], totals: { label: string; value: number; strong?: boolean }[]) {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)}${i.variantName ? `<br><span style="color:#888;font-size:13px">${esc(i.variantName)}</span>` : ''}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">×${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${formatCOP(i.totalCop)}</td></tr>`,
    )
    .join('');
  const tot = totals
    .map((x) => `<tr><td colspan="2" style="padding:4px 0;text-align:right;${x.strong ? 'font-weight:bold' : 'color:#666'}">${x.label}</td><td style="padding:4px 0;text-align:right;${x.strong ? 'font-weight:bold' : ''}">${formatCOP(x.value)}</td></tr>`)
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}${tot}</table>`;
}

export { esc as escapeHtml };
