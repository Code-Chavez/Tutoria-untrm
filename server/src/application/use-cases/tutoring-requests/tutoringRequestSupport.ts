import { TutoringRequest, TutoringRequestView, TutoringCaseType } from '@domain/entities/TutoringRequest';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

export const CASE_TYPE_LABEL: Record<TutoringCaseType, string> = {
  ACADEMIC: 'Académico',
  PSYCHOLOGICAL: 'Psicológico',
  SOCIAL: 'Social',
  HEALTH: 'Salud',
};

/**
 * Quién gestiona una solicitud: la DBU, a quien se le enrutó, y quien tiene alcance sobre el tutorado
 * (su tutor o el coordinador de su escuela). Nadie más la ve ni la modifica.
 */
export async function canManageTutoringRequest(
  guard: StudentAccessGuard,
  requesterId: string,
  request: Pick<TutoringRequest, 'routedToId' | 'studentId'>,
): Promise<boolean> {
  const scope = await guard.scopeFor(requesterId);
  if (scope.kind === 'ALL') return true;
  if (scope.kind === 'NONE') return false;
  if (request.routedToId === requesterId) return true;
  return guard
    .assertAccess(requesterId, request.studentId)
    .then(() => true)
    .catch(() => false);
}

/** Resuelve los nombres (estudiante, destinatario, quien atendió) de un conjunto de solicitudes. */
export async function toTutoringRequestViews(
  requests: TutoringRequest[],
  students: StudentRepository,
  users: UserRepository,
): Promise<TutoringRequestView[]> {
  const studentCache = new Map<string, Awaited<ReturnType<StudentRepository['findById']>>>();
  const userCache = new Map<string, string>();
  const userName = async (id: string | null): Promise<string | null> => {
    if (!id) return null;
    if (!userCache.has(id)) {
      const user = await users.findById(id);
      userCache.set(id, user ? `${user.firstName} ${user.lastName}` : 'Desconocido');
    }
    return userCache.get(id) ?? null;
  };

  const views: TutoringRequestView[] = [];
  for (const request of requests) {
    if (!studentCache.has(request.studentId)) studentCache.set(request.studentId, await students.findById(request.studentId));
    const student = studentCache.get(request.studentId);
    views.push({
      ...request,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Desconocido',
      studentCode: student?.studentCode ?? '—',
      routedToName: (await userName(request.routedToId)) ?? 'Desconocido',
      handledByName: await userName(request.handledById),
    });
  }
  return views;
}
