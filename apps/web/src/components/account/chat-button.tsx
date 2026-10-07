'use client';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Abre el asistente/chat del sitio (evento global 'ct-chat-open'). */
export function ChatButton({ label = '¿Problemas? Escríbenos', message, className }: { label?: string; message?: string; className?: string }) {
  return (
    <button type="button" className={cn('btn-outline', className)} onClick={() => window.dispatchEvent(new CustomEvent('ct-chat-open', { detail: message ? { message } : undefined }))}>
      <MessageCircle className="size-4" aria-hidden /> {label}
    </button>
  );
}
