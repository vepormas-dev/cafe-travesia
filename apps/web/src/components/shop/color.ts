/** Utilidades de color para fondos por origen (product.themeColor). */
export function luminance(hex: string | null | undefined) {
  const h = (hex ?? '#111A31').replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return 0;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** 'dark' si el fondo es oscuro (texto crema), 'light' si es claro (texto noche). Umbral por contraste WCAG. */
export function toneOf(bg: string | null | undefined): 'dark' | 'light' {
  const L = luminance(bg);
  // contraste con crema (#F8F3EA, L≈0.9) vs noche (#111A31, L≈0.011)
  const withCrema = (0.9 + 0.05) / (L + 0.05);
  const withNoche = (L + 0.05) / (0.011 + 0.05);
  return withCrema >= withNoche ? 'dark' : 'light';
}

export const themeOf = (p: { themeColor: string | null; accentColor?: string | null }) => {
  const bg = p.themeColor ?? '#111A31';
  const tone = toneOf(bg);
  return { bg, accent: p.accentColor ?? '#EB9A37', tone, ink: tone === 'dark' ? '#F8F3EA' : '#111A31' };
};
