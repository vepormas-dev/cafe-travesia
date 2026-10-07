import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Download, ExternalLink, SearchX, ShieldAlert } from 'lucide-react';
import { brand, formatDate } from '@travesia/shared';
import { getCertificate } from '@/lib/academy';
import { env } from '@/lib/env';
import { Logo } from '@/components/brand/logo';
import { PatternDivider } from '@/components/ui/primitives';

type Props = { params: Promise<{ code: string }> };

export const metadata: Metadata = {
  title: 'Verificación de certificado · Academia',
  description: `Verifica la autenticidad de un certificado de la Academia ${brand.name}.`,
  robots: { index: false, follow: true },
};

export default function CertificatePage({ params }: Props) {
  return (
    <div className="min-h-[80vh] bg-arena py-12 sm:py-16">
      <div className="container-site max-w-4xl">
        <p className="eyebrow text-center">Academia Travesía · Verificación</p>
        <Suspense fallback={<div className="mx-auto mt-8 aspect-[1.414] w-full animate-pulse rounded-3xl bg-hueso" aria-busy="true" />}>
          <Verification params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Verification({ params }: Props) {
  const { code } = await params;
  const cert = await getCertificate(decodeURIComponent(code));

  if (!cert) {
    return (
      <div className="card mx-auto mt-8 max-w-xl p-10 text-center">
        <SearchX className="mx-auto size-12 text-cereza" aria-hidden />
        <h1 className="mt-4 font-display text-3xl">Certificado no encontrado</h1>
        <p className="mt-3 text-gris">
          No existe ningún certificado con el código <code className="rounded bg-arena px-1.5 py-0.5 font-mono text-noche">{decodeURIComponent(code).toUpperCase().slice(0, 24)}</code>. Revisa que esté bien escrito (formato CT-XXX-XXXXX).
        </p>
        <Link href="/academia" className="btn-primary mt-7">
          Conocer la Academia
        </Link>
      </div>
    );
  }

  const revoked = Boolean(cert.revokedAt);
  const verifyUrl = `${env.siteUrl}/certificados/${cert.code}`;
  return (
    <>
      <div
        role="status"
        className={`mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${revoked ? 'bg-cereza/10 text-cereza' : 'bg-[#e5efd3] text-montana'}`}
      >
        {revoked ? <ShieldAlert className="size-5" aria-hidden /> : <BadgeCheck className="size-5" aria-hidden />}
        {revoked ? `Certificado revocado el ${formatDate(cert.revokedAt)}` : cert.sample ? 'Certificado de muestra (modo demo)' : 'Certificado válido y emitido por Café Travesía'}
      </div>

      {/* Réplica del certificado */}
      <article className={`relative mx-auto mt-8 overflow-hidden rounded-3xl bg-crema p-3 shadow-elevada ${revoked ? 'opacity-70 grayscale' : ''}`} aria-label="Certificado">
        <div className="relative rounded-[1.25rem] border-2 border-noche p-1.5">
          <div className="relative rounded-2xl border border-ambar px-6 py-10 text-center sm:px-14 sm:py-14">
            <PatternDivider className="absolute inset-x-8 top-3 w-auto" />
            <PatternDivider className="absolute inset-x-8 bottom-3 w-auto" />
            <Logo href={null} className="mx-auto w-28 sm:w-32" />
            <p className="mt-4 text-[0.68rem] font-bold tracking-[0.3em] text-ambar-700 uppercase">Academia Travesía · {brand.origin}</p>
            <h1 className="mt-3 font-display text-3xl text-noche italic sm:text-4xl">Certificado de finalización</h1>
            <p className="mt-6 text-sm text-gris">Se otorga con orgullo a</p>
            <p className="mt-1 font-display text-3xl font-bold text-noche sm:text-5xl">{cert.holderName}</p>
            <div className="mx-auto mt-3 h-px w-56 bg-ambar" />
            <p className="mt-5 text-sm text-gris">por completar satisfactoriamente el curso</p>
            <p className="mt-1 font-display text-xl text-tostado italic sm:text-2xl">{cert.courseTitle}</p>
            <p className="mt-3 text-sm text-noche/75">
              {cert.hours} {cert.hours === 1 ? 'hora' : 'horas'}
              {cert.instructorName ? ` · Instructor: ${cert.instructorName}` : ''}
            </p>
            <dl className="mt-10 grid gap-6 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[0.65rem] font-bold tracking-[0.2em] text-gris uppercase">Fecha de emisión</dt>
                <dd className="mt-1 text-noche">{formatDate(cert.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-bold tracking-[0.2em] text-gris uppercase">Firma</dt>
                <dd className="mt-1 font-display text-noche italic">Gabriel · Fundador</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-bold tracking-[0.2em] text-gris uppercase">Código</dt>
                <dd className="mt-1 font-mono font-semibold tracking-wider text-noche">{cert.code}</dd>
              </div>
            </dl>
          </div>
        </div>
      </article>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {!revoked ? (
          <>
            <a href={`/api/certificates/${cert.code}?descargar=1`} className="btn-primary">
              <Download className="size-4" aria-hidden /> Descargar PDF
            </a>
            <a href={`/api/certificates/${cert.code}`} target="_blank" rel="noopener" className="btn-outline">
              <ExternalLink className="size-4" aria-hidden /> Abrir PDF
            </a>
          </>
        ) : null}
        {cert.courseSlug ? (
          <Link href={`/academia/cursos/${cert.courseSlug}`} className="btn-ghost">
            Ver el curso
          </Link>
        ) : null}
      </div>
      <p className="mt-6 text-center text-xs text-gris">
        URL de verificación: <span className="font-mono">{verifyUrl.replace(/^https?:\/\//, '')}</span>
      </p>
    </>
  );
}
