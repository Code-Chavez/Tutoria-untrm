import { TutoringRequest } from '../entities/TutoringRequest';

export interface TutoringRequestFilters {
  studentId?: string;
  routedToId?: string;
}

export interface TutoringRequestRepository {
  create(data: Omit<TutoringRequest, 'id' | 'createdAt'>): Promise<TutoringRequest>;
  findAll(filters?: TutoringRequestFilters): Promise<TutoringRequest[]>;
  /** Historial de un estudiante, más reciente primero (para el expediente). */
  findByStudent(studentId: string): Promise<TutoringRequest[]>;
}
