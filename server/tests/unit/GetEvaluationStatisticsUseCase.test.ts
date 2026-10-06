import { GetEvaluationStatisticsUseCase } from '@application/use-cases/evaluation/GetEvaluationStatisticsUseCase';
import {
  EvaluationResultsForbiddenError,
  NoActivePeriodError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import { ReportPeriodNotFoundError } from '@application/use-cases/report-filters/ReportFilterErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { EVALUATION_ITEMS } from '@domain/entities/TutorEvaluation';

describe('GetEvaluationStatisticsUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let evaluations: jest.Mocked<TutorEvaluationRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let faculties: jest.Mocked<FacultyRepository>;
  let useCase: GetEvaluationStatisticsUseCase;

  const adminUser = { id: 'admin-1', roleId: 'role-admin' } as User;
  const tutorA = { id: 'tutor-a', firstName: 'Elena', lastName: 'Ramírez' } as User;
  const tutorB = { id: 'tutor-b', firstName: 'Jorge', lastName: 'Salazar' } as User;
  const activePeriod = { id: 'period-1', name: '2026-II' } as AcademicPeriod;

  const allSiempre = Array(EVALUATION_ITEMS.length).fill('S');
  const allNunca = Array(EVALUATION_ITEMS.length).fill('N');

  beforeEach(() => {
    users = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'admin-1' ? adminUser : id === 'tutor-a' ? tutorA : id === 'tutor-b' ? tutorB : null,
      ),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn().mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    periods = {
      findActive: jest.fn().mockResolvedValue(activePeriod),
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    evaluations = {
      create: jest.fn(),
      findByStudentAndPeriod: jest.fn(),
      findAnonymizedScoresByTutorAndPeriod: jest.fn(),
      findAnonymizedSuggestionsByPeriod: jest.fn().mockResolvedValue([]),
      findAnonymizedScoresByPeriod: jest.fn().mockResolvedValue([
        { tutorId: 'tutor-a', scores: allSiempre },
        { tutorId: 'tutor-a', scores: allNunca },
        { tutorId: 'tutor-b', scores: allSiempre },
      ]),
    };
    schools = {
      findAll: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'Sistemas', facultyId: 'faculty-1' }]),
    } as unknown as jest.Mocked<SchoolRepository>;
    faculties = {
      findAll: jest.fn().mockResolvedValue([{ id: 'faculty-1', name: 'Ingeniería' }]),
    } as unknown as jest.Mocked<FacultyRepository>;
    useCase = new GetEvaluationStatisticsUseCase(users, roles, periods, evaluations, schools, faculties);
  });

  it('agrupa las respuestas por tutor y calcula promedios', async () => {
    const report = await useCase.execute('admin-1');

    expect(report.periodName).toBe('2026-II');
    expect(report.tutors).toHaveLength(2);

    const rowA = report.tutors.find((t) => t.tutorId === 'tutor-a');
    expect(rowA?.tutorName).toBe('Elena Ramírez');
    expect(rowA?.totalResponses).toBe(2);
    expect(rowA?.overallAverage).toBe(3); // promedio de S(5) y N(1)

    const rowB = report.tutors.find((t) => t.tutorId === 'tutor-b');
    expect(rowB?.totalResponses).toBe(1);
    expect(rowB?.overallAverage).toBe(5);
  });

  it('pasa los filtros de escuela/facultad al repositorio', async () => {
    await useCase.execute('admin-1', { schoolId: 'school-1', facultyId: 'faculty-1' });

    expect(evaluations.findAnonymizedScoresByPeriod).toHaveBeenCalledWith('period-1', {
      schoolId: 'school-1',
      facultyId: 'faculty-1',
    });
  });

  it('pasa el ciclo al repositorio y filtra por tutor sin exponer al tutorado (HU-47)', async () => {
    const report = await useCase.execute('admin-1', { cycle: 3, tutorId: 'tutor-b' });

    expect(evaluations.findAnonymizedScoresByPeriod).toHaveBeenCalledWith('period-1', { cycle: 3 });
    expect(report.tutors.map((t) => t.tutorId)).toEqual(['tutor-b']);
  });

  it('consulta el semestre indicado en lugar del activo y falla si no existe', async () => {
    periods.findById.mockResolvedValueOnce({ ...activePeriod, id: 'period-0', name: '2026-I' });
    const report = await useCase.execute('admin-1', { periodId: 'period-0' });
    expect(report.periodName).toBe('2026-I');
    expect(evaluations.findAnonymizedScoresByPeriod).toHaveBeenCalledWith('period-0', expect.anything());

    periods.findById.mockResolvedValueOnce(null);
    await expect(useCase.execute('admin-1', { periodId: 'nope' })).rejects.toBeInstanceOf(ReportPeriodNotFoundError);
  });

  it('describe los filtros aplicados para rotular las exportaciones', async () => {
    const report = await useCase.execute('admin-1', { schoolId: 'school-1', facultyId: 'faculty-1', cycle: 4, tutorId: 'tutor-a' });
    expect(report.appliedFilters).toEqual([
      'Facultad: Ingeniería',
      'Escuela: Sistemas',
      'Ciclo: 4',
      'Tutor: Elena Ramírez',
    ]);
    expect((await useCase.execute('admin-1')).appliedFilters).toEqual([]);
  });

  it('no incluye tutores sin ninguna respuesta', async () => {
    evaluations.findAnonymizedScoresByPeriod.mockResolvedValue([]);
    const report = await useCase.execute('admin-1');
    expect(report.tutors).toHaveLength(0);
  });

  it('permite el acceso a Coordinador además de Administrador DBU', async () => {
    roles.findById.mockResolvedValue({ id: 'role-coord', name: 'Coordinador' } as Role);
    await expect(useCase.execute('admin-1')).resolves.toBeDefined();
  });

  it('lanza EvaluationResultsForbiddenError para un rol sin permiso de gestión', async () => {
    roles.findById.mockResolvedValue({ id: 'role-tutor', name: 'Docente Tutor' } as Role);
    await expect(useCase.execute('admin-1')).rejects.toThrow(EvaluationResultsForbiddenError);
  });

  it('lanza NoActivePeriodError si no hay periodo habilitado', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(useCase.execute('admin-1')).rejects.toThrow(NoActivePeriodError);
  });

  // Test de anonimato (HU-37/39): ninguna respuesta expone al tutorado que la
  // emitió, incluso agrupada por tutor.
  it('nunca expone un studentId ni ningún campo identificador del tutorado', async () => {
    evaluations.findAnonymizedScoresByPeriod.mockResolvedValue([
      { tutorId: 'tutor-a', scores: allSiempre, studentId: 'student-filtrado' } as never,
    ]);

    const report = await useCase.execute('admin-1');

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('studentId');
    expect(serialized).not.toContain('student-filtrado');
  });
});
