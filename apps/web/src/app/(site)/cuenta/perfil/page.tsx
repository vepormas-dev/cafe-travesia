import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KeyRound, MapPin, UserRound } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getAuthProvider, listAddresses, toMeDTO } from '@/lib/account';
import { ProfileForm } from '@/components/account/profile-form';
import { AddressesManager } from '@/components/account/addresses-manager';
import { PasswordForm } from '@/components/account/password-form';
import { PageTitle, SectionSkeleton } from '@/components/account/ui';

export const metadata: Metadata = { title: 'Perfil y direcciones' };

export default function PerfilPage() {
  return (
    <>
      <PageTitle title="Perfil y direcciones" intro="Tus datos para facturación, envíos y comunicaciones." />
      <Suspense fallback={<SectionSkeleton rows={3} />}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const user = await requireUser('/cuenta/perfil');
  const [addresses, provider] = await Promise.all([listAddresses(user.id), getAuthProvider(user.id)]);
  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8" aria-labelledby="pf-t">
        <h2 id="pf-t" className="mb-5 flex items-center gap-2 text-xl">
          <UserRound className="size-5 text-ambar-700" aria-hidden /> Datos personales
        </h2>
        <ProfileForm me={toMeDTO(user)} />
      </section>
      <section className="card p-6 sm:p-8" aria-labelledby="ad-t">
        <h2 id="ad-t" className="mb-5 flex items-center gap-2 text-xl">
          <MapPin className="size-5 text-ambar-700" aria-hidden /> Direcciones
        </h2>
        <AddressesManager initial={addresses} />
      </section>
      <section className="card p-6 sm:p-8" aria-labelledby="pw-t">
        <h2 id="pw-t" className="mb-5 flex items-center gap-2 text-xl">
          <KeyRound className="size-5 text-ambar-700" aria-hidden /> Contraseña
        </h2>
        {provider === 'password' || provider == null ? (
          <PasswordForm email={user.email} />
        ) : (
          <p className="text-sm text-gris">Ingresas con {provider === 'google.com' ? 'Google' : provider === 'apple.com' ? 'Apple' : provider}: tu contraseña se gestiona en esa cuenta.</p>
        )}
      </section>
    </div>
  );
}
