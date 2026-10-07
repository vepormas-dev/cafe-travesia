'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/cn';
import { authErrorMessage, firebaseEnabled, registerWithEmail, resetPassword, signInWithApple, signInWithEmail, signInWithGoogle } from '@/lib/firebase/client';
import { AppleIcon } from '@/components/site/social-icons';
import { GoogleG } from '@/components/auth/google-g';

type Mode = 'login' | 'register' | 'reset';

/** Solo rutas internas (evita open redirect). */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/cuenta';
  if (/^\/(ingresar|api)\b/.test(next)) return '/cuenta';
  return next;
}

export function LoginForm() {
  const sp = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [mode, setMode] = useState<Mode>(sp.get('modo') === 'registro' ? 'register' : 'login');
  const [loading, setLoading] = useState<null | 'email' | 'google' | 'apple'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const disabled = !firebaseEnabled || loading !== null;

  const done = () => {
    window.location.assign(next);
  };

  const run = async (kind: 'email' | 'google' | 'apple', fn: () => Promise<unknown>) => {
    setError(null);
    setNotice(null);
    setLoading(kind);
    try {
      await fn();
      done();
    } catch (e) {
      setError(authErrorMessage(e));
      setLoading(null);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    if (mode === 'reset') {
      setError(null);
      setLoading('email');
      try {
        await resetPassword(email);
        setNotice(`Te enviamos un enlace a ${email} para crear una nueva contraseña. Revisa también el spam.`);
      } catch (err) {
        setError(authErrorMessage(err));
      } finally {
        setLoading(null);
      }
      return;
    }
    if (mode === 'register') {
      const name = String(fd.get('name') ?? '').trim();
      if (name.length < 2) return setError('Escribe tu nombre.');
      if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
      if (fd.get('terms') !== 'on') return setError('Acepta los términos y la política de datos para continuar.');
      return run('email', () => registerWithEmail(email, password, name));
    }
    return run('email', () => signInWithEmail(email, password));
  };

  return (
    <div className="w-full">
      {mode !== 'reset' ? (
        <div role="tablist" aria-label="Ingreso o registro" className="mb-8 grid grid-cols-2 rounded-full bg-arena p-1">
          {(
            [
              ['login', 'Ingresar'],
              ['register', 'Crear cuenta'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn('rounded-full py-2.5 text-sm font-semibold transition', mode === m ? 'bg-noche text-crema shadow-suave' : 'text-noche/70 hover:text-noche')}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setMode('login')} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-noche/70 hover:text-noche">
          <ArrowLeft className="size-4" aria-hidden /> Volver a ingresar
        </button>
      )}

      <h1 className="font-display text-4xl leading-tight">{mode === 'login' ? 'Bienvenido de vuelta' : mode === 'register' ? 'Únete a la travesía' : 'Recupera tu contraseña'}</h1>
      <p className="mt-2 text-gris">
        {mode === 'reset' ? 'Escribe tu correo y te enviamos un enlace para crear una nueva.' : 'Una sola cuenta para la tienda, la Academia y la app.'}
      </p>

      {mode !== 'reset' ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={disabled} onClick={() => run('google', signInWithGoogle)} className="btn border border-noche/15 bg-white text-noche hover:border-noche">
            {loading === 'google' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleG />} Continuar con Google
          </button>
          <button type="button" disabled={disabled} onClick={() => run('apple', signInWithApple)} className="btn bg-black text-white hover:bg-tinta">
            {loading === 'apple' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <AppleIcon className="size-4" />} Continuar con Apple
          </button>
        </div>
      ) : null}

      {mode !== 'reset' ? (
        <div className="my-7 flex items-center gap-4 text-xs font-semibold tracking-[0.2em] text-gris uppercase">
          <span className="h-px flex-1 bg-noche/10" /> o con tu correo <span className="h-px flex-1 bg-noche/10" />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className={cn('grid gap-4', mode === 'reset' && 'mt-8')} noValidate>
        {mode === 'register' ? (
          <div>
            <label htmlFor="auth-name" className="label">
              Nombre completo
            </label>
            <input id="auth-name" name="name" autoComplete="name" required className="input" disabled={disabled} />
          </div>
        ) : null}
        <div>
          <label htmlFor="auth-email" className="label">
            Correo electrónico
          </label>
          <input id="auth-email" name="email" type="email" autoComplete="email" required className="input" disabled={disabled} />
        </div>
        {mode !== 'reset' ? (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="auth-password" className="label">
                Contraseña
              </label>
              {mode === 'login' ? (
                <button type="button" onClick={() => setMode('reset')} className="mb-1.5 text-sm font-medium text-ambar-700 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              ) : null}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'register' ? 8 : undefined}
                className="input pr-12"
                disabled={disabled}
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-gris hover:text-noche" aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            {mode === 'register' ? <p className="mt-1 text-xs text-gris">Mínimo 8 caracteres.</p> : null}
          </div>
        ) : null}
        {mode === 'register' ? (
          <label className="flex items-start gap-3 text-sm text-noche/80">
            <input type="checkbox" name="terms" className="mt-1 size-4 accent-noche" disabled={disabled} />
            <span>
              Acepto los{' '}
              <a href="/terminos" className="link" target="_blank">
                términos
              </a>{' '}
              y la{' '}
              <a href="/privacidad" className="link" target="_blank">
                política de tratamiento de datos
              </a>
              .
            </span>
          </label>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-xl bg-cereza/10 px-4 py-3 text-sm text-cereza">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-xl bg-montana/10 px-4 py-3 text-sm text-montana">
            {notice}
          </p>
        ) : null}

        <button type="submit" disabled={disabled} className="btn-primary mt-2 w-full py-3.5">
          {loading === 'email' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
          {mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Crear mi cuenta' : 'Enviar enlace'}
        </button>
      </form>
    </div>
  );
}
