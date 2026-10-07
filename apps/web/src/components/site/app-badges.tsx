import { cn } from '@/lib/cn';
import { AppleIcon, GooglePlayIcon } from './social-icons';

/** Botones App Store / Google Play desde getSiteContent('app_links'). Sin URL → "Próximamente". */
export function AppBadges({ ios, android, dark = true, className }: { ios?: string; android?: string; dark?: boolean; className?: string }) {
  const items = [
    { href: ios, label: 'App Store', pre: 'Descárgala en', Icon: AppleIcon },
    { href: android, label: 'Google Play', pre: 'Disponible en', Icon: GooglePlayIcon },
  ];
  return (
    <div className={cn('flex flex-wrap gap-2.5', className)}>
      {items.map(({ href, label, pre, Icon }) => {
        const inner = (
          <>
            <Icon className="size-6 shrink-0" />
            <span className="leading-none">
              <span className="block text-[0.6rem] tracking-wide opacity-75">{href ? pre : 'Próximamente en'}</span>
              <span className="mt-0.5 block text-[0.95rem] font-semibold">{label}</span>
            </span>
          </>
        );
        const cls = cn(
          'inline-flex min-w-[148px] items-center gap-2.5 rounded-xl border px-3.5 py-2 transition',
          dark ? 'border-crema/25 bg-noche-950 text-crema' : 'border-noche/20 bg-noche text-crema',
          href ? 'hover:-translate-y-0.5 hover:border-ambar' : 'cursor-default opacity-80',
        );
        return href ? (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`${pre} ${label}`}>
            {inner}
          </a>
        ) : (
          <span key={label} className={cls} aria-label={`${label}: próximamente`}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}
