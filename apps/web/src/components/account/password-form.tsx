'use client';
/** Cambio de contraseña con Firebase (solo cuentas de correo y contraseña). */
import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { authErrorMessage, firebaseAuth, firebaseEnabled, resetPassword } from '@/lib/firebase/client';
import { cn } from '@/lib/cn';

export function PasswordForm({ email }: { email: string }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [rep, setRep] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!firebaseEnabled) return <p className="text-sm text-gris">El cambio de contraseña no está disponible en este momento.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!cur) errs.cur = 'Escribe tu contraseña actual';
    if (next.length < 8) errs.next = 'Mínimo 8 caracteres';
    else if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) errs.next = 'Combina letras y números';
    if (rep !== next) errs.rep = 'Las contraseñas no coinciden';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const auth = firebaseAuth();
      await auth.authStateReady();
      const u = auth.currentUser;
      if (!u || (u.email ?? '').toLowerCase() !== email.toLowerCase()) throw Object.assign(new Error('Vuelve a iniciar sesión en este dispositivo para cambiar tu contraseña.'), { code: '' });
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(email, cur));
      await updatePassword(u, next);
      setCur('');
      setNext('');
      setRep('');
      toast.success('Actualizamos tu contraseña');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const type = show ? 'text' : 'password';
  return (
    <form onSubmit={submit} className="grid max-w-md gap-4" noValidate>
      {(
        [
          ['cur', 'Contraseña actual', cur, setCur, 'current-password'],
          ['next', 'Nueva contraseña', next, setNext, 'new-password'],
          ['rep', 'Repite la nueva contraseña', rep, setRep, 'new-password'],
        ] as const
      ).map(([k, l, v, set, ac]) => (
        <div key={k}>
          <label htmlFor={`pw-${k}`} className="label">
            {l}
          </label>
          <input id={`pw-${k}`} type={type} autoComplete={ac} className={cn('input', errors[k] && 'input-error')} value={v} onChange={(e) => set(e.target.value)} aria-invalid={Boolean(errors[k])} />
          {errors[k] ? <p className="field-error">{errors[k]}</p> : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary btn-sm" disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Cambiar contraseña
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setShow((s) => !s)} aria-pressed={show}>
          {show ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />} {show ? 'Ocultar' : 'Mostrar'}
        </button>
        <button
          type="button"
          className="link text-xs"
          onClick={() =>
            void resetPassword(email)
              .then(() => toast.success(`Te enviamos un enlace a ${email}`))
              .catch((e) => toast.error(authErrorMessage(e)))
          }
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
    </form>
  );
}
