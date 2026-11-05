import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { TUTOR_ROLE_NAME } from '@application/use-cases/assignments/TutorValidation';

export class TutorSchoolRequiredError extends Error {
  constructor() {
    super('Elija la escuela profesional del docente tutor: solo puede tutorear estudiantes de su escuela.');
    this.name = 'TutorSchoolRequiredError';
  }
}

/**
 * Escuela que corresponde guardar según el rol. El docente tutor pertenece a una escuela (de ahí salen su facultad y su sede);
 * para los demás roles la escuela no tiene sentido y se descarta.
 */
export async function resolveTutorSchool(
  schools: SchoolRepository,
  roleName: string,
  schoolId: string | null | undefined,
): Promise<string | null> {
  if (roleName !== TUTOR_ROLE_NAME) return null;
  if (!schoolId) throw new TutorSchoolRequiredError();
  const school = await schools.findById(schoolId);
  if (!school || !school.isActive) throw new TutorSchoolRequiredError();
  return school.id;
}
