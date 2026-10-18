import type { CycleTutorApplier } from '@application/use-cases/cycle-tutors/CycleTutorUseCases';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { PeriodEnrollmentRepository } from '@domain/repositories/PeriodEnrollmentRepository';
import { normalizeEmail } from '@application/validation/email';
import { NoOpenPeriodForLoadError } from './StudentErrors';
import {
  EMAIL_INVALID,
  NAME_TOO_SHORT,
  PHONE_INVALID,
  STUDENT_NAME_MIN,
  isValidOptionalEmail,
  isValidOptionalPhone,
} from '@application/validation/studentFields';
import {
  ImportStudentRow,
  ImportReport,
  ImportRowError,
  ImportCreatedRow,
} from '@application/dtos/studentImport.dto';

const CODE_PATTERN = /^\d{8,12}$/;

// Normaliza un nombre de escuela para emparejarlo sin distinguir mayúsculas/acentos.
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export class ImportStudentsUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly enrollments: PeriodEnrollmentRepository,
    // Si la escuela ya tiene tutor para el ciclo, el estudiante cargado queda con él.
    private readonly cycleTutors?: CycleTutorApplier,
  ) {}

  async execute(rows: ImportStudentRow[], requesterId: string): Promise<ImportReport> {
    // La carga es de un periodo: cada estudiante cargado queda matriculado en el periodo vigente.
    const period = await this.periods.findActive();
    if (!period) throw new NoOpenPeriodForLoadError();
    const scope = await this.guard.scopeFor(requesterId);
    const allSchools = await this.schools.findAll();
    // El coordinador solo carga tutorados de las escuelas que coordina; la DBU, de cualquiera.
    const inScope = (schoolId: string) =>
      scope.kind === 'ALL' || (scope.kind === 'SCHOOLS' && scope.schoolIds.includes(schoolId));
    const schools = allSchools;
    const schoolByName = new Map(schools.map((s) => [normalize(s.name), s.id]));

    // Correos que ya tiene algún estudiante (una sola consulta para todo el archivo) y los ya vistos en este archivo: dos
    // estudiantes no comparten correo.
    const emailOwner = new Set<string>();
    for (const student of await this.students.findAll()) if (student.email) emailOwner.add(normalizeEmail(student.email));
    const seenEmails = new Set<string>();

    const errors: ImportRowError[] = [];
    const createdRows: ImportCreatedRow[] = [];
    const continuedRows: ImportCreatedRow[] = [];

    // Códigos ya vistos en este mismo archivo, para detectar duplicados internos.
    const seenCodes = new Set<string>();

    for (const row of rows) {
      const code = row.studentCode?.trim() ?? '';
      const rowErrors: string[] = [];

      if (!CODE_PATTERN.test(code)) {
        rowErrors.push('El código universitario debe tener entre 8 y 12 dígitos numéricos');
      }
      const firstName = row.firstName?.trim() ?? '';
      const lastName = row.lastName?.trim() ?? '';
      if (!firstName) rowErrors.push('El nombre es obligatorio');
      else if (firstName.length < STUDENT_NAME_MIN) rowErrors.push(`El nombre ${NAME_TOO_SHORT}`);
      if (!lastName) rowErrors.push('El apellido es obligatorio');
      else if (lastName.length < STUDENT_NAME_MIN) rowErrors.push(`El apellido ${NAME_TOO_SHORT}`);

      // Mismas reglas que el formulario: correo y teléfono son opcionales, pero si vienen deben ser válidos.
      const email = row.email ? normalizeEmail(row.email) : '';
      const phone = row.phone?.trim() ?? '';
      if (!isValidOptionalEmail(email)) rowErrors.push(`${EMAIL_INVALID} («${email}»)`);
      if (!isValidOptionalPhone(phone)) rowErrors.push(PHONE_INVALID);

      const cycle = Number(row.cycle);
      if (!row.cycle?.toString().trim() || Number.isNaN(cycle) || !Number.isInteger(cycle) || cycle < 1 || cycle > 14) {
        rowErrors.push('El ciclo debe ser un entero entre 1 y 14');
      }

      const schoolId = schoolByName.get(normalize(row.school ?? ''));
      if (!row.school?.trim()) {
        rowErrors.push('La escuela profesional es obligatoria');
      } else if (!schoolId) {
        rowErrors.push(`No se encontró la escuela «${row.school.trim()}»`);
      } else if (!inScope(schoolId)) {
        rowErrors.push(`No tienes acceso a la escuela «${row.school.trim()}»`);
      }

      if (CODE_PATTERN.test(code) && seenCodes.has(code)) {
        rowErrors.push('El código está duplicado dentro del archivo');
      }
      if (email && seenEmails.has(email)) rowErrors.push('El correo está duplicado dentro del archivo');

      if (rowErrors.length > 0) {
        errors.push({ row: row.rowNumber, studentCode: code || undefined, message: rowErrors.join('; ') });
        continue;
      }

      const existing = await this.students.findByCode(code);
      if (existing) {
        // Estudiante de un periodo anterior que continúa: se matricula de nuevo en el periodo vigente con su ciclo actual.
        if (existing.schoolId !== schoolId) {
          errors.push({ row: row.rowNumber, studentCode: code, message: 'Ya existe un estudiante con ese código en otra escuela' });
          continue;
        }
        await this.students.update(existing.id, { cycle, isActive: true });
        await this.enrollments.enroll({ periodId: period.id, studentId: existing.id, schoolId: existing.schoolId, cycle });
        await this.cycleTutors?.applyToStudent(period.id, { id: existing.id, schoolId: existing.schoolId, cycle, tutorId: existing.tutorId }, requesterId);
        seenCodes.add(code);
        continuedRows.push({ row: row.rowNumber, studentCode: code, fullName: `${existing.firstName} ${existing.lastName}` });
        continue;
      }

      // Quien ya existe por su código continúa (su correo no se toca); un estudiante nuevo no puede traer el de otro.
      if (email && emailOwner.has(email)) {
        errors.push({ row: row.rowNumber, studentCode: code, message: `Ya hay un estudiante con el correo ${email}` });
        continue;
      }

      const student = await this.students.create({
        studentCode: code,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        cycle,
        schoolId: schoolId as string,
        isAtRisk: false,
        isActive: true,
      });
      await this.enrollments.enroll({ periodId: period.id, studentId: student.id, schoolId: student.schoolId, cycle });
      await this.cycleTutors?.applyToStudent(period.id, { id: student.id, schoolId: student.schoolId, cycle }, requesterId);
      seenCodes.add(code);
      if (email) {
        seenEmails.add(email);
        emailOwner.add(email);
      }
      createdRows.push({ row: row.rowNumber, studentCode: code, fullName: `${firstName} ${lastName}` });
    }

    return {
      totalRows: rows.length,
      created: createdRows.length,
      continued: continuedRows.length,
      skipped: errors.length,
      createdRows,
      continuedRows,
      errors,
    };
  }
}
