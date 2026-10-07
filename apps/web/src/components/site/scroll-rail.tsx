'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Carrusel horizontal accesible (scroll-snap nativo + flechas). */
export function ScrollRail({ children, label, className, dark }: { children: React.ReactNode; label: string; className?: string; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const btn = cn(
    'grid size-11 place-items-center rounded-full border transition disabled:opacity-30',
    dark ? 'border-crema/25 text-crema hover:bg-crema hover:text-noche' : 'border-noche/20 text-noche hover:bg-noche hover:text-crema',
  );

  return (
    <div className={className}>
      <div ref={ref} role="region" aria-label={label} tabIndex={0} className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-2 focus-visible:outline-none sm:-mx-8 sm:scroll-px-8 sm:px-8">
        {children}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={btn} onClick={() => go(-1)} disabled={edge.start} aria-label="Anterior">
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <button type="button" className={btn} onClick={() => go(1)} disabled={edge.end} aria-label="Siguiente">
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
