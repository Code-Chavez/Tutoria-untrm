import { ImportStudentsUseCase } from '@application/use-cases/students/ImportStudentsUseCase';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { Student } from '@domain/entities/Student';
import { School } from '@domain/entities/School';
import { ImportStudentRow } from '@application/dtos/studentImport.dto';

describe('ImportStudentsUseCase', () => {
  let useCase: ImportStudentsUseCase;
  let mockStudentRepository: jest.Mocked<StudentRepository>;
  let mockSchoolRepository: jest.Mocked<SchoolRepository>;

  const school: School = {
    id: 'school-1',
    name: 'Ingeniería de Sistemas',
    facultyId: 'fac-1',
    isActive: true,
    createdAt: new Date(),
  };

  const row = (rowNumber: number, overrides: Partial<ImportStudentRow> = {}): ImportStudentRow => ({
    rowNumber,
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    email: 'ana@untrm.edu.pe',
    phone: '987654321',
    cycle: '5',
    school: 'Ingeniería de Sistemas',
    ...overrides,
  });

  beforeEach(() => {
    mockStudentRepository = {
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      create: jest.fn().mockImplementation(async (data) => ({ id: 'new', createdAt: new Date(), updatedAt: new Date(), ...data } as Student)),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    mockSchoolRepository = {
      findAll: jest.fn().mockResolvedValue([school]),
      findById: jest.fn(),
    };
    useCase = new ImportStudentsUseCase(mockStudentRepository, mockSchoolRepository);
  });

  it('crea las filas válidas y resuelve la escuela por nombre (sin distinguir acentos/mayúsculas)', async () => {
    const report = await useCase.execute([
      row(2),
      row(3, { studentCode: '20195678', school: 'INGENIERIA DE SISTEMAS' }),
    ]);

    expect(report.created).toBe(2);
    expect(report.skipped).toBe(0);
    expect(report.errors).toHaveLength(0);
    expect(report.createdRows).toHaveLength(2);
    expect(report.createdRows[0]).toEqual({ row: 2, studentCode: '20191234', fullName: 'Ana Torres' });
    expect(mockStudentRepository.create).toHaveBeenCalledTimes(2);
    expect(mockStudentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: 'school-1', isActive: true, isAtRisk: false }),
    );
  });

  it('reporta el código con formato inválido sin crearlo', async () => {
    const report = await useCase.execute([row(2, { studentCode: '123' })]);

    expect(report.created).toBe(0);
    expect(report.skipped).toBe(1);
    expect(report.errors[0].row).toBe(2);
    expect(report.errors[0].message).toMatch(/8 y 12 d/i);
    expect(mockStudentRepository.create).not.toHaveBeenCalled();
  });

  it('reporta la escuela inexistente', async () => {
    const report = await useCase.execute([row(2, { school: 'Escuela Fantasma' })]);

    expect(report.created).toBe(0);
    expect(report.errors[0].message).toMatch(/no se encontró la escuela/i);
  });

  it('detecta duplicados dentro del mismo archivo', async () => {
    const report = await useCase.execute([row(2), row(3)]); // mismo código

    expect(report.created).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.errors[0].row).toBe(3);
    expect(report.errors[0].message).toMatch(/duplicado dentro del archivo/i);
  });

  it('detecta duplicados contra la base de datos', async () => {
    mockStudentRepository.findByCode.mockResolvedValue({ id: 'x', studentCode: '20191234' } as Student);

    const report = await useCase.execute([row(2)]);

    expect(report.created).toBe(0);
    expect(report.errors[0].message).toMatch(/ya existe/i);
    expect(mockStudentRepository.create).not.toHaveBeenCalled();
  });
});
