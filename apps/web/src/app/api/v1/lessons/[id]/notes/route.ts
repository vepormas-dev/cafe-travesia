import { z } from 'zod';
import { apiUser } from '@/lib/auth';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { addNote, deleteNote, listNotes, updateNote } from '@/lib/academy';

type Ctx = { params: Promise<{ id: string }> };
const noteSchema = z.object({ atS: z.number().int().min(0).max(86_400), body: z.string().trim().min(1, 'Escribe tu nota').max(2000) });
const patchSchema = z.object({ id: z.string().min(1).max(64), body: z.string().trim().min(1, 'Escribe tu nota').max(2000) });

const fail = (r: { status: number; error: string }) => (r.status === 503 ? demoBlocked() : apiError(r.error, r.status));

/** GET /api/v1/lessons/:id/notes → { notes } */
export async function GET(_req: Request, ctx: Ctx) {
  return handle('notes.list', async () => {
    const { id } = await ctx.params;
    const r = await listNotes(await apiUser(), id);
    return r.ok ? json({ notes: r.notes }, { headers: { 'Cache-Control': 'private, no-store' } }) : fail(r);
  });
}

/** POST /api/v1/lessons/:id/notes { atS, body } → { note } */
export async function POST(req: Request, ctx: Ctx) {
  return handle('notes.add', async () => {
    const limited = await rateLimit(req, 'notes', 60, 600);
    if (limited) return limited;
    const [data, err] = await parseBody(req, noteSchema);
    if (err) return err;
    const { id } = await ctx.params;
    const r = await addNote(await apiUser(), id, data);
    return r.ok ? json({ note: r.note }, 201) : fail(r);
  });
}

/** PATCH /api/v1/lessons/:id/notes { id, body } (extensión del contrato: editar nota) */
export async function PATCH(req: Request, ctx: Ctx) {
  return handle('notes.update', async () => {
    const limited = await rateLimit(req, 'notes', 60, 600);
    if (limited) return limited;
    const [data, err] = await parseBody(req, patchSchema);
    if (err) return err;
    const { id } = await ctx.params;
    const r = await updateNote(await apiUser(), id, data.id, data.body);
    return r.ok ? json({ ok: true }) : fail(r);
  });
}

/** DELETE /api/v1/lessons/:id/notes?noteId= (extensión del contrato: borrar nota) */
export async function DELETE(req: Request, ctx: Ctx) {
  return handle('notes.delete', async () => {
    const noteId = new URL(req.url).searchParams.get('noteId');
    if (!noteId) return apiError('Falta noteId', 422);
    const { id } = await ctx.params;
    const r = await deleteNote(await apiUser(), id, noteId);
    return r.ok ? json({ ok: true }) : fail(r);
  });
}
