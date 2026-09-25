import { CreateFollowUpUseCase } from '@application/use-cases/follow-ups/CreateFollowUpUseCase';
import { FollowUpInstructorDetailsRequiredError } from '@application/use-cases/follow-ups/FollowUpErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { Student } from '@domain/entities/Student';
import { CreateFollowUpInput } from '@application/dtos/followUp.dto';

describe('CreateFollowUpUseCase', () => {
  let useCase: CreateFollowUpUseCase;
  let followUps: jest.Mocked<TutorFollowUpRepository>;
  let students: jest.Mocked<StudentRepository>;

  const baseInput: CreateFollowUpInput = {
    reason: 'Bajo rendimiento en Cálculo',
    agreements: 'Reforzamiento semanal',
    withInstructor: false,
  };

  beforeEach(() => {
    followUps = {
      create: jest.fn().mockImplementation(async (data) => ({
        id: 'followup-1',
        createdAt: new Date(),
        ...data,
      })),
      findByStudent: jest.fn(),
    };
    students = {
      findById: jest.fn().mockResolvedValue({ id: 'student-1' } as Student),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    useCase = new CreateFollowUpUseCase(followUps, students);
  });

  it('registra el seguimiento con el propio tutorado (sin datos de docente)', async () => {
    const result = await useCase.execute('student-1', 'tutor-1', baseInput);

    expect(result.instructorName).toBeNull();
    expect(result.courseName).toBeNull();
    expect(result.courseCycle).toBeNull();
    expect(followUps.create).toHaveBeenCalledWith({
      studentId: 'student-1',
      conductedById: 'tutor-1',
      reason: 'Bajo rendimiento en Cálculo',
      agreements: 'Reforzamiento semanal',
      instructorName: null,
      courseName: null,
      courseCycle: null,
    });
  });

  it('registra nombre, curso y ciclo cuando el acuerdo es con un docente', async () => {
    const result = await useCase.execute('student-1', 'tutor-1', {
      ...baseInput,
      withInstructor: true,
      instructorName: 'Prof. Juan Pérez',
      courseName: 'Cálculo I',
      courseCycle: 3,
    });

    expect(result.instructorName).toBe('Prof. Juan Pérez');
    expect(result.courseName).toBe('Cálculo I');
    expect(result.courseCycle).toBe(3);
  });

  it('lanza FollowUpInstructorDetailsRequiredError si falta algún dato del docente', async () => {
    await expect(
      useCase.execute('student-1', 'tutor-1', {
        ...baseInput,
        withInstructor: true,
        instructorName: 'Prof. Juan Pérez',
        // courseName y courseCycle faltantes
      }),
    ).rejects.toThrow(FollowUpInstructorDetailsRequiredError);
    expect(followUps.create).not.toHaveBeenCalled();
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1', baseInput)).rejects.toThrow(
      StudentNotFoundError,
    );
  });
});
