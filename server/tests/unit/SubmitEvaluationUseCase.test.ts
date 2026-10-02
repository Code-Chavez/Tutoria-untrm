import { SubmitEvaluationUseCase } from '@application/use-cases/evaluation/SubmitEvaluationUseCase';
import { StudentProfileNotLinkedError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import {
  NoActivePeriodError,
  EvaluationAlreadySubmittedError,
  TutorNotAssignedError,
  EvaluationNotOpenForSchoolError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { EvaluationWindowRepository } from '@domain/repositories/EvaluationWindowRepository';
import { Student } from '@domain/entities/Student';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { EvaluationWindow } from '@domain/entities/EvaluationWindow';
import { TutorEvaluation, EVALUATION_ITEMS } from '@domain/entities/TutorEvaluation';
import { SubmitEvaluationInput } from '@application/dtos/evaluation.dto';

describe('SubmitEvaluationUseCase', () => {
  let useCase: SubmitEvaluationUseCase;
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
  const scores = Array(EVALUATION_ITEMS.length).fill('S') as SubmitEvaluationInput['scores'];

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
    };
    evaluations = {
      create: jest.fn().mockImplementation(async (data) => ({ id: 'eval-1', createdAt: new Date(), ...data })),
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
    useCase = new SubmitEvaluationUseCase(students, periods, evaluations, windows);
  });

  it('registra la evaluación con el tutor y periodo resueltos', async () => {
    const result = await useCase.execute('user-1', { scores, likes: '  Más talleres  ', dislikes: '' });

    expect(evaluations.create).toHaveBeenCalledWith({
      studentId: 'student-1',
      tutorId: 'tutor-1',
      periodId: 'period-1',
      scores,
      likes: 'Más talleres',
      dislikes: null,
    });
    expect(result.id).toBe('eval-1');
  });

  it('lanza StudentProfileNotLinkedError si la cuenta no está vinculada', async () => {
    students.findByUserId.mockResolvedValue(null);
    await expect(useCase.execute('user-x', { scores })).rejects.toThrow(StudentProfileNotLinkedError);
    expect(evaluations.create).not.toHaveBeenCalled();
  });

  it('lanza TutorNotAssignedError si el tutorado no tiene tutor', async () => {
    students.findByUserId.mockResolvedValue({ ...linkedStudent, tutorId: null } as unknown as Student);
    await expect(useCase.execute('user-1', { scores })).rejects.toThrow(TutorNotAssignedError);
    expect(evaluations.create).not.toHaveBeenCalled();
  });

  it('lanza NoActivePeriodError si no hay periodo habilitado', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(useCase.execute('user-1', { scores })).rejects.toThrow(NoActivePeriodError);
    expect(evaluations.create).not.toHaveBeenCalled();
  });

  it('lanza EvaluationNotOpenForSchoolError si la DBU no abrió la evaluación para la escuela (HU-38)', async () => {
    windows.findByPeriodAndSchool.mockResolvedValue(null);
    await expect(useCase.execute('user-1', { scores })).rejects.toThrow(EvaluationNotOpenForSchoolError);
    expect(evaluations.create).not.toHaveBeenCalled();
  });

  it('lanza EvaluationNotOpenForSchoolError si la ventana de la escuela está cerrada', async () => {
    windows.findByPeriodAndSchool.mockResolvedValue({ ...openWindow, isOpen: false });
    await expect(useCase.execute('user-1', { scores })).rejects.toThrow(EvaluationNotOpenForSchoolError);
    expect(evaluations.create).not.toHaveBeenCalled();
  });

  it('lanza EvaluationAlreadySubmittedError si ya existe una respuesta en el periodo', async () => {
    evaluations.findByStudentAndPeriod.mockResolvedValue({ id: 'eval-existing' } as TutorEvaluation);
    await expect(useCase.execute('user-1', { scores })).rejects.toThrow(EvaluationAlreadySubmittedError);
    expect(evaluations.create).not.toHaveBeenCalled();
  });
});
