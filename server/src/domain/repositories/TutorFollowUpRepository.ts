import { TutorFollowUp } from '../entities/TutorFollowUp';

export interface TutorFollowUpRepository {
  create(data: Omit<TutorFollowUp, 'id' | 'createdAt'>): Promise<TutorFollowUp>;
  /** Fichas de seguimiento de un estudiante, más reciente primero (para el expediente). */
  findByStudent(studentId: string): Promise<TutorFollowUp[]>;
  /** Fichas de seguimiento realizadas por un tutor dentro de un rango de fechas. */
  findByTutorBetween(tutorId: string, from: Date, to: Date): Promise<TutorFollowUp[]>;
}
