/** Validación de cada sección del CMS (claves de SITE_DEFAULTS). Seguro para cliente y servidor. */
import { z } from 'zod';

const s = (max: number, label = 'Este campo') => z.string().trim().min(1, `${label} es obligatorio`).max(max, `Máximo ${max} caracteres`);
const o = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).default('');
const href = z.string().trim().max(300).refine((v) => !v || v.startsWith('/') || /^https?:\/\//.test(v) || v.startsWith('mailto:') || v.startsWith('tel:'), 'Usa una ruta (/tienda) o una URL https://');
const media = z.string().trim().max(600).refine((v) => !v || v.startsWith('/') || /^https?:\/\//.test(v), 'Usa una URL https:// o una ruta /');
const cta = z.object({ label: s(40, 'El texto del botón'), href: href.refine(Boolean, 'El enlace es obligatorio') });

export const SITE_SCHEMAS = {
  'home.hero': z.object({ eyebrow: o(120), title: s(120, 'El título'), subtitle: o(300), primaryCta: cta, secondaryCta: cta, videoUrl: media.default(''), posterUrl: media.default(''), imageUrl: media.default('') }),
  'home.seasonal': z.object({ enabled: z.boolean(), eyebrow: o(60), title: s(120, 'El título'), subtitle: o(200), productSlug: s(160, 'El producto'), color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal (#RRGGBB)') }),
  'home.banner': z.object({ enabled: z.boolean(), text: s(200, 'El texto'), href: href.default('') }),
  'home.story': z.object({ title: s(120, 'El título'), body: o(800), pillars: z.array(z.object({ icon: s(40, 'El ícono'), title: s(60, 'El título'), text: o(200) })).max(6) }),
  about: z.object({ title: s(120, 'El título'), intro: o(600), body: o(3000), imageUrl: media.default('') }),
  impact: z.object({ title: s(160, 'El título'), intro: o(600), stats: z.array(z.object({ value: s(20, 'La cifra'), label: s(120, 'La descripción') })).max(8), pillars: z.array(z.object({ title: s(60, 'El título'), text: o(300) })).max(8) }),
  faq: z.object({ items: z.array(z.object({ q: s(200, 'La pregunta'), a: s(1500, 'La respuesta') })).max(40) }),
  contact: z.object({ email: z.email('Correo inválido'), phone: o(40), whatsapp: z.string().trim().regex(/^\d{8,15}$/, 'Solo números con indicativo, ej. 573001234567'), address: o(300), hours: o(200), instagram: href.default(''), facebook: href.default(''), tiktok: href.default('') }),
  app_links: z.object({ ios: href.default(''), android: href.default('') }),
  seo: z.object({ title: s(70, 'El título'), description: s(170, 'La descripción'), ogImage: media.default('') }),
} as const;
export type SiteKey = keyof typeof SITE_SCHEMAS;
export const SITE_KEY_LIST = Object.keys(SITE_SCHEMAS) as SiteKey[];

export const SITE_META: Record<SiteKey, { label: string; description: string; path: string }> = {
  'home.hero': { label: 'Inicio · Portada', description: 'Video/imagen principal, titular y botones', path: '/' },
  'home.seasonal': { label: 'Inicio · Edición temporada', description: 'Producto destacado a todo color', path: '/' },
  'home.banner': { label: 'Inicio · Franja superior', description: 'Mensaje promocional sobre el menú', path: '/' },
  'home.story': { label: 'Inicio · Del grano a tu taza', description: 'Historia y pilares con íconos', path: '/' },
  about: { label: 'Nosotros', description: 'Quiénes somos', path: '/nosotros' },
  impact: { label: 'Impacto', description: 'Cifras y pilares de sostenibilidad', path: '/impacto' },
  faq: { label: 'Preguntas frecuentes', description: 'Preguntas y respuestas reordenables', path: '/preguntas-frecuentes' },
  contact: { label: 'Contacto y redes', description: 'Correo, WhatsApp, horarios y redes', path: '/contacto' },
  app_links: { label: 'Enlaces de la app', description: 'App Store y Google Play', path: '/' },
  seo: { label: 'SEO global', description: 'Título, descripción e imagen para compartir', path: '/' },
};

export const BRAND_ICONS = ['finca', 'tienda-online', 'local', 'pregunta', 'faq', 'maquina-espresso', 'idea', 'academia', 'libro', 'granja', 'granos', 'cosecha'] as const;
