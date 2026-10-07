'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Copy, FileText, Loader2, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { deleteMedia, updateMediaAlt } from '@/lib/admin/actions/content';
import { ConfirmButton, useRunAction } from '../client-ui';
import { Empty, btn, inputCls, selectCls } from '../ui';
import { ACCEPT_ATTR, uploadToGateway, type MediaAsset } from './upload';

type Job = { id: string; name: string; pct: number; state: 'up' | 'ok' | 'error'; error?: string };
const kb = (n: number | null) => (n == null ? '—' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export function MediaLibrary({ assets, folders, current }: { assets: MediaAsset[]; folders: { name: string; n: number }[]; current?: string }) {
  const router = useRouter();
  const [folder, setFolder] = useState(current || 'general');
  const [newFolder, setNewFolder] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const [sel, setSel] = useState<MediaAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = (newFolder.trim() || folder).toLowerCase().replace(/[^a-z0-9/_-]/g, '-');

  const uploadMany = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) return;
    const add = list.map((f) => ({ id: crypto.randomUUID(), name: f.name, pct: 0, state: 'up' as const }));
    setJobs((j) => [...add, ...j]);
    let okN = 0;
    await Promise.all(
      list.map(async (f, i) => {
        const id = add[i]!.id;
        try {
          await uploadToGateway(f, target, (pct) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, pct } : x))));
          okN++;
          setJobs((j) => j.map((x) => (x.id === id ? { ...x, pct: 100, state: 'ok' } : x)));
        } catch (e) {
          setJobs((j) => j.map((x) => (x.id === id ? { ...x, state: 'error', error: e instanceof Error ? e.message : 'Error' } : x)));
        }
      }),
    );
    if (okN) {
      toast.success(`${okN} archivo(s) subidos a ${target}`);
      router.refresh();
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-9">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void uploadMany(e.dataTransfer.files); }}
          className={cn('flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition sm:flex-row sm:text-left', drag ? 'border-ambar bg-ambar-100/60' : 'border-noche/15 bg-white')}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-ambar-100 text-ambar-700"><UploadCloud className="size-6" /></span>
          <div className="flex-1">
            <p className="font-medium text-noche">Arrastra imágenes, PDF o videos cortos aquí</p>
            <p className="text-xs text-gris">Se suben directo a tu hosting cPanel (sin límite de Vercel) · máx. 15 MB c/u · se guardan en la carpeta «{target}»</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={folder} onChange={(e) => setFolder(e.target.value)} className={cn(selectCls, 'w-36')} aria-label="Carpeta destino">
              {[...new Set(['general', 'productos', 'blog', 'sitio', 'academia', 'push', ...folders.map((f) => f.name)])].map((f) => <option key={f}>{f}</option>)}
            </select>
            <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="o nueva carpeta" className={cn(inputCls, 'w-36')} />
            <input ref={fileRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={(e) => e.target.files && void uploadMany(e.target.files)} />
            <button type="button" className={btn.primary} onClick={() => fileRef.current?.click()}>Elegir archivos</button>
          </div>
        </div>
        {jobs.length ? (
          <ul className="space-y-1.5 rounded-xl border border-noche/[0.08] bg-white p-3">
            {jobs.slice(0, 8).map((j) => (
              <li key={j.id} className="flex items-center gap-3 text-sm">
                {j.state === 'up' ? <Loader2 className="size-4 animate-spin text-ambar-700" /> : j.state === 'ok' ? <CheckCircle2 className="size-4 text-montana" /> : <XCircle className="size-4 text-cereza" />}
                <span className="w-48 truncate text-noche">{j.name}</span>
                {j.state === 'error' ? <span className="text-xs text-cereza">{j.error}</span> : <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-noche/[0.06]"><div className="h-full bg-ambar transition-[width]" style={{ width: `${j.pct}%` }} /></div>}
              </li>
            ))}
          </ul>
        ) : null}
        {assets.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {assets.map((a) => (
              <button key={a.id} type="button" onClick={() => setSel(a)} className={cn('group overflow-hidden rounded-xl border bg-white text-left transition hover:shadow-md', sel?.id === a.id ? 'border-ambar ring-2 ring-ambar/30' : 'border-noche/[0.08]')}>
                <div className="aspect-square overflow-hidden bg-crema">
                  {a.mime?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.alt ?? ''} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="grid size-full place-items-center text-gris"><FileText className="size-8" /></div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-noche">{a.alt || a.path.split('/').pop()}</p>
                  <p className="text-[0.65rem] text-gris">{a.folder} · {kb(a.sizeBytes)}{a.width ? ` · ${a.width}×${a.height}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        ) : <Empty title="La biblioteca está vacía" text="Sube tus fotos de producto, portadas del blog e imágenes del sitio." />}
      </div>
      <aside className="xl:col-span-3">
        <div className="xl:sticky xl:top-20">{sel ? <AssetPanel key={sel.id} a={sel} onDeleted={() => setSel(null)} /> : <div className="rounded-xl border border-dashed border-noche/15 p-6 text-center text-sm text-gris">Selecciona un archivo para editar su texto alternativo, copiar la URL o eliminarlo.</div>}</div>
      </aside>
    </div>
  );
}

function AssetPanel({ a, onDeleted }: { a: MediaAsset; onDeleted: () => void }) {
  const [alt, setAlt] = useState(a.alt ?? '');
  const { pending, run } = useRunAction();
  return (
    <div className="overflow-hidden rounded-xl border border-noche/[0.08] bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {a.mime?.startsWith('image/') ? <img src={a.url} alt={alt} className="aspect-[4/3] w-full bg-crema object-contain" /> : null}
      <div className="space-y-3 p-4">
        <div>
          <label className="mb-1 block text-[0.8rem] font-medium text-noche/80" htmlFor="alt">Texto alternativo (accesibilidad y SEO)</label>
          <textarea id="alt" rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} className={inputCls} />
          <button type="button" disabled={pending || alt === (a.alt ?? '')} onClick={() => run(() => updateMediaAlt(a.id, alt))} className={cn(btn.secondary, btn.sm, 'mt-1.5')}>Guardar alt</button>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-crema/70 px-2.5 py-2">
          <code className="min-w-0 flex-1 truncate text-[0.68rem]">{a.url}</code>
          <button type="button" aria-label="Copiar URL" onClick={async () => { await navigator.clipboard.writeText(a.url.startsWith('/') ? `${location.origin}${a.url}` : a.url); toast.success('URL copiada'); }} className={cn(btn.ghost, btn.icon)}><Copy className="size-3.5" /></button>
        </div>
        <dl className="grid grid-cols-2 gap-1 text-xs text-gris"><dt>Carpeta</dt><dd className="text-noche">{a.folder}</dd><dt>Tipo</dt><dd className="text-noche">{a.mime}</dd><dt>Tamaño</dt><dd className="text-noche">{kb(a.sizeBytes)}</dd>{a.width ? <><dt>Dimensiones</dt><dd className="text-noche">{a.width}×{a.height}</dd></> : null}</dl>
        <ConfirmButton className={cn(btn.danger, 'w-full')} title="¿Eliminar el archivo?" description="Se borra del hosting. Si está en uso en una página o producto, dejará de verse." confirmLabel="Eliminar" onConfirm={() => run(() => deleteMedia(a.id), { onOk: onDeleted })}><Trash2 className="size-4" /> Eliminar</ConfirmButton>
      </div>
    </div>
  );
}
