import { StudentReferral } from '../entities/StudentReferral';

export interface StudentReferralRepository {
  create(data: Omit<StudentReferral, 'id' | 'createdAt' | 'status' | 'statusHistory'>): Promise<StudentReferral>;
  findById(id: string): Promise<StudentReferral | null>;
  findMany(filters: { referredById?: string; service?: string }): Promise<StudentReferral[]>;
  updateStatus(referralId: string, status: string, changedById: string, notes?: string): Promise<StudentReferral>;
}
