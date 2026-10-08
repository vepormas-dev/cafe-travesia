import Link from 'next/link';
import { cacheLife, cacheTag } from 'next/cache';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { brand } from '@travesia/shared';
import { Logo } from '@/components/brand/logo';
import { getSiteContent } from '@/lib/data/catalog';
import { publicPhone, publicWhatsapp } from '@/lib/public-contact';
import { TAGS } from '@/lib/data/tags';
import { NewsletterForm } from './newsletter-form';
import { AppBadges } from './app-badges';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from './social-icons';
import { SHOP_CATEGORIES } from './nav';

const COLS = [
  { title: 'Tienda', links: [...SHOP_CATEGORIES.map((c) => ({ label: c.label, href: c.href })), { label: 'Suscripciones', href: '/suscripciones' }] },
  {
    title: 'Academia',
    links: [
      { label: 'Explorar cursos', href: '/academia' },
      { label: 'Mis cursos', href: '/cuenta/cursos' },
      { label: 'Plan con Academia', href: '/suscripciones/maestro-premium' },
      { label: 'Notas de café', href: '/blog' },
    ],
  },
  {
    title: 'Nosotros',
    links: [
      { label: 'Nuestra historia', href: '/nosotros' },
      { label: 'Impacto', href: '/impacto' },
      { label: 'Nuestras tiendas', href: '/tiendas' },
      { label: 'Empresas', href: '/empresas' },
    ],
  },
  {
    title: 'Ayuda',
    links: [
      { label: 'Envíos y devoluciones', href: '/envios-y-devoluciones' },
      { label: 'Preguntas frecuentes', href: '/preguntas-frecuentes' },
      { label: 'Consejos de seguridad en compras', href: '/compra-segura' },
      { label: 'Términos y condiciones', href: '/terminos' },
      { label: 'Política de privacidad', href: '/privacidad' },
      { label: 'Eliminar cuenta', href: '/eliminar-cuenta' },
      { label: 'PQRS y contacto', href: '/contacto' },
    ],
  },
];

const PAYMENTS = ['Visa', 'Mastercard', 'Amex', 'PSE', 'Nequi', 'Bancolombia', 'Daviplata'];

export async function SiteFooter() {
  'use cache';
  cacheLife('days');
  cacheTag(TAGS.site);
  const [contact, apps] = await Promise.all([getSiteContent('contact'), getSiteContent('app_links')]);
  const phone = publicPhone(contact.phone);
  const whatsapp = publicWhatsapp(contact.whatsapp);
  const year = new Date().getFullYear();
  const social = [
    { href: contact.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: contact.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: contact.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { href: `https://wa.me/${whatsapp}`, label: 'WhatsApp', Icon: WhatsAppIcon },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden bg-noche text-crema">
      <div aria-hidden className="divider-andino h-4 opacity-90" style={{ backgroundSize: '32px 16px' }} />
      <div aria-hidden className="bg-andino pointer-events-none absolute inset-0 opacity-[0.04]" />

      {/* Newsletter */}
      <div className="container-site relative grid gap-8 border-b border-crema/10 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="font-script text-2xl text-ambar">Notas desde la montaña</p>
          <h2 className="mt-1 font-display text-3xl text-crema sm:text-4xl">
            Suscríbete al boletín y recibe <em className="text-ambar-300">10 % en tu primera compra</em>
          </h2>
        </div>
        <NewsletterForm dark source="footer" />
      </div>

      <div className="container-site relative grid gap-12 py-14 lg:grid-cols-[1.3fr_2.7fr]">
        <div className="space-y-6">
          <Logo variant="claro" className="w-[150px]" />
          <p className="max-w-xs text-sm leading-relaxed text-crema/70">{brand.claim}</p>
          <ul className="space-y-2.5 text-sm text-crema/80">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ambar" aria-hidden /> {contact.address}
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 size-4 shrink-0 text-ambar" aria-hidden /> {contact.hours}
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="flex gap-2.5 hover:text-ambar-300">
                <Mail className="mt-0.5 size-4 shrink-0 text-ambar" aria-hidden /> {contact.email}
              </a>
            </li>
            {phone ? (
              <li>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex gap-2.5 hover:text-ambar-300">
                  <Phone className="mt-0.5 size-4 shrink-0 text-ambar" aria-hidden /> {phone}
                </a>
              </li>
            ) : null}
          </ul>
          <ul className="flex gap-2" aria-label="Redes sociales">
            {social.map(({ href, label, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-full border border-crema/20 transition hover:border-ambar hover:bg-ambar hover:text-noche">
                  <Icon className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h3 className="mb-4 font-sans text-xs font-semibold tracking-[0.2em] text-ambar-300 uppercase">{c.title}</h3>
              <ul className="space-y-2.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-crema/75 transition hover:text-crema hover:underline hover:decoration-ambar hover:underline-offset-4">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="col-span-2 sm:col-span-4 grid gap-8 border-t border-crema/10 pt-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-sans text-xs font-semibold tracking-[0.2em] text-ambar-300 uppercase">Lleva Travesía en tu bolsillo</h3>
              <AppBadges ios={apps.ios} android={apps.android} />
            </div>
            <div>
              <h3 className="mb-3 font-sans text-xs font-semibold tracking-[0.2em] text-ambar-300 uppercase">Paga seguro con Wompi</h3>
              <ul className="flex flex-wrap gap-1.5" aria-label="Medios de pago">
                {PAYMENTS.map((p) => (
                  <li key={p} className="rounded-md border border-crema/15 bg-crema/[0.06] px-2.5 py-1 text-xs font-semibold tracking-wide text-crema/85">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-crema/10">
        <div className="container-site flex flex-col gap-3 py-6 text-xs text-crema/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brand.legalName}. Todos los derechos reservados.{' '}
            <Link href="/acceso" className="ml-2 text-crema/35 hover:text-crema/70">
              Acceso administrativo
            </Link>
          </p>
          <p className="font-script text-base text-crema/70">Hecho con ☕ en Caicedo, Antioquia</p>
        </div>
      </div>
    </footer>
  );
}
