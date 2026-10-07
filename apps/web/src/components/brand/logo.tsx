import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Logotipo oficial (PNG del Drive de marca, recortado).
 * variant: "noche" (azul sobre fondos claros) | "claro" (crema sobre azul/fotos) | "blanco".
 */
export function Logo({ variant = 'noche', className, href = '/', priority }: { variant?: 'noche' | 'claro' | 'blanco'; className?: string; href?: string | null; priority?: boolean }) {
  const src = variant === 'claro' ? '/brand/logo-claro.png' : variant === 'blanco' ? '/brand/logo-blanco.png' : '/brand/logo.png';
  const img = <Image src={src} alt="Café Travesía · la esencia de lo que somos" width={1200} height={804} priority={priority} className={cn('h-auto w-[120px]', className)} />;
  return href ? (
    <Link href={href} aria-label="Café Travesía, inicio" className="inline-flex shrink-0">
      {img}
    </Link>
  ) : (
    img
  );
}

/** Íconos oficiales del Drive (máscara: toman el color del texto). */
export type BrandIconName = 'finca' | 'tienda-online' | 'local' | 'pregunta' | 'faq' | 'maquina-espresso' | 'idea' | 'academia' | 'libro' | 'granja' | 'granos' | 'cosecha';
export function BrandIcon({ name, className }: { name: BrandIconName | string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('mask-icon inline-block size-10', className)}
      style={{ maskImage: `url(/brand/iconos/${name}.png)`, WebkitMaskImage: `url(/brand/iconos/${name}.png)` }}
    />
  );
}
