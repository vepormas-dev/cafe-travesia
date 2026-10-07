import { apiUser } from '@/lib/auth';
import { apiError, handle, json } from '@/lib/api';
import { listMyLearning } from '@/lib/academy';

/** GET /api/v1/academy/me (sesión) → { enrollments, certificates } */
export async function GET() {
  return handle('academy.me', async () => {
    const user = await apiUser();
    if (!user) return apiError('Inicia sesión para ver tus cursos', 401);
    const { enrollments, certificates } = await listMyLearning(user);
    return json(
      {
        enrollments: enrollments.map(({ course, progressPct, lastLessonId, status, completedAt }) => ({ course, progressPct, lastLessonId, status, completedAt })),
        certificates: certificates.map(({ code, courseTitle, issuedAt, url, hours, pdfUrl, courseSlug }) => ({ code, courseTitle, issuedAt, url, hours, pdfUrl, courseSlug })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  });
}
