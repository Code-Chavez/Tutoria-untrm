import { GetEvaluationSuggestionsUseCase } from '@application/use-cases/evaluation/GetEvaluationSuggestionsUseCase';
import {
  EvaluationResultsForbiddenError,
  NoActivePeriodError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';

describe('GetEvaluationSuggestionsUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let evaluations: jest.Mocked<TutorEvaluationRepository>;
  let useCase: GetEvaluationSuggestionsUseCase;

  const adminUser = { id: 'admin-1', roleId: 'role-admin' } as User;
  const tutorA = { id: 'tutor-a', firstName: 'Elena', lastName: 'Ramírez' } as User;
  const activePeriod = { id: 'period-1', name: '2026-II' } as AcademicPeriod;

  beforeEach(() => {
    users = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'admin-1' ? adminUser : id === 'tutor-a' ? tutorA : null,
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
    periods = { findActive: jest.fn().mockResolvedValue(activePeriod) };
    evaluations = {
      create: jest.fn(),
      findByStudentAndPeriod: jest.fn(),
      findAnonymizedScoresByTutorAndPeriod: jest.fn(),
      findAnonymizedScoresByPeriod: jest.fn(),
      findAnonymizedSuggestionsByPeriod: jest.fn().mockResolvedValue([
        { tutorId: 'tutor-a', likes: 'Más talleres', dislikes: null },
        { tutorId: 'tutor-a', likes: null, dislikes: 'Horarios cruzados' },
      ]),
    };
    useCase = new GetEvaluationSuggestionsUseCase(users, roles, periods, evaluations);
  });

  it('devuelve las sugerencias del periodo activo con el nombre del tutor', async () => {
    const report = await useCase.execute('admin-1');

    expect(report.periodName).toBe('2026-II');
    expect(report.suggestions).toEqual([
      { tutorId: 'tutor-a', tutorName: 'Elena Ramírez', likes: 'Más talleres', dislikes: null },
      { tutorId: 'tutor-a', tutorName: 'Elena Ramírez', likes: null, dislikes: 'Horarios cruzados' },
    ]);
  });

  it('pasa los filtros de tutor/escuela/facultad al repositorio', async () => {
    await useCase.execute('admin-1', { tutorId: 't', schoolId: 's', facultyId: 'f' });

    expect(evaluations.findAnonymizedSuggestionsByPeriod).toHaveBeenCalledWith('period-1', {
      tutorId: 't',
      schoolId: 's',
      facultyId: 'f',
    });
  });

  it('lanza EvaluationResultsForbiddenError para un rol sin permiso de gestión', async () => {
    roles.findById.mockResolvedValue({ id: 'role-tutor', name: 'Docente Tutor' } as Role);
    await expect(useCase.execute('admin-1')).rejects.toThrow(EvaluationResultsForbiddenError);
  });

  it('lanza NoActivePeriodError si no hay periodo habilitado', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(useCase.execute('admin-1')).rejects.toThrow(NoActivePeriodError);
  });

  // Test de anonimato (HU-37/40): aunque un repositorio con fuga devolviera
  // el studentId, el caso de uso nunca lo propaga.
  it('nunca expone un studentId en las sugerencias', async () => {
    evaluations.findAnonymizedSuggestionsByPeriod.mockResolvedValue([
      { tutorId: 'tutor-a', likes: 'Algo', dislikes: null, studentId: 'student-filtrado' } as never,
    ]);

    const report = await useCase.execute('admin-1');

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('studentId');
    expect(serialized).not.toContain('student-filtrado');
  });
});
