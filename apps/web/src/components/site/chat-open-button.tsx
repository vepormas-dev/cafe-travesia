'use client';
import { cn } from '@/lib/cn';

/** Botón que abre el Asistente Travesía (opcionalmente con un mensaje). */
export function ChatOpenButton({ children, message, className }: { children: React.ReactNode; message?: string; className?: string }) {
  return (
    <button type="button" className={cn(className)} onClick={() => window.dispatchEvent(new CustomEvent('ct-chat-open', { detail: { message } }))}>
      {children}
    </button>
  );
}
