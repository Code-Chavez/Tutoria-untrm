import { Student } from '@domain/entities/Student';
import { StudentRepository, StudentFilters } from '@domain/repositories/StudentRepository';

export class ListStudentsUseCase {
  constructor(private readonly students: StudentRepository) {}

  execute(filters?: StudentFilters): Promise<Student[]> {
    return this.students.findAll(filters);
  }
}
