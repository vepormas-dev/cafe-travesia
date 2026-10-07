import { NextResponse } from 'next/server';
import { apiStaff } from '@/lib/auth';
import { isDemoMode } from '@/lib/env';
import { getChatMessages, listChats } from '@/lib/admin/data/ops';

/** GET ?status=&s=<sessionId> → bandeja + mensajes de la conversación abierta (polling del panel cada 5 s). */
export async function GET(req: Request) {
  if (!isDemoMode() && !(await apiStaff())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const s = sp.get('s');
  const [sessions, messages] = await Promise.all([listChats(sp.get('status') ?? undefined), s ? getChatMessages(s) : Promise.resolve([])]);
  return NextResponse.json({ sessions, messages }, { headers: { 'cache-control': 'no-store' } });
}
