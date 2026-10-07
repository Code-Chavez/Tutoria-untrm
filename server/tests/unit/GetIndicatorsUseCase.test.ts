import { GetIndicatorsUseCase } from '@application/use-cases/indicators/GetIndicatorsUseCase';
import { IndicatorsForbiddenError } from '@application/use-cases/indicators/IndicatorsErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { ReportFilters } from '@application/use-cases/report-filters/reportFilters';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import { Student } from '@domain/entities/Student';
import { StudentReferral } from '@domain/entities/StudentReferral';

const day = (d: string) => new Date(`2026-${d}T10:00:00Z`);

const student = (id: string, schoolId: string, tutorId: string | null, isAtRisk = false) =>
  ({ id, schoolId, tutorId, isAtRisk, isActive: true }) as Student;

const session = (id: string, tutorId: string, studentIds: string[], over: Partial<SessionWithParticipants> = {}) =>
  ({ id, tutorId, studentIds, attendedStudentIds: studentIds, absentStudentIds: [], scheduledAt: day('09-10'), endsAt: day('09-10'), cancelledAt: null, ...over }) as SessionWithParticipants;

const referral = (studentId: string, service: string, status = 'ENVIADO', createdAt = day('09-12')) =>
  ({ studentId, service, status, createdAt }) as unknown as StudentReferral;

describe('GetIndicatorsUseCase (HU-45)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let students: jest.Mocked<StudentRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let faculties: jest.Mocked<FacultyRepository>;
  let referrals: jest.Mocked<StudentReferralRepository>;
  let evaluations: jest.Mocked<TutorEvaluationRepository>;
  let roleName: string;

  beforeEach(() => {
    roleName = 'Administrador DBU';
    users = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'me'
          ? { id: 'me', roleId: 'r' }
          : { id, firstName: id.toUpperCase(), lastName: 'Tutor' },
      ),
    } as unknown as jest.Mocked<UserRepository>;
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
        { id: 'sc1', name: 'Sistemas', facultyId: 'f1', coordinatorId: 'me' },
        { id: 'sc2', name: 'Civil', facultyId: 'f1', coordinatorId: 'otro' },
      ]),
    } as unknown as jest.Mocked<SchoolRepository>;
    faculties = {
      findAll: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Ingeniería' }]),
    } as unknown as jest.Mocked<FacultyRepository>;
    students = {
      findAll: jest.fn().mockResolvedValue([
        student('a', 'sc1', 't1', true),
        student('b', 'sc1', 't1'),
        student('c', 'sc1', null),
        student('d', 'sc2', 't2', true),
      ]),
    } as unknown as jest.Mocked<StudentRepository>;
    sessions = {
      findAll: jest.fn().mockResolvedValue([
        session('1', 't1', ['a']),
        session('2', 't1', ['a', 'b'], { scheduledAt: day('10-05'), endsAt: day('10-05') }),
        session('3', 't2', ['d']),
        session('4', 't1', ['b'], { cancelledAt: day('09-11') }),
      ]),
    } as unknown as jest.Mocked<SessionRepository>;
    referrals = {
      findMany: jest.fn().mockResolvedValue([
        referral('a', 'PSICOLOGIA'),
        referral('b', 'PSICOLOGIA', 'ATENDIDO'),
        referral('d', 'SALUD'),
        referral('a', 'ESCUELA', 'ENVIADO', day('01-01')), // fuera del periodo
      ]),
    } as unknown as jest.Mocked<StudentReferralRepository>;
    evaluations = {
      findAnonymizedScoresByPeriod: jest.fn().mockResolvedValue([
        { tutorId: 't1', scores: ['S', 'S', 'CS', 'CS'] },
        { tutorId: 't2', scores: ['N', 'N', 'CN', 'CN'] },
      ]),
    } as unknown as jest.Mocked<TutorEvaluationRepository>;
  });

  const run = (filters?: ReportFilters) =>
    new GetIndicatorsUseCase(users, roles, periods, sessions, students, schools, faculties, referrals, evaluations).execute('me', filters);

  it('calcula tutorados, riesgo y cobertura de sesiones', async () => {
    const r = await run();
    expect(r.students).toEqual({ active: 4, withTutor: 3, withoutTutor: 1, assignedPct: 75 });
    expect(r.risk).toMatchObject({ atRisk: 2, atRiskPct: 50 });
    expect(r.risk.bySchool).toEqual([
      { schoolId: 'sc2', schoolName: 'Civil', active: 1, atRisk: 1 },
      { schoolId: 'sc1', schoolName: 'Sistemas', active: 3, atRisk: 1 },
    ]);
    expect(r.sessions).toMatchObject({
      individual: 2,
      group: 1,
      total: 3, // la cancelada no cuenta
      studentsServed: 3, // a, b y d
      coveragePct: 75,
    });
    expect(r.sessions.byMonth).toEqual([
      { month: '2026-09', individual: 2, group: 0 },
      { month: '2026-10', individual: 0, group: 1 },
    ]);
  });

  it('agrupa derivaciones por servicio y estado dentro del periodo', async () => {
    const r = await run();
    expect(r.referrals.total).toBe(3);
    expect(r.referrals.byService).toEqual([
      { service: 'PSICOLOGIA', count: 2 },
      { service: 'SALUD', count: 1 },
    ]);
    expect(r.referrals.byStatus).toEqual(
      expect.arrayContaining([
        { status: 'ENVIADO', count: 2 },
        { status: 'ATENDIDO', count: 1 },
      ]),
    );
  });

  it('expone la evaluación solo agregada (sin tutor ni tutorado)', async () => {
    const r = await run();
    expect(r.evaluation).toEqual({ responses: 2, averageScore: 3 }); // (4.5 + 1.5) / 2
    expect(JSON.stringify(r.evaluation)).not.toMatch(/tutor|student/i);
  });

  it('filtra por tutor: tutorados, sesiones y evaluaciones de ese tutor', async () => {
    const r = await run({ tutorId: 't2' });
    expect(r.students.active).toBe(1);
    expect(r.sessions.total).toBe(1);
    expect(r.evaluation).toEqual({ responses: 1, averageScore: 1.5 });
  });

  it('filtra por escuela y consulta la evaluación con ese alcance', async () => {
    const r = await run({ schoolId: 'sc2' });
    expect(r.students.active).toBe(1);
    expect(evaluations.findAnonymizedScoresByPeriod).toHaveBeenCalledWith('p1', { schoolId: 'sc2' });
  });

  it('el Coordinador solo ve las escuelas que coordina', async () => {
    roleName = 'Coordinador';
    const r = await run();
    expect(r.students.active).toBe(3);
    expect(r.referrals.total).toBe(2); // las de a y b
    expect(evaluations.findAnonymizedScoresByPeriod).toHaveBeenCalledWith('p1', { schoolId: 'sc1' });
  });

  it('filtra por ciclo: tutorados y evaluaciones de ese ciclo (HU-47)', async () => {
    students.findAll.mockResolvedValue([
      { id: 'a', schoolId: 'sc1', tutorId: 't1', isAtRisk: true, isActive: true, cycle: 2 },
      { id: 'b', schoolId: 'sc1', tutorId: 't1', isAtRisk: false, isActive: true, cycle: 4 },
    ] as never);

    const r = await run({ cycle: 4 });

    expect(r.students.active).toBe(1);
    expect(r.risk.atRisk).toBe(0);
    expect(evaluations.findAnonymizedScoresByPeriod).toHaveBeenCalledWith('p1', { cycle: 4 });
    expect(r.appliedFilters).toEqual(['Ciclo: 4']);
  });

  it('un semestre pasado usa su propio rango y no el del periodo activo', async () => {
    periods.findById.mockResolvedValue({ id: 'p0', name: '2026-I', startDate: day('01-01'), endDate: day('07-31') } as never);

    const r = await run({ periodId: 'p0' });

    expect(r.periodName).toBe('2026-I');
    expect(r.sessions.total).toBe(0); // todas las sesiones de prueba son de septiembre en adelante
    expect(evaluations.findAnonymizedScoresByPeriod).toHaveBeenCalledWith('p0');
  });

  it('un Coordinador no puede ampliar el alcance con un filtro de otra escuela', async () => {
    roleName = 'Coordinador';
    const r = await run({ schoolId: 'sc2' });
    expect(r.students.active).toBe(0);
    expect(r.risk.bySchool).toEqual([]);
  });

  it('sin datos devuelve ceros y promedio nulo', async () => {
    students.findAll.mockResolvedValue([]);
    sessions.findAll.mockResolvedValue([]);
    referrals.findMany.mockResolvedValue([]);
    evaluations.findAnonymizedScoresByPeriod.mockResolvedValue([]);
    const r = await run();
    expect(r.students.assignedPct).toBe(0);
    expect(r.sessions.coveragePct).toBe(0);
    expect(r.evaluation).toEqual({ responses: 0, averageScore: null });
  });

  it('permite DBU, Vicerrectorado y Coordinador; rechaza a los demás', async () => {
    roleName = 'Vicerrectorado';
    await expect(run()).resolves.toBeDefined();
    roleName = 'Docente Tutor';
    await expect(run()).rejects.toBeInstanceOf(IndicatorsForbiddenError);
  });

  it('exige periodo activo', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(run()).rejects.toBeInstanceOf(NoActivePeriodError);
  });

  describe('cobertura basada en la asistencia (A07)', () => {
    it('programar una sesión no cubre al tutorado: sin asistencia registrada la cobertura es cero', async () => {
      sessions.findAll.mockResolvedValue([
        session('1', 't1', ['a'], { attendedStudentIds: [], absentStudentIds: [] }),
        session('2', 't1', ['b'], { attendedStudentIds: [], absentStudentIds: ['b'] }),
      ]);

      const r = await run();

      expect(r.sessions.total).toBe(0);
      expect(r.sessions.studentsServed).toBe(0);
      expect(r.sessions.coveragePct).toBe(0);
      expect(r.sessions.byMonth).toEqual([]);
    });

    it('en una grupal solo se cubre a quienes asistieron', async () => {
      sessions.findAll.mockResolvedValue([
        session('g', 't1', ['a', 'b', 'd'], { attendedStudentIds: ['a'], absentStudentIds: ['b', 'd'] }),
      ]);

      const r = await run();

      expect(r.sessions.group).toBe(1);
      expect(r.sessions.studentsServed).toBe(1);
      expect(r.sessions.coveragePct).toBe(25); // 1 de 4 tutorados activos
    });
  });
});
