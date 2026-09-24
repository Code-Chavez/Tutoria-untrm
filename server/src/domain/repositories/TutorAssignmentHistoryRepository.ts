import { TutorAssignmentHistory } from '../entities/TutorAssignmentHistory';

export interface TutorAssignmentHistoryRepository {
  create(
    data: Omit<TutorAssignmentHistory, 'id' | 'createdAt'>,
  ): Promise<TutorAssignmentHistory>;
  /** Historial de un estudiante, más reciente primero (útil para el expediente). */
  findByStudent(studentId: string): Promise<TutorAssignmentHistory[]>;
}
