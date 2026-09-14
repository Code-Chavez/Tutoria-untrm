import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import {
  ImportStudentRow,
  ImportReport,
  ImportRowError,
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
  ) {}

  async execute(rows: ImportStudentRow[]): Promise<ImportReport> {
    const schools = await this.schools.findAll();
    const schoolByName = new Map(schools.map((s) => [normalize(s.name), s.id]));

    const errors: ImportRowError[] = [];
    let created = 0;

    // Códigos ya vistos en este mismo archivo, para detectar duplicados internos.
    const seenCodes = new Set<string>();

    for (const row of rows) {
      const code = row.studentCode?.trim() ?? '';
      const rowErrors: string[] = [];

      if (!CODE_PATTERN.test(code)) {
        rowErrors.push('El código universitario debe tener entre 8 y 12 dígitos numéricos');
      }
      if (!row.firstName?.trim()) {
        rowErrors.push('El nombre es obligatorio');
      }
      if (!row.lastName?.trim()) {
        rowErrors.push('El apellido es obligatorio');
      }

      const cycle = Number(row.cycle);
      if (!row.cycle?.toString().trim() || Number.isNaN(cycle) || !Number.isInteger(cycle) || cycle < 1 || cycle > 14) {
        rowErrors.push('El ciclo debe ser un entero entre 1 y 14');
      }

      const schoolId = schoolByName.get(normalize(row.school ?? ''));
      if (!row.school?.trim()) {
        rowErrors.push('La escuela profesional es obligatoria');
      } else if (!schoolId) {
        rowErrors.push(`No se encontró la escuela «${row.school.trim()}»`);
      }

      if (CODE_PATTERN.test(code) && seenCodes.has(code)) {
        rowErrors.push('El código está duplicado dentro del archivo');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: row.rowNumber, studentCode: code || undefined, message: rowErrors.join('; ') });
        continue;
      }

      // Duplicado contra la base de datos.
      const existing = await this.students.findByCode(code);
      if (existing) {
        errors.push({ row: row.rowNumber, studentCode: code, message: 'Ya existe un estudiante con ese código' });
        continue;
      }

      await this.students.create({
        studentCode: code,
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        cycle,
        schoolId: schoolId as string,
        isAtRisk: false,
        isActive: true,
      });
      seenCodes.add(code);
      created += 1;
    }

    return {
      totalRows: rows.length,
      created,
      skipped: errors.length,
      errors,
    };
  }
}
