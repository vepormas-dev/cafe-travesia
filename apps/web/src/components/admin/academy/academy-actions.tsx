'use client';
import { useState } from 'react';
import { KeyRound, UserPlus } from 'lucide-react';
import { grantCourseAccess, revokeCertificate, revokeEnrollment } from '@/lib/admin/actions/academy';
import { ConfirmButton, Dialog, Field, useRunAction } from '../client-ui';
import { btn, inputCls, selectCls } from '../ui';
import { cn } from '@/lib/cn';

export function GrantAccessButton({ courses }: { courses: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState(courses[0]?.id ?? '');
  const { pending, run } = useRunAction();
  return (
    <>
      <button type="button" className={btn.primary} onClick={() => setOpen(true)}><UserPlus className="size-4" /> Otorgar acceso</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Otorgar acceso manual" footer={<><button type="button" className={btn.secondary} onClick={() => setOpen(false)}>Cancelar</button><button type="button" disabled={pending} className={btn.primary} onClick={() => run(() => grantCourseAccess(email, course), { onOk: () => setOpen(false) })}>Otorgar</button></>}>
        <div className="space-y-3">
          <Field label="Correo del estudiante"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="cliente@correo.com" /></Field>
          <Field label="Curso"><select value={course} onChange={(e) => setCourse(e.target.value)} className={selectCls}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
          <p className="text-xs text-gris">Se registra con origen «Manual» (p. ej. becas, empresas, cortesías).</p>
        </div>
      </Dialog>
    </>
  );
}

export function EnrollmentToggle({ id, revoked }: { id: string; revoked: boolean }) {
  const { run } = useRunAction();
  return revoked ? (
    <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => run(() => revokeEnrollment(id, true))}><KeyRound className="size-3.5" /> Restaurar</button>
  ) : (
    <ConfirmButton className={cn(btn.ghost, btn.sm, 'text-cereza')} title="¿Revocar el acceso?" description="El estudiante dejará de ver las lecciones de este curso." confirmLabel="Revocar" onConfirm={() => run(() => revokeEnrollment(id))}>Revocar</ConfirmButton>
  );
}

export function CertificateToggle({ id, revoked }: { id: string; revoked: boolean }) {
  const { run } = useRunAction();
  return revoked ? (
    <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => run(() => revokeCertificate(id, true))}>Restaurar</button>
  ) : (
    <ConfirmButton className={cn(btn.ghost, btn.sm, 'text-cereza')} title="¿Revocar el certificado?" description="La página pública de verificación lo mostrará como revocado." confirmLabel="Revocar" onConfirm={() => run(() => revokeCertificate(id))}>Revocar</ConfirmButton>
  );
}
