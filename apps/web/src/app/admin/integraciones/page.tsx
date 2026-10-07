import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { adminPage } from '@/lib/admin/guard';
import { envStatus, integrationUrls } from '@/lib/admin/env-status';
import { env } from '@/lib/env';
import { Badge, PageHeader, PageSkeleton, Panel } from '@/components/admin/ui';
import { CopyButton } from '@/components/admin/client-ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Integraciones' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Integrations />
    </Suspense>
  );
}

async function Integrations() {
  await adminPage('/admin/integraciones');
  const groups = envStatus();
  const u = integrationUrls();
  const missing = groups.flatMap((g) => g.vars).filter((v) => v.required && !v.set);
  const steps: { title: string; body: React.ReactNode; url?: string }[] = [
    { title: 'Webhook de eventos de Wompi', body: 'En el panel de Wompi › Desarrolladores › URL de eventos. Pega esta URL en sandbox y en producción, y copia el «Secreto de eventos» en WOMPI_EVENTS_SECRET.', url: u.webhook },
    { title: 'URL de redirección del checkout', body: 'Wompi vuelve aquí después del pago (el sitio verifica la transacción como respaldo del webhook).', url: u.redirect },
    { title: 'Cron de cPanel (cada 15 min)', body: <>En cPanel › Trabajos de cron: <code className="text-xs">*/15 * * * * curl -fsS -H &quot;Authorization: Bearer $CRON_SECRET&quot; {u.cron}?tasks=reconcile,push,carts</code></>, url: u.cron },
    { title: 'Cron diario (Vercel)', body: 'vercel.json ya programa el cobro de suscripciones y recordatorios una vez al día (plan Hobby).', url: u.cronDaily },
    { title: 'Salud de la pasarela PHP', body: 'Debe responder 200 desde internet. Si falla, revisa SSL del subdominio y config.php.', url: u.gatewayHealth },
    { title: 'Dominio de medios', body: 'Las imágenes del CMS se sirven desde aquí (Apache, caché 1 año). Debe coincidir con NEXT_PUBLIC_MEDIA_URL.', url: u.media },
    { title: 'Firebase Auth · dominios autorizados', body: `Agrega ${new URL(u.site).host} (y el dominio de Vercel) en Authentication › Settings › Authorized domains. Habilita Google y Apple.` },
  ];
  return (
    <>
      <PageHeader eyebrow="Configuración" title="Integraciones" description="Guía con las URLs reales de este despliegue y estado de las variables de entorno (solo se muestra si existen, nunca su valor)." />
      {missing.length ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Faltan {missing.length} variables obligatorias:</strong> {missing.map((m) => m.name).join(', ')}
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Todas las variables obligatorias están configuradas.</div>
      )}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-7" title="Guía de configuración" description={`Entorno: ${env.isProd ? 'producción' : 'preview / local'} · Wompi ${env.wompi.env}`}>
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-noche text-xs font-bold text-ambar-300">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-noche">{s.title}</p>
                  <p className="mt-0.5 text-sm text-gris">{s.body}</p>
                  {s.url ? (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-noche/10 bg-crema/50 px-3 py-2">
                      <code className="min-w-0 flex-1 truncate text-xs text-noche">{s.url}</code>
                      <CopyButton text={s.url} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="space-y-4 xl:col-span-5">
          {groups.map((g) => (
            <Panel key={g.group} title={g.group} actions={<Badge tone={g.vars.every((v) => v.set || !v.required) ? 'success' : 'warning'}>{g.vars.filter((v) => v.set).length}/{g.vars.length}</Badge>}>
              <ul className="space-y-1.5">
                {g.vars.map((v) => (
                  <li key={v.name} className="flex items-start gap-2 text-sm">
                    {v.set ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-montana" /> : v.required ? <XCircle className="mt-0.5 size-4 shrink-0 text-cereza" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-gris" />}
                    <span className="min-w-0">
                      <code className={cn('text-xs', v.set ? 'text-noche' : v.required ? 'text-cereza' : 'text-gris')}>{v.name}</code>
                      <span className="block text-xs text-gris">{v.purpose}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
    </>
  );
}
