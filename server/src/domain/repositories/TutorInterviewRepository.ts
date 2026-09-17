import { TutorInterview } from '../entities/TutorInterview';

export interface TutorInterviewRepository {
  create(data: Omit<TutorInterview, 'id' | 'createdAt' | 'updatedAt'>): Promise<TutorInterview>;
  /** Historial de entrevistas de un estudiante, más reciente primero (para el expediente). */
  findByStudent(studentId: string): Promise<TutorInterview[]>;
}
