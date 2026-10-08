import { SignedDocumentRepository } from '@domain/repositories/SignedDocumentRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { canViewReferral, resolveReferralActor } from '@application/use-cases/referrals/referralAccess';
import { SignedDocumentNotFoundError } from './SignedDocumentErrors';

/**
 * Entrega el archivo de un documento firmado con la misma regla que el caso al que pertenece: una
 * constancia de derivación, solo a quien ve esa derivación; una hoja de asistencia, a quien tiene
 * alcance sobre el tutorado. Fuera de ahí se responde «no encontrado» (no se confirma que exista).
 */
export class GetSignedDocumentFileUseCase {
  constructor(
    private readonly documents: SignedDocumentRepository,
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly guard: StudentAccessGuard,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(documentId: string, requesterId: string): Promise<{ fileName: string; mimeType: string; absolutePath: string }> {
    const document = await this.documents.findById(documentId);
    if (!document) throw new SignedDocumentNotFoundError();

    if (document.kind === 'REFERRAL_CONSTANCIA') {
      const referral = document.referralId ? await this.referrals.findById(document.referralId) : null;
      const actor = await resolveReferralActor(this.users, this.roles, requesterId).catch(() => null);
      if (!referral || !actor || !canViewReferral(actor, referral)) throw new SignedDocumentNotFoundError();
    } else {
      if (!document.studentId) throw new SignedDocumentNotFoundError();
      await this.guard.assertAccess(requesterId, document.studentId).catch(() => {
        throw new SignedDocumentNotFoundError();
      });
    }

    return { fileName: document.fileName, mimeType: document.mimeType, absolutePath: this.storage.resolvePath(document.storageKey) };
  }
}
