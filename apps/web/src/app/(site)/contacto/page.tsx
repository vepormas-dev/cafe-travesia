import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MapPin, MessageSquareText, Phone } from 'lucide-react';
import { getSiteContent } from '@/lib/data/catalog';
import { PageHero } from '@/components/site/page-hero';
import { LeadForm } from '@/components/site/lead-form';
import { Emphasis } from '@/components/site/emphasis';
import { ChatOpenButton } from '@/components/site/chat-open-button';
import { WhatsAppIcon } from '@/components/site/social-icons';

export const metadata: Metadata = {
  title: 'Contacto y PQRS',
  description: 'Escríbenos por WhatsApp, correo o el formulario. Peticiones, quejas, reclamos y sugerencias de Café Travesía.',
  alternates: { canonical: '/contacto' },
};

export default async function ContactoPage() {
  const c = await getSiteContent('contact');
  const channels = [
    { Icon: WhatsAppIcon, title: 'WhatsApp', text: `+${c.whatsapp.replace(/^57/, '57 ')}`, href: `https://wa.me/${c.whatsapp}?text=${encodeURIComponent('¡Hola, Café Travesía! ')}`, cta: 'Escribir ahora' },
    { Icon: Mail, title: 'Correo', text: c.email, href: `mailto:${c.email}`, cta: 'Enviar correo' },
    { Icon: Phone, title: 'Teléfono', text: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}`, cta: 'Llamar' },
  ];
  return (
    <>
      <PageHero eyebrow="Contacto · PQRS" title={<Emphasis text="Hablemos de café" word={/café/} className="text-ambar-700" />} intro="Pedidos, suscripciones, cursos, ventas al por mayor o una simple duda: aquí estamos, como en la barra." crumbs={[{ label: 'Contacto' }]} />
      <div className="container-site grid gap-12 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:py-20">
        <aside className="space-y-4">
          {channels.map(({ Icon, title, text, href, cta }) => (
            <a key={title} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="group card flex items-center gap-5 p-5 transition hover:-translate-y-0.5 hover:shadow-elevada">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-noche text-ambar transition group-hover:bg-ambar group-hover:text-noche">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold tracking-[0.18em] text-gris uppercase">{title}</span>
                <span className="block truncate font-display text-xl text-noche">{text}</span>
              </span>
              <span className="hidden text-sm font-semibold text-ambar-700 sm:block">{cta} →</span>
            </a>
          ))}
          <div className="card space-y-3 p-6 text-sm text-noche/85">
            <p className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ambar-700" aria-hidden /> {c.address}
            </p>
            <p className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-ambar-700" aria-hidden /> {c.hours}
            </p>
            <Link href="/tiendas" className="link inline-block">
              Ver tiendas y mapa
            </Link>
          </div>
          <div className="rounded-3xl bg-noche p-6 text-crema">
            <MessageSquareText className="size-6 text-ambar" aria-hidden />
            <p className="mt-3 font-display text-2xl text-crema">¿Respuesta inmediata?</p>
            <p className="mt-1 text-sm text-crema/70">El Asistente Travesía conoce el catálogo, los envíos y el estado de tus pedidos.</p>
            <ChatOpenButton className="btn-ambar btn-sm mt-5">Abrir el asistente</ChatOpenButton>
          </div>
        </aside>
        <div>
          <h2 className="title-lg">Escríbenos</h2>
          <p className="mt-2 mb-8 text-gris">
            Para PQRS (peticiones, quejas, reclamos y sugerencias) elige el motivo y, si aplica, incluye tu número de pedido. Respondemos en máximo 15 días hábiles, normalmente en menos de 24 horas.
          </p>
          <LeadForm source="contacto" fields={['phone', 'interest', 'message']} interests={['Pregunta general', 'Mi pedido', 'Mi suscripción', 'Academia y cursos', 'Ventas al por mayor', 'Petición', 'Queja o reclamo', 'Sugerencia']} />
        </div>
      </div>
    </>
  );
}
