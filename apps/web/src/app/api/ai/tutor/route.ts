import { aiTutorSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { apiError, handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { aiChat, BRAND_VOICE, type AiMessage } from '@/lib/ai';
import { getLessonForUser, instructorPersona, ruleBasedTutor } from '@/lib/academy';

/** POST /api/ai/tutor (sesión + acceso a la lección) { lessonId, question, history? } → { answer, lessons: {id,title}[], ai } */
export async function POST(req: Request) {
  return handle('ai.tutor', async () => {
    const limited = await rateLimit(req, 'tutor', 20, 300);
    if (limited) return limited;
    const [data, err] = await parseBody(req, aiTutorSchema);
    if (err) return err;
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión para hablar con el tutor', 401);
    const r = await getLessonForUser(user, data.lessonId);
    if (r.status !== 200) return apiError(r.error, r.status);
    const { lesson, course, content, access } = r;
    const persona = instructorPersona(course);
    const lessonsIndex = content.lessons.map((l, i) => `${i + 1}. [${l.id}] ${l.title}: ${l.summary ?? ''}`).join('\n');

    const system = `${BRAND_VOICE}
Eres ${persona.name}, ${persona.role}, y actúas como tutor del curso «${course.title}» (nivel ${course.level}) de la Academia Travesía.
Responde dudas del estudiante sobre la lección actual y el curso: claro, práctico, paso a paso cuando sirva, con ejemplos de barra o de finca. Máximo ~180 palabras, en Markdown sencillo.
Si la pregunta no tiene que ver con café o con el curso, redirígela con amabilidad. No inventes datos técnicos que contradigan el contenido.
Cuando recomiendes repasar una lección del temario, menciónala por su título exacto.

LECCIÓN ACTUAL: ${lesson.title}
Resumen: ${lesson.summary ?? '—'}
Contenido:
${(lesson.content ?? '').slice(0, 6000)}

TEMARIO DEL CURSO (id, título y resumen):
${lessonsIndex}`;

    const messages: AiMessage[] = [{ role: 'system', content: system }, ...(data.history ?? []).slice(-8), { role: 'user', content: data.question }];
    const answer = await aiChat(messages, { feature: 'academy.tutor', maxTokens: 600, temperature: 0.4 });

    if (answer) {
      const lower = answer.toLowerCase();
      const cited = content.lessons.filter((l) => l.id !== lesson.id && lower.includes(l.title.toLowerCase())).slice(0, 3);
      const lessons = cited.length ? cited : ruleBasedTutor(data.question, content.lessons, lesson.id, access.enrolled).lessons;
      return json({ answer, lessons: lessons.map((l) => ({ id: l.id, title: l.title })), ai: true });
    }
    const fb = ruleBasedTutor(data.question, content.lessons, lesson.id, access.enrolled);
    return json({ answer: fb.answer, lessons: fb.lessons, ai: false });
  });
}
