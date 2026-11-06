import { PrismaClient } from '@prisma/client';
import { CertificateEvidenceRecord, CertificateFilters, CertificateRecord, CertificateRepository } from '@domain/repositories/CertificateRepository';

// Nunca se leen `snapshot` ni `unsignedStorageKey`: el PDF y los datos congelados se entregan por su propia ruta auditada (corte 4).
const SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  periodId: true,
  schoolId: true,
  tutorId: true,
  assignmentId: true,
  createdById: true,
  status: true,
  isDemo: true,
  number: true,
  templateId: true,
  unsignedStorageKey: true,
  approvedById: true,
  approvedAt: true,
  voidedById: true,
  voidedAt: true,
  voidReason: true,
  reviewNote: true,
} as const;

type Row = Omit<CertificateRecord, 'hasUnsignedPdf'> & { unsignedStorageKey: string | null };

const toRecord = ({ unsignedStorageKey, ...rest }: Row): CertificateRecord => ({ ...rest, hasUnsignedPdf: unsignedStorageKey !== null });

/**
 * El alcance de quien consulta y la escuela que pide se combinan (intersección), nunca se sustituyen: pedir una escuela fuera del
 * alcance no la abre, devuelve vacío.
 */
function schoolCondition(filters: CertificateFilters): { schoolId?: string | { in: string[] } } {
  if (filters.schoolIds && filters.schoolId) return { schoolId: { in: filters.schoolIds.filter((id) => id === filters.schoolId) } };
  if (filters.schoolIds) return { schoolId: { in: filters.schoolIds } };
  if (filters.schoolId) return { schoolId: filters.schoolId };
  return {};
}

export class PrismaCertificateRepository implements CertificateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: CertificateFilters = {}): Promise<CertificateRecord[]> {
    const rows = await this.prisma.certificate.findMany({
      where: {
        ...schoolCondition(filters),
        ...(filters.periodId && { periodId: filters.periodId }),
        ...(filters.status && { status: filters.status }),
      },
      select: SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<CertificateRecord | null> {
    const row = await this.prisma.certificate.findUnique({ where: { id }, select: SELECT });
    return row ? toRecord(row) : null;
  }

  evidencesOf(certificateId: string): Promise<CertificateEvidenceRecord[]> {
    return this.prisma.certificateEvidence.findMany({
      where: { certificateId },
      select: { id: true, kind: true, ref: true, result: true, comment: true, reviewedById: true, reviewedAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
