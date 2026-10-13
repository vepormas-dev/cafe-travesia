import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Café Travesía usa solo cookies necesarias para la sesión. Sin cookies de publicidad ni de seguimiento; la analítica es propia y sin identificadores.',
  alternates: { canonical: '/cookies' },
};

const MD = `
> Café Travesía, de **Café La Montaña S.A.S.**, usa solo lo necesario para que el sitio funcione. **No usamos cookies de publicidad, de redes sociales ni de seguimiento entre sitios.**

## 1. Cookie que usamos

| Nombre | Para qué | Duración |
|---|---|---|
| \`__session\` | Mantener tu sesión iniciada (cuenta, pedidos, Academia). Es HttpOnly y segura: solo viaja por HTTPS y ningún script la puede leer. | 14 días |

Solo existe si inicias sesión. Al cerrar sesión la borramos.

## 2. Lo que se guarda en tu navegador (no son cookies)

| Clave | Para qué |
|---|---|
| \`ct-cart-v1\` | Tu carrito, para que no se pierda si cierras la pestaña. |
| \`cafe-travesia-cookies\` | Recordar que ya viste este aviso. |
| \`ct-admin-collapsed\` | Solo para el equipo: recordar si el menú del panel está plegado. |

Viven en el almacenamiento local de tu navegador y no se envían a nuestros servidores, salvo el carrito cuando inicias sesión para sincronizarlo entre la web y la app.

## 3. Estadísticas sin cookies

Contamos visitas con una analítica propia: por cada página vista registramos la ruta, de dónde llegaste y el tipo de dispositivo. **No usa cookies ni identificadores personales** y respeta la opción "No rastrear" (Do Not Track) de tu navegador.

## 4. Servicios de terceros

Al pagar, **Wompi** abre su propio checkout y puede usar sus cookies para procesar el pago y prevenir fraude; se rigen por su política. Al iniciar sesión con Google o Apple aplica la política de ese proveedor.

## 5. Cómo controlarlas

Puedes borrar las cookies y el almacenamiento local desde la configuración de tu navegador. Si borras \`__session\` tendrás que volver a iniciar sesión, y si borras \`ct-cart-v1\` se vaciará el carrito.

## 6. Contacto

Para dudas sobre esta política o sobre tus datos, escríbenos desde la página de [contacto](/contacto) o consulta la [política de privacidad](/privacidad).
`;

export default function CookiesPage() {
  return <LegalPage title="Política de cookies" intro="Solo lo necesario para que tu café llegue." updated="octubre de 2026" current="/cookies" markdown={MD} />;
}
