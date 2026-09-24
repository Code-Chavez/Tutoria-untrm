import { CreateInterviewUseCase } from '@application/use-cases/interviews/CreateInterviewUseCase';
import { InterviewMotiveRequiredError } from '@application/use-cases/interviews/InterviewErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { Student } from '@domain/entities/Student';
import { TutorInterview } from '@domain/entities/TutorInterview';
import { CreateInterviewInput } from '@application/dtos/interview.dto';

describe('CreateInterviewUseCase', () => {
  let useCase: CreateInterviewUseCase;
  let interviews: jest.Mocked<TutorInterviewRepository>;
  let students: jest.Mocked<StudentRepository>;

  const student = { id: 'student-1' } as Student;

  const baseInput: CreateInterviewInput = {
    motiveAcademic: true,
    motivePersonalEmotional: false,
    motiveVocational: false,
    aspectsDiscussed: 'Bajo rendimiento en el curso de Cálculo',
    agreements: 'Asistir a tutorías de reforzamiento semanales',
  };

  beforeEach(() => {
    interviews = {
      create: jest.fn().mockImplementation(async (data) => ({
        id: 'interview-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as TutorInterview)),
      findByStudent: jest.fn(),
    };
    students = {
      findById: jest.fn().mockResolvedValue(student),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    useCase = new CreateInterviewUseCase(interviews, students);
  });

  it('registra la entrevista cuando hay al menos un motivo marcado', async () => {
    const result = await useCase.execute('student-1', 'tutor-1', baseInput);

    expect(result.id).toBe('interview-1');
    expect(interviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student-1',
        conductedById: 'tutor-1',
        motiveAcademic: true,
        aspectsDiscussed: 'Bajo rendimiento en el curso de Cálculo',
        agreements: 'Asistir a tutorías de reforzamiento semanales',
      }),
    );
  });

  it('exige al menos un motivo marcado', async () => {
    await expect(
      useCase.execute('student-1', 'tutor-1', {
        ...baseInput,
        motiveAcademic: false,
      }),
    ).rejects.toThrow(InterviewMotiveRequiredError);
    expect(interviews.create).not.toHaveBeenCalled();
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1', baseInput)).rejects.toThrow(
      StudentNotFoundError,
    );
  });

  it('normaliza los campos opcionales vacíos a null', async () => {
    const result = await useCase.execute('student-1', 'tutor-1', {
      ...baseInput,
      originPlace: '   ',
      religion: undefined,
    });

    expect(result.originPlace).toBeNull();
    expect(result.religion).toBeNull();
  });
});
