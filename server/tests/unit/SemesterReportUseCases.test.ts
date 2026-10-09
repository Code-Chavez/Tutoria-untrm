import { GetMySemesterReportUseCase } from '@application/use-cases/semester-reports/GetMySemesterReportUseCase';
import { SaveMySemesterReportUseCase } from '@application/use-cases/semester-reports/SaveMySemesterReportUseCase';
import { GetSemesterReportForExportUseCase } from '@application/use-cases/semester-reports/GetSemesterReportForExportUseCase';
import { SemesterReportNotFoundError } from '@application/use-cases/semester-reports/SemesterReportErrors';
import { TutorNotFoundError } from '@application/use-cases/assignments/AssignmentErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import { TutorSemesterReport, TutorSemesterReportContent } from '@domain/entities/TutorSemesterReport';

const day = (d: string) => new Date(`2026-${d}T10:00:00Z`);

const session = (over: Partial<SessionWithParticipants>): SessionWithParticipants =>
  ({
    id: 's',
    tutorId: 't1',
    topic: 'Hábitos de estudio',
    scheduledAt: day('09-10'),
    endsAt: day('09-10'),
    cancelledAt: null,
    studentIds: ['a'],
    attendedStudentIds: ['a'],
    absentStudentIds: [],
    attendance: null,
    ...over,
  }) as SessionWithParticipants;

describe('Tutor semester report (HU-43)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let students: jest.Mocked<StudentRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let faculties: jest.Mocked<FacultyRepository>;
  let followUps: jest.Mocked<TutorFollowUpRepository>;
  let reports: jest.Mocked<TutorSemesterReportRepository>;

  const content = { programName: 'Sistemas' } as TutorSemesterReportContent;

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue({
        id: 't1', roleId: 'r1', isActive: true, firstName: 'Elena', lastName: 'Ramírez', phone: '941000003',
      }),
    } as unknown as jest.Mocked<UserRepository>;
    roles = {
      findByName: jest.fn().mockResolvedValue({ id: 'r1', name: 'Docente Tutor' }),
    } as unknown as jest.Mocked<RoleRepository>;
    periods = {
      findActive: jest.fn().mockResolvedValue({
        id: 'p1', name: '2026-II', startDate: day('08-01'), endDate: day('12-31'),
      }),
    } as unknown as jest.Mocked<AcademicPeriodRepository>;
    sessions = { findAll: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<SessionRepository>;
    students = {
      findAll: jest.fn().mockResolvedValue([
        { id: 'a', schoolId: 'sc1', cycle: 3 },
        { id: 'b', schoolId: 'sc1', cycle: 1 },
      ]),
    } as unknown as jest.Mocked<StudentRepository>;
    schools = {
      findAll: jest.fn().mockResolvedValue([
        { id: 'sc1', name: 'Ing. de Sistemas', facultyId: 'f1' },
        { id: 'sc2', name: 'Civil', facultyId: 'f2' },
      ]),
    } as unknown as jest.Mocked<SchoolRepository>;
    faculties = {
      findAll: jest.fn().mockResolvedValue([
        { id: 'f1', name: 'Facultad de Ingeniería' },
        { id: 'f2', name: 'Otra' },
      ]),
    } as unknown as jest.Mocked<FacultyRepository>;
    followUps = { findByTutorBetween: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<TutorFollowUpRepository>;
    reports = {
      findByPeriodAndTutor: jest.fn().mockResolvedValue(null),
      findAllByPeriod: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ id: 'r' } as TutorSemesterReport),
    };
  });

  const get = () =>
    new GetMySemesterReportUseCase(users, roles, periods, sessions, students, schools, faculties, followUps, reports);

  it('autollena datos generales con la escuela, facultad y ciclos de sus tutorados', async () => {
    const { draft, tutorName, periodName } = await get().execute('t1');
    expect(tutorName).toBe('Elena Ramírez');
    expect(periodName).toBe('2026-II');
    expect(draft).toMatchObject({
      programName: 'Ing. de Sistemas',
      faculty: 'Facultad de Ingeniería',
      tutoringCycles: '1, 3',
      phone: '941000003',
      teacherCategory: '',
    });
  });

  it('separa sesiones individuales de grupales y cuenta participantes distintos', async () => {
    sessions.findAll.mockResolvedValue([
      session({ id: '1', studentIds: ['a'] }),
      session({ id: '2', studentIds: ['b'], attendedStudentIds: ['b'] }),
      session({ id: '3', topic: 'Taller de estrés', studentIds: ['a', 'b', 'c'], attendedStudentIds: ['a', 'b', 'c'] }),
    ]);
    const { draft } = await get().execute('t1');
    expect(draft.individual).toEqual([
      expect.objectContaining({ activity: 'Hábitos de estudio (2 sesiones)', participants: 2 }),
    ]);
    expect(draft.group).toEqual([
      expect.objectContaining({ activity: 'Taller de estrés (1 sesión)', participants: 3 }),
    ]);
  });

  it('ignora sesiones canceladas, fuera del periodo o aún no realizadas', async () => {
    const future = new Date(Date.now() + 86_400_000);
    sessions.findAll.mockResolvedValue([
      session({ id: '1', cancelledAt: day('09-11') }),
      session({ id: '2', scheduledAt: day('01-10'), endsAt: day('01-10') }),
      session({ id: '3', scheduledAt: future, endsAt: future }),
    ]);
    const { draft } = await get().execute('t1');
    expect(draft.individual).toEqual([]);
    expect(draft.group).toEqual([]);
  });

  it('suma una fila de seguimiento individual con motivos y acuerdos de las fichas', async () => {
    followUps.findByTutorBetween.mockResolvedValue([
      { studentId: 'a', reason: 'Bajo rendimiento', agreements: 'Asistir a tutoría' },
      { studentId: 'b', reason: 'Bajo rendimiento', agreements: 'Reforzar matemática' },
    ] as never);
    const { draft } = await get().execute('t1');
    expect(draft.individual).toEqual([
      {
        activity: 'Seguimiento individual (2 fichas)',
        difficulties: 'Bajo rendimiento',
        achievements: 'Asistir a tutoría; Reforzar matemática',
        suggestions: '',
        participants: 2,
      },
    ]);
  });

  it('devuelve el informe guardado junto con el borrador', async () => {
    const saved = { id: 'rep1' } as TutorSemesterReport;
    reports.findByPeriodAndTutor.mockResolvedValue(saved);
    expect((await get().execute('t1')).report).toBe(saved);
  });

  it('solo un Docente Tutor activo puede usar el informe', async () => {
    roles.findByName.mockResolvedValue({ id: 'otro', name: 'Docente Tutor' } as never);
    await expect(get().execute('t1')).rejects.toBeInstanceOf(TutorNotFoundError);
  });

  it('exige periodo activo', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(get().execute('t1')).rejects.toBeInstanceOf(NoActivePeriodError);
  });

  it('guarda el informe en el periodo activo para el tutor autenticado', async () => {
    await new SaveMySemesterReportUseCase(users, roles, periods, reports).execute('t1', content);
    expect(reports.upsert).toHaveBeenCalledWith('p1', 't1', content);
  });

  it('exportar exige haber guardado el informe', async () => {
    const exporter = new GetSemesterReportForExportUseCase(users, roles, periods, reports);
    await expect(exporter.execute('t1')).rejects.toBeInstanceOf(SemesterReportNotFoundError);

    const saved = { id: 'rep1' } as TutorSemesterReport;
    reports.findByPeriodAndTutor.mockResolvedValue(saved);
    await expect(exporter.execute('t1')).resolves.toEqual({
      periodName: '2026-II',
      tutorName: 'Elena Ramírez',
      report: saved,
    });
  });

  describe('solo cuenta lo que realmente ocurrió (A07)', () => {
    it('una sesión vencida sin asistencia registrada no es una actividad realizada ni aporta participantes', async () => {
      sessions.findAll.mockResolvedValue([
        session({ id: '1', studentIds: ['a'], attendedStudentIds: [], absentStudentIds: [] }), // nadie la registró
        session({ id: '2', studentIds: ['b'], attendedStudentIds: [], absentStudentIds: ['b'] }), // se registró la inasistencia
      ]);
      const { draft } = await get().execute('t1');
      expect(draft.individual).toEqual([]);
      expect(draft.group).toEqual([]);
    });

    it('una grupal con 2 asistentes de 5 aporta 2 participantes, no 5', async () => {
      sessions.findAll.mockResolvedValue([
        session({
          id: 'g', topic: 'Taller', studentIds: ['a', 'b', 'c', 'd', 'e'],
          attendedStudentIds: ['a', 'b'], absentStudentIds: ['c', 'd', 'e'],
        }),
      ]);
      const { draft } = await get().execute('t1');
      expect(draft.group).toEqual([expect.objectContaining({ activity: 'Taller (1 sesión)', participants: 2 })]);
    });
  });
});
