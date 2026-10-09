import { TutoringRequest, TutoringRequestStatus } from '../entities/TutoringRequest';

export interface TutoringRequestFilters {
  studentId?: string;
  routedToId?: string;
  status?: TutoringRequestStatus;
}

export interface TutoringRequestAttention {
  status: TutoringRequestStatus;
  responseNote: string | null;
  handledById: string;
  handledAt: Date;
  sessionId: string | null;
}

export interface TutoringRequestRepository {
  create(data: Omit<TutoringRequest, 'id' | 'createdAt' | 'status' | 'responseNote' | 'handledById' | 'handledAt' | 'sessionId'>): Promise<TutoringRequest>;
  findById(id: string): Promise<TutoringRequest | null>;
  findAll(filters?: TutoringRequestFilters): Promise<TutoringRequest[]>;
  /** Historial de un estudiante, más reciente primero (para el expediente). */
  findByStudent(studentId: string): Promise<TutoringRequest[]>;
  /**
   * Registra la atención solo si la solicitud sigue en el estado esperado (dos personas no pisan el
   * mismo cambio). Devuelve la solicitud actualizada, o null si otro cambio se adelantó.
   */
  updateAttention(id: string, expectedStatus: TutoringRequestStatus, attention: TutoringRequestAttention): Promise<TutoringRequest | null>;
}
