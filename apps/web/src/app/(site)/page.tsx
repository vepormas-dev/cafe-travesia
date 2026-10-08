import type { Metadata } from 'next';
import { brand } from '@travesia/shared';
import { env } from '@/lib/env';
import { getSiteContent, getStores } from '@/lib/data/catalog';
import { publicPhone } from '@/lib/public-contact';
import { JsonLd } from '@/components/site/json-ld';
import { Recommended } from '@/components/site/recommended';
import { HomeHero } from '@/components/site/home/hero';
import { HomeSeasonal } from '@/components/site/home/seasonal';
import {
  HomeAcademy,
  HomeApp,
  HomeExperiences,
  HomeFaq,
  HomeFreshCoffee,
  HomeNotes,
  HomeOrigin,
  HomePlans,
  HomePurpose,
  HomeStores,
  HomeStory,
} from '@/components/site/home/sections';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteContent('seo');
  return { title: { absolute: seo.title }, description: seo.description, alternates: { canonical: '/' } };
}

async function HomeJsonLd() {
  const [contact, stores, seo] = await Promise.all([getSiteContent('contact'), getStores(), getSiteContent('seo')]);
  const orgPhone = publicPhone(contact.phone);
  const url = env.siteUrl;
  return (
    <JsonLd
      data={[
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': `${url}/#org`,
          name: brand.name,
          slogan: brand.tagline,
          description: seo.description,
          url,
          logo: `${url}/brand/logo.png`,
          email: contact.email,
          ...(orgPhone ? { telephone: orgPhone } : {}),
          sameAs: [contact.instagram, contact.facebook, contact.tiktok].filter(Boolean),
          foundingLocation: { '@type': 'Place', name: brand.origin },
        },
        ...stores.map((s) => {
          const telephone = publicPhone(s.phone) || orgPhone;
          return {
            '@context': 'https://schema.org',
            '@type': s.kind === 'finca' ? 'LocalBusiness' : 'CafeOrCoffeeShop',
            '@id': `${url}/tiendas#${s.slug}`,
            name: s.name,
            parentOrganization: { '@id': `${url}/#org` },
            image: s.imageUrl ? `${url}${s.imageUrl}` : undefined,
            description: s.description,
            address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressRegion: 'Antioquia', addressCountry: 'CO' },
            geo: s.lat && s.lng ? { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } : undefined,
            hasMap: s.mapUrl ?? undefined,
            ...(telephone ? { telephone } : {}),
            servesCuisine: s.kind === 'cafe' ? 'Café de especialidad' : undefined,
            priceRange: '$$',
            url: `${url}/tiendas`,
          };
        }),
      ]}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeSeasonal />
      <HomeFreshCoffee />
      <HomeStory />
      <Recommended context="home" />
      <HomePlans />
      <HomeAcademy />
      <HomeOrigin />
      <HomeNotes />
      <HomePurpose />
      <HomeStores />
      <HomeExperiences />
      <HomeApp />
      <HomeFaq />
      <HomeJsonLd />
    </>
  );
}
