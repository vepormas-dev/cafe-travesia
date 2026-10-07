'use client';
/** Piezas interactivas del panel: filtros en la URL, confirmaciones, switches, chips, diálogos. */
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ActionState } from '@/lib/admin/action-state';
import { btn, inputCls, labelCls, selectCls } from './ui';

/** Muestra un toast cada vez que cambia el estado de una acción. */
export function useActionToast(state: ActionState, onOk?: (s: ActionState) => void) {
  const last = useRef(0);
  useEffect(() => {
    if (!state.ts || state.ts === last.current) return;
    last.current = state.ts;
    if (state.ok) {
      toast.success(state.message || 'Listo');
      onOk?.(state);
    } else if (state.demo) toast.info(state.message);
    else toast.error(state.message || 'Revisa los campos marcados');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

/** Ejecuta una acción "suelta" (botones) con toast y estado de carga. */
export function useRunAction() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionState>, opts: { refresh?: boolean; onOk?: (s: ActionState) => void } = {}) =>
    start(async () => {
      try {
        const s = await fn();
        if (s.ok) {
          toast.success(s.message || 'Listo');
          opts.onOk?.(s);
          if (opts.refresh !== false) router.refresh();
        } else if (s.demo) toast.info(s.message);
        else toast.error(s.message);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ocurrió un error');
      }
    });
  return { pending, run };
}

export function SubmitButton({ children, className, pendingText = 'Guardando…', variant = 'primary', disabled }: { children: ReactNode; className?: string; pendingText?: string; variant?: 'primary' | 'ambar' | 'secondary' | 'danger'; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={cn(btn[variant], className)}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </button>
  );
}

export function FieldError({ errors, name }: { errors?: Record<string, string[]>; name: string }) {
  const e = errors?.[name];
  return e?.length ? <p className="mt-1 text-xs text-cereza">{e[0]}</p> : null;
}

export function Field({ label, name, errors, hint, children, className, counter }: { label: ReactNode; name?: string; errors?: Record<string, string[]>; hint?: ReactNode; children: ReactNode; className?: string; counter?: { value: number; max: number } }) {
  const err = name ? errors?.[name]?.[0] : undefined;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label className={labelCls} htmlFor={name}>
          {label}
        </label>
        {counter ? <span className={cn('text-[0.68rem] tabular-nums', counter.value > counter.max ? 'font-semibold text-cereza' : 'text-gris')}>{counter.value}/{counter.max}</span> : null}
      </div>
      <div className={cn(err && '[&_input]:border-cereza [&_select]:border-cereza [&_textarea]:border-cereza')}>{children}</div>
      {err ? <p className="mt-1 text-xs text-cereza">{err}</p> : hint ? <p className="mt-1 text-xs text-gris">{hint}</p> : null}
    </div>
  );
}

/** Actualiza searchParams (filtros persistidos en la URL). */
export function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    const q = next.toString();
    start(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
  };
  return { set, sp, pending };
}

export function SearchBox({ placeholder = 'Buscar…', param = 'q', className }: { placeholder?: string; param?: string; className?: string }) {
  const { set, sp, pending } = useQueryUpdater();
  const [v, setV] = useState(sp.get(param) ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div className={cn('relative min-w-[12rem] flex-1', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" />
      <input
        type="search"
        value={v}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => {
          setV(e.target.value);
          clearTimeout(timer.current);
          const val = e.target.value;
          timer.current = setTimeout(() => set({ [param]: val || null }), 300);
        }}
        className={cn(inputCls, 'pl-9')}
      />
      {pending ? <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-gris" /> : null}
    </div>
  );
}

export function SelectFilter({ param, options, label, className }: { param: string; options: { value: string; label: string }[]; label: string; className?: string }) {
  const { set, sp } = useQueryUpdater();
  return (
    <select aria-label={label} value={sp.get(param) ?? ''} onChange={(e) => set({ [param]: e.target.value || null })} className={cn(selectCls, 'w-auto min-w-[9rem]', className)}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DateFilter({ param, label }: { param: string; label: string }) {
  const { set, sp } = useQueryUpdater();
  return <input type="date" aria-label={label} title={label} value={sp.get(param) ?? ''} onChange={(e) => set({ [param]: e.target.value || null })} className={cn(inputCls, 'w-auto')} />;
}

export function ChipFilter({ param, options }: { param: string; options: { value: string; label: string; count?: number }[] }) {
  const { set, sp } = useQueryUpdater();
  const cur = sp.get(param) ?? '';
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => set({ [param]: o.value || null })} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition', cur === o.value ? 'border-noche bg-noche text-crema' : 'border-noche/15 bg-white text-noche/80 hover:border-noche/40')}>
          {o.label}
          {o.count != null ? <span className="ml-1 opacity-60 tabular-nums">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, name, disabled, description }: { checked: boolean; onChange?: (v: boolean) => void; label?: ReactNode; name?: string; disabled?: boolean; description?: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 select-none', disabled && 'cursor-not-allowed opacity-60')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn('relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-noche' : 'bg-noche/20')}
      >
        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', checked ? 'left-[1.15rem] bg-ambar-300' : 'left-0.5')} />
      </button>
      {name ? <input type="hidden" name={name} value={checked ? 'true' : 'false'} /> : null}
      {label ? (
        <span className="text-sm text-noche">
          {label}
          {description ? <span className="block text-xs text-gris">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

/** Entrada de chips (notas de cata, métodos, tags, ciudades…). */
export function ChipsInput({ value, onChange, placeholder = 'Escribe y presiona Enter', suggestions, max = 30 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: readonly string[]; max?: number }) {
  const [draft, setDraft] = useState('');
  const add = (s: string) => {
    const x = s.trim();
    if (!x || value.includes(x) || value.length >= max) return;
    onChange([...value, x]);
  };
  const left = suggestions?.filter((s) => !value.includes(s)) ?? [];
  return (
    <div>
      <div className={cn(inputCls, 'flex min-h-[2.4rem] flex-wrap items-center gap-1.5 py-1.5')}>
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-noche/[0.07] px-2 py-0.5 text-xs font-medium text-noche">
            {v}
            <button type="button" aria-label={`Quitar ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="text-gris hover:text-cereza">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => {
            if (draft) {
              add(draft);
              setDraft('');
            }
          }}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8rem] flex-1 border-0 bg-transparent p-0.5 text-sm outline-none focus:ring-0"
        />
      </div>
      {left.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {left.slice(0, 12).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-md border border-dashed border-noche/20 px-1.5 py-0.5 text-[0.7rem] text-gris hover:border-noche/50 hover:text-noche">
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Dialog({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-noche-950/50 backdrop-blur-[2px] animate-in fade-in" onClick={onClose} />
      <div className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-elevada sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-noche/[0.08] px-5 py-3.5">
          <h2 className="font-sans text-base font-semibold text-noche">{title}</h2>
          <button type="button" onClick={onClose} className={cn(btn.ghost, btn.icon)} aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-noche/[0.08] bg-crema/40 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Botón con confirmación para acciones destructivas o sensibles. */
export function ConfirmButton({ children, title = '¿Confirmas esta acción?', description, confirmLabel = 'Confirmar', onConfirm, className, danger = true, disabled }: { children: ReactNode; title?: string; description?: ReactNode; confirmLabel?: string; onConfirm: () => void | Promise<void>; className?: string; danger?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} className={className ?? (danger ? btn.danger : btn.secondary)} onClick={() => setOpen(true)}>
        {children}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              className={danger ? cn(btn.base, 'bg-cereza text-white hover:bg-cereza/90') : btn.primary}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                  setOpen(false);
                }
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {confirmLabel}
            </button>
          </>
        }
      >
        <div className="text-sm text-noche/80">{description ?? 'Esta acción no se puede deshacer.'}</div>
      </Dialog>
    </>
  );
}

export function CopyButton({ text, label = 'Copiar', className }: { text: string; label?: string; className?: string }) {
  return (
    <button
      type="button"
      className={className ?? cn(btn.secondary, btn.sm)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success('Copiado al portapapeles');
        } catch {
          toast.error('No se pudo copiar');
        }
      }}
    >
      {label}
    </button>
  );
}

/** Contenedor de lista editable genérica (filas reordenables). */
export function useListEditor<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  return {
    items,
    setItems,
    add: (x: T) => setItems((a) => [...a, x]),
    remove: (i: number) => setItems((a) => a.filter((_, j) => j !== i)),
    update: (i: number, patch: Partial<T>) => setItems((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x))),
    move: (i: number, dir: -1 | 1) =>
      setItems((a) => {
        const j = i + dir;
        if (j < 0 || j >= a.length) return a;
        const n = [...a];
        [n[i], n[j]] = [n[j]!, n[i]!];
        return n;
      }),
  };
}
