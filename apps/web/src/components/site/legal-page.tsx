import Link from 'next/link';
import { Markdown } from '@/components/ui/primitives';
import { PageHero } from './page-hero';

const LEGAL_NAV = [
  { href: '/terminos', label: 'Términos y condiciones' },
  { href: '/privacidad', label: 'Política de privacidad' },
  { href: '/eliminar-cuenta', label: 'Eliminar cuenta' },
  { href: '/envios-y-devoluciones', label: 'Envíos y devoluciones' },
  { href: '/compra-segura', label: 'Compra segura' },
  { href: '/preguntas-frecuentes', label: 'Preguntas frecuentes' },
  { href: '/contacto', label: 'PQRS y contacto' },
];

/** Plantilla de páginas legales y de ayuda (Markdown + índice lateral). */
export function LegalPage({ title, intro, updated, current, markdown, children }: { title: string; intro?: string; updated?: string; current: string; markdown?: string; children?: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Ayuda y legal" title={title} intro={intro} crumbs={[{ label: title }]}>
        {updated ? <p className="mt-4 text-sm text-gris">Última actualización: {updated}</p> : null}
      </PageHero>
      <div className="container-site grid grid-cols-1 gap-12 py-14 lg:grid-cols-[240px_1fr] lg:py-20">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Páginas de ayuda">
            <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible">
              {LEGAL_NAV.map((l) => (
                <li key={l.href} className="shrink-0">
                  <Link
                    href={l.href}
                    aria-current={l.href === current ? 'page' : undefined}
                    className="block rounded-full px-4 py-2 text-sm text-noche/75 transition hover:bg-arena aria-[current=page]:bg-noche aria-[current=page]:text-crema lg:rounded-xl"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className="min-w-0 max-w-3xl">
          {markdown ? <Markdown className="prose-headings:scroll-mt-28 [&_h2]:mt-12 [&_h2]:text-3xl">{markdown}</Markdown> : null}
          {children}
        </article>
      </div>
    </>
  );
}
