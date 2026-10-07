import { StudentAccessGuard, StudentScope } from '@application/access/StudentAccessGuard';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';

/**
 * Doble de la política de alcance para las pruebas que no son del alcance
 * mismo: deja pasar a todos (alcance total) pero conserva el comportamiento de
 * "no encontrado" cuando el tutorado no existe en el repositorio simulado.
 * La política real se prueba en StudentAccessGuard.test.ts.
 */
export function allowAllGuard(
  students: Pick<jest.Mocked<StudentRepository>, 'findById'>,
  scope: StudentScope = { kind: 'ALL' },
): jest.Mocked<StudentAccessGuard> {
  const assertAccess = jest.fn(async (_requesterId: string, studentId: string) => {
    const student = await students.findById(studentId);
    if (!student) throw new StudentNotFoundError(studentId);
    return student;
  });
  return {
    scopeFor: jest.fn().mockResolvedValue(scope),
    assertAccess,
    assertAccessToAll: jest.fn(async (requesterId: string, ids: string[]) => {
      const found = [];
      for (const id of ids) found.push(await assertAccess(requesterId, id));
      return found;
    }),
    assertSchoolAccess: jest.fn().mockResolvedValue(undefined),
    visibleStudentIds: jest.fn().mockResolvedValue(null),
    canSeeSession: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<StudentAccessGuard>;
}
