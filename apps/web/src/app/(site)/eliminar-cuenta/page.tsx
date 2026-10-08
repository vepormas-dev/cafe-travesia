import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/legal-page';
import { DeleteAccount } from '@/components/account/delete-account';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Eliminar cuenta y datos',
  description: 'Cómo pedir la eliminación de tu cuenta de Café Travesía y qué datos se borran o se conservan.',
  alternates: { canonical: '/eliminar-cuenta' },
};

const MD = `
Esta página es de **Café Travesía** (sitio cafetravesia.com y app móvil). Sirve para pedir la eliminación de tu cuenta y de los datos personales asociados, en la web o en la app.

## Cómo eliminar tu cuenta

1. Inicia sesión con el mismo correo de la app (correo y contraseña, Google o Apple).
2. En esta página, o en [Perfil](/cuenta/perfil), pulsa **Eliminar mi cuenta**.
3. Escribe **ELIMINAR** y confirma. En la app el camino es **Perfil › Eliminar mi cuenta**.
4. Si no puedes entrar, escribe a **info@cafetravesia.co** con el asunto «Eliminar cuenta» y el correo de la cuenta. Respondemos en los plazos de la Ley 1581 de 2012.

## Qué se elimina

- Nombre, teléfono, documento, direcciones y foto de perfil.
- Carrito, notas de la Academia, notificaciones y dispositivos de avisos.
- Acceso a cursos, certificados y puntos.
- Suscripciones activas: se cancelan y se anula la tarjeta guardada en Wompi. Café Travesía no guarda el número completo de la tarjeta.

## Qué se conserva

El registro de las compras ya hechas se conserva **sin vínculo a tu cuenta**, porque la ley contable y tributaria de Colombia exige guardar el soporte de las ventas. No usamos esos datos para escribirte ni para publicidad.

La eliminación no se puede deshacer.
`;

export default function EliminarCuentaPage() {
  return (
    <LegalPage
      title="Eliminar cuenta"
      intro="Puedes borrar tu cuenta de Café Travesía y los datos personales asociados, desde aquí o desde la app."
      updated="8 de octubre de 2026"
      current="/eliminar-cuenta"
      markdown={MD}
    >
      <section className="card mt-10 border-cereza/20 p-6 sm:p-8" aria-labelledby="del-public">
        <h2 id="del-public" className="mb-3 text-2xl">
          Eliminar mi cuenta ahora
        </h2>
        <Suspense fallback={<LoginPrompt />}>
          <DeleteSection />
        </Suspense>
      </section>
    </LegalPage>
  );
}

/** La sesión se lee en la petición; el resto de la página se prerenderiza. */
async function DeleteSection() {
  const user = await getSessionUser();
  return (
    <>
      {user?.role === 'customer' ? (
        <>
          <p className="mb-4 text-sm text-gris">Sesión iniciada como {user.email}.</p>
          <DeleteAccount />
        </>
      ) : user ? (
        <p className="text-sm text-gris">Las cuentas del equipo se eliminan desde el panel, por otro administrador.</p>
      ) : (
        <LoginPrompt />
      )}
    </>
  );
}

function LoginPrompt() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gris">Inicia sesión con la cuenta que quieres eliminar. Después vuelves a esta página para confirmar.</p>
      <Link href="/ingresar?next=/eliminar-cuenta" className="btn-primary">
        Ingresar para eliminar la cuenta
      </Link>
    </div>
  );
}
