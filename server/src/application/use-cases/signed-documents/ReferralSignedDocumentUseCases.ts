import { SignedDocumentView } from '@domain/entities/SignedDocument';
import { SignedDocumentRepository } from '@domain/repositories/SignedDocumentRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { canViewReferral, resolveReferralActor } from '@application/use-cases/referrals/referralAccess';
import { ReferralForbiddenError, ReferralNotFoundError } from '@application/use-cases/referrals/ReferralErrors';
import { sha256Of, toSignedDocumentViews } from './signedDocumentView';

export interface SignedFileInput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Adjunta la constancia de derivación (Anexo N°6) impresa, firmada y escaneada (A14). Pueden hacerlo
 * quienes ven el caso: la DBU, el tutor que derivó y el profesional del servicio de destino (cada uno
 * con su firma en el impreso). El sistema registra quién, cuándo y la huella del archivo.
 */
export class AttachReferralSignedDocumentUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly documents: SignedDocumentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly storage: EvidenceStorage,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(referralId: string, requesterId: string, file: SignedFileInput, ipAddress?: string) {
    const actor = await resolveReferralActor(this.users, this.roles, requesterId);
    const referral = await this.referrals.findById(referralId);
    if (!referral) throw new ReferralNotFoundError(referralId);
    if (!canViewReferral(actor, referral)) throw new ReferralForbiddenError();

    const storageKey = await this.storage.save(file.fileBuffer, file.fileName);
    const created = await this.documents.create({
      kind: 'REFERRAL_CONSTANCIA',
      referralId,
      studentId: referral.studentId,
      periodId: null,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      storageKey,
      sha256: sha256Of(file.fileBuffer),
      uploadedById: requesterId,
    });
    await this.auditLogs.create({
      userId: requesterId,
      action: 'SIGNED_DOCUMENT_ATTACHED',
      entity: 'StudentReferral',
      entityId: referralId,
      details: `Constancia firmada adjunta (${created.sha256.slice(0, 12)}…)`,
      ipAddress: ipAddress ?? null,
    });
    return (await toSignedDocumentViews([created], this.users))[0];
  }
}

export class ListReferralSignedDocumentsUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly documents: SignedDocumentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(referralId: string, requesterId: string): Promise<SignedDocumentView[]> {
    const actor = await resolveReferralActor(this.users, this.roles, requesterId);
    const referral = await this.referrals.findById(referralId);
    if (!referral) throw new ReferralNotFoundError(referralId);
    if (!canViewReferral(actor, referral)) throw new ReferralForbiddenError();
    return toSignedDocumentViews(await this.documents.listByReferral(referralId), this.users);
  }
}
