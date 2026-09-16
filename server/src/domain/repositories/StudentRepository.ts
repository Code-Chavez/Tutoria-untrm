import { Student } from '../entities/Student';

export interface StudentFilters {
  schoolId?: string;
  cycle?: number;
  isActive?: boolean;
  isAtRisk?: boolean;
  search?: string;
  tutorId?: string;
  unassigned?: boolean;
}

export interface TutorLoad {
  tutorId: string;
  count: number;
}

export interface StudentRepository {
  findById(id: string): Promise<Student | null>;
  findByCode(studentCode: string): Promise<Student | null>;
  findAll(filters?: StudentFilters): Promise<Student[]>;
  create(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
  update(id: string, data: Partial<Student>): Promise<Student>;
  /** Asigna un tutor a varios estudiantes; devuelve cuántos se actualizaron. */
  assignTutor(studentIds: string[], tutorId: string, assignedAt: Date): Promise<number>;
  /** Cantidad de estudiantes activos asignados a cada tutor. */
  countByTutor(): Promise<TutorLoad[]>;
}
