'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bot, CheckCheck, CornerDownLeft, Headset, Loader2, MessageSquareOff, Send, Smartphone, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { chatCopilot, replyChat, setChatStatus } from '@/lib/admin/actions/ops';
import { CHAT_STATUS_LABEL, CHAT_STATUS_TONE } from '@/lib/admin/labels';
import type { ChatSummary } from '@/lib/admin/data/ops';
import { Avatar, Badge, btn, inputCls, relTime } from '../ui';

type Msg = { id: string; role: string; content: string; createdAt: string };
type Copilot = { summary: string; intent: string; sentiment: string; suggestedReply: string };

export function ChatConsole({ initialSessions, initialSelected, initialMessages }: { initialSessions: ChatSummary[]; initialSelected: string | null; initialMessages: Msg[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessions, setSessions] = useState(initialSessions);
  const [sel, setSel] = useState<string | null>(initialSelected);
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [text, setText] = useState('');
  const [copilot, setCopilot] = useState<Copilot | null>(null);
  const [sending, startSend] = useTransition();
  const [coPending, startCo] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const current = sessions.find((s) => s.id === sel) ?? null;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/chat?${new URLSearchParams({ ...(filter === 'all' ? { status: 'all' } : {}), ...(sel ? { s: sel } : {}) })}`, { cache: 'no-store' });
      if (!res.ok) return;
      const d = (await res.json()) as { sessions: ChatSummary[]; messages: Msg[] };
      setSessions(d.sessions);
      if (sel) setMsgs(d.messages);
    } catch {
      /* red intermitente */
    }
  }, [filter, sel]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [msgs.length, sel]);

  const open = (id: string) => {
    setSel(id);
    setCopilot(null);
    setMsgs([]);
    router.replace(`${pathname}?s=${id}`, { scroll: false });
  };
  const send = () => {
    if (!sel || !text.trim()) return;
    const content = text.trim();
    startSend(async () => {
      const r = await replyChat(sel, content);
      if (r.ok) {
        setText('');
        setMsgs((m) => [...m, { id: crypto.randomUUID(), role: 'agent', content, createdAt: new Date().toISOString() }]);
        void refresh();
      } else (r.demo ? toast.info : toast.error)(r.message);
    });
  };
  const status = (s: 'bot' | 'closed' | 'human') =>
    startSend(async () => {
      const r = await setChatStatus(sel!, s);
      if (r.ok) {
        toast.success(r.message);
        void refresh();
      } else (r.demo ? toast.info : toast.error)(r.message);
    });

  const waiting = sessions.filter((s) => s.status === 'human_requested').length;
  return (
    <div className="grid h-[calc(100dvh-15.5rem)] min-h-[520px] overflow-hidden rounded-xl border border-noche/[0.08] bg-white lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_300px]">
      {/* Bandeja */}
      <aside className="flex min-h-0 flex-col border-r border-noche/[0.06]">
        <div className="flex items-center justify-between border-b border-noche/[0.06] px-4 py-3">
          <p className="text-sm font-semibold text-noche">Bandeja {waiting ? <Badge tone="danger" className="ml-1">{waiting} esperando</Badge> : null}</p>
          <div className="flex rounded-md bg-crema p-0.5 text-[0.7rem]">
            {(['open', 'all'] as const).map((f) => <button key={f} type="button" onClick={() => setFilter(f)} className={cn('rounded px-2 py-0.5 font-medium', filter === f ? 'bg-white text-noche shadow-sm' : 'text-gris')}>{f === 'open' ? 'Abiertas' : 'Todas'}</button>)}
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {sessions.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => open(s.id)} className={cn('flex w-full gap-3 border-b border-noche/[0.04] px-4 py-3 text-left transition', sel === s.id ? 'bg-crema' : 'hover:bg-crema/50', s.status === 'human_requested' && sel !== s.id && 'bg-rose-50/60')}>
                <Avatar name={s.name ?? 'Visitante'} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-noche">{s.name ?? s.email ?? 'Visitante'}</span>
                    <span className="shrink-0 text-[0.65rem] text-gris">{relTime(s.lastMessageAt)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-gris">{s.preview.replace(/\*\*/g, '')}</span>
                  <span className="mt-1 flex items-center gap-1.5"><Badge tone={CHAT_STATUS_TONE[s.status]} dot>{CHAT_STATUS_LABEL[s.status]}</Badge>{s.channel === 'app' ? <Smartphone className="size-3 text-gris" /> : null}</span>
                </span>
              </button>
            </li>
          ))}
          {!sessions.length ? <li className="p-6 text-center text-sm text-gris">Sin conversaciones abiertas.</li> : null}
        </ul>
      </aside>

      {/* Conversación */}
      <section className="flex min-h-0 flex-col">
        {current ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-noche/[0.06] px-4 py-2.5">
              <div className="min-w-[10rem] flex-1">
                <p className="truncate text-sm font-semibold text-noche">{current.name ?? 'Visitante'} <span className="font-normal text-gris">{current.email}</span></p>
                <p className="text-[0.68rem] text-gris">{current.channel === 'app' ? 'App' : 'Web'} · se actualiza cada 5 s</p>
              </div>
              <Badge tone={CHAT_STATUS_TONE[current.status]} dot>{CHAT_STATUS_LABEL[current.status]}</Badge>
              {current.status !== 'human' ? <button type="button" className={cn(btn.secondary, btn.sm)} onClick={() => status('human')}><Headset className="size-3.5" /> Tomar</button> : null}
              {current.status !== 'bot' && current.status !== 'closed' ? <button type="button" className={cn(btn.secondary, btn.sm)} onClick={() => status('bot')}><Bot className="size-3.5" /> Devolver a IA</button> : null}
              {current.status !== 'closed' ? <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => status('closed')}><CheckCheck className="size-3.5" /> Cerrar</button> : null}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#FBF8F2,#F6F1E7)] px-4 py-4">
              {msgs.map((m) =>
                m.role === 'system' ? (
                  <p key={m.id} className="text-center text-[0.68rem] text-gris">— {m.content} —</p>
                ) : (
                  <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                    {m.role === 'user' ? <span className="mt-auto grid size-7 shrink-0 place-items-center rounded-full bg-white text-gris shadow-sm"><User className="size-3.5" /></span> : null}
                    <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm', m.role === 'user' ? 'rounded-bl-sm bg-white text-noche' : m.role === 'agent' ? 'rounded-br-sm bg-noche text-crema' : 'rounded-br-sm border border-ambar/30 bg-ambar-100 text-noche')}>
                      <p className="mb-0.5 text-[0.62rem] font-semibold tracking-wide uppercase opacity-60">{m.role === 'user' ? 'Cliente' : m.role === 'agent' ? 'Asesor' : 'Asistente IA'}</p>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className="mt-1 text-right text-[0.6rem] opacity-50">{relTime(m.createdAt)}</p>
                    </div>
                  </div>
                ),
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t border-noche/[0.06] p-3">
              <div className="flex gap-2">
                <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2} placeholder={current.status === 'closed' ? 'Conversación cerrada: escribir la reabre con un asesor' : 'Responde como asesor… (Enter envía, Shift+Enter salto de línea)'} className={cn(inputCls, 'resize-none')} />
                <button type="button" onClick={send} disabled={sending || !text.trim()} className={cn(btn.primary, 'self-end')} aria-label="Enviar">{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</button>
              </div>
              <p className="mt-1 text-[0.65rem] text-gris">El cliente lo ve en el chat de la web/app{current.userId ? ' y recibe una notificación push' : ''}.</p>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-center text-sm text-gris">
            <div><MessageSquareOff className="mx-auto mb-2 size-8 text-noche/20" />Elige una conversación de la bandeja.<br />Las que piden asesor aparecen primero.</div>
          </div>
        )}
      </section>

      {/* Copiloto */}
      <aside className="hidden min-h-0 flex-col border-l border-noche/[0.06] bg-crema/30 xl:flex">
        <div className="border-b border-noche/[0.06] px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-noche"><Sparkles className="size-4 text-ambar-700" /> Copiloto</p>
          <p className="text-[0.68rem] text-gris">Resumen, intención y respuesta sugerida</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {current ? (
            <>
              <button type="button" disabled={coPending} onClick={() => startCo(async () => { const r = await chatCopilot(current.id); if (r.ok && r.data) setCopilot(r.data); else toast.error(r.message); })} className={cn(btn.ai, 'w-full')}>
                {coPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-ambar-700" />} {copilot ? 'Actualizar' : 'Analizar conversación'}
              </button>
              {copilot ? (
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg bg-white p-3"><p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-gris uppercase">Resumen</p><p className="text-noche">{copilot.summary}</p></div>
                  <div className="flex gap-2"><Badge tone="noche">{copilot.intent}</Badge><Badge tone={copilot.sentiment === 'negativo' ? 'danger' : copilot.sentiment === 'positivo' ? 'success' : 'neutral'}>{copilot.sentiment}</Badge></div>
                  <div className="rounded-lg border border-ambar/30 bg-white p-3">
                    <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-gris uppercase">Respuesta sugerida</p>
                    <p className="text-noche">{copilot.suggestedReply}</p>
                    <button type="button" onClick={() => setText(copilot.suggestedReply)} className={cn(btn.secondary, btn.sm, 'mt-2')}><CornerDownLeft className="size-3.5" /> Insertar</button>
                  </div>
                </div>
              ) : <p className="text-xs text-gris">Pide al copiloto un resumen antes de responder: detecta la intención, el tono y te propone qué decir.</p>}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
