import { Student } from '@domain/entities/Student';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { CreateStudentInput } from '@application/dtos/student.dto';
import { DuplicateStudentCodeError, SchoolNotFoundError } from './StudentErrors';

export class CreateStudentUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(data: CreateStudentInput, requesterId: string): Promise<Student> {
    const code = data.studentCode.trim();
    await this.guard.assertSchoolAccess(requesterId, data.schoolId);

    const school = await this.schools.findById(data.schoolId);
    if (!school) {
      throw new SchoolNotFoundError(data.schoolId);
    }

    const existing = await this.students.findByCode(code);
    if (existing) {
      throw new DuplicateStudentCodeError(code);
    }

    return this.students.create({
      studentCode: code,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email ?? null,
      phone: data.phone ?? null,
      cycle: data.cycle,
      schoolId: data.schoolId,
      isAtRisk: false,
      isActive: true,
    });
  }
}
