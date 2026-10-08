import { GetEvaluationStatusUseCase } from '@application/use-cases/evaluation/GetEvaluationStatusUseCase';
import { StudentProfileNotLinkedError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { EvaluationWindowRepository } from '@domain/repositories/EvaluationWindowRepository';
import { Student } from '@domain/entities/Student';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { TutorEvaluation } from '@domain/entities/TutorEvaluation';
import { EvaluationWindow } from '@domain/entities/EvaluationWindow';

describe('GetEvaluationStatusUseCase', () => {
  let useCase: GetEvaluationStatusUseCase;
  let students: jest.Mocked<StudentRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let evaluations: jest.Mocked<TutorEvaluationRepository>;
  let windows: jest.Mocked<EvaluationWindowRepository>;

  const linkedStudent = {
    id: 'student-1',
    userId: 'user-1',
    tutorId: 'tutor-1',
    schoolId: 'school-1',
  } as Student;
  const activePeriod = { id: 'period-1', name: '2026-II', isActive: true } as AcademicPeriod;
  const openWindow = { id: 'win-1', periodId: 'period-1', schoolId: 'school-1', isOpen: true } as EvaluationWindow;

  beforeEach(() => {
    students = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue(linkedStudent),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    periods = {
      findActive: jest.fn().mockResolvedValue(activePeriod),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByDate: jest.fn(),
    };
    evaluations = {
      create: jest.fn(),
      findByStudentAndPeriod: jest.fn().mockResolvedValue(null),
      findAnonymizedScoresByTutorAndPeriod: jest.fn().mockResolvedValue([]),
      findAnonymizedScoresByPeriod: jest.fn().mockResolvedValue([]),
      findAnonymizedSuggestionsByPeriod: jest.fn().mockResolvedValue([]),
    };
    windows = {
      findByPeriodAndSchool: jest.fn().mockResolvedValue(openWindow),
      findAllByPeriod: jest.fn(),
      upsert: jest.fn(),
    };
    useCase = new GetEvaluationStatusUseCase(students, periods, evaluations, windows);
  });

  it('permite responder cuando hay periodo activo, escuela habilitada, tutor asignado y sin respuesta previa', async () => {
    const status = await useCase.execute('user-1');
    expect(status).toEqual({ canRespond: true, alreadyResponded: false, periodName: '2026-II' });
  });

  it('marca alreadyResponded cuando ya existe una evaluación en el periodo', async () => {
    evaluations.findByStudentAndPeriod.mockResolvedValue({ id: 'eval-1' } as TutorEvaluation);
    const status = await useCase.execute('user-1');
    expect(status).toEqual({ canRespond: false, alreadyResponded: true, periodName: '2026-II' });
  });

  it('no permite responder si no hay periodo habilitado', async () => {
    periods.findActive.mockResolvedValue(null);
    const status = await useCase.execute('user-1');
    expect(status.canRespond).toBe(false);
    expect(status.periodName).toBeNull();
  });

  it('no permite responder si el tutorado no tiene tutor asignado', async () => {
    students.findByUserId.mockResolvedValue({ ...linkedStudent, tutorId: null } as unknown as Student);
    const status = await useCase.execute('user-1');
    expect(status.canRespond).toBe(false);
  });

  it('no permite responder si la DBU no abrió la evaluación para la escuela (HU-38)', async () => {
    windows.findByPeriodAndSchool.mockResolvedValue(null);
    const status = await useCase.execute('user-1');
    expect(status.canRespond).toBe(false);
    expect(status.periodName).toBe('2026-II');
  });

  it('no permite responder si la escuela tiene una ventana cerrada explícitamente', async () => {
    windows.findByPeriodAndSchool.mockResolvedValue({ ...openWindow, isOpen: false });
    const status = await useCase.execute('user-1');
    expect(status.canRespond).toBe(false);
  });

  it('lanza StudentProfileNotLinkedError si la cuenta no está vinculada', async () => {
    students.findByUserId.mockResolvedValue(null);
    await expect(useCase.execute('user-x')).rejects.toThrow(StudentProfileNotLinkedError);
  });
});
