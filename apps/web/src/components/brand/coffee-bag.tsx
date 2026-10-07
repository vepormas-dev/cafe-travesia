import { cn } from '@/lib/cn';

/**
 * Bolsa de café ilustrada (SVG) con el color de cada origen — inspirada en el
 * empaque por color de Pergamino. Se usa cuando el producto no tiene foto de estudio
 * o como pieza gráfica en hero/edición de temporada.
 */
export function CoffeeBag({
  color = '#111A31',
  accent = '#EB9A37',
  name,
  origin,
  className,
}: {
  color?: string | null;
  accent?: string | null;
  name: string;
  origin?: string | null;
  className?: string;
}) {
  const c = color ?? '#111A31';
  const a = accent ?? '#EB9A37';
  const light = isLight(c);
  const ink = light ? '#111A31' : '#F8F3EA';
  const id = `bag-${hash(name + c)}`;
  return (
    <svg viewBox="0 0 240 320" role="img" aria-label={`Bolsa de café ${name}`} className={cn('h-auto w-full drop-shadow-[0_24px_30px_rgba(17,26,49,0.28)]', className)}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.18" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <pattern id={`${id}-p`} width="24" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6 6 0l6 6-6 6zM12 6l6-6 6 6-6 6z" fill="none" stroke={a} strokeWidth="1" opacity="0.9" />
        </pattern>
      </defs>
      {/* Cuerpo */}
      <path d="M36 34 L204 34 L214 300 Q120 312 26 300 Z" fill={c} />
      {/* Sello superior */}
      <path d="M30 18 H210 V40 H30 Z" fill={c} />
      <path d="M30 18 H210 V24 H30 Z" fill="#000" opacity="0.15" />
      {/* Válvula */}
      <circle cx="120" cy="66" r="7" fill="#000" opacity="0.18" />
      <circle cx="120" cy="66" r="3" fill="#000" opacity="0.25" />
      {/* Franja andina */}
      <rect x="40" y="208" width="166" height="14" fill={`url(#${id}-p)`} />
      {/* Etiqueta */}
      <text x="120" y="118" textAnchor="middle" fontFamily="var(--font-caveat), cursive" fontSize="30" fill={ink}>
        Café Travesía
      </text>
      <text x="120" y="138" textAnchor="middle" fontFamily="var(--font-dm-sans), sans-serif" fontSize="8" letterSpacing="2" fill={a}>
        LA ESENCIA DE LO QUE SOMOS
      </text>
      <text x="120" y="176" textAnchor="middle" fontFamily="var(--font-playfair), serif" fontSize={name.length > 16 ? 16 : 20} fontWeight="700" fill={ink}>
        {name.toUpperCase()}
      </text>
      {origin ? (
        <text x="120" y="196" textAnchor="middle" fontFamily="var(--font-dm-sans), sans-serif" fontSize="9" letterSpacing="1.5" fill={ink} opacity="0.8">
          {origin.toUpperCase()}
        </text>
      ) : null}
      <text x="120" y="250" textAnchor="middle" fontFamily="var(--font-dm-sans), sans-serif" fontSize="8" letterSpacing="2" fill={ink} opacity="0.7">
        CAFÉ ESPECIAL · CAICEDO, ANTIOQUIA
      </text>
      {/* Volumen */}
      <path d="M36 34 L204 34 L214 300 Q120 312 26 300 Z" fill={`url(#${id}-g)`} />
    </svg>
  );
}

function isLight(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
