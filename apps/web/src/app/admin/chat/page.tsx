import { Suspense } from 'react';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { getChatMessages, listChats } from '@/lib/admin/data/ops';
import { flat, type SPromise } from '@/lib/admin/sp';
import { PageHeader, Skeleton } from '@/components/admin/ui';
import { ChatConsole } from '@/components/admin/support/chat-console';

export const metadata: Metadata = { title: 'Chat en vivo' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <>
      <PageHeader eyebrow="Soporte" title="Chat en vivo" description="Conversaciones del asistente de la web y la app. Toma las que piden asesor, responde y devuélvelas a la IA." />
      <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
        <Chat searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Chat({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/chat');
  const sp = flat(await searchParams);
  const sessions = await listChats();
  const selected = sp.s ?? sessions.find((s) => s.status === 'human_requested')?.id ?? sessions[0]?.id ?? null;
  const messages = selected ? await getChatMessages(selected) : [];
  return <ChatConsole initialSessions={sessions} initialSelected={selected} initialMessages={messages} />;
}
