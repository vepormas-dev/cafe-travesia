'use client';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import Image from 'next/image';
import { Film, RotateCcw, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { detectProvider, embedUrl, type VideoProvider } from './video-utils';

export type PlayerControls = { hasVideo: boolean; seek(s: number): void; toggle(): void; skip(delta: number): void; time(): number; playing(): boolean };

type Props = {
  src: string | null;
  provider: VideoProvider;
  poster: string | null;
  title: string;
  startAt?: number;
  controlsRef?: React.Ref<PlayerControls>;
  onTime?: (t: number, duration: number) => void;
  onPause?: (t: number) => void;
  onPlayChange?: (playing: boolean) => void;
  onEnded?: () => void;
  emptyHint?: React.ReactNode;
};

/**
 * Reproductor: <video> nativo (MP4 / HLS con hls.js cargado bajo demanda si el navegador no
 * soporta HLS nativo), YouTube/Vimeo por iframe y un póster elegante si aún no hay video.
 */
export function VideoPlayer({ src, provider, poster, title, startAt = 0, controlsRef, onTime, onPause, onPlayChange, onEnded, emptyHint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const kind = src ? detectProvider(src, provider) : null;
  const iframe = src && (kind === 'youtube' || kind === 'vimeo') ? embedUrl(src, kind, startAt) : null;
  const native = Boolean(src && !iframe && kind !== 'youtube' && kind !== 'vimeo');

  useImperativeHandle(
    controlsRef,
    () => ({
      hasVideo: native,
      seek: (s) => {
        const v = videoRef.current;
        if (v) {
          v.currentTime = Math.max(0, Math.min(s, v.duration || s));
          void v.play().catch(() => undefined);
        }
      },
      toggle: () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) void v.play().catch(() => undefined);
        else v.pause();
      },
      skip: (d) => {
        const v = videoRef.current;
        if (v) v.currentTime = Math.max(0, Math.min((v.currentTime || 0) + d, v.duration || Infinity));
      },
      time: () => videoRef.current?.currentTime ?? 0,
      playing: () => Boolean(videoRef.current && !videoRef.current.paused),
    }),
    [native],
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src || !native) return;
    setError(null);
    let destroyed = false;
    let hls: { destroy(): void } | null = null;
    const isHls = kind === 'hls' || /\.m3u8(\?|$)/i.test(src);
    if (isHls && !v.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (destroyed) return;
          if (!Hls.isSupported()) {
            v.src = src;
            return;
          }
          const h = new Hls({ startPosition: startAt > 5 ? startAt : -1, capLevelToPlayerSize: true });
          h.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) setError('No pudimos cargar el video. Revisa tu conexión e inténtalo de nuevo.');
          });
          h.loadSource(src);
          h.attachMedia(v);
          hls = h;
        })
        .catch(() => setError('No pudimos cargar el reproductor de video.'));
    } else {
      v.src = src;
    }
    return () => {
      destroyed = true;
      hls?.destroy();
    };
    // startAt solo aplica al montar la lección
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, native, kind]);

  if (!src) {
    return (
      <div role="status" aria-label="Contenido en preparación" className="relative aspect-video w-full overflow-hidden bg-black">
        {poster ? <Image src={poster} alt="" fill sizes="(min-width: 1024px) 70vw, 100vw" className="scale-105 object-cover opacity-45 blur-[2px]" priority /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#120c0a] via-[#120c0a]/60 to-[#120c0a]/30" aria-hidden />
        <div className="bg-andino absolute inset-0 opacity-[0.06]" aria-hidden />
        <div className="relative flex h-full items-center justify-center p-5">
          <div className="max-w-md rounded-2xl border border-white/15 bg-black/40 px-6 py-5 text-center backdrop-blur-md">
            <Film className="mx-auto size-8 text-ambar-300" aria-hidden />
            <p className="mt-2 text-[0.68rem] font-semibold tracking-[0.18em] text-ambar-300 uppercase">Contenido en preparación</p>
            <p className="mt-2 font-display text-xl text-crema sm:text-2xl">El video de esta lección se publicará pronto</p>
            <div className="mt-2 text-sm text-crema/70">{emptyHint ?? 'Mientras tanto, lee el resumen de la lección y pregúntale al tutor.'}</div>
          </div>
        </div>
      </div>
    );
  }

  if (iframe) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <iframe src={iframe} title={title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen loading="lazy" className="absolute inset-0 size-full" />
      </div>
    );
  }

  return (
    <div className="group relative aspect-video w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        aria-label={`Video: ${title}`}
        className="absolute inset-0 size-full"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (startAt > 5 && startAt < (v.duration || 0) - 5 && v.currentTime < 1) v.currentTime = startAt;
        }}
        onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
        onPlay={() => onPlayChange?.(true)}
        onPause={(e) => {
          onPlayChange?.(false);
          onPause?.(e.currentTarget.currentTime);
        }}
        onEnded={() => onEnded?.()}
        onError={() => setError('No pudimos reproducir este video.')}
      />
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-between px-3 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button type="button" onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)} className="pointer-events-auto rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70" aria-label="Retroceder 10 segundos">
          <RotateCcw className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={() => videoRef.current && (videoRef.current.currentTime += 10)} className="pointer-events-auto rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70" aria-label="Adelantar 10 segundos">
          <RotateCw className="size-5" aria-hidden />
        </button>
      </div>
      {error ? <p className={cn('absolute inset-x-4 bottom-16 rounded-lg bg-cereza/90 px-3 py-2 text-center text-sm text-white')}>{error}</p> : null}
    </div>
  );
}
