'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { authErrorMessage, firebaseEnabled, resetPassword, signInWithEmail, signInWithGoogle, signOutEverywhere } from '@/lib/firebase/client';
import { cn } from '@/lib/cn';

type Who = { demo: boolean; staff: boolean; user: { email: string; fullName: string | null; role: string } | null };

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginCard({ next, initialError, demo, firebaseReady }: { next: string; initialError: string | null; demo: boolean; firebaseReady: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<null | 'email' | 'google' | 'reset' | 'demo'>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [current, setCurrent] = useState<Who | null>(null);
  const [noPerms, setNoPerms] = useState(Boolean(initialError));
  const canAuth = !demo && firebaseReady && firebaseEnabled;

  useEffect(() => {
    if (!canAuth) return;
    fetch('/api/admin/whoami', { cache: 'no-store' })
      .then((r) => r.json() as Promise<Who>)
      .then((w) => w.user && setCurrent(w))
      .catch(() => undefined);
  }, [canAuth]);

  const verifyAndGo = async () => {
    const r = await fetch('/api/admin/whoami', { cache: 'no-store' });
    const w = (await r.json()) as Who;
    if (w.staff) {
      router.replace(next);
      router.refresh();
      return;
    }
    setCurrent(w);
    setNoPerms(true);
    setError('Tu cuenta no tiene permisos de administrador.');
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Escribe un correo válido.');
    if (password.length < 6) return setError('Escribe tu contraseña.');
    setBusy('email');
    try {
      await signInWithEmail(email.trim(), password);
      await verifyAndGo();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  const onGoogle = async () => {
    setError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
      await verifyAndGo();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Escribe el correo de tu cuenta.');
    setBusy('reset');
    try {
      await resetPassword(email.trim());
      setNotice(`Si ${email.trim()} tiene una cuenta, te enviamos un enlace para crear una nueva contraseña.`);
      setMode('login');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-noche/10 bg-hueso p-6 shadow-[0_30px_80px_-40px_rgba(17,26,49,0.45)] sm:p-8">
      <h2 className="font-display text-[1.9rem] leading-tight text-noche">{mode === 'reset' ? 'Recupera tu acceso' : 'Bienvenido de nuevo'}</h2>
      <p className="mt-1.5 text-sm text-gris">{mode === 'reset' ? 'Te enviaremos un enlace para restablecer tu contraseña.' : 'Ingresa con tu cuenta del equipo Café Travesía.'}</p>

      {!canAuth ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-ambar/40 bg-ambar-100/70 p-4 text-sm text-noche">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-ambar-700" /> Modo demo
            </p>
            <p className="mt-1 text-noche/80">
              {demo ? 'La base de datos aún no está conectada.' : 'Firebase Auth aún no está configurado.'} Puedes recorrer el panel completo con datos de ejemplo realistas; los cambios no se guardan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBusy('demo');
              router.push('/admin');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-noche px-5 py-3.5 text-sm font-semibold text-crema transition hover:bg-noche-800 active:scale-[0.99]"
          >
            {busy === 'demo' ? <Loader2 className="size-4 animate-spin" /> : null} Entrar al panel demo <ArrowRight className="size-4" />
          </button>
          <p className="text-xs text-gris">Para el acceso real configura las variables NEXT_PUBLIC_FIREBASE_* , FIREBASE_* y la conexión de la base de datos (DB_GATEWAY_URL / DB_GATEWAY_SECRET).</p>
        </div>
      ) : (
        <>
          {current?.user && !noPerms && current.staff ? (
            <button type="button" onClick={() => router.replace(next)} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-montana/30 bg-emerald-50/60 p-3 text-left text-sm transition hover:bg-emerald-50">
              <span className="grid size-9 place-items-center rounded-full bg-montana text-crema">{(current.user.fullName ?? current.user.email)[0]?.toUpperCase()}</span>
              <span className="flex-1">
                <span className="block font-semibold text-noche">Continuar como {current.user.fullName ?? current.user.email}</span>
                <span className="block text-xs text-gris">Ya tienes una sesión activa</span>
              </span>
              <ArrowRight className="size-4 text-montana" />
            </button>
          ) : null}

          {error ? (
            <div role="alert" className={cn('mt-5 flex gap-2.5 rounded-xl border p-3 text-sm', noPerms ? 'border-cereza/30 bg-rose-50 text-rose-900' : 'border-cereza/25 bg-rose-50/70 text-rose-900')}>
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-cereza" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {noPerms ? (
                  <p className="mt-1 text-xs text-rose-900/75">
                    {current?.user ? `Ingresaste como ${current.user.email}. ` : ''}Pide a un administrador que te asigne el rol de editor o administrador.{' '}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={async () => {
                        await signOutEverywhere();
                        setCurrent(null);
                        setNoPerms(false);
                        setError(null);
                      }}
                    >
                      Usar otra cuenta
                    </button>{' '}
                    · <Link href="/cuenta" className="font-semibold underline">Ir a mi cuenta</Link>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {notice ? <p className="mt-5 rounded-xl border border-montana/30 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}

          {mode === 'login' ? (
            <form onSubmit={onEmail} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="adm-email" className="label">Correo</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gris" />
                  <input id="adm-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@cafetravesia.co" className="input pl-10" required />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="adm-pass" className="label">Contraseña</label>
                  <button type="button" onClick={() => { setMode('reset'); setError(null); }} className="text-xs font-medium text-ambar-700 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gris" />
                  <input id="adm-pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input pr-11 pl-10" required />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-gris hover:text-noche" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy !== null} className="flex w-full items-center justify-center gap-2 rounded-xl bg-noche px-5 py-3.5 text-sm font-semibold text-crema transition hover:bg-noche-800 active:scale-[0.99] disabled:opacity-60">
                {busy === 'email' ? <Loader2 className="size-4 animate-spin" /> : null} Ingresar al panel
              </button>
            </form>
          ) : (
            <form onSubmit={onReset} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="adm-reset" className="label">Correo de tu cuenta</label>
                <input id="adm-reset" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
              </div>
              <button type="submit" disabled={busy !== null} className="flex w-full items-center justify-center gap-2 rounded-xl bg-noche px-5 py-3.5 text-sm font-semibold text-crema transition hover:bg-noche-800 disabled:opacity-60">
                {busy === 'reset' ? <Loader2 className="size-4 animate-spin" /> : null} Enviar enlace
              </button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm font-medium text-noche/70 hover:text-noche">
                ← Volver a ingresar
              </button>
            </form>
          )}

          {mode === 'login' ? (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-gris">
                <span className="h-px flex-1 bg-noche/10" /> o <span className="h-px flex-1 bg-noche/10" />
              </div>
              <button type="button" onClick={onGoogle} disabled={busy !== null} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-noche/15 bg-white px-5 py-3 text-sm font-semibold text-noche transition hover:border-noche/40 hover:bg-crema/40 disabled:opacity-60">
                {busy === 'google' ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />} Continuar con Google
              </button>
            </>
          )  : null}
        </>
      )}
    </div>
  );
}
