'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { embedUrl } from './video-utils';

/** Botón de play sobre la portada que abre el trailer en un diálogo. */
export function TrailerButton({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  const iframe = embedUrl(url);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group absolute inset-0 flex items-center justify-center focus-visible:outline-none"
        aria-label={`Ver trailer de ${title}`}
      >
        <span className="flex size-20 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-elevada backdrop-blur-md transition group-hover:scale-105 group-hover:bg-white/25 group-focus-visible:ring-4 group-focus-visible:ring-ambar">
          <Play className="size-8 translate-x-0.5 fill-white" aria-hidden />
        </span>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-noche-950/70 px-3 py-1 text-xs font-semibold tracking-wide text-crema">Ver trailer</span>
      </button>
      <dialog ref={ref} onClose={() => setOpen(false)} className="m-auto w-[min(960px,94vw)] overflow-hidden rounded-2xl bg-black p-0 backdrop:bg-noche-950/85">
        <button type="button" onClick={() => setOpen(false)} className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white" aria-label="Cerrar trailer">
          <X className="size-5" aria-hidden />
        </button>
        {open ? (
          <div className="aspect-video">
            {iframe ? (
              <iframe src={`${iframe}&autoplay=1`} title={`Trailer: ${title}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="size-full" />
            ) : (
              <video src={url} controls autoPlay playsInline className="size-full" />
            )}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
