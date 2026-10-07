'use client';
import { Printer } from 'lucide-react';
import { btn } from './ui';

export function PrintButton({ label = 'Imprimir' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={btn.primary}>
      <Printer className="size-4" /> {label}
    </button>
  );
}
