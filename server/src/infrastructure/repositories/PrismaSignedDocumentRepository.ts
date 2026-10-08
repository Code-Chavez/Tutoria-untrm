import { PrismaClient } from '@prisma/client';
import { SignedDocument } from '@domain/entities/SignedDocument';
import { SignedDocumentRepository } from '@domain/repositories/SignedDocumentRepository';

export class PrismaSignedDocumentRepository implements SignedDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<SignedDocument, 'id' | 'createdAt'>): Promise<SignedDocument> {
    return (await this.prisma.signedDocument.create({ data })) as SignedDocument;
  }

  async findById(id: string): Promise<SignedDocument | null> {
    return (await this.prisma.signedDocument.findUnique({ where: { id } })) as SignedDocument | null;
  }

  async listByReferral(referralId: string): Promise<SignedDocument[]> {
    return (await this.prisma.signedDocument.findMany({
      where: { referralId },
      orderBy: { createdAt: 'desc' },
    })) as SignedDocument[];
  }

  async listByStudentPeriod(studentId: string, periodId: string): Promise<SignedDocument[]> {
    return (await this.prisma.signedDocument.findMany({
      where: { kind: 'ATTENDANCE_SHEET', studentId, periodId },
      orderBy: { createdAt: 'desc' },
    })) as SignedDocument[];
  }
}
