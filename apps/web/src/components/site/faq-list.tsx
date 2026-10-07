import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { JsonLd } from './json-ld';

/** Acordeón accesible con <details>/<summary> nativos + JSON-LD FAQPage. */
export function FaqList({ items, className, jsonLd = true }: { items: readonly { q: string; a: string }[]; className?: string; jsonLd?: boolean }) {
  return (
    <div className={className}>
      <ul className="divide-y divide-noche/10 border-y border-noche/10">
        {items.map((f, i) => (
          <li key={i}>
            <details className="group" name="faq">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-display text-lg text-noche transition hover:text-ambar-700 sm:text-xl [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full border border-noche/15 transition group-open:rotate-45 group-open:border-noche group-open:bg-noche group-open:text-crema')}>
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="max-w-3xl pr-12 pb-6 leading-relaxed text-tinta/80">{f.a}</p>
            </details>
          </li>
        ))}
      </ul>
      {jsonLd ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }}
        />
      ) : null}
    </div>
  );
}
