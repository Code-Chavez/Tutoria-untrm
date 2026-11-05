import { REFERRAL_SERVICES } from '@domain/entities/StudentReferral';
import { UserAccessPolicy } from '@domain/entities/UserAccessPolicy';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';

export const ACCESS_KINDS: readonly UserAccessPolicy['kind'][] = ['NONE', 'OWN', 'SCHOOLS', 'FACULTIES', 'INSTITUTION', 'SERVICE'];

/** Roles cuyo alcance no se amplía desde la pantalla: el tutorado solo ve lo suyo (su portal) y la administración conserva toda la institución. */
export const STUDENT_ROLE_NAME = 'Tutorado';
export const ADMIN_ROLE_NAME = 'Administrador DBU';

export class AccessScopeInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessScopeInvalidError';
  }
}

export class AccessScopeNotConfigurableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessScopeNotConfigurableError';
  }
}

export interface AccessScopeInput {
  kind: UserAccessPolicy['kind'];
  schoolIds?: string[];
  facultyIds?: string[];
  service?: string | null;
}

export interface NormalizedAccessScope {
  kind: UserAccessPolicy['kind'];
  schoolIds: string[];
  facultyIds: string[];
  service: string | null;
}

/**
 * Deja solo lo que el tipo de alcance usa y comprueba que existan las escuelas, facultades o el servicio indicados:
 * un alcance de escuelas sin escuelas no daría acceso a nadie y confundiría a quien lo configura, así que se rechaza.
 */
export async function normalizeAccessScope(input: AccessScopeInput, schools: SchoolRepository, faculties: FacultyRepository): Promise<NormalizedAccessScope> {
  const schoolIds = [...new Set(input.schoolIds ?? [])].sort();
  const facultyIds = [...new Set(input.facultyIds ?? [])].sort();
  const service = input.service ?? null;
  switch (input.kind) {
    case 'SCHOOLS': {
      if (schoolIds.length === 0) throw new AccessScopeInvalidError('Elija al menos una escuela para el alcance por escuela.');
      const known = new Set((await schools.findAll()).map((s) => s.id));
      const missing = schoolIds.filter((id) => !known.has(id));
      if (missing.length > 0) throw new AccessScopeInvalidError('Alguna de las escuelas indicadas no existe.');
      return { kind: 'SCHOOLS', schoolIds, facultyIds: [], service: null };
    }
    case 'FACULTIES': {
      if (facultyIds.length === 0) throw new AccessScopeInvalidError('Elija al menos una facultad para el alcance por facultad.');
      const known = new Set((await faculties.findAll()).map((f) => f.id));
      const missing = facultyIds.filter((id) => !known.has(id));
      if (missing.length > 0) throw new AccessScopeInvalidError('Alguna de las facultades indicadas no existe.');
      return { kind: 'FACULTIES', schoolIds: [], facultyIds, service: null };
    }
    case 'SERVICE':
      if (!service || !(REFERRAL_SERVICES as readonly string[]).includes(service)) throw new AccessScopeInvalidError('Elija el servicio para el alcance por servicio.');
      return { kind: 'SERVICE', schoolIds: [], facultyIds: [], service };
    case 'OWN':
    case 'INSTITUTION':
    case 'NONE':
      return { kind: input.kind, schoolIds: [], facultyIds: [], service: null };
    default:
      throw new AccessScopeInvalidError('Tipo de alcance no válido.');
  }
}
