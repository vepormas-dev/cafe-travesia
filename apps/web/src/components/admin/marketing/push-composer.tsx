'use client';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Apple, Bell, Loader2, Send, Smartphone, Sparkles, Users } from 'lucide-react';
import { DEEP_LINKS, PUSH_AUDIENCES } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { initialActionState } from '@/lib/admin/action-state';
import { aiPushSuggestions, estimateAudience, sendPushCampaign } from '@/lib/admin/actions/marketing';
import { Field, SubmitButton, useActionToast } from '../client-ui';
import { MediaPicker } from '../media/media-picker';
import { btn, inputCls, selectCls } from '../ui';

export function PushComposer({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const [state, action] = useActionState(sendPushCampaign, initialActionState);
  const [f, setF] = useState({ title: '', body: '', imageUrl: null as string | null, deepLink: '/tienda', customLink: '', audienceType: 'all', courseId: courses[0]?.id ?? '', userEmail: '', platform: 'all', when: 'now', scheduledAt: '' });
  const [preview, setPreview] = useState<'ios' | 'android'>('ios');
  const [count, setCount] = useState<number | null>(null);
  const [goal, setGoal] = useState('');
  const [options, setOptions] = useState<{ title: string; body: string }[]>([]);
  const [aiPending, startAi] = useTransition();
  useActionToast(state, () => {
    setF((x) => ({ ...x, title: '', body: '' }));
    router.refresh();
  });
  const audience = f.audienceType === 'course' ? `course:${f.courseId}` : f.audienceType === 'user' ? `email:${f.userEmail.trim()}` : f.audienceType;
  const link = f.deepLink === '__custom' ? f.customLink : f.deepLink;
  useEffect(() => {
    if (f.audienceType === 'user' && !/^\S+@\S+\.\S+$/.test(f.userEmail)) return;
    const id = setTimeout(async () => {
      const r = await estimateAudience(audience, f.platform);
      setCount(r.ok && r.data ? r.data.count : null);
    }, 350);
    return () => clearTimeout(id);
  }, [audience, f.platform, f.audienceType, f.userEmail]);
  const e = state.errors;
  const payload = JSON.stringify({ title: f.title, body: f.body, imageUrl: f.imageUrl, deepLink: link, audience, platform: f.platform, when: f.when, scheduledAt: f.scheduledAt });
  const audienceLabel = f.audienceType === 'course' ? `Estudiantes de ${courses.find((c) => c.id === f.courseId)?.title ?? 'curso'}` : f.audienceType === 'user' ? f.userEmail || 'Un usuario' : (PUSH_AUDIENCES.find((a) => a.value === f.audienceType)?.label ?? '');
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <form action={action} className="space-y-4 rounded-xl border border-noche/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(17,26,49,0.04)] xl:col-span-7">
        <input type="hidden" name="payload" value={payload} />
        <div className="rounded-xl border border-ambar/30 bg-gradient-to-br from-ambar-100/60 to-white p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-noche"><Sparkles className="size-3.5 text-ambar-700" /> Sugerir con IA</p>
          <div className="flex flex-wrap gap-2">
            <input value={goal} onChange={(ev) => setGoal(ev.target.value)} placeholder="Objetivo: p. ej. lanzar Cima del Viento a suscriptores, recuperar carritos…" className={cn(inputCls, 'min-w-[14rem] flex-1')} />
            <button type="button" disabled={aiPending} onClick={() => startAi(async () => { const r = await aiPushSuggestions(goal, audienceLabel, link); if (r.ok && r.data) setOptions(r.data.options); else toast.error(r.message); })} className={btn.ai}>
              {aiPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-ambar-700" />} 3 opciones
            </button>
          </div>
          {options.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {options.map((o, i) => (
                <button key={i} type="button" onClick={() => setF((x) => ({ ...x, title: o.title, body: o.body }))} className="rounded-lg border border-noche/10 bg-white p-2.5 text-left text-xs transition hover:border-ambar hover:shadow">
                  <span className="block font-semibold text-noche">{o.title}</span>
                  <span className="mt-0.5 block text-gris">{o.body}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Field label="Título" name="title" errors={e} counter={{ value: f.title.length, max: 65 }}>
          <input value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} className={inputCls} placeholder="Cima del Viento ya llegó 🌬️" maxLength={80} />
        </Field>
        <Field label="Mensaje" name="body" errors={e} counter={{ value: f.body.length, max: 240 }}>
          <textarea rows={3} value={f.body} onChange={(ev) => setF({ ...f, body: ev.target.value })} className={inputCls} placeholder="Microlote de temporada: jazmín, mandarina y caramelo. Pocas bolsas." maxLength={300} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div>
            <p className="mb-1 text-[0.8rem] font-medium text-noche/80">Imagen (opcional)</p>
            <MediaPicker value={f.imageUrl} onChange={(u) => setF({ ...f, imageUrl: u })} folder="push" aspect="aspect-[2/1]" />
          </div>
          <div className="space-y-3">
            <Field label="Al tocar abre…" name="deepLink" errors={e}>
              <select value={f.deepLink} onChange={(ev) => setF({ ...f, deepLink: ev.target.value })} className={selectCls}>
                {DEEP_LINKS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label} ({d.value})</option>
                ))}
                <option value="__custom">Ruta personalizada…</option>
              </select>
            </Field>
            {f.deepLink === '__custom' ? <input value={f.customLink} onChange={(ev) => setF({ ...f, customLink: ev.target.value })} className={inputCls} placeholder="/tienda/cima-del-viento" /> : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Audiencia" name="audience" errors={e}>
            <select value={f.audienceType} onChange={(ev) => setF({ ...f, audienceType: ev.target.value })} className={selectCls}>
              {PUSH_AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
              <option value="course">Estudiantes de un curso…</option>
              <option value="user">Un usuario (por correo)…</option>
            </select>
          </Field>
          <Field label="Plataforma" name="platform" errors={e}>
            <select value={f.platform} onChange={(ev) => setF({ ...f, platform: ev.target.value })} className={selectCls}>
              <option value="all">iOS y Android</option>
              <option value="ios">Solo iOS</option>
              <option value="android">Solo Android</option>
            </select>
          </Field>
          {f.audienceType === 'course' ? (
            <Field label="Curso" className="sm:col-span-2">
              <select value={f.courseId} onChange={(ev) => setF({ ...f, courseId: ev.target.value })} className={selectCls}>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
          ) : null}
          {f.audienceType === 'user' ? (
            <Field label="Correo del usuario" name="userEmail" errors={e} className="sm:col-span-2">
              <input type="email" value={f.userEmail} onChange={(ev) => setF({ ...f, userEmail: ev.target.value })} className={inputCls} placeholder="cliente@correo.com" />
            </Field>
          ) : null}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-crema/70 px-3 py-2 text-sm">
          <Users className="size-4 text-ambar-700" />
          <span className="text-noche">Alcance estimado: <strong className="tabular-nums">{count == null ? '…' : count.toLocaleString('es-CO')}</strong> dispositivos</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-1 rounded-lg bg-crema p-1 text-sm">
            {(['now', 'later'] as const).map((w) => (
              <button key={w} type="button" onClick={() => setF({ ...f, when: w })} className={cn('flex-1 rounded-md px-3 py-1.5 font-medium', f.when === w ? 'bg-white text-noche shadow-sm' : 'text-gris')}>
                {w === 'now' ? 'Enviar ahora' : 'Programar'}
              </button>
            ))}
          </div>
          {f.when === 'later' ? (
            <Field label="" name="scheduledAt" errors={e} hint="Hora de Bogotá">
              <input type="datetime-local" value={f.scheduledAt} onChange={(ev) => setF({ ...f, scheduledAt: ev.target.value })} className={inputCls} />
            </Field>
          ) : null}
        </div>
        <SubmitButton className="w-full" pendingText="Enviando…" disabled={!f.title || !f.body}>
          <Send className="size-4" /> {f.when === 'now' ? `Enviar a ${count ?? '…'} dispositivos` : 'Programar campaña'}
        </SubmitButton>
      </form>

      <div className="xl:col-span-5">
        <div className="xl:sticky xl:top-20">
          <div className="mb-3 flex justify-center gap-1 rounded-lg bg-white p-1 text-sm shadow-sm">
            <button type="button" onClick={() => setPreview('ios')} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium', preview === 'ios' ? 'bg-noche text-crema' : 'text-gris')}><Apple className="size-4" /> iPhone</button>
            <button type="button" onClick={() => setPreview('android')} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium', preview === 'android' ? 'bg-noche text-crema' : 'text-gris')}><Smartphone className="size-4" /> Android</button>
          </div>
          <PhonePreview kind={preview} title={f.title || 'Título de la notificación'} body={f.body || 'Aquí verás cómo se lee el mensaje en la pantalla bloqueada.'} image={f.imageUrl} />
          <p className="mt-3 text-center text-xs text-gris">Al tocar: <code>{link || '/'}</code> · iOS corta el texto en ~4 líneas</p>
        </div>
      </div>
    </div>
  );
}

function PhonePreview({ kind, title, body, image }: { kind: 'ios' | 'android'; title: string; body: string; image: string | null }) {
  const ios = kind === 'ios';
  return (
    <div className={cn('relative mx-auto h-[560px] w-[290px] overflow-hidden border-[10px] border-[#1b1c1f] bg-cover bg-center shadow-[0_30px_60px_-20px_rgba(10,16,34,0.6)]', ios ? 'rounded-[2.8rem]' : 'rounded-[2rem]')} style={{ backgroundImage: 'linear-gradient(180deg, rgba(17,26,49,0.25), rgba(17,26,49,0.75)), url(/brand/fotos/manos-cafe-caicedo.webp)' }}>
      {ios ? <div className="absolute top-2 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" /> : <div className="absolute top-3 left-1/2 size-3 -translate-x-1/2 rounded-full bg-black" />}
      <div className="pt-14 text-center text-white">
        <p className={cn('font-light', ios ? 'text-6xl' : 'text-5xl')}>9:41</p>
        <p className="mt-1 text-sm opacity-90">miércoles, 7 de octubre</p>
      </div>
      <div className={cn('absolute inset-x-3 top-48 p-3 text-noche backdrop-blur-xl', ios ? 'rounded-2xl bg-white/75' : 'rounded-xl bg-white/90')}>
        <div className="flex items-center gap-2 text-[0.65rem] text-black/60">
          <span className="grid size-5 place-items-center rounded-md bg-noche text-[0.55rem] font-bold text-ambar-300">CT</span>
          <span className="font-medium uppercase">Café Travesía</span>
          <span className="ml-auto">{ios ? 'ahora' : '• ahora'}</span>
          {!ios ? <Bell className="size-3" /> : null}
        </div>
        <div className="mt-1.5 flex gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[0.82rem] font-semibold text-black">{title}</p>
            <p className={cn('text-[0.78rem] leading-snug text-black/80', ios ? 'line-clamp-4' : 'line-clamp-2')}>{body}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image && ios ? <img src={image} alt="" className="size-10 shrink-0 rounded-md object-cover" /> : null}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && !ios ? <img src={image} alt="" className="mt-2 aspect-[2/1] w-full rounded-lg object-cover" /> : null}
      </div>
    </div>
  );
}
