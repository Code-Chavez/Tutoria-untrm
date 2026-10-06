import { GetConsolidatedReportUseCase } from '@application/use-cases/consolidated-reports/GetConsolidatedReportUseCase';
import { ConsolidatedReportForbiddenError } from '@application/use-cases/consolidated-reports/ConsolidatedReportErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import { Student } from '@domain/entities/Student';

const day = (d: string) => new Date(`2026-${d}T10:00:00Z`);

const student = (id: string, schoolId: string, tutorId: string | null, isActive = true) =>
  ({ id, schoolId, tutorId, isActive }) as Student;

const session = (id: string, studentIds: string[], over: Partial<SessionWithParticipants> = {}) =>
  ({
    id,
    studentIds,
    scheduledAt: day('09-10'),
    endsAt: day('09-10'),
    cancelledAt: null,
    ...over,
  }) as SessionWithParticipants;

describe('GetConsolidatedReportUseCase (HU-44)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let students: jest.Mocked<StudentRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let faculties: jest.Mocked<FacultyRepository>;
  let reports: jest.Mocked<TutorSemesterReportRepository>;
  let roleName: string;

  beforeEach(() => {
    roleName = 'Administrador DBU';
    users = { findById: jest.fn().mockResolvedValue({ id: 'u', roleId: 'r' }) } as unknown as jest.Mocked<UserRepository>;
    roles = {
      findById: jest.fn().mockImplementation(async () => ({ id: 'r', name: roleName })),
    } as unknown as jest.Mocked<RoleRepository>;
    periods = {
      findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II', startDate: day('08-01'), endDate: day('12-31') }),
    } as unknown as jest.Mocked<AcademicPeriodRepository>;
    schools = {
      findAll: jest.fn().mockResolvedValue([
        { id: 'sc1', name: 'Sistemas', facultyId: 'f1' },
        { id: 'sc2', name: 'Civil', facultyId: 'f1' },
        { id: 'sc3', name: 'Enfermería', facultyId: 'f2' },
      ]),
    } as unknown as jest.Mocked<SchoolRepository>;
    faculties = {
      findAll: jest.fn().mockResolvedValue([
        { id: 'f1', name: 'Ingeniería' },
        { id: 'f2', name: 'Salud' },
      ]),
    } as unknown as jest.Mocked<FacultyRepository>;
    students = {
      findAll: jest.fn().mockResolvedValue([
        student('a', 'sc1', 't1'),
        student('b', 'sc1', 't1'),
        student('c', 'sc1', null), // sin tutor
        student('d', 'sc2', 't1'), // t1 atiende dos escuelas
        student('e', 'sc3', 't2'),
        student('x', 'sc1', 't1', false), // inactivo: no cuenta
      ]),
    } as unknown as jest.Mocked<StudentRepository>;
    sessions = {
      findAll: jest.fn().mockResolvedValue([
        session('1', ['a']),
        session('2', ['b']),
        session('3', ['a', 'd']), // grupal que abarca sc1 y sc2
        session('4', ['e']),
        session('5', ['a'], { cancelledAt: day('09-11') }),
        session('6', ['a'], { scheduledAt: day('01-10'), endsAt: day('01-10') }),
      ]),
    } as unknown as jest.Mocked<SessionRepository>;
    reports = {
      findByPeriodAndTutor: jest.fn(),
      findAllByPeriod: jest.fn().mockResolvedValue([{ tutorId: 't1' }]),
      upsert: jest.fn(),
    } as unknown as jest.Mocked<TutorSemesterReportRepository>;
  });

  const run = (filters?: { facultyId?: string; schoolId?: string }) =>
    new GetConsolidatedReportUseCase(users, roles, periods, sessions, students, schools, faculties, reports).execute('u', filters);

  it('calcula las métricas por escuela', async () => {
    const report = await run();
    const sistemas = report.faculties[0].schools.find((s) => s.schoolName === 'Sistemas')!.metrics;
    expect(sistemas).toMatchObject({
      activeStudents: 3,
      studentsWithTutor: 2,
      coveragePct: 66.7,
      tutors: 1,
      sessionsIndividual: 2,
      sessionsGroup: 1,
      sessionsTotal: 3,
      participants: 2, // a y b (c nunca asistió)
      participationPct: 66.7,
      reportsSubmitted: 1,
      reportsPct: 100,
      avgStudentsPerTutor: 2,
      avgSessionsPerTutor: 3,
    });
  });

  it('ignora sesiones canceladas, fuera del periodo y alumnos inactivos', async () => {
    const report = await run();
    expect(report.totals.activeStudents).toBe(5);
    expect(report.totals.sessionsTotal).toBe(4); // 1, 2, 3 y 4
  });

  it('no cuenta dos veces al tutor ni a la sesión grupal que abarca varias escuelas', async () => {
    const report = await run();
    const ing = report.faculties.find((f) => f.facultyName === 'Ingeniería')!.metrics;
    expect(ing.tutors).toBe(1); // t1 atiende sc1 y sc2
    expect(ing.sessionsTotal).toBe(3);
    expect(report.totals.tutors).toBe(2);
    expect(report.totals.reportsSubmitted).toBe(1);
    expect(report.totals.reportsPct).toBe(50);
  });

  it('filtra por facultad y por escuela', async () => {
    const byFaculty = await run({ facultyId: 'f2' });
    expect(byFaculty.faculties.map((f) => f.facultyName)).toEqual(['Salud']);
    expect(byFaculty.totals.activeStudents).toBe(1);

    const bySchool = await run({ schoolId: 'sc2' });
    expect(bySchool.faculties[0].schools.map((s) => s.schoolName)).toEqual(['Civil']);
  });

  it('expone todas las facultades y escuelas como opciones de filtro, aun con filtro aplicado', async () => {
    const report = await run({ facultyId: 'f2' });
    expect(report.filterOptions.faculties.map((f) => f.id)).toEqual(['f1', 'f2']);
    expect(report.filterOptions.schools).toHaveLength(3);
  });

  it('una escuela sin datos devuelve ceros, no NaN', async () => {
    students.findAll.mockResolvedValue([]);
    sessions.findAll.mockResolvedValue([]);
    const { totals } = await run();
    expect(totals).toMatchObject({ coveragePct: 0, participationPct: 0, avgSessionsPerTutor: 0, reportsPct: 0 });
  });

  it('permite a la DBU y al Vicerrectorado, y rechaza a los demás roles', async () => {
    roleName = 'Vicerrectorado';
    await expect(run()).resolves.toBeDefined();
    roleName = 'Coordinador';
    await expect(run()).rejects.toBeInstanceOf(ConsolidatedReportForbiddenError);
    roleName = 'Docente Tutor';
    await expect(run()).rejects.toBeInstanceOf(ConsolidatedReportForbiddenError);
  });

  it('exige periodo activo', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(run()).rejects.toBeInstanceOf(NoActivePeriodError);
  });
});
