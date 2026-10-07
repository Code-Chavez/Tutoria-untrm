import { GetConsolidatedReportUseCase } from '@application/use-cases/consolidated-reports/GetConsolidatedReportUseCase';
import { ConsolidatedReportForbiddenError } from '@application/use-cases/consolidated-reports/ConsolidatedReportErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { ReportFilters } from '@application/use-cases/report-filters/reportFilters';
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
    attendedStudentIds: studentIds, // salvo que la prueba diga lo contrario, asistieron todos
    absentStudentIds: [],
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
      findAll: jest.fn(),
      findById: jest.fn(),
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

  const run = (filters?: ReportFilters) =>
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

  it('filtra por ciclo del tutorado', async () => {
    students.findAll.mockResolvedValue([
      { id: 'a', schoolId: 'sc1', tutorId: 't1', isActive: true, cycle: 3 },
      { id: 'b', schoolId: 'sc1', tutorId: 't1', isActive: true, cycle: 5 },
    ] as never);
    sessions.findAll.mockResolvedValue([session('1', ['a']), session('2', ['b'])]);

    const report = await run({ cycle: 5 });

    expect(report.totals.activeStudents).toBe(1);
    expect(report.totals.sessionsTotal).toBe(1);
    expect(report.appliedFilters).toEqual(['Ciclo: 5']);
  });

  it('filtra por tutor: solo sus tutorados y sus sesiones', async () => {
    sessions.findAll.mockResolvedValue([
      session('1', ['a'], { tutorId: 't1' } as never),
      session('2', ['d'], { tutorId: 't2' } as never),
    ]);

    const report = await run({ tutorId: 't1' });

    expect(report.totals.tutors).toBe(1);
    expect(report.totals.activeStudents).toBe(3); // a, b y d tienen t1
    expect(report.totals.sessionsTotal).toBe(1);
  });

  it('combina filtros y los describe: facultad + escuela + ciclo', async () => {
    students.findAll.mockResolvedValue([{ id: 'a', schoolId: 'sc1', tutorId: 't1', isActive: true, cycle: 2 }] as never);
    const report = await run({ facultyId: 'f1', schoolId: 'sc1', cycle: 2 });
    expect(report.appliedFilters).toEqual(['Facultad: Ingeniería', 'Escuela: Sistemas', 'Ciclo: 2']);
    expect(report.totals.activeStudents).toBe(1);
  });

  it('consulta el semestre indicado: sus informes y su rango de fechas', async () => {
    periods.findById.mockResolvedValue({ id: 'p0', name: '2026-I', startDate: day('01-01'), endDate: day('07-31') } as never);
    sessions.findAll.mockResolvedValue([
      session('old', ['a'], { scheduledAt: day('03-10'), endsAt: day('03-10') }),
      session('new', ['a']),
    ]);

    const report = await run({ periodId: 'p0' });

    expect(report.periodName).toBe('2026-I');
    expect(report.totals.sessionsTotal).toBe(1); // solo la de marzo
    expect(reports.findAllByPeriod).toHaveBeenCalledWith('p0');
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

  describe('participación basada en la asistencia (A07)', () => {
    it('una sesión vencida sin asistentes aporta cero sesiones y cero participación', async () => {
      sessions.findAll.mockResolvedValue([
        session('sin-registro', ['a'], { attendedStudentIds: [], absentStudentIds: [] }),
        session('inasistencia', ['b'], { attendedStudentIds: [], absentStudentIds: ['b'] }),
      ]);

      const { totals } = await run();

      expect(totals.sessionsTotal).toBe(0);
      expect(totals.participants).toBe(0);
      expect(totals.participationPct).toBe(0);
    });

    it('una grupal con 2 asistentes de 5 programados aporta 2 participantes, no 5', async () => {
      students.findAll.mockResolvedValue(
        ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, schoolId: 'sc1', tutorId: 't1', isActive: true, cycle: 1 })) as never,
      );
      sessions.findAll.mockResolvedValue([
        session('g', ['a', 'b', 'c', 'd', 'e'], { attendedStudentIds: ['a', 'b'], absentStudentIds: ['c', 'd', 'e'] }),
      ]);

      const { totals } = await run();

      expect(totals.sessionsGroup).toBe(1);
      expect(totals.participants).toBe(2);
      expect(totals.participationPct).toBe(40); // 2 de 5 tutorados
    });

    it('solo cuenta a los asistentes de cada escuela cuando la grupal abarca varias', async () => {
      sessions.findAll.mockResolvedValue([
        session('g', ['a', 'd'], { attendedStudentIds: ['a'], absentStudentIds: ['d'] }), // a (Sistemas) asistió; d (Civil) no
      ]);

      const report = await run();
      const sistemas = report.faculties[0].schools.find((s) => s.schoolName === 'Sistemas')!.metrics;
      const civil = report.faculties[0].schools.find((s) => s.schoolName === 'Civil')!.metrics;

      expect(sistemas.sessionsTotal).toBe(1);
      expect(sistemas.participants).toBe(1);
      expect(civil.sessionsTotal).toBe(0); // la sesión no cuenta para quien no asistió
      expect(civil.participants).toBe(0);
    });
  });
});
