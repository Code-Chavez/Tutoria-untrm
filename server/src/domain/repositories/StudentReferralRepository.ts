import { StudentReferral } from '../entities/StudentReferral';

export interface StudentReferralRepository {
  create(data: Omit<StudentReferral, 'id' | 'createdAt'>): Promise<StudentReferral>;
  findById(id: string): Promise<StudentReferral | null>;
  findMany(filters: { referredById?: string; service?: string }): Promise<StudentReferral[]>;
}
