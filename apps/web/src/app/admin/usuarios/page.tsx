import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { adminPage } from '@/lib/admin/guard';
import { listUsersAdmin } from '@/lib/admin/data/ops';
import { env } from '@/lib/env';
import { ROLE_LABEL } from '@/lib/admin/labels';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Avatar, Badge, Empty, PageHeader, PageSkeleton, Panel, Table, relTime, td, th, trHover } from '@/components/admin/ui';
import { ChipFilter, SearchBox } from '@/components/admin/client-ui';
import { RoleSelect } from '@/components/admin/system/role-select';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Usuarios y roles' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: { searchParams: SPromise }) {
  const { user } = await adminPage('/admin/usuarios');
  const sp = flat(await searchParams);
  const { rows, admins } = await listUsersAdmin(sp);
  return (
    <>
      <PageHeader eyebrow="Configuración" title="Usuarios y roles" description="Administradores gestionan todo; editores gestionan contenido, catálogo, pedidos y soporte (sin usuarios, cupones ni integraciones)." />
      <div className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border border-noche/[0.08] bg-white px-4 py-3 text-sm text-noche/80">
        <ShieldCheck className="mt-0.5 size-4 text-montana" />
        <p className="flex-1">Hay <strong>{admins}</strong> administrador(es). No puedes quitarte tu rol ni dejar el panel sin administradores. {env.adminEmails.length ? <>Correos con admin automático (ADMIN_EMAILS): {env.adminEmails.join(', ')}.</> : null}</p>
      </div>
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Buscar cualquier usuario por correo o nombre…" />
          <ChipFilter param="role" options={[{ value: '', label: 'Equipo' }, { value: 'admin', label: 'Administradores' }, { value: 'editor', label: 'Editores' }, { value: 'customer', label: 'Clientes' }]} />
        </div>
        {rows.length ? (
          <Table>
            <thead><tr><th className={th}>Usuario</th><th className={th}>Rol</th><th className={th}>Ingreso con</th><th className={th}>Último acceso</th><th className={cn(th, 'text-right')}>Cambiar rol</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={trHover}>
                  <td className={td}><div className="flex items-center gap-3"><Avatar name={u.fullName ?? u.email} /><div><p className="font-medium text-noche">{u.fullName ?? '—'} {u.id === user.id ? <Badge tone="ambar">Tú</Badge> : null}</p><p className="text-xs text-gris">{u.email}</p></div></div></td>
                  <td className={td}><Badge tone={u.role === 'admin' ? 'noche' : u.role === 'editor' ? 'info' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge></td>
                  <td className={cn(td, 'text-xs text-gris')}>{u.provider ?? '—'}</td>
                  <td className={cn(td, 'text-xs text-gris')}>{relTime(u.lastSeenAt)}</td>
                  <td className={td}><RoleSelect userId={u.id} email={u.email} role={u.role} isSelf={u.id === user.id} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Sin resultados" text="Busca por correo para encontrar a un cliente y darle acceso al panel." />}
      </Panel>
    </>
  );
}
