import { CreateStudentUseCase } from '@application/use-cases/students/CreateStudentUseCase';
import { UpdateStudentUseCase } from '@application/use-cases/students/UpdateStudentUseCase';
import { ImportStudentsUseCase } from '@application/use-cases/students/ImportStudentsUseCase';
import { DuplicateStudentEmailError } from '@application/use-cases/students/StudentErrors';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { PeriodEnrollmentRepository } from '@domain/repositories/PeriodEnrollmentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { Student } from '@domain/entities/Student';
import { allowAllGuard } from '../helpers/studentGuard';

// El correo de un estudiante es un dato de contacto: se guarda en su forma única y no lo comparten dos estudiantes. No se le
// exige el dominio institucional (RF-01 rige las cuentas de usuario; muchos estudiantes usan correo personal).
const student = (over: Partial<Student> = {}) => ({ id: 's1', studentCode: '20190001', firstName: 'Ana', lastName: 'Torres', email: null, schoolId: 'sch', cycle: 3, isActive: true, ...over }) as Student;

describe('correo de contacto del estudiante: forma única y sin duplicados', () => {
  let students: jest.Mocked<StudentRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let enrollments: jest.Mocked<PeriodEnrollmentRepository>;

  beforeEach(() => {
    students = {
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findByUserId: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (d) => ({ id: 'new', createdAt: new Date(), updatedAt: new Date(), ...d }) as Student),
      update: jest.fn().mockImplementation(async (_id, d) => student(d as Partial<Student>)),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    schools = { findById: jest.fn().mockResolvedValue({ id: 'sch', name: 'Sistemas' }), findAll: jest.fn().mockResolvedValue([{ id: 'sch', name: 'Sistemas' }]) } as never;
    periods = { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as jest.Mocked<AcademicPeriodRepository>;
    enrollments = { enroll: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<PeriodEnrollmentRepository>;
  });

  describe('alta', () => {
    const create = () => new CreateStudentUseCase(students, schools, allowAllGuard(students), periods, enrollments);
    const input = (email?: string) => ({ studentCode: '20250001', firstName: 'Luis', lastName: 'Pérez', email, cycle: 3, schoolId: 'sch' }) as never;

    it('guarda el correo normalizado; vacío o ausente es «sin correo» (null), no una cadena vacía', async () => {
      await create().execute(input('  Luis.Perez@Gmail.COM '), 'admin');
      expect(students.create).toHaveBeenLastCalledWith(expect.objectContaining({ email: 'luis.perez@gmail.com' }));

      await create().execute(input(''), 'admin');
      expect(students.create).toHaveBeenLastCalledWith(expect.objectContaining({ email: null }));
      await create().execute(input(undefined), 'admin');
      expect(students.create).toHaveBeenLastCalledWith(expect.objectContaining({ email: null }));
    });

    it('admite un correo personal (no se exige el dominio institucional al estudiante)', async () => {
      await expect(create().execute(input('luis@gmail.com'), 'admin')).resolves.toBeDefined();
    });

    it('rechaza el correo que ya tiene otro estudiante, sin distinguir mayúsculas, y no crea nada', async () => {
      students.findAll.mockResolvedValue([student({ id: 'otro', email: 'luis@gmail.com' })]);
      await expect(create().execute(input('LUIS@gmail.com'), 'admin')).rejects.toThrow(DuplicateStudentEmailError);
      expect(students.findAll).toHaveBeenCalledWith({ email: 'luis@gmail.com' });
      expect(students.create).not.toHaveBeenCalled();
    });
  });

  describe('edición', () => {
    const update = () => new UpdateStudentUseCase(students, schools, allowAllGuard(students));

    beforeEach(() => students.findById.mockResolvedValue(student({ email: 'ana@gmail.com' })));

    it('cambiar a un correo libre lo guarda normalizado', async () => {
      await update().execute('s1', { email: ' Nuevo@Mail.com' } as never, 'admin');
      expect(students.update).toHaveBeenCalledWith('s1', expect.objectContaining({ email: 'nuevo@mail.com' }));
    });

    it('vaciar el correo lo quita (null)', async () => {
      await update().execute('s1', { email: '' } as never, 'admin');
      expect(students.update).toHaveBeenCalledWith('s1', expect.objectContaining({ email: null }));
    });

    it('un correo de otro estudiante se rechaza; el propio (aunque cambie la forma) no cuenta como duplicado', async () => {
      students.findAll.mockResolvedValue([student({ id: 'otro', email: 'ocupado@mail.com' })]);
      await expect(update().execute('s1', { email: 'Ocupado@mail.com' } as never, 'admin')).rejects.toThrow(DuplicateStudentEmailError);

      students.update.mockClear();
      students.findAll.mockResolvedValue([student({ id: 's1', email: 'ana@gmail.com' })]);
      await update().execute('s1', { email: 'ANA@gmail.com' } as never, 'admin');
      expect(students.update).toHaveBeenCalled();
    });
  });

  describe('carga masiva', () => {
    const importer = () => new ImportStudentsUseCase(students, schools, allowAllGuard(students), periods, enrollments);
    const row = (n: number, code: string, email: string) => ({ rowNumber: n, studentCode: code, firstName: 'Luis', lastName: 'Pérez', email, phone: '', cycle: '3', school: 'Sistemas' });

    it('el correo repetido dentro del archivo se rechaza en la segunda fila; la primera se crea', async () => {
      const report = await importer().execute([row(2, '20250001', 'luis@gmail.com'), row(3, '20250002', 'LUIS@gmail.com ')], 'admin');

      expect(report.created).toBe(1);
      expect(report.errors).toEqual([{ row: 3, studentCode: '20250002', message: 'El correo está duplicado dentro del archivo' }]);
    });

    it('el correo que ya tiene otro estudiante de la base se rechaza (una sola consulta para todo el archivo)', async () => {
      students.findAll.mockResolvedValue([student({ id: 'otro', email: 'Luis@Gmail.com' })]);

      const report = await importer().execute([row(2, '20250001', 'luis@gmail.com'), row(3, '20250002', 'otro@gmail.com')], 'admin');

      expect(report.created).toBe(1);
      expect(report.errors[0]).toMatchObject({ row: 2, message: 'Ya hay un estudiante con el correo luis@gmail.com' });
      expect(students.findAll).toHaveBeenCalledTimes(1);
    });

    it('quien ya existe por su código continúa sin que su correo cuente como duplicado', async () => {
      students.findByCode.mockResolvedValue(student({ id: 's9', studentCode: '20250001', schoolId: 'sch', email: 'luis@gmail.com' }));
      students.findAll.mockResolvedValue([student({ id: 's9', email: 'luis@gmail.com' })]);

      const report = await importer().execute([row(2, '20250001', 'luis@gmail.com')], 'admin');

      expect(report.errors).toEqual([]);
      expect(report.continued).toBe(1);
    });
  });
});
