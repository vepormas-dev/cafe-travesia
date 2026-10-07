'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatClock } from '@travesia/shared';
import type { PlayerControls } from './video-player';

type Note = { id: string; atS: number; body: string; createdAt: string };

/** Notas personales con marca de tiempo clicable (CRUD → /api/v1/lessons/:id/notes). */
export function LessonNotes({ lessonId, controls, loggedIn, demo, loginHref }: { lessonId: string; controls: React.RefObject<PlayerControls | null>; loggedIn: boolean; demo: boolean; loginHref: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const url = `/api/v1/lessons/${lessonId}/notes`;

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = (await res.json()) as { notes?: Note[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'No pudimos cargar tus notas');
      setNotes(data.notes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus notas');
      setNotes([]);
    }
  }, [url]);

  useEffect(() => {
    if (loggedIn && !demo) void load();
  }, [load, loggedIn, demo]);

  if (demo)
    return (
      <p className="rounded-xl border border-ambar/30 bg-ambar/10 px-4 py-3 text-sm text-crema/85">
        <strong className="text-ambar-300">Modo demo.</strong> Las notas se guardan en tu cuenta cuando la base de datos está conectada.
      </p>
    );
  if (!loggedIn)
    return (
      <p className="text-sm text-crema/75">
        <Link href={loginHref} className="font-semibold text-ambar-300 underline underline-offset-4">
          Ingresa
        </Link>{' '}
        para tomar notas con marca de tiempo mientras ves la lección.
      </p>
    );

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const atS = Math.floor(controls.current?.time() ?? 0);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ atS, body }) });
      const data = (await res.json()) as { note?: Note; error?: string };
      if (!res.ok || !data.note) throw new Error(data.error ?? 'No pudimos guardar la nota');
      setNotes((n) => [...(n ?? []), data.note!].sort((a, b) => a.atS - b.atS));
      setBody('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos guardar la nota');
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!editing) return;
    const res = await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(editing) });
    if (!res.ok) return toast.error('No pudimos actualizar la nota');
    setNotes((n) => n?.map((x) => (x.id === editing.id ? { ...x, body: editing.body } : x)) ?? null);
    setEditing(null);
  };
  const remove = async (id: string) => {
    const prev = notes;
    setNotes((n) => n?.filter((x) => x.id !== id) ?? null);
    const res = await fetch(`${url}?noteId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      setNotes(prev);
      toast.error('No pudimos borrar la nota');
    }
  };

  return (
    <div>
      <form onSubmit={add} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <label htmlFor="nota" className="text-sm font-medium text-crema/85">
          Nueva nota
        </label>
        <textarea
          id="nota"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Escribe lo que no quieres olvidar… se guarda con el minuto actual del video."
          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-crema placeholder:text-crema/40 focus:border-ambar focus:ring-2 focus:ring-ambar/30 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-crema/50">
            <Clock className="size-3.5" aria-hidden /> Se guardará en el minuto actual
          </span>
          <button type="submit" disabled={busy || !body.trim()} className="btn-ambar btn-sm">
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Guardar nota
          </button>
        </div>
      </form>

      {error ? <p className="mt-4 text-sm text-[#f3a59c]">{error}</p> : null}
      {notes === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-crema/60">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando tus notas…
        </p>
      ) : notes.length === 0 ? (
        <p className="mt-5 text-sm text-crema/55">Aún no tienes notas en esta lección.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <button
                type="button"
                onClick={() => controls.current?.seek(n.atS)}
                disabled={!controls.current?.hasVideo}
                className="h-fit shrink-0 rounded-md bg-[#c9dfa4]/15 px-2 py-1 font-mono text-xs font-semibold text-[#c9dfa4] transition hover:bg-[#c9dfa4]/25 disabled:cursor-default"
                aria-label={`Ir al minuto ${formatClock(n.atS)}`}
              >
                {formatClock(n.atS)}
              </button>
              {editing?.id === n.id ? (
                <div className="flex-1">
                  <textarea
                    value={editing.body}
                    onChange={(e) => setEditing({ id: n.id, body: e.target.value })}
                    rows={3}
                    aria-label="Editar nota"
                    className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-crema focus:border-ambar focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={save} className="btn-ambar btn-sm">
                      Guardar
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="btn btn-sm text-crema/70 hover:text-crema">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm leading-relaxed whitespace-pre-wrap text-crema/85">{n.body}</p>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditing({ id: n.id, body: n.body })} className="rounded p-1.5 text-crema/50 hover:bg-white/10 hover:text-crema" aria-label="Editar nota">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => remove(n.id)} className="rounded p-1.5 text-crema/50 hover:bg-white/10 hover:text-[#f3a59c]" aria-label="Borrar nota">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
