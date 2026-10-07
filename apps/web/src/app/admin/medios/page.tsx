import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { HardDrive } from 'lucide-react';
import { staffPage } from '@/lib/admin/guard';
import { listMedia } from '@/lib/admin/data/content';
import { storageStats } from '@/lib/storage';
import { isStorageConfigured } from '@/lib/env';
import { flat, type SPromise } from '@/lib/admin/sp';
import { DemoBanner, PageHeader, PageSkeleton, Panel } from '@/components/admin/ui';
import { SearchBox } from '@/components/admin/client-ui';
import { MediaLibrary } from '@/components/admin/media/media-library';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Medios' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Media searchParams={searchParams} />
    </Suspense>
  );
}

const gb = (b: number) => (b > 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(1)} MB`);

async function Media({ searchParams }: { searchParams: SPromise }) {
  const { demo } = await staffPage('/admin/medios');
  const sp = flat(await searchParams);
  const [{ rows, folders }, stats] = await Promise.all([
    listMedia({ folder: sp.folder, q: sp.q, limit: 200 }),
    isStorageConfigured() ? storageStats().catch(() => null) : Promise.resolve(demo ? { bytes: 1_843_000_000, files: 412, freeBytes: 18_200_000_000 } : null),
  ]);
  const used = stats ? stats.bytes / (stats.bytes + (stats.freeBytes ?? stats.bytes)) : 0;
  return (
    <>
      <PageHeader eyebrow="Contenido" title="Biblioteca de medios" description="Imágenes y archivos servidos desde media.cafetravesia.co (disco del cPanel, caché de 1 año)." />
      {demo ? <DemoBanner>Ves las fotos de marca del sitio. Para subir archivos conecta la pasarela de medios (MEDIA_GATEWAY_URL / DB_GATEWAY_SECRET).</DemoBanner> : null}
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox placeholder="Buscar por nombre o alt…" />
            <div className="flex flex-wrap gap-1.5">
              <Link href="/admin/medios" className={cn('rounded-full border px-3 py-1 text-xs font-medium', !sp.folder ? 'border-noche bg-noche text-crema' : 'border-noche/15 bg-white text-noche/80')}>Todas</Link>
              {folders.map((f) => <Link key={f.name} href={`/admin/medios?folder=${encodeURIComponent(f.name)}`} className={cn('rounded-full border px-3 py-1 text-xs font-medium', sp.folder === f.name ? 'border-noche bg-noche text-crema' : 'border-noche/15 bg-white text-noche/80')}>{f.name} <span className="opacity-60">{f.n}</span></Link>)}
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-noche text-ambar-300"><HardDrive className="size-5" /></span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-noche">{stats ? `${gb(stats.bytes)} · ${stats.files.toLocaleString('es-CO')} archivos` : 'Uso no disponible'}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-noche/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-ambar to-ambar-700" style={{ width: `${Math.max(2, used * 100)}%` }} /></div>
              <p className="mt-1 text-[0.68rem] text-gris">{stats?.freeBytes ? `${gb(stats.freeBytes)} libres en el hosting` : 'Espacio libre desconocido'}</p>
            </div>
          </div>
        </Panel>
      </div>
      <MediaLibrary assets={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} folders={folders} current={sp.folder} />
    </>
  );
}
