'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { btn } from './ui';

export function RefreshButton({ label = 'Actualizar' }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => router.refresh())} className={btn.secondary} disabled={pending}>
      <RefreshCw className={cn('size-4', pending && 'animate-spin')} /> {label}
    </button>
  );
}
