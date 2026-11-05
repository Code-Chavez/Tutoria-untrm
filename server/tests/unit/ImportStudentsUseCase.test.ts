import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { PeriodEnrollmentRepository } from '@domain/repositories/PeriodEnrollmentRepository';
import { ImportStudentsUseCase } from '@application/use-cases/students/ImportStudentsUseCase';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { Student } from '@domain/entities/Student';
import { School } from '@domain/entities/School';
import { ImportStudentRow } from '@application/dtos/studentImport.dto';
import { allowAllGuard } from '../helpers/studentGuard';

describe('ImportStudentsUseCase', () => {
  let useCase: ImportStudentsUseCase;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let enrollments: jest.Mocked<PeriodEnrollmentRepository>;
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
      findByUserId: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (data) => ({ id: 'new', createdAt: new Date(), updatedAt: new Date(), ...data } as Student)),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    mockSchoolRepository = {
      findAll: jest.fn().mockResolvedValue([school]),
      findById: jest.fn(),
    };
    periods = { findActive: jest.fn().mockResolvedValue({ id: 'period-1', name: '2026-II' }), findAll: jest.fn(), findById: jest.fn(), findByDate: jest.fn(), close: jest.fn(), reopen: jest.fn() } as unknown as jest.Mocked<AcademicPeriodRepository>;
    enrollments = { enroll: jest.fn().mockResolvedValue(undefined), isEnrolled: jest.fn(), count: jest.fn() } as jest.Mocked<PeriodEnrollmentRepository>;
    useCase = new ImportStudentsUseCase(mockStudentRepository, mockSchoolRepository, allowAllGuard(mockStudentRepository), periods, enrollments);
  });

  it('crea las filas válidas y resuelve la escuela por nombre (sin distinguir acentos/mayúsculas)', async () => {
    const report = await useCase.execute([
      row(2),
      row(3, { studentCode: '20195678', school: 'INGENIERIA DE SISTEMAS', email: 'otra.persona@untrm.edu.pe' }), // dos estudiantes no comparten correo
    ], 'admin-1');

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
    const report = await useCase.execute([row(2, { studentCode: '123' })], 'admin-1');

    expect(report.created).toBe(0);
    expect(report.skipped).toBe(1);
    expect(report.errors[0].row).toBe(2);
    expect(report.errors[0].message).toMatch(/8 y 12 d/i);
    expect(mockStudentRepository.create).not.toHaveBeenCalled();
  });

  it('reporta la escuela inexistente', async () => {
    const report = await useCase.execute([row(2, { school: 'Escuela Fantasma' })], 'admin-1');

    expect(report.created).toBe(0);
    expect(report.errors[0].message).toMatch(/no se encontró la escuela/i);
  });

  it('detecta duplicados dentro del mismo archivo', async () => {
    const report = await useCase.execute([row(2), row(3)], 'admin-1'); // mismo código

    expect(report.created).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.errors[0].row).toBe(3);
    expect(report.errors[0].message).toMatch(/duplicado dentro del archivo/i);
  });

  it('detecta duplicados contra la base de datos', async () => {
    mockStudentRepository.findByCode.mockResolvedValue({ id: 'x', studentCode: '20191234' } as Student);

    const report = await useCase.execute([row(2)], 'admin-1');

    expect(report.created).toBe(0);
    expect(report.errors[0].message).toMatch(/ya existe/i);
    expect(mockStudentRepository.create).not.toHaveBeenCalled();
  });

  describe('correo, teléfono y nombres (A03)', () => {
    const messages = async (overrides: Partial<ImportStudentRow>) => {
      const report = await useCase.execute([row(2, overrides)], 'admin-1');
      return { report, text: report.errors.map((e) => e.message).join(' | ') };
    };

    it.each(['sin-arroba', 'ana@', '@untrm.edu.pe', 'ana perez@untrm.edu.pe'])('rechaza el correo mal formado «%s» sin crear al estudiante', async (email) => {
      const { report, text } = await messages({ email });

      expect(report.created).toBe(0);
      expect(text).toMatch(/formato válido/);
      expect(mockStudentRepository.create).not.toHaveBeenCalled();
    });

    it('acepta el correo vacío o ausente y guarda null', async () => {
      const report = await useCase.execute([row(2, { email: '' }), row(3, { studentCode: '20195678', email: undefined })], 'admin-1');

      expect(report.created).toBe(2);
      expect(mockStudentRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
    });

    it('guarda el correo sin espacios y en minúsculas', async () => {
      await useCase.execute([row(2, { email: '  Ana.Torres@UNTRM.edu.pe ' })], 'admin-1');

      expect(mockStudentRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana.torres@untrm.edu.pe' }));
    });

    it.each(['98765abcd', 'nueve ocho', '987654321987654321987'])('rechaza el teléfono «%s»', async (phone) => {
      const { report, text } = await messages({ phone });

      expect(report.created).toBe(0);
      expect(text).toMatch(/teléfono/i);
    });

    it('acepta teléfonos con prefijo, espacios y guiones', async () => {
      const report = await useCase.execute([row(2, { phone: '+51 987-654-321' })], 'admin-1');

      expect(report.created).toBe(1);
    });

    it('rechaza nombres de una sola letra y los de solo espacios, igual que el formulario', async () => {
      const short = await messages({ firstName: 'A' });
      const blank = await messages({ lastName: '   ' });

      expect(short.text).toMatch(/nombre debe tener al menos 2/);
      expect(blank.text).toMatch(/apellido es obligatorio/i);
    });

    it('reporta todos los problemas de la fila a la vez, para corregirla de una vez', async () => {
      const { text } = await messages({ email: 'malo', phone: 'abc', firstName: 'A' });

      expect(text).toMatch(/formato válido/);
      expect(text).toMatch(/teléfono/i);
      expect(text).toMatch(/nombre debe tener/);
    });

    it('una fila inválida no impide crear las demás', async () => {
      const report = await useCase.execute([row(2, { email: 'malo' }), row(3, { studentCode: '20195678' })], 'admin-1');

      expect(report.created).toBe(1);
      expect(report.skipped).toBe(1);
      expect(report.errors[0].row).toBe(2);
    });
  });

  describe('matrícula por periodo (fase 2)', () => {
    const existing = { id: 'old-1', studentCode: '20195678', firstName: 'Luis', lastName: 'Pérez', cycle: 4, schoolId: 'school-1', isActive: false } as Student;

    it('cada estudiante nuevo queda matriculado en el periodo vigente', async () => {
      const report = await useCase.execute([row(2)], 'admin-1');

      expect(report.created).toBe(1);
      expect(enrollments.enroll).toHaveBeenCalledWith({ periodId: 'period-1', studentId: 'new', schoolId: 'school-1', cycle: 5 });
    });

    it('un estudiante que ya existía (de un periodo anterior) continúa: se actualiza su ciclo, se reactiva y se matricula de nuevo, sin error', async () => {
      mockStudentRepository.findByCode.mockResolvedValue(existing);

      const report = await useCase.execute([row(2, { studentCode: '20195678', cycle: '5' })], 'admin-1');

      expect(report).toMatchObject({ created: 0, continued: 1, skipped: 0 });
      expect(report.continuedRows).toEqual([{ row: 2, studentCode: '20195678', fullName: 'Luis Pérez' }]);
      expect(mockStudentRepository.update).toHaveBeenCalledWith('old-1', { cycle: 5, isActive: true });
      expect(mockStudentRepository.create).not.toHaveBeenCalled();
      expect(enrollments.enroll).toHaveBeenCalledWith({ periodId: 'period-1', studentId: 'old-1', schoolId: 'school-1', cycle: 5 });
    });

    it('si el código existe en otra escuela se rechaza la fila (no se cambia de escuela por una carga)', async () => {
      mockStudentRepository.findByCode.mockResolvedValue({ ...existing, schoolId: 'otra' });

      const report = await useCase.execute([row(2, { studentCode: '20195678' })], 'admin-1');

      expect(report.continued).toBe(0);
      expect(report.errors[0].message).toMatch(/otra escuela/);
      expect(enrollments.enroll).not.toHaveBeenCalled();
    });

    it('un código repetido dentro del archivo sigue siendo un error de la segunda fila', async () => {
      const report = await useCase.execute([row(2), row(3)], 'admin-1');

      expect(report.created).toBe(1);
      expect(report.errors[0].message).toMatch(/duplicado dentro del archivo/);
    });

    it('sin periodo vigente no se carga nada: hay que abrir el periodo primero', async () => {
      periods.findActive.mockResolvedValue(null);

      await expect(useCase.execute([row(2)], 'admin-1')).rejects.toThrow(/periodo académico vigente/);

      expect(mockStudentRepository.create).not.toHaveBeenCalled();
    });
  });
});
