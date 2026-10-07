import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteContent } from '@/lib/data/catalog';
import { LegalPage } from '@/components/site/legal-page';
import { FaqList } from '@/components/site/faq-list';
import { ChatOpenButton } from '@/components/site/chat-open-button';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Tueste, envíos, suscripciones, medios de pago, cursos y ventas al por mayor: resolvemos tus dudas sobre Café Travesía.',
  alternates: { canonical: '/preguntas-frecuentes' },
};

export default async function FaqPage() {
  const faq = await getSiteContent('faq');
  return (
    <LegalPage title="Preguntas frecuentes" intro="Lo que más nos preguntan en la barra, por WhatsApp y en el chat." current="/preguntas-frecuentes">
      <FaqList items={faq.items} />
      <div className="mt-12 flex flex-col items-start gap-4 rounded-3xl bg-noche p-8 text-crema sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-2xl text-crema">¿No encontraste tu respuesta?</p>
          <p className="text-sm text-crema/70">Nuestro asistente responde al instante, y si hace falta te pasa con una persona.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChatOpenButton className="btn-ambar">Abrir el asistente</ChatOpenButton>
          <Link href="/contacto" className="btn-light">
            Contacto
          </Link>
        </div>
      </div>
    </LegalPage>
  );
}
