import { brand } from '@travesia/shared';

export const C = {
  ...brand.colors,
  white: '#FFFFFF',
  line: 'rgba(17,26,49,0.12)',
  muted: '#5E6271',
  /** Academia / reproductor (modo oscuro editorial del mockup) */
  ink: '#120A09',
  inkCard: '#1D1413',
  inkLine: 'rgba(248,243,234,0.10)',
  inkMuted: 'rgba(248,243,234,0.62)',
  lima: '#C9E7A6',
} as const;

export const F = {
  display: 'PlayfairDisplay_700Bold',
  displayItalic: 'PlayfairDisplay_400Regular_Italic',
  displayRegular: 'PlayfairDisplay_400Regular',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  script: 'CaveatBrush_400Regular',
} as const;

export const R = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const shadow = {
  shadowColor: '#111A31',
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

/** ¿Color claro? (para elegir tinta sobre themeColor) */
export function isLight(hex: string | null | undefined) {
  const h = (hex ?? '#111A31').replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}
export const inkOn = (hex: string | null | undefined) => (isLight(hex) ? C.noche : C.crema);
