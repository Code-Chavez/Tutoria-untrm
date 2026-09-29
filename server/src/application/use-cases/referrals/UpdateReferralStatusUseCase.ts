import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import {
  ReferralNotFoundError,
  ReferralClosedError,
  ClosureNotesRequiredError,
  InvalidReferralStatusError,
} from './ReferralErrors';

const VALID_STATUSES = ['ENVIADO', 'RECIBIDO', 'EN_ATENCION', 'ATENDIDO', 'CERRADO'];

export class UpdateReferralStatusUseCase {
  constructor(private readonly referralRepo: StudentReferralRepository) {}

  async execute(
    referralId: string,
    status: string,
    changedById: string,
    notes?: string
  ): Promise<StudentReferral> {
    if (!VALID_STATUSES.includes(status)) {
      throw new InvalidReferralStatusError(status);
    }

    const referral = await this.referralRepo.findById(referralId);
    if (!referral) {
      throw new ReferralNotFoundError(referralId);
    }

    if (referral.status === 'CERRADO') {
      throw new ReferralClosedError();
    }

    if ((status === 'ATENDIDO' || status === 'CERRADO') && (!notes || !notes.trim())) {
      throw new ClosureNotesRequiredError();
    }

    return this.referralRepo.updateStatus(referralId, status, changedById, notes?.trim());
  }
}

