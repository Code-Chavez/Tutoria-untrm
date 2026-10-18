import { Student } from '@domain/entities/Student';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { UpdateStudentInput } from '@application/dtos/student.dto';
import { normalizeEmail } from '@application/validation/email';
import {
  DuplicateStudentCodeError,
  DuplicateStudentEmailError,
  SchoolNotFoundError,
} from './StudentErrors';

export class UpdateStudentUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(id: string, data: UpdateStudentInput, requesterId: string): Promise<Student> {
    const existing = await this.guard.assertAccess(requesterId, id);
    // Mover al estudiante a otra escuela exige tener alcance también sobre la de destino.
    if (data.schoolId && data.schoolId !== existing.schoolId) {
      await this.guard.assertSchoolAccess(requesterId, data.schoolId);
    }

    if (data.schoolId && data.schoolId !== existing.schoolId) {
      const school = await this.schools.findById(data.schoolId);
      if (!school) {
        throw new SchoolNotFoundError(data.schoolId);
      }
    }

    // Si cambia el código, no debe chocar con otro estudiante.
    if (data.studentCode && data.studentCode.trim() !== existing.studentCode) {
      const other = await this.students.findByCode(data.studentCode.trim());
      if (other) {
        throw new DuplicateStudentCodeError(data.studentCode.trim());
      }
    }

    // Correo de contacto: forma única; vacío lo quita; no puede ser el de otro estudiante.
    let email: string | null | undefined;
    if (data.email !== undefined) {
      email = data.email ? normalizeEmail(data.email) : null;
      if (email && email !== (existing.email ?? null)) {
        const owners = await this.students.findAll({ email });
        if (owners.some((s) => s.id !== id)) throw new DuplicateStudentEmailError(email);
      }
    }

    return this.students.update(id, {
      ...(data.studentCode !== undefined && { studentCode: data.studentCode.trim() }),
      ...(data.firstName !== undefined && { firstName: data.firstName.trim() }),
      ...(data.lastName !== undefined && { lastName: data.lastName.trim() }),
      ...(email !== undefined && { email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.cycle !== undefined && { cycle: data.cycle }),
      ...(data.schoolId !== undefined && { schoolId: data.schoolId }),
    });
  }
}
