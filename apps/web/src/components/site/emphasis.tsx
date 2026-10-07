import { Fragment } from 'react';
import { cn } from '@/lib/cn';

/**
 * Titular con una palabra en itálica ámbar (firma editorial). Usa `word` si aparece en el texto;
 * si no, resalta las últimas `last` palabras.
 */
export function Emphasis({ text, word, last = 1, className }: { text: string; word?: RegExp; last?: number; className?: string }) {
  const em = (s: string, k?: number) => (
    <em key={k} className={cn('font-display font-normal italic', className ?? 'text-ambar')}>
      {s}
    </em>
  );
  if (word) {
    const m = text.match(word);
    if (m && m.index !== undefined) {
      return (
        <>
          {text.slice(0, m.index)}
          {em(m[0])}
          {text.slice(m.index + m[0].length)}
        </>
      );
    }
  }
  const parts = text.trim().split(' ');
  const head = parts.slice(0, Math.max(0, parts.length - last)).join(' ');
  const tail = parts.slice(-last).join(' ');
  return (
    <Fragment>
      {head ? `${head} ` : ''}
      {em(tail)}
    </Fragment>
  );
}
