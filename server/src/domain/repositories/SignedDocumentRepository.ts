import { SignedDocument } from '../entities/SignedDocument';

export interface SignedDocumentRepository {
  create(data: Omit<SignedDocument, 'id' | 'createdAt'>): Promise<SignedDocument>;
  findById(id: string): Promise<SignedDocument | null>;
  listByReferral(referralId: string): Promise<SignedDocument[]>;
  listByStudentPeriod(studentId: string, periodId: string): Promise<SignedDocument[]>;
}
