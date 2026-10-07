'use client';
/** Piezas de formulario compartidas: Markdown con vista previa, vista previa SEO de Google, color, secciones. */
import { useState } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { Markdown } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { inputCls } from './ui';

export function Section({ title, description, actions, children, id }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-noche/[0.08] bg-white shadow-[0_1px_2px_rgba(17,26,49,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-noche/[0.06] px-5 py-3.5">
        <div>
          <h2 className="font-sans text-[0.95rem] font-semibold text-noche">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-gris">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function MarkdownField({ value, onChange, rows = 8, placeholder, live }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; live?: boolean }) {
  const [preview, setPreview] = useState(false);
  if (live)
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={cn(inputCls, 'font-mono text-[0.82rem] leading-relaxed')} />
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-noche/10 bg-hueso p-4" style={{ minHeight: `${rows * 1.6}rem` }}>
          {value ? <Markdown className="prose-sm sm:prose-base">{value}</Markdown> : <p className="text-sm text-gris">La vista previa aparece aquí.</p>}
        </div>
      </div>
    );
  return (
    <div>
      <div className="mb-1.5 flex justify-end gap-1">
        <button type="button" onClick={() => setPreview(false)} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.7rem] font-medium', !preview ? 'bg-noche text-crema' : 'text-gris hover:text-noche')}>
          <Pencil className="size-3" /> Escribir
        </button>
        <button type="button" onClick={() => setPreview(true)} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.7rem] font-medium', preview ? 'bg-noche text-crema' : 'text-gris hover:text-noche')}>
          <Eye className="size-3" /> Vista previa
        </button>
      </div>
      {preview ? (
        <div className="rounded-lg border border-noche/10 bg-hueso p-4" style={{ minHeight: `${rows * 1.5}rem` }}>
          {value ? <Markdown className="prose-sm">{value}</Markdown> : <p className="text-sm text-gris">Nada que mostrar aún.</p>}
        </div>
      ) : (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder ?? 'Admite Markdown: **negrita**, ## subtítulos, listas…'} className={cn(inputCls, 'font-mono text-[0.82rem] leading-relaxed')} />
      )}
    </div>
  );
}

export function GooglePreview({ title, description, path }: { title: string; description: string; path: string }) {
  return (
    <div className="rounded-xl border border-noche/10 bg-white p-4 font-[arial,sans-serif]">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-crema text-[0.7rem] font-bold text-noche">CT</span>
        <div className="leading-tight">
          <p className="text-[0.8rem] text-[#202124]">Café Travesía</p>
          <p className="text-[0.72rem] text-[#4d5156]">https://cafetravesia.com{path}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-[1.15rem] text-[#1a0dab]">{title || 'Título de la página'}</p>
      <p className="mt-0.5 line-clamp-2 text-[0.85rem] leading-snug text-[#4d5156]">{description || 'Escribe una descripción atractiva de máximo 155 caracteres para Google.'}</p>
    </div>
  );
}

export function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <p className="mb-1 text-[0.8rem] font-medium text-noche/80">{label}</p>
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-noche/15 shadow-inner" style={{ background: value || '#ffffff' }}>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#111a31'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label} />
        </label>
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, 'font-mono uppercase')} placeholder="#111A31" maxLength={7} />
      </div>
    </div>
  );
}

export const BRAND_SWATCHES = ['#111A31', '#1E2A4A', '#4D6630', '#7C9A4E', '#3A2418', '#5B3A26', '#B23A2E', '#EB9A37', '#C4741A', '#F5C27A', '#EFE6D6', '#F8F3EA'];
export function Swatches({ onPick }: { onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BRAND_SWATCHES.map((c) => (
        <button key={c} type="button" onClick={() => onPick(c)} title={c} className="size-6 rounded-md border border-noche/10 transition hover:scale-110" style={{ background: c }} />
      ))}
    </div>
  );
}

export { toBogotaLocal } from '@/lib/admin/range';
