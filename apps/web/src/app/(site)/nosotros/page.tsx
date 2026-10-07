import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { brand } from '@travesia/shared';
import { BrandIcon } from '@/components/brand/logo';
import { getSiteContent } from '@/lib/data/catalog';
import { PageHero } from '@/components/site/page-hero';
import { Emphasis } from '@/components/site/emphasis';

export const metadata: Metadata = {
  title: 'Nosotros: de Caicedo a tu taza',
  description: 'La historia de Café Travesía: de las montañas de Caicedo, Antioquia, a nuestra barra en el Parque Comercial Florida de Medellín.',
  alternates: { canonical: '/nosotros' },
};

const TIMELINE = [
  { icon: 'granja', place: 'Caicedo, Antioquia', title: 'Donde todo empezó', text: 'Un pueblo de montaña al occidente de Antioquia, a 1.900 msnm, donde el café se vive en familia. Allí nació la idea de llevar nuestro grano, sin intermediarios, hasta tu taza.' },
  { icon: 'cosecha', place: 'Las fincas aliadas', title: 'Cereza por cereza', text: 'Trabajamos con familias caficultoras de la vereda: seleccionamos lotes de altura, secamos al sol y pagamos por encima del precio de mercado.' },
  { icon: 'granos', place: 'Nuestro tostador', title: 'Tueste propio, en pequeños lotes', text: 'Gabo tuesta cada semana para resaltar la dulzura natural del grano: chocolate, panela y, en los microlotes, flores y frutas.' },
  { icon: 'local', place: 'Parque Comercial Florida, Medellín', title: 'Un lugar diferente, el mismo sabor', text: 'Abrimos nuestra barra en Medellín: un espacio pa’ trabajar, conversar o hacerle una pausa al caos con un buen café.' },
  { icon: 'tienda-online', place: 'Toda Colombia', title: 'La travesía sigue', text: 'Tienda en línea, suscripciones, Academia y app: el mismo café de la barra, recién empacado, en cualquier rincón del país.' },
];

const TEAM = [
  { name: 'Gabriel “Gabo”', role: 'Fundador y maestro tostador', text: 'Creció entre cafetales en Caicedo. Lidera el tueste y las alianzas con las familias de la vereda. Enseña en la Academia “Fundamentos del Grano” y “La Ciencia del Tueste”.', initial: 'G' },
  { name: 'Alex', role: 'Barista líder · Florida', text: 'Formador del equipo de barra en Medellín. Si te tomaste un capuchino perfecto en Florida, probablemente fue suyo. Enseña Espresso y Métodos de Filtrado.', initial: 'A' },
];

const VALUES = [
  { title: 'Origen con nombre propio', text: 'Cada bolsa dice de dónde viene y quién la cultivó.' },
  { title: 'Precio justo', text: 'Pagamos por encima del mercado y a tiempo.' },
  { title: 'Frescura obsesiva', text: 'Tostamos cada semana y despachamos en 48 h.' },
  { title: 'Enseñar lo que sabemos', text: 'Más gente que entiende el café = mejores tazas para todos.' },
];

const GALLERY = [
  { src: '/brand/fotos/latte-travesia.webp', alt: 'Latte con arte en taza de Café Travesía' },
  { src: '/brand/video/caicedo-jeep.webp', alt: 'Jeep cargado de café en Caicedo' },
  { src: '/brand/fotos/aromatica-frutos.webp', alt: 'Aromática de frutos con fresa y mora' },
  { src: '/brand/fotos/barra-travesia.webp', alt: 'Barista sirviendo en la barra de Florida' },
  { src: '/brand/fotos/frappe-caramelo.webp', alt: 'Frappé de caramelo de la carta de Travesía' },
  { src: '/brand/fotos/soda-frutos.webp', alt: 'Soda de frutos con fresa y naranja' },
];

export default async function NosotrosPage() {
  const about = await getSiteContent('about');
  return (
    <>
      <PageHero eyebrow="Nuestra historia" title={<Emphasis text={about.title} word={/lo que somos/i} className="text-ambar-700" />} intro={about.intro} image={about.imageUrl} imageAlt="Manos de caficultor con café de Caicedo" crumbs={[{ label: 'Nosotros' }]} />

      <section aria-labelledby="travesia-title" className="container-site py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow mb-3">De Caicedo a Florida</p>
            <h2 id="travesia-title" className="title-lg">
              Una travesía de montaña a ciudad
            </h2>
            <p className="lede mt-4">{about.body}</p>
            <p className="mt-8 font-script text-3xl text-ambar-700">“{brand.claim.split('.')[1]?.trim()}.”</p>
          </div>
          <ol className="relative space-y-10 border-l-2 border-dashed border-ambar/50 pl-10">
            {TIMELINE.map((t, i) => (
              <li key={t.title} className="relative">
                <span className="absolute top-0 -left-[3.85rem] grid size-12 place-items-center rounded-full bg-noche text-ambar ring-4 ring-crema">
                  <BrandIcon name={t.icon} className="size-6" />
                </span>
                <p className="text-xs font-semibold tracking-[0.2em] text-ambar-700 uppercase">
                  {String(i + 1).padStart(2, '0')} · {t.place}
                </p>
                <h3 className="mt-2 text-2xl">{t.title}</h3>
                <p className="mt-2 leading-relaxed text-tinta/80">{t.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="equipo-title" className="bg-noche py-16 text-crema lg:py-24">
        <div className="container-site">
          <p className="eyebrow mb-3 text-ambar-300">El equipo</p>
          <h2 id="equipo-title" className="font-display text-4xl text-crema sm:text-5xl">
            Las manos detrás de cada taza
          </h2>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {TEAM.map((m) => (
              <li key={m.name} className="relative overflow-hidden rounded-[2rem] border border-crema/10 bg-noche-800 p-8">
                <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.05]" />
                <span className="arch relative grid h-28 w-24 place-items-center bg-ambar font-script text-6xl text-noche">{m.initial}</span>
                <h3 className="relative mt-6 text-3xl text-crema">{m.name}</h3>
                <p className="relative text-sm font-semibold tracking-wide text-ambar-300">{m.role}</p>
                <p className="relative mt-4 leading-relaxed text-crema/75">{m.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-crema/50">Fotos del equipo: [CONFIRMAR CON EL CLIENTE] (pendientes de sesión fotográfica).</p>
        </div>
      </section>

      <section aria-labelledby="galeria-title" className="container-site py-16 lg:py-24">
        <h2 id="galeria-title" className="title-lg">
          Así se vive Travesía
        </h2>
        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {GALLERY.map((g, i) => (
            <li key={g.src} className={i % 3 === 1 ? 'md:translate-y-10' : ''}>
              <div className={`relative aspect-[3/4] overflow-hidden ${i % 2 ? 'arch' : 'rounded-[1.75rem]'}`}>
                <Image src={g.src} alt={g.alt} fill sizes="(min-width: 768px) 30vw, 48vw" className="object-cover transition duration-700 hover:scale-105" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="valores-title" className="bg-arena/60 py-16 lg:py-24">
        <div className="container-site">
          <h2 id="valores-title" className="title-lg">
            En lo que creemos
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <li key={v.title} className="card p-6">
                <p className="font-display text-4xl text-ambar-700">0{i + 1}</p>
                <h3 className="mt-3 text-xl">{v.title}</h3>
                <p className="mt-1.5 text-sm text-gris">{v.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/impacto" className="btn-primary">
              Nuestro impacto <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/tienda" className="btn-outline">
              Probar nuestro café
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
