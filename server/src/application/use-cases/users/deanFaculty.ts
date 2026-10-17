import { FacultyRepository } from '@domain/repositories/FacultyRepository';

export const DEAN_ROLE_NAME = 'Decano';

export class DeanFacultyRequiredError extends Error {
  constructor() {
    super('Elija la facultad del decano: solo puede amonestar a los docentes de su facultad.');
    this.name = 'DeanFacultyRequiredError';
  }
}

/** Facultad que corresponde guardar según el rol: el Decano pertenece a una facultad; en los demás roles no tiene sentido y se descarta. */
export async function resolveDeanFaculty(
  faculties: FacultyRepository | undefined,
  roleName: string,
  facultyId: string | null | undefined,
): Promise<string | null> {
  if (roleName !== DEAN_ROLE_NAME) return null;
  if (!facultyId || !faculties) throw new DeanFacultyRequiredError();
  const faculty = (await faculties.findAll()).find((f) => f.id === facultyId);
  if (!faculty) throw new DeanFacultyRequiredError();
  return faculty.id;
}
