import { Student } from '@domain/entities/Student';
import { SessionWithParticipants } from '@domain/entities/Session';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { StudentAccessDeniedError, StudentNotFoundError } from '@application/use-cases/students/StudentErrors';

/**
 * Alcance de una persona sobre los tutorados (Art. 9.a y 14.c del Protocolo):
 * la DBU ve a todos; el Coordinador, a los de las escuelas que coordina; el
 * Docente Tutor, solo a los que tiene asignados. Cualquier otro rol no accede
 * a datos individuales. Es la única fuente de esta regla: todo endpoint que
 * lea o escriba datos de un tutorado pasa por aquí, no por filtros del cliente.
 */
export type StudentScope =
  | { kind: 'ALL' }
  | { kind: 'SCHOOLS'; schoolIds: string[] }
  | { kind: 'TUTOR'; tutorId: string }
  | { kind: 'NONE' };

export function scopeCovers(scope: StudentScope, student: Pick<Student, 'schoolId' | 'tutorId'>): boolean {
  switch (scope.kind) {
    case 'ALL':
      return true;
    case 'SCHOOLS':
      return scope.schoolIds.includes(student.schoolId);
    case 'TUTOR':
      return student.tutorId === scope.tutorId;
    default:
      return false;
  }
}

export class StudentAccessGuard {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly students: StudentRepository,
  ) {}

  async scopeFor(requesterId: string): Promise<StudentScope> {
    const user = await this.users.findById(requesterId);
    if (!user || user.isActive === false) return { kind: 'NONE' };
    const role = await this.roles.findById(user.roleId);
    switch (role?.name) {
      case 'Administrador DBU':
        return { kind: 'ALL' };
      case 'Coordinador': {
        const schools = await this.schools.findAll();
        return { kind: 'SCHOOLS', schoolIds: schools.filter((s) => s.coordinatorId === requesterId).map((s) => s.id) };
      }
      case 'Docente Tutor':
        return { kind: 'TUTOR', tutorId: requesterId };
      default:
        return { kind: 'NONE' };
    }
  }

  /**
   * El tutorado, si existe y está dentro del alcance. Fuera de él se responde
   * "no encontrado": no se confirma ni siquiera que el estudiante exista.
   */
  async assertAccess(requesterId: string, studentId: string): Promise<Student> {
    const student = await this.students.findById(studentId);
    if (!student) throw new StudentNotFoundError(studentId);
    if (!scopeCovers(await this.scopeFor(requesterId), student)) throw new StudentNotFoundError(studentId);
    return student;
  }

  /** Igual que assertAccess para varios tutorados (p. ej. los participantes de una sesión). */
  async assertAccessToAll(requesterId: string, studentIds: string[]): Promise<Student[]> {
    const scope = await this.scopeFor(requesterId);
    const found: Student[] = [];
    for (const id of studentIds) {
      const student = await this.students.findById(id);
      if (!student || !scopeCovers(scope, student)) throw new StudentNotFoundError(id);
      found.push(student);
    }
    return found;
  }

  /** Quién puede dar de alta o mover tutorados en una escuela: la DBU y el coordinador de esa escuela. */
  async assertSchoolAccess(requesterId: string, schoolId: string): Promise<void> {
    const scope = await this.scopeFor(requesterId);
    const allowed = scope.kind === 'ALL' || (scope.kind === 'SCHOOLS' && scope.schoolIds.includes(schoolId));
    if (!allowed) throw new StudentAccessDeniedError();
  }

  /** Identificadores de los tutorados visibles, o null si el alcance es total (no hace falta filtrar). */
  async visibleStudentIds(scope: StudentScope): Promise<Set<string> | null> {
    if (scope.kind === 'ALL') return null;
    if (scope.kind === 'NONE') return new Set();
    const all = await this.students.findAll(scope.kind === 'TUTOR' ? { tutorId: scope.tutorId } : {});
    return new Set(all.filter((s) => scopeCovers(scope, s)).map((s) => s.id));
  }

  /**
   * Una sesión es visible para la DBU, para su tutor y para el coordinador de
   * una escuela a la que pertenezca algún participante.
   */
  async canSeeSession(requesterId: string, session: SessionWithParticipants): Promise<boolean> {
    const scope = await this.scopeFor(requesterId);
    if (scope.kind === 'ALL') return true;
    if (scope.kind === 'TUTOR') return session.tutorId === scope.tutorId;
    if (scope.kind === 'NONE') return false;
    for (const id of session.studentIds) {
      const student = await this.students.findById(id);
      if (student && scopeCovers(scope, student)) return true;
    }
    return false;
  }
}
