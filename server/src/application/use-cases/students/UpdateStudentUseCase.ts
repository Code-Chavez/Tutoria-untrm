import { Student } from '@domain/entities/Student';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UpdateStudentInput } from '@application/dtos/student.dto';
import {
  StudentNotFoundError,
  DuplicateStudentCodeError,
  SchoolNotFoundError,
} from './StudentErrors';

export class UpdateStudentUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async execute(id: string, data: UpdateStudentInput): Promise<Student> {
    const existing = await this.students.findById(id);
    if (!existing) {
      throw new StudentNotFoundError(id);
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

    return this.students.update(id, {
      ...(data.studentCode !== undefined && { studentCode: data.studentCode.trim() }),
      ...(data.firstName !== undefined && { firstName: data.firstName.trim() }),
      ...(data.lastName !== undefined && { lastName: data.lastName.trim() }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.cycle !== undefined && { cycle: data.cycle }),
      ...(data.schoolId !== undefined && { schoolId: data.schoolId }),
    });
  }
}
