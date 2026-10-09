import { Student } from '@domain/entities/Student';
import { StudentFilters, StudentRepository } from '@domain/repositories/StudentRepository';
import { scopeCovers, StudentAccessGuard } from '@application/access/StudentAccessGuard';

/**
 * Lista los tutorados que el solicitante puede ver: la DBU, todos; el
 * coordinador, los de sus escuelas; el tutor, los que tiene asignados. Los
 * filtros del cliente solo acotan dentro de ese alcance; nunca lo amplían.
 */
export class ListStudentsUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(requesterId: string, filters: StudentFilters = {}): Promise<Student[]> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind === 'NONE') return [];

    const query: StudentFilters = { ...filters };
    if (scope.kind === 'TUTOR') query.tutorId = scope.tutorId;
    if (scope.kind === 'SCHOOLS' && filters.schoolId && !scope.schoolIds.includes(filters.schoolId)) return [];

    // El filtro de la base acota; la verificación final es la que garantiza el alcance
    // (p. ej. "sin tutor" combinado con el tutor propio no debe devolver estudiantes ajenos).
    return (await this.students.findAll(query)).filter((student) => scopeCovers(scope, student));
  }
}
