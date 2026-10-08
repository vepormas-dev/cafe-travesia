import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, Mail, ShieldCheck } from 'lucide-react';
import { getSiteContent } from '@/lib/data/catalog';
import { publicWhatsapp } from '@/lib/public-contact';
import { LegalPage } from '@/components/site/legal-page';
import { WhatsAppIcon } from '@/components/site/social-icons';
import { Markdown } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Consejos de seguridad en compras',
  description: 'Cómo comprar seguro en Café Travesía: nuestros canales oficiales, qué datos nunca te vamos a pedir y cómo reconocer mensajes falsos.',
  alternates: { canonical: '/compra-segura' },
};

const NUNCA = `
## Lo que nunca te vamos a pedir

Ni por WhatsApp, ni por llamada, correo, redes sociales o mensaje de texto te vamos a pedir:

- La **clave** de tu tarjeta, tu cuenta bancaria, Nequi o Daviplata.
- El **código de seguridad (CVV)** de la tarjeta ni su fecha de vencimiento.
- **Códigos de verificación**, claves dinámicas o códigos que te lleguen por SMS o correo.
- Que **instales una aplicación** o compartas tu pantalla para “ayudarte” con un pago.
- La **contraseña** de tu cuenta de Café Travesía.

Si alguien te los pide en nuestro nombre, **no es Café Travesía**. No respondas y avísanos por un canal oficial.
`;

const CONSEJOS = `
## Cómo pagar con tranquilidad

- **Escribe la dirección tú mismo**: entra a **cafetravesia.com** desde tu navegador o desde nuestra app oficial. Desconfía de enlaces que lleguen por mensajes no solicitados.
- **Revisa el candado y el dominio** antes de pagar: la dirección debe empezar por \`https://\` y terminar en **cafetravesia.com**. Cuando pagas en línea, la pasarela segura es **Wompi** (de Bancolombia), en un dominio de wompi.co.
- **Los datos de tu tarjeta los recibe la pasarela**, no nosotros: Café Travesía no ve ni guarda el número completo ni el código de seguridad.
- **Si te escribimos por WhatsApp**, será desde nuestro número oficial. Si dudas de un enlace, un número o unos datos de pago, confírmalos antes por otro canal oficial.
- **Ofertas demasiado buenas**: si ves una promoción, sorteo o descuento que no aparece en nuestro sitio o en nuestras redes oficiales, pregúntanos antes de pagar.
- **Descarga la app solo desde App Store o Google Play**, usando los enlaces de este sitio.

## Cómo reconocer un mensaje falso (phishing)

- Te mete **prisa**: “tu pedido se cancela en 10 minutos”, “último aviso”, “tu cuenta será bloqueada”.
- Viene de un **número o correo** que no es el oficial, o de un perfil con un nombre parecido al nuestro.
- Trae un **enlace acortado** o un dominio extraño (por ejemplo, letras cambiadas o terminaciones distintas).
- Tiene **errores de ortografía**, logos de baja calidad o pide datos que no tienen que ver con tu pedido.

## Si crees que fuiste víctima de fraude

1. **Comunícate de inmediato con tu banco** o con el emisor de tu tarjeta para bloquearla.
2. **Cambia tus contraseñas**, empezando por la de tu correo y la de tu cuenta de Café Travesía.
3. **Escríbenos por un canal oficial** con capturas del mensaje recibido para alertar a otros clientes.
4. Si pagaste por una compra que no hiciste o que no recibiste, puedes pedir la **reversión del pago** (artículo 51 de la Ley 1480 de 2011). Te explicamos cómo en [Envíos y devoluciones](/envios-y-devoluciones).
5. Puedes denunciar en el **CAI Virtual de la Policía Nacional** (caivirtual.policia.gov.co).
`;

export default async function CompraSeguraPage() {
  const c = await getSiteContent('contact');
  const whatsapp = publicWhatsapp(c.whatsapp);
  const social = [
    { label: 'Instagram', href: c.instagram },
    { label: 'Facebook', href: c.facebook },
    { label: 'TikTok', href: c.tiktok },
  ].filter((s) => s.href);
  const channels = [
    { Icon: Globe, title: 'Sitio web', text: 'cafetravesia.com', href: 'https://cafetravesia.com' },
    { Icon: WhatsAppIcon, title: 'WhatsApp', text: `+${whatsapp.replace(/^57(\d{3})(\d{3})(\d{4})$/, '57 $1 $2 $3')}`, href: `https://wa.me/${whatsapp}` },
    ...(c.email ? [{ Icon: Mail, title: 'Correo', text: c.email, href: `mailto:${c.email}` }] : []),
  ];
  return (
    <LegalPage title="Consejos de seguridad en compras" intro="Comprar café debe ser un placer, no un riesgo. Así te cuidamos y así puedes cuidarte." current="/compra-segura">
      <section aria-labelledby="canales-oficiales" className="rounded-3xl border border-noche/10 bg-hueso p-6 shadow-suave sm:p-8">
        <h2 id="canales-oficiales" className="flex items-center gap-2 font-display text-3xl">
          <ShieldCheck className="size-7 text-ambar-700" aria-hidden /> Nuestros canales oficiales
        </h2>
        <p className="mt-2 text-gris">Solo atendemos pedidos y pagos por estos canales. Cualquier otro número, perfil o página que use nuestro nombre no es nuestro.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {channels.map(({ Icon, title, text, href }) => (
            <li key={title}>
              <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="flex h-full items-center gap-3 rounded-2xl border border-noche/10 bg-crema p-4 transition hover:border-ambar">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-noche text-ambar">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold tracking-[0.16em] text-gris uppercase">{title}</span>
                  <span className="block truncate text-sm font-semibold text-noche">{text}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {social.length ? (
          <p className="mt-4 text-sm text-gris">
            Redes oficiales:{' '}
            {social.map((s, i) => (
              <span key={s.label}>
                {i ? ' · ' : ''}
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="link">
                  {s.label}
                </a>
              </span>
            ))}
            . También puedes visitarnos en nuestras <Link href="/tiendas" className="link">tiendas</Link>.
          </p>
        ) : null}
      </section>
      <div className="mt-10">
        <Markdown className="prose-headings:scroll-mt-28 [&_h2]:mt-12 [&_h2]:text-3xl">{NUNCA}</Markdown>
        <Markdown className="prose-headings:scroll-mt-28 [&_h2]:mt-12 [&_h2]:text-3xl">{CONSEJOS}</Markdown>
      </div>
      <p className="mt-12 rounded-2xl bg-arena/60 p-5 text-sm text-noche/80">
        ¿Recibiste algo sospechoso a nombre de Café Travesía? Escríbenos desde la página de <Link href="/contacto" className="link">PQRS y contacto</Link> y lo revisamos.
      </p>
    </LegalPage>
  );
}
