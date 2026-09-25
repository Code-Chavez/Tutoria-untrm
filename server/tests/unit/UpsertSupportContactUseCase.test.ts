import { UpsertSupportContactUseCase } from '@application/use-cases/support-contacts/UpsertSupportContactUseCase';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { Student } from '@domain/entities/Student';
import { SupportContact } from '@domain/entities/SupportContact';
import { UpsertSupportContactInput } from '@application/dtos/supportContact.dto';

describe('UpsertSupportContactUseCase', () => {
  let useCase: UpsertSupportContactUseCase;
  let contacts: jest.Mocked<SupportContactRepository>;
  let students: jest.Mocked<StudentRepository>;

  const student = { id: 'student-1' } as Student;

  const baseInput: UpsertSupportContactInput = {
    fullName: 'María Torres Ramos',
    relationship: 'Madre',
    age: 48,
    occupation: 'Comerciante',
    phone: '987654321',
  };

  beforeEach(() => {
    contacts = {
      findByStudent: jest.fn(),
      upsert: jest.fn().mockImplementation(async (studentId, data) => ({
        id: 'contact-1',
        studentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as SupportContact)),
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
    useCase = new UpsertSupportContactUseCase(contacts, students);
  });

  it('registra el contacto de red de apoyo', async () => {
    const result = await useCase.execute('student-1', baseInput);

    expect(result.id).toBe('contact-1');
    expect(contacts.upsert).toHaveBeenCalledWith('student-1', {
      fullName: 'María Torres Ramos',
      relationship: 'Madre',
      age: 48,
      occupation: 'Comerciante',
      phone: '987654321',
    });
  });

  it('normaliza la ocupación vacía a null', async () => {
    const result = await useCase.execute('student-1', { ...baseInput, occupation: '   ' });
    expect(result.occupation).toBeNull();
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', baseInput)).rejects.toThrow(StudentNotFoundError);
    expect(contacts.upsert).not.toHaveBeenCalled();
  });
});
