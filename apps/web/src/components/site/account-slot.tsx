import { getSessionUser } from '@/lib/auth';
import { AccountMenu } from './account-menu';

/** Server component (va dentro de <Suspense>): lee la sesión y entrega datos mínimos al menú. */
export async function AccountSlot() {
  const u = await getSessionUser();
  return <AccountMenu user={u ? { name: u.fullName, email: u.email, role: u.role, points: u.loyaltyPoints, avatarUrl: u.avatarUrl } : null} />;
}

export function AccountSlotFallback() {
  return <AccountMenu user={null} />;
}
