'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, ImagePlus, Link2, Loader2, Search, Trash2, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Dialog } from '../client-ui';
import { btn, inputCls } from '../ui';
import { ACCEPT_ATTR, fetchMedia, uploadToGateway, type MediaAsset } from './upload';

const isImage = (u: string) => /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i.test(u) || u.startsWith('data:image');

/** Campo de imagen reutilizable: elegir de la biblioteca, subir o pegar una URL. */
export function MediaPicker({ value, onChange, folder = 'general', label = 'Imagen', aspect = 'aspect-[4/3]', compact }: { value: string | null | undefined; onChange: (url: string | null) => void; folder?: string; label?: string; aspect?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={cn('group relative overflow-hidden rounded-xl border border-dashed border-noche/20 bg-crema/50', compact ? 'size-24' : aspect)}>
        {value ? (
          isImage(value) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-2 text-center text-[0.65rem] break-all text-gris">{value}</div>
          )
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-gris hover:text-noche">
            <ImagePlus className="size-5" />
            {compact ? null : `Elegir ${label.toLowerCase()}`}
          </button>
        )}
        {value ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-noche/70 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-white/90 px-2 py-1 text-[0.68rem] font-semibold text-noche">
              Cambiar
            </button>
            <button type="button" onClick={() => onChange(null)} className="rounded-md bg-white/90 p-1 text-cereza" aria-label="Quitar imagen">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      <MediaDialog open={open} onClose={() => setOpen(false)} folder={folder} onPick={(u) => { onChange(u); setOpen(false); }} />
    </div>
  );
}

export function MediaDialog({ open, onClose, onPick, folder }: { open: boolean; onClose: () => void; onPick: (url: string) => void; folder: string }) {
  const [tab, setTab] = useState<'lib' | 'upload' | 'url'>('lib');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssets((await fetchMedia(undefined, q || undefined)).assets);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar la biblioteca');
    } finally {
      setLoading(false);
    }
  }, [q]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && tab === 'lib') void load();
  }, [open, tab, load]);
  const upload = async (file?: File | null) => {
    if (!file) return;
    setProgress(0);
    try {
      const a = await uploadToGateway(file, folder, setProgress);
      toast.success('Imagen subida');
      onPick(a.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo subir');
    } finally {
      setProgress(null);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Elegir imagen" wide>
      <div className="mb-4 flex gap-1 rounded-lg bg-crema p-1 text-sm">
        {(
          [
            ['lib', 'Biblioteca'],
            ['upload', 'Subir'],
            ['url', 'URL'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn('flex-1 rounded-md px-3 py-1.5 font-medium', tab === k ? 'bg-white text-noche shadow-sm' : 'text-gris hover:text-noche')}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'lib' ? (
        <div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o texto alternativo…" className={cn(inputCls, 'pl-9')} />
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-noche/5" />
              ))}
            </div>
          ) : assets.length ? (
            <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
              {assets.map((a) => (
                <button key={a.id} type="button" onClick={() => onPick(a.url)} className="group relative aspect-square overflow-hidden rounded-lg border border-noche/10 bg-crema" title={a.alt ?? a.path}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isImage(a.url) ? <img src={a.url} alt={a.alt ?? ''} className="size-full object-cover transition group-hover:scale-105" loading="lazy" /> : <span className="p-2 text-[0.6rem] break-all">{a.path}</span>}
                  <span className="absolute inset-0 grid place-items-center bg-noche/50 opacity-0 transition group-hover:opacity-100">
                    <Check className="size-6 text-white" />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gris">La biblioteca está vacía. Sube tu primera imagen.</p>
          )}
        </div>
      ) : tab === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void upload(e.dataTransfer.files[0]);
          }}
          className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-14 text-center transition', drag ? 'border-ambar bg-ambar-100/50' : 'border-noche/15 bg-crema/40')}
        >
          {progress != null ? <Loader2 className="size-7 animate-spin text-ambar-700" /> : <UploadCloud className="size-7 text-ambar-700" />}
          <p className="text-sm font-medium text-noche">{progress != null ? `Subiendo… ${progress}%` : 'Arrastra una imagen aquí'}</p>
          <p className="text-xs text-gris">JPG, PNG, WebP, AVIF o SVG · máx. 15 MB · se guarda en tu hosting (media.cafetravesia.co)</p>
          <input ref={fileRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className={cn(btn.secondary, 'mt-2')} disabled={progress != null}>
            Elegir archivo
          </button>
          {progress != null ? (
            <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-noche/10">
              <div className="h-full bg-ambar transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gris">Pega una URL de tu dominio de medios o una ruta del sitio (por ejemplo /brand/fotos/latte-travesia.webp).</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://media.cafetravesia.co/…" className={cn(inputCls, 'pl-9')} />
            </div>
            <button type="button" className={btn.primary} disabled={!/^(https:\/\/|\/)/.test(url)} onClick={() => onPick(url.trim())}>
              Usar
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
