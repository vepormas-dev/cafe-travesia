'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Video del hero: muted + loop + playsInline. Arranca solo si el usuario NO pidió reducir
 * movimiento (en ese caso se queda el póster) y ofrece pausar (WCAG 2.2.2).
 */
export function HeroVideo({ src, poster, className, label }: { src: string; poster: string; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (mq.matches) {
        v.pause();
        setPlaying(false);
      } else
        v.play()
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().then(() => setPlaying(true));
    else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <video ref={ref} muted loop playsInline preload="metadata" poster={poster} aria-label={label} className="absolute inset-0 size-full object-cover">
        <source src={src} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 bottom-4 z-10 grid size-10 place-items-center rounded-full border border-crema/30 bg-noche/40 text-crema backdrop-blur transition hover:bg-noche/70"
        aria-label={playing ? 'Pausar video' : 'Reproducir video'}
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
