import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaCertificateSequenceRepository } from './PrismaCertificateSequenceRepository';
import { CertificateEvidenceRecord, CertificateRecord } from '@domain/repositories/CertificateRepository';
import {
  CertificateAlreadyExistsError,
  CertificatePatch,
  CertificateWorkflowRepository,
  EvidencePatch,
  NewCertificate,
  TransitionTools,
} from '@domain/repositories/CertificateWorkflowRepository';

const CERTIFICATE_SELECT = {
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
  unsignedSha256: true,
  approvedById: true,
  approvedAt: true,
  voidedById: true,
  voidedAt: true,
  voidReason: true,
  reviewNote: true,
} as const;

const EVIDENCE_SELECT = { id: true, kind: true, ref: true, result: true, comment: true, reviewedById: true, reviewedAt: true } as const;

type Row = Omit<CertificateRecord, 'hasUnsignedPdf' | 'pdfSha256'> & { unsignedStorageKey: string | null; unsignedSha256: string | null };
const toRecord = ({ unsignedStorageKey, unsignedSha256, ...rest }: Row): CertificateRecord => ({ ...rest, hasUnsignedPdf: unsignedStorageKey !== null, pdfSha256: unsignedSha256 });

const isUniqueViolation = (error: unknown): boolean => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class PrismaCertificateWorkflowRepository implements CertificateWorkflowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: NewCertificate): Promise<CertificateRecord> {
    try {
      const row = await this.prisma.certificate.create({
        data: {
          periodId: input.periodId,
          schoolId: input.schoolId,
          tutorId: input.tutorId,
          assignmentId: input.assignmentId,
          createdById: input.createdById,
          evidences: { create: input.evidences.map((e) => ({ kind: e.kind, ref: e.ref })) },
        },
        select: CERTIFICATE_SELECT,
      });
      return toRecord(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw new CertificateAlreadyExistsError();
      throw error;
    }
  }

  /** Bloquea la fila del trámite hasta que termine la transacción: las demás acciones sobre él esperan y luego ven el resultado. */
  private async lock(tx: Prisma.TransactionClient, id: string): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM certificates WHERE id = ${id} FOR UPDATE`;
    return rows.length > 0;
  }

  transition(
    id: string,
    decide: (current: CertificateRecord, evidences: CertificateEvidenceRecord[], tools: TransitionTools) => CertificatePatch | Promise<CertificatePatch>,
  ): Promise<CertificateRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lock(tx, id))) return null;
      const current = toRecord(await tx.certificate.findUniqueOrThrow({ where: { id }, select: CERTIFICATE_SELECT }));
      const evidences = await tx.certificateEvidence.findMany({ where: { certificateId: id }, select: EVIDENCE_SELECT, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      const tools: TransitionTools = { nextSequence: (scope, year) => new PrismaCertificateSequenceRepository(tx).next(scope, year) };
      const { snapshot, ...rest } = await decide(current, evidences, tools);
      const data = { ...rest, ...(snapshot !== undefined && { snapshot: snapshot as Prisma.InputJsonValue }) };
      return toRecord(await tx.certificate.update({ where: { id }, data, select: CERTIFICATE_SELECT }));
    });
  }

  reviewEvidence(
    certificateId: string,
    evidenceId: string,
    decide: (current: CertificateRecord, evidence: CertificateEvidenceRecord) => EvidencePatch,
  ): Promise<CertificateEvidenceRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lock(tx, certificateId))) return null;
      const evidence = await tx.certificateEvidence.findFirst({ where: { id: evidenceId, certificateId }, select: EVIDENCE_SELECT });
      if (!evidence) return null;
      const current = toRecord(await tx.certificate.findUniqueOrThrow({ where: { id: certificateId }, select: CERTIFICATE_SELECT }));
      const patch = decide(current, evidence);
      return tx.certificateEvidence.update({ where: { id: evidenceId }, data: patch, select: EVIDENCE_SELECT });
    });
  }
}
