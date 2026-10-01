import { GetEvaluationResultsUseCase } from '@application/use-cases/evaluation/GetEvaluationResultsUseCase';
import {
  EvaluationResultsForbiddenError,
  TutorNotFoundError,
  NoActivePeriodError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { EVALUATION_ITEMS } from '@domain/entities/TutorEvaluation';

describe('GetEvaluationResultsUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let evaluations: jest.Mocked<TutorEvaluationRepository>;
  let useCase: GetEvaluationResultsUseCase;

  const adminUser = { id: 'admin-1', roleId: 'role-admin' } as User;
  const tutorUser = { id: 'tutor-1', firstName: 'Elena', lastName: 'Ramírez', roleId: 'role-tutor' } as User;
  const activePeriod = { id: 'period-1', name: '2026-II' } as AcademicPeriod;

  const allSiempre = Array(EVALUATION_ITEMS.length).fill('S');
  const allNunca = Array(EVALUATION_ITEMS.length).fill('N');

  beforeEach(() => {
    users = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'admin-1' ? adminUser : id === 'tutor-1' ? tutorUser : null,
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
    };
    evaluations = {
      create: jest.fn(),
      findByStudentAndPeriod: jest.fn(),
      findAnonymizedScoresByTutorAndPeriod: jest
        .fn()
        .mockResolvedValue([{ scores: allSiempre }, { scores: allNunca }]),
    };
    useCase = new GetEvaluationResultsUseCase(users, roles, periods, evaluations);
  });

  it('calcula el promedio y la distribución de cada ítem', async () => {
    const results = await useCase.execute('admin-1', 'tutor-1');

    expect(results.tutorName).toBe('Elena Ramírez');
    expect(results.periodName).toBe('2026-II');
    expect(results.totalResponses).toBe(2);
    // Un 'S' (5) y un 'N' (1) por ítem → promedio 3.
    expect(results.items[0].average).toBe(3);
    expect(results.items[0].distribution).toEqual({ N: 1, CN: 0, AV: 0, CS: 0, S: 1 });
    expect(results.overallAverage).toBe(3);
  });

  it('devuelve promedio null y distribución en cero cuando nadie ha respondido', async () => {
    evaluations.findAnonymizedScoresByTutorAndPeriod.mockResolvedValue([]);

    const results = await useCase.execute('admin-1', 'tutor-1');

    expect(results.totalResponses).toBe(0);
    expect(results.overallAverage).toBeNull();
    expect(results.items[0].average).toBeNull();
    expect(results.items[0].distribution).toEqual({ N: 0, CN: 0, AV: 0, CS: 0, S: 0 });
  });

  it('lanza EvaluationResultsForbiddenError para un rol sin permiso de gestión (ej. el propio tutor)', async () => {
    roles.findById.mockResolvedValue({ id: 'role-tutor', name: 'Docente Tutor' } as Role);

    await expect(useCase.execute('tutor-1', 'tutor-1')).rejects.toThrow(EvaluationResultsForbiddenError);
  });

  it('permite el acceso a Coordinador además de Administrador DBU', async () => {
    roles.findById.mockResolvedValue({ id: 'role-coord', name: 'Coordinador' } as Role);

    await expect(useCase.execute('admin-1', 'tutor-1')).resolves.toBeDefined();
  });

  it('lanza TutorNotFoundError si el tutor indicado no existe', async () => {
    await expect(useCase.execute('admin-1', 'tutor-inexistente')).rejects.toThrow(TutorNotFoundError);
  });

  it('lanza NoActivePeriodError si no hay periodo habilitado', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'tutor-1')).rejects.toThrow(NoActivePeriodError);
  });

  // Test de anonimato (HU-37): ninguna respuesta expone al tutorado que la
  // emitió. Simula un repositorio "con fuga" (devuelve studentId aunque el
  // tipo no lo declare) para probar que el caso de uso nunca lo propaga: solo
  // lee `scores` de cada entrada.
  it('nunca expone un studentId ni ningún campo identificador del tutorado en los resultados', async () => {
    evaluations.findAnonymizedScoresByTutorAndPeriod.mockResolvedValue([
      { scores: allSiempre, studentId: 'student-filtrado' } as never,
    ]);

    const results = await useCase.execute('admin-1', 'tutor-1');

    const serialized = JSON.stringify(results);
    expect(serialized).not.toContain('studentId');
    expect(serialized).not.toContain('student-filtrado');
    expect(results).not.toHaveProperty('studentId');
    results.items.forEach((item) => expect(item).not.toHaveProperty('studentId'));
  });
});
