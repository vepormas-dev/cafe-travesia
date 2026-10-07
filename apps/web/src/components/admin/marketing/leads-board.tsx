'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, ChevronLeft, ChevronRight, Copy, Loader2, Mail, Phone, Sparkles } from 'lucide-react';
import { formatDateTime, LEAD_STATUS_LABEL } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { aiScoreLead, saveLeadNotes, setLeadStatus } from '@/lib/admin/actions/marketing';
import { LEAD_STATUS_TONE } from '@/lib/admin/labels';
import { Dialog, useRunAction } from '../client-ui';
import { Badge, Empty, Table, btn, inputCls, relTime, td, th, trHover } from '../ui';

export type LeadUI = { id: string; name: string; email: string; phone: string | null; company: string | null; source: string; interest: string | null; message: string | null; status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost'; score: number | null; notes: string | null; createdAt: string };
const COLS = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;
const COL_STYLE: Record<string, string> = { new: 'border-t-ambar', contacted: 'border-t-sky-400', qualified: 'border-t-noche', won: 'border-t-montana', lost: 'border-t-noche/20' };

export function LeadsBoard({ leads: initial, view }: { leads: LeadUI[]; view: 'kanban' | 'tabla' }) {
  const [leads, setLeads] = useState(initial);
  const [open, setOpen] = useState<LeadUI | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const router = useRouter();
  const moveTo = async (id: string, status: LeadUI['status']) => {
    const prev = leads;
    setLeads((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
    const r = await setLeadStatus(id, status);
    if (!r.ok) {
      if (!r.demo) setLeads(prev);
      (r.demo ? toast.info : toast.error)(r.message);
    } else {
      toast.success(`Movido a «${LEAD_STATUS_LABEL[status]}»`);
      router.refresh();
    }
  };
  if (!leads.length) return <Empty title="Aún no hay leads" text="Llegan desde los formularios de contacto, empresas y academia." />;
  return (
    <>
      {view === 'kanban' ? (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {COLS.map((col, ci) => {
            const items = leads.filter((l) => l.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => { e.preventDefault(); setOver(col); }}
                onDragLeave={() => setOver(null)}
                onDrop={() => { setOver(null); if (dragId) void moveTo(dragId, col); setDragId(null); }}
                className={cn('flex min-w-[14.5rem] flex-1 flex-col rounded-xl border border-t-4 border-noche/[0.08] bg-crema/50 transition', COL_STYLE[col], over === col && 'bg-ambar-100/60 ring-2 ring-ambar/40')}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <p className="text-sm font-semibold text-noche">{LEAD_STATUS_LABEL[col]}</p>
                  <span className="rounded-full bg-white px-2 text-xs font-semibold text-gris tabular-nums">{items.length}</span>
                </div>
                <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                  {items.map((l) => (
                    <article key={l.id} draggable onDragStart={() => setDragId(l.id)} onDragEnd={() => setDragId(null)} className={cn('cursor-grab rounded-lg border border-noche/[0.08] bg-white p-3 shadow-[0_1px_2px_rgba(17,26,49,0.05)] transition hover:shadow-md active:cursor-grabbing', dragId === l.id && 'opacity-50')}>
                      <button type="button" onClick={() => setOpen(l)} className="block w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-noche">{l.name}</p>
                          {l.score != null ? <span className={cn('rounded-md px-1.5 text-[0.68rem] font-bold tabular-nums', l.score >= 75 ? 'bg-emerald-100 text-emerald-800' : l.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-noche/5 text-gris')}>{l.score}</span> : null}
                        </div>
                        {l.company ? <p className="flex items-center gap-1 text-xs text-gris"><Building2 className="size-3" />{l.company}</p> : null}
                        <p className="mt-1 text-xs font-medium text-ambar-700">{l.interest ?? l.source}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-noche/70">{l.message}</p>
                      </button>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[0.65rem] text-gris">{relTime(l.createdAt)} · {l.source}</span>
                        <span className="flex">
                          <button type="button" aria-label="Mover a la izquierda" disabled={ci === 0} onClick={() => moveTo(l.id, COLS[ci - 1]!)} className="rounded p-0.5 text-gris hover:bg-noche/5 disabled:opacity-20"><ChevronLeft className="size-3.5" /></button>
                          <button type="button" aria-label="Mover a la derecha" disabled={ci === COLS.length - 1} onClick={() => moveTo(l.id, COLS[ci + 1]!)} className="rounded p-0.5 text-gris hover:bg-noche/5 disabled:opacity-20"><ChevronRight className="size-3.5" /></button>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table>
          <thead><tr><th className={th}>Lead</th><th className={th}>Interés</th><th className={th}>Fuente</th><th className={th}>Estado</th><th className={th}>Puntaje</th><th className={th}>Recibido</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className={cn(trHover, 'cursor-pointer')} onClick={() => setOpen(l)}>
                <td className={td}><p className="font-medium text-noche">{l.name}</p><p className="text-xs text-gris">{l.email}{l.company ? ` · ${l.company}` : ''}</p></td>
                <td className={cn(td, 'text-noche/80')}>{l.interest ?? '—'}</td>
                <td className={cn(td, 'text-gris')}>{l.source}</td>
                <td className={td}><Badge tone={LEAD_STATUS_TONE[l.status]} dot>{LEAD_STATUS_LABEL[l.status]}</Badge></td>
                <td className={cn(td, 'tabular-nums')}>{l.score ?? '—'}</td>
                <td className={cn(td, 'text-xs text-gris')}>{relTime(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {open ? <LeadDialog key={open.id} lead={leads.find((x) => x.id === open.id) ?? open} onClose={() => setOpen(null)} onMove={moveTo} onUpdate={(p) => setLeads((l) => l.map((x) => (x.id === open.id ? { ...x, ...p } : x)))} /> : null}
    </>
  );
}

function LeadDialog({ lead, onClose, onMove, onUpdate }: { lead: LeadUI; onClose: () => void; onMove: (id: string, s: LeadUI['status']) => void; onUpdate: (p: Partial<LeadUI>) => void }) {
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [ai, setAi] = useState<{ score: number; segment: string; nextStep: string; replyDraft: string } | null>(null);
  const [pendingAi, startAi] = useTransition();
  const { pending, run } = useRunAction();
  return (
    <Dialog open onClose={onClose} title={lead.name} wide>
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-noche hover:underline"><Mail className="size-4 text-gris" />{lead.email}</a>
            {lead.phone ? <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-noche hover:underline"><Phone className="size-4 text-gris" />{lead.phone}</a> : null}
            {lead.company ? <span className="inline-flex items-center gap-1.5 text-noche"><Building2 className="size-4 text-gris" />{lead.company}</span> : null}
          </div>
          <div className="rounded-lg bg-crema/70 p-3 text-sm text-noche">
            <p className="mb-1 text-xs font-semibold text-gris">{lead.interest ?? 'Mensaje'} · {lead.source} · {formatDateTime(lead.createdAt)}</p>
            {lead.message}
          </div>
          <div>
            <p className="mb-1 text-[0.8rem] font-medium text-noche/80">Notas internas</p>
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Llamada el martes, enviar cotización de 12 kg…" />
            <button type="button" disabled={pending || notes === (lead.notes ?? '')} onClick={() => run(() => saveLeadNotes(lead.id, notes), { onOk: () => onUpdate({ notes }) })} className={cn(btn.secondary, btn.sm, 'mt-1.5')}>Guardar notas</button>
          </div>
          {ai ? (
            <div className="rounded-xl border border-ambar/30 bg-ambar-100/40 p-4">
              <p className="text-sm font-semibold text-noche">Puntaje IA: {ai.score}/100 · {ai.segment}</p>
              <p className="mt-1 text-sm text-noche/80"><strong>Siguiente paso:</strong> {ai.nextStep}</p>
              <p className="mt-3 mb-1 text-xs font-semibold text-gris">Borrador de respuesta</p>
              <pre className="rounded-lg bg-white p-3 font-sans text-sm whitespace-pre-wrap text-noche">{ai.replyDraft}</pre>
              <div className="mt-2 flex gap-2">
                <button type="button" className={cn(btn.secondary, btn.sm)} onClick={async () => { await navigator.clipboard.writeText(ai.replyDraft); toast.success('Copiado'); }}><Copy className="size-3.5" /> Copiar</button>
                <a className={cn(btn.primary, btn.sm)} href={`mailto:${lead.email}?subject=${encodeURIComponent('Café Travesía · ' + (lead.interest ?? 'tu solicitud'))}&body=${encodeURIComponent(ai.replyDraft)}`}><Mail className="size-3.5" /> Abrir en correo</a>
              </div>
            </div>
          ) : null}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gris uppercase">Estado</p>
          <div className="grid gap-1.5">
            {COLS.map((s) => (
              <button key={s} type="button" onClick={() => onMove(lead.id, s)} className={cn('rounded-lg border px-3 py-2 text-left text-sm font-medium transition', lead.status === s ? 'border-noche bg-noche text-crema' : 'border-noche/10 hover:border-noche/30')}>{LEAD_STATUS_LABEL[s]}</button>
            ))}
          </div>
          <button type="button" disabled={pendingAi} onClick={() => startAi(async () => { const r = await aiScoreLead(lead.id); if (r.ok && r.data) { setAi(r.data); onUpdate({ score: r.data.score }); toast.success(r.message); } else (r.message.startsWith('Modo demo') ? toast.info : toast.error)(r.message); })} className={cn(btn.ai, 'w-full')}>
            {pendingAi ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-ambar-700" />} Calificar con IA
          </button>
          {lead.score != null ? <p className="text-center text-xs text-gris">Puntaje actual: <strong className="text-noche">{lead.score}</strong></p> : null}
        </div>
      </div>
    </Dialog>
  );
}
