import { StudentReferral } from '../entities/StudentReferral';

export interface StudentReferralRepository {
  create(data: Omit<StudentReferral, 'id' | 'createdAt' | 'status' | 'statusHistory'>): Promise<StudentReferral>;
  findById(id: string): Promise<StudentReferral | null>;
  findMany(filters: { referredById?: string; service?: string; studentId?: string }): Promise<StudentReferral[]>;
  /**
   * Cambia el estado solo si todavía es `expectedStatus` (control de concurrencia);
   * devuelve null si otra petición lo cambió antes.
   */
  updateStatus(
    referralId: string,
    status: string,
    changedById: string,
    notes: string | undefined,
    expectedStatus: string,
  ): Promise<StudentReferral | null>;
}
