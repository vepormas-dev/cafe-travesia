import { cn } from '@/lib/cn';

/** Ilustraciones de línea (estilo "Nuestras tiendas" de Pergamino): barra en Florida y finca en Caicedo. */
export function StoreIllustration({ kind, className }: { kind: 'cafe' | 'finca' | string; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'finca')
    return (
      <svg viewBox="0 0 240 150" role="img" aria-label="Ilustración de la finca en Caicedo" className={cn('h-auto w-full text-noche', className)}>
        <g {...common}>
          <path d="M4 112 52 50l26 30 34-48 44 56 22-24 54 48" />
          <path d="M98 52l14-20 14 18" strokeDasharray="3 5" opacity=".6" />
          <path d="M140 92h52v40h-52z" />
          <path d="M134 94l32-24 32 24" />
          <path d="M160 132v-20h12v20M147 102h8v8h-8zM177 102h8v8h-8z" />
          <path d="M150 74v-9h6v4" />
          <path d="M4 132h232" />
          {[24, 52, 80, 108].map((x) => (
            <g key={x}>
              <path d={`M${x} 132v-18`} />
              <path d={`M${x} 118c-8-2-12-8-12-14 8 0 12 6 12 14zm0 0c8-2 12-8 12-14-8 0-12 6-12 14zM${x} 124c-6-1-10-5-10-10 6 0 10 4 10 10zm0 0c6-1 10-5 10-10-6 0-10 4-10 10z`} />
            </g>
          ))}
        </g>
        <g fill="#EB9A37">
          {[24, 52, 80, 108].map((x) => (
            <g key={x}>
              <circle cx={x - 3} cy={121} r={2} />
              <circle cx={x + 3} cy={127} r={2} />
            </g>
          ))}
          <circle cx="206" cy="30" r="9" opacity=".9" />
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label="Ilustración de nuestra barra en el Parque Comercial Florida" className={cn('h-auto w-full text-noche', className)}>
      <g {...common}>
        <path d="M20 140V44h200v96" />
        <path d="M12 44h216" />
        <path d="M28 20h184l16 24H12z" />
        <path d="M60 20v24M100 20v24M140 20v24M180 20v24" opacity=".7" />
        <path d="M12 44c0 9 7 14 16 14s16-5 16-14c0 9 7 14 16 14s16-5 16-14c0 9 7 14 16 14s16-5 16-14c0 9 7 14 16 14s16-5 16-14c0 9 7 14 16 14s16-5 16-14c0 9 7 14 16 14s16-5 16-14" />
        <path d="M34 72h68v46H34zM138 72h68v46h-68z" />
        <path d="M102 140V84h36v56" />
        <path d="M128 112v4" />
        <path d="M40 104h56M144 104h56" opacity=".55" />
        <path d="M52 104v-8a6 6 0 0 1 12 0v8M162 104l3-12h12l3 12" />
        <path d="M8 140h224" />
        <path d="M222 140v-26M222 120c-8-2-11-8-11-14 8 0 11 6 11 14zm0 0c8-2 11-8 11-14-8 0-11 6-11 14z" />
      </g>
      <rect x="84" y="2" width="72" height="14" rx="7" fill="#EB9A37" />
      <text x="120" y="12.5" textAnchor="middle" fontFamily="var(--font-dm-sans), sans-serif" fontSize="8" fontWeight="700" letterSpacing="1.5" fill="#111A31">
        TRAVESÍA
      </text>
      <path d="M71 96c0-3 2-5 5-5h6v8a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="#EB9A37" opacity=".85" />
    </svg>
  );
}
