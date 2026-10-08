import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';
import { getProducts, getStores } from '@/lib/data/catalog';
import { publicPhone } from '@/lib/public-contact';
import { PageHero } from '@/components/site/page-hero';
import { StoreIllustration } from '@/components/site/store-illustration';
import { GoogleG } from '@/components/site/home/sections';

export const metadata: Metadata = {
  title: 'Nuestras tiendas',
  description: 'Visítanos en el Parque Comercial Florida (Medellín) o vive el origen en Caicedo, Antioquia. Horarios, mapa y cómo llegar.',
  alternates: { canonical: '/tiendas' },
};

export default async function TiendasPage() {
  const [stores, experiences] = await Promise.all([getStores(), getProducts({ kind: 'experience' })]);
  const tour = experiences.find((e) => /tour|caicedo/.test(e.slug)) ?? experiences[0];
  const cata = experiences.find((e) => /cata/.test(e.slug));
  return (
    <>
      <PageHero
        eyebrow="Tiendas y origen"
        title={
          <>
            Nuestras <span className="font-black">tiendas</span>
          </>
        }
        intro="Un lugar diferente, el mismo sabor. Ven a la barra en Medellín o sube a la montaña donde nace nuestro café."
        crumbs={[{ label: 'Tiendas' }]}
      />
      <div className="container-site space-y-16 py-14 lg:py-20">
        {stores.map((s, i) => (
          <section key={s.slug} id={s.slug} aria-labelledby={`t-${s.slug}`} className="grid scroll-mt-28 gap-8 lg:grid-cols-2 lg:items-stretch">
            <div className={`flex flex-col rounded-[2rem] border border-noche/10 bg-hueso p-8 shadow-suave sm:p-10 ${i % 2 ? 'lg:order-2' : ''}`}>
              <StoreIllustration kind={s.kind} className="mb-6 max-w-[260px]" />
              <p className="eyebrow">{s.kind === 'finca' ? 'Origen · visitas con reserva' : 'Barra, tienda y coworking'}</p>
              <h2 id={`t-${s.slug}`} className="mt-2 text-4xl">
                {s.name}
              </h2>
              <p className="mt-3 text-gris">{s.description}</p>
              <ul className="mt-6 space-y-3 text-noche/85">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-ambar-700" aria-hidden /> {s.address}
                </li>
                {s.hours.map((h) => (
                  <li key={h} className="flex gap-3">
                    <Clock className="mt-0.5 size-5 shrink-0 text-ambar-700" aria-hidden /> {h}
                  </li>
                ))}
                {publicPhone(s.phone) ? (
                  <li className="flex gap-3">
                    <Phone className="mt-0.5 size-5 shrink-0 text-ambar-700" aria-hidden /> {publicPhone(s.phone)}
                  </li>
                ) : null}
              </ul>
              <div className="mt-auto flex flex-wrap gap-2 pt-8">
                {s.mapUrl ? (
                  <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline bg-white">
                    Ir con Google <GoogleG />
                  </a>
                ) : null}
                {s.kind === 'finca' && tour ? (
                  <Link href={`/tienda/${tour.slug}`} className="btn-primary">
                    Reservar experiencia <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : cata ? (
                  <Link href={`/tienda/${cata.slug}`} className="btn-primary">
                    Reservar una cata <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : null}
                {s.menuUrl ? (
                  <a href={s.menuUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    Ver carta
                  </a>
                ) : null}
              </div>
            </div>
            <div className="grid min-h-[360px] grid-rows-[1fr_auto] gap-4">
              {s.lat && s.lng ? (
                <iframe
                  title={`Mapa de ${s.name}`}
                  src={`https://www.google.com/maps?q=${s.lat},${s.lng}&z=15&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="size-full min-h-[300px] rounded-[2rem] border border-noche/10 grayscale-[35%]"
                />
              ) : null}
              {s.imageUrl ? (
                <div className="relative hidden h-40 overflow-hidden rounded-[2rem] sm:block">
                  <Image src={s.imageUrl} alt={s.name} fill sizes="(min-width: 1024px) 45vw, 92vw" className="object-cover object-[50%_75%]" />
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
