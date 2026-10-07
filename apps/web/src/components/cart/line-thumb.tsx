import Image from 'next/image';
import { GraduationCap } from 'lucide-react';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { cn } from '@/lib/cn';

/** Miniatura de una línea de carrito/pedido: foto, bolsa ilustrada o ícono de curso. */
export function LineThumb({ name, imageUrl, themeColor, kind, className }: { name: string; imageUrl?: string | null; themeColor?: string | null; kind?: string; className?: string }) {
  return (
    <div className={cn('relative size-20 shrink-0 overflow-hidden rounded-xl bg-arena', className)} style={themeColor ? { backgroundColor: themeColor } : undefined}>
      {themeColor && kind !== 'course' ? (
        <div className="absolute inset-x-3 top-2 bottom-0">
          <CoffeeBag name={name} color={themeColor} className="drop-shadow-md" />
        </div>
      ) : imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="80px" className="object-cover" />
      ) : kind === 'course' ? (
        <div className="grid size-full place-items-center bg-noche text-ambar">
          <GraduationCap className="size-7" aria-hidden />
        </div>
      ) : (
        <div className="absolute inset-x-3 top-2 bottom-0">
          <CoffeeBag name={name} />
        </div>
      )}
    </div>
  );
}
