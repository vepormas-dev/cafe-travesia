'use client';
/**
 * Asistente Travesía (burbuja flotante). Abre desde cualquier parte con:
 *   window.dispatchEvent(new CustomEvent('ct-chat-open', { detail: { message?: string } }))
 * Persiste sessionId/visitorId e historial corto en localStorage. Cuando un asesor toma la
 * conversación (status human_requested/human) consulta GET /api/chat cada 5 s.
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ChevronDown, Headset, MessageCircle, Sparkles, X } from 'lucide-react';
import type { ChatReplyDTO } from '@travesia/shared';
import { BrandIcon } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

type Msg = ChatReplyDTO['messages'][number];
type Status = ChatReplyDTO['status'];
type Stored = { sessionId: string | null; visitorId: string; status: Status; messages: Msg[] };

const KEY = 'ct-chat-v1';
const QUICK = ['Recomiéndame un café', 'Quiero suscribirme', '¿Dónde va mi pedido?', 'Hablar con un asesor'];
const WELCOME: Msg = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! ☕ Soy el **Asistente Travesía**. Te ayudo a elegir tu café, armar tu suscripción, encontrar un curso o revisar tu pedido. ¿Qué se te antoja hoy?',
  actions: null,
  createdAt: new Date(0).toISOString(),
};

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function load(): Stored {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    if (s?.visitorId) return { ...s, messages: (s.messages ?? []).slice(-40) };
  } catch {
    /* ignore */
  }
  return { sessionId: null, visitorId: uid(), status: 'bot', messages: [] };
}

/** Markdown mínimo y seguro: **negritas**, [texto](/ruta) y saltos de línea. */
function RichText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 ? <br /> : null}
          {line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
            const b = part.match(/^\*\*([^*]+)\*\*$/);
            if (b) return <strong key={i} className="font-semibold text-noche">{b[1]}</strong>;
            const l = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
            if (l) {
              const href = l[2]!;
              if (/^\/(?!\/)/.test(href))
                return (
                  <Link key={i} href={href} onClick={onNavigate} className="font-semibold text-noche underline decoration-ambar decoration-2 underline-offset-2 hover:text-ambar-700">
                    {l[1]}
                  </Link>
                );
              if (/^https:\/\//.test(href))
                return (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-noche underline decoration-ambar decoration-2 underline-offset-2">
                    {l[1]}
                  </a>
                );
              return <span key={i}>{l[1]}</span>;
            }
            return <Fragment key={i}>{part}</Fragment>;
          })}
        </Fragment>
      ))}
    </>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Stored>({ sessionId: null, visitorId: '', status: 'bot', messages: [] });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [ai, setAi] = useState(false);
  const [unread, setUnread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stateRef = useRef(state);
  const openRef = useRef(open);
  // Copia "más reciente" para los callbacks asíncronos (sondeo, envío); se actualiza tras cada render.
  useEffect(() => {
    stateRef.current = state;
    openRef.current = open;
  }, [state, open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- historial guardado en localStorage: solo existe en el navegador
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify({ ...state, messages: state.messages.slice(-40) }));
  }, [state, ready]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length, typing, open]);

  const merge = useCallback((incoming: Msg[], status?: Status, sessionId?: string) => {
    setState((s) => {
      const byId = new Map(s.messages.filter((m) => !m.id.startsWith('tmp-')).map((m) => [m.id, m]));
      let added = false;
      for (const m of incoming) {
        if (!byId.has(m.id)) added = true;
        byId.set(m.id, m);
      }
      if (added && !openRef.current && incoming.some((m) => m.role === 'agent')) setUnread(true);
      const messages = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { ...s, messages, status: status ?? s.status, sessionId: sessionId ?? s.sessionId };
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message) return;
      setError(null);
      setInput('');
      const tmp: Msg = { id: `tmp-${uid()}`, role: 'user', content: message, actions: null, createdAt: new Date().toISOString() };
      setState((s) => ({ ...s, messages: [...s.messages, tmp] }));
      const st = stateRef.current;
      const humanMode = st.status === 'human' || st.status === 'human_requested';
      if (!humanMode) setTyping(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: st.sessionId, visitorId: st.visitorId, message, channel: 'web', page: location.pathname }),
        });
        const data = (await res.json()) as ChatReplyDTO & { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'No pudimos enviar tu mensaje');
        setAi(data.ai);
        merge(data.messages, data.status, data.sessionId);
      } catch (e) {
        setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== tmp.id) }));
        setInput(message);
        setError(e instanceof Error ? e.message : 'No pudimos enviar tu mensaje');
      } finally {
        setTyping(false);
      }
    },
    [merge],
  );

  // Abrir desde cualquier parte
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      setUnread(false);
      const msg = (e as CustomEvent<{ message?: string } | undefined>).detail?.message;
      if (msg) setTimeout(() => send(msg), 60);
      else setTimeout(() => inputRef.current?.focus(), 60);
    };
    window.addEventListener('ct-chat-open', onOpen);
    return () => window.removeEventListener('ct-chat-open', onOpen);
  }, [send]);

  // Polling cuando atiende una persona
  useEffect(() => {
    if (!ready || !state.sessionId || state.sessionId.startsWith('demo-')) return;
    if (state.status !== 'human' && state.status !== 'human_requested') return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/chat?sessionId=${encodeURIComponent(state.sessionId!)}&visitorId=${encodeURIComponent(state.visitorId)}`, { cache: 'no-store' });
        if (res.status === 404) return setState((s) => ({ ...s, sessionId: null, status: 'bot' }));
        if (!res.ok) return;
        const data = (await res.json()) as ChatReplyDTO;
        merge(data.messages, data.status);
      } catch {
        /* reintenta en el siguiente ciclo */
      }
    };
    void tick();
    const h = setInterval(tick, 5000);
    return () => clearInterval(h);
  }, [ready, state.sessionId, state.status, state.visitorId, merge]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const messages = [WELCOME, ...state.messages];
  const human = state.status === 'human' || state.status === 'human_requested';
  const reset = () => setState((s) => ({ sessionId: null, visitorId: s.visitorId, status: 'bot', messages: [] }));

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[45] flex flex-col items-end sm:right-6 sm:bottom-6">
      {/* Panel */}
      <section
        id="ct-chat"
        role="dialog"
        aria-modal="false"
        aria-label="Asistente Travesía"
        hidden={!open}
        className={cn(
          'pointer-events-auto mb-3 flex w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-noche/10 bg-hueso shadow-elevada sm:w-[400px]',
          'h-[min(640px,calc(100dvh-6.5rem))]',
          open && 'animate-fade-up',
        )}
      >
        <header className="relative flex items-center gap-3 bg-noche px-5 py-4 text-crema">
          <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.07]" />
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-ambar text-noche ring-2 ring-crema/20">
            <BrandIcon name="granos" className="size-6" />
            <span className="absolute right-0 bottom-0 size-3 rounded-full bg-hoja ring-2 ring-noche" />
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-lg leading-tight">
              Asistente Travesía
              <span className="rounded-full bg-crema/10 px-1.5 py-0.5 font-sans text-[0.6rem] font-bold tracking-widest text-ambar-300" title={ai ? 'Respuestas con inteligencia artificial' : 'Asistente automático'}>
                IA
              </span>
            </p>
            <p className="text-xs text-crema/65">{human ? (state.status === 'human' ? 'Te atiende una persona del equipo' : 'Esperando a un asesor…') : 'En línea · responde al instante'}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="relative grid size-9 place-items-center rounded-full hover:bg-crema/10" aria-label="Minimizar asistente">
            <ChevronDown className="size-5" aria-hidden />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-crema/60 px-4 py-5" aria-live="polite" aria-relevant="additions">
          {messages.map((m) => {
            const mine = m.role === 'user';
            if (m.role === 'system')
              return (
                <div key={m.id} className="mx-auto max-w-[90%] rounded-2xl border border-ambar/30 bg-ambar-100/70 px-4 py-3 text-center text-[0.83rem] leading-relaxed text-noche">
                  <RichText text={m.content} onNavigate={() => setOpen(false)} />
                  {m.actions?.length ? <Actions msg={m} onSend={send} onNavigate={() => setOpen(false)} /> : null}
                </div>
              );
            return (
              <div key={m.id} className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}>
                {!mine ? (
                  <span aria-hidden className={cn('mt-1 grid size-7 shrink-0 place-items-center rounded-full', m.role === 'agent' ? 'bg-montana text-crema' : 'bg-noche text-ambar')}>
                    {m.role === 'agent' ? <Headset className="size-3.5" /> : <BrandIcon name="granos" className="size-4" />}
                  </span>
                ) : null}
                <div className={cn('max-w-[82%]', mine && 'items-end')}>
                  {m.role === 'agent' ? <p className="mb-1 text-[0.65rem] font-semibold tracking-wider text-montana uppercase">Asesor Travesía</p> : null}
                  <div className={cn('rounded-2xl px-4 py-2.5 text-[0.9rem] leading-relaxed', mine ? 'rounded-br-md bg-noche text-crema' : 'rounded-tl-md border border-noche/5 bg-hueso text-tinta shadow-suave', m.id.startsWith('tmp-') && 'opacity-70')}>
                    {mine ? m.content : <RichText text={m.content} onNavigate={() => setOpen(false)} />}
                  </div>
                  {!mine && m.actions?.length ? <Actions msg={m} onSend={send} onNavigate={() => setOpen(false)} /> : null}
                </div>
              </div>
            );
          })}
          {typing ? (
            <div className="flex items-center gap-2 text-xs text-gris" role="status">
              <span className="grid size-7 place-items-center rounded-full bg-noche text-ambar" aria-hidden>
                <BrandIcon name="granos" className="size-4" />
              </span>
              <span className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-hueso px-4 py-3 shadow-suave">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="size-1.5 animate-bounce rounded-full bg-noche/50" style={{ animationDelay: `${d}ms` }} />
                ))}
                <span className="ml-2">escribiendo…</span>
              </span>
            </div>
          ) : null}
        </div>

        {state.messages.length < 2 && !human ? (
          <div className="scrollbar-none flex gap-2 overflow-x-auto border-t border-noche/5 bg-hueso px-4 pt-3">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="chip shrink-0 bg-white py-1.5 transition hover:border-noche hover:bg-noche hover:text-crema">
                {q === 'Hablar con un asesor' ? <Headset className="size-3.5" aria-hidden /> : q === 'Recomiéndame un café' ? <Sparkles className="size-3.5" aria-hidden /> : null}
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="bg-cereza/10 px-4 py-2 text-xs text-cereza">{error}</p> : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 bg-hueso px-4 py-3"
        >
          <label htmlFor="ct-chat-input" className="sr-only">
            Escribe tu mensaje
          </label>
          <textarea
            ref={inputRef}
            id="ct-chat-input"
            rows={1}
            value={input}
            maxLength={1500}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={human ? 'Escríbele al asesor…' : 'Pregunta lo que quieras…'}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-noche/15 bg-white px-4 py-2.5 text-[0.92rem] focus:border-noche focus:ring-2 focus:ring-ambar/40 focus:outline-none"
          />
          <button type="submit" disabled={!input.trim() || typing} className="grid size-11 shrink-0 place-items-center rounded-full bg-noche text-crema transition hover:bg-noche-800 disabled:opacity-40" aria-label="Enviar mensaje">
            <ArrowUp className="size-5" aria-hidden />
          </button>
        </form>
        <p className="flex items-center justify-between bg-hueso px-5 pb-2.5 text-[0.65rem] text-gris">
          <span>Asistente con IA: puede equivocarse.</span>
          {state.messages.length ? (
            <button type="button" onClick={reset} className="underline-offset-2 hover:text-noche hover:underline">
              Nueva conversación
            </button>
          ) : null}
        </p>
      </section>

      {/* Burbuja */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setUnread(false);
          setTimeout(() => inputRef.current?.focus(), 60);
        }}
        aria-expanded={open}
        aria-controls="ct-chat"
        aria-label={open ? 'Cerrar asistente' : 'Abrir Asistente Travesía'}
        className="group pointer-events-auto relative flex items-center gap-3 rounded-full bg-noche py-2 pr-2 pl-2 text-crema shadow-elevada ring-1 ring-crema/10 transition hover:-translate-y-0.5 hover:bg-noche-800 sm:pl-5"
      >
        <span className="hidden text-sm font-semibold sm:inline">{open ? 'Cerrar' : '¿Te ayudo a elegir?'}</span>
        <span className="relative grid size-12 place-items-center rounded-full bg-ambar text-noche transition group-hover:rotate-6">
          {open ? <X className="size-5" aria-hidden /> : <MessageCircle className="size-5" aria-hidden />}
          {unread ? <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-cereza ring-2 ring-noche" aria-label="Mensaje nuevo" /> : null}
        </span>
      </button>
    </div>
  );
}

function Actions({ msg, onSend, onNavigate }: { msg: Msg; onSend: (t: string) => void; onNavigate: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {msg.actions!.map((a, i) => {
        const cls = cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
          i === 0 && a.type !== 'human' ? 'border-noche bg-noche text-crema hover:bg-noche-800' : 'border-noche/20 bg-white text-noche hover:border-noche',
        );
        if (a.type === 'human' || !a.href)
          return (
            <button key={i} type="button" className={cls} onClick={() => onSend(a.type === 'human' ? 'Hablar con un asesor' : a.label)}>
              {a.type === 'human' ? <Headset className="size-3.5" aria-hidden /> : null}
              {a.label}
            </button>
          );
        if (/^https:\/\//.test(a.href))
          return (
            <a key={i} href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>
              {a.label}
            </a>
          );
        return (
          <Link key={i} href={a.href} onClick={onNavigate} className={cls}>
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
