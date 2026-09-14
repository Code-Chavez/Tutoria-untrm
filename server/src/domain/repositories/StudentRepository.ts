import { Student } from '../entities/Student';

export interface StudentFilters {
  schoolId?: string;
  cycle?: number;
  isActive?: boolean;
  isAtRisk?: boolean;
  search?: string;
}

export interface StudentRepository {
  findById(id: string): Promise<Student | null>;
  findByCode(studentCode: string): Promise<Student | null>;
  findAll(filters?: StudentFilters): Promise<Student[]>;
  create(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
  update(id: string, data: Partial<Student>): Promise<Student>;
}
