import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { Student } from '@domain/entities/Student';
import { School } from '@domain/entities/School';
import { User } from '@domain/entities/User';
import { SessionWithParticipants } from '@domain/entities/Session';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentRepository, StudentFilters } from '@domain/repositories/StudentRepository';

/**
 * Escenario de pruebas con dos escuelas, dos coordinadores y tres tutores, para
 * comprobar el alcance con la política REAL (no con dobles):
 *
 *   Escuela A (coordina coordA): a1, a2 → tutorA1 · a3 → tutorA2 · a4 sin tutor
 *   Escuela B (coordina coordB): b1 → tutorB
 */
export const ROLE_OF: Record<string, string> = {
  dbu: 'Administrador DBU',
  coordA: 'Coordinador',
  coordB: 'Coordinador',
  tutorA1: 'Docente Tutor',
  tutorA2: 'Docente Tutor',
  tutorB: 'Docente Tutor',
  vice: 'Vicerrectorado',
  prof: 'Profesional de Servicio',
  pupil: 'Tutorado',
  gone: 'Docente Tutor', // tutor dado de baja
};

const user = (id: string, over: Partial<User> = {}): User =>
  ({ id, roleId: `role:${ROLE_OF[id]}`, firstName: id, lastName: 'X', isActive: true, ...over }) as User;

export const USERS: User[] = Object.keys(ROLE_OF).map((id) => user(id, id === 'gone' ? { isActive: false } : {}));

export const SCHOOLS: School[] = [
  { id: 'A', name: 'Escuela A', facultyId: 'f', isActive: true, coordinatorId: 'coordA', createdAt: new Date() },
  { id: 'B', name: 'Escuela B', facultyId: 'f', isActive: true, coordinatorId: 'coordB', createdAt: new Date() },
];

const student = (id: string, schoolId: string, tutorId: string | null): Student =>
  ({ id, studentCode: id, firstName: id, lastName: 'E', cycle: 3, schoolId, tutorId, isActive: true, isAtRisk: false }) as Student;

export const STUDENTS: Student[] = [
  student('a1', 'A', 'tutorA1'),
  student('a2', 'A', 'tutorA1'),
  student('a3', 'A', 'tutorA2'),
  student('a4', 'A', null),
  student('b1', 'B', 'tutorB'),
];

export const session = (id: string, tutorId: string, studentIds: string[]): SessionWithParticipants =>
  ({
    id,
    tutorId,
    studentIds,
    topic: 'Tema',
    scheduledAt: new Date('2026-10-01T10:00:00Z'),
    endsAt: new Date('2026-10-01T10:45:00Z'),
    cancelledAt: null,
    attendance: null,
  }) as unknown as SessionWithParticipants;

function matches(s: Student, f: StudentFilters = {}): boolean {
  return (
    (!f.schoolId || s.schoolId === f.schoolId) &&
    (f.cycle === undefined || s.cycle === f.cycle) &&
    (f.isActive === undefined || s.isActive === f.isActive) &&
    (f.isAtRisk === undefined || s.isAtRisk === f.isAtRisk) &&
    (!f.tutorId || s.tutorId === f.tutorId) &&
    (!f.unassigned || s.tutorId === null)
  );
}

/** Repositorios en memoria con el escenario anterior y la política de alcance real sobre ellos. */
export function buildWorld() {
  const students = {
    findById: jest.fn(async (id: string) => STUDENTS.find((s) => s.id === id) ?? null),
    findAll: jest.fn(async (f?: StudentFilters) => STUDENTS.filter((s) => matches(s, f))),
    findByCode: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(async (id: string, data: Partial<Student>) => ({ ...STUDENTS.find((s) => s.id === id)!, ...data })),
    assignTutor: jest.fn(async (ids: string[]) => ids.length),
    countByTutor: jest.fn(),
  } as unknown as jest.Mocked<StudentRepository>;

  const users = {
    findById: jest.fn(async (id: string) => USERS.find((u) => u.id === id) ?? null),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;

  const roles = {
    findById: jest.fn(async (id: string) => ({ id, name: id.replace('role:', '') })),
    findByName: jest.fn(async (name: string) => ({ id: `role:${name}`, name })),
    findAll: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<RoleRepository>;

  const schools = {
    findAll: jest.fn(async () => SCHOOLS),
    findById: jest.fn(async (id: string) => SCHOOLS.find((s) => s.id === id) ?? null),
  } as unknown as jest.Mocked<SchoolRepository>;

  const guard = new StudentAccessGuard(users, roles, schools, students);
  return { students, users, roles, schools, guard };
}
