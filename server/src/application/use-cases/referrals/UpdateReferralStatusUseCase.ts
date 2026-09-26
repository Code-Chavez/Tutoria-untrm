import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';

export class UpdateReferralStatusUseCase {
  constructor(private readonly referralRepo: StudentReferralRepository) {}

  async execute(
    referralId: string,
    status: string,
    changedById: string,
    notes?: string
  ): Promise<StudentReferral> {
    const referral = await this.referralRepo.findById(referralId);
    if (!referral) {
      throw new Error('Referral not found');
    }

    if (referral.status === 'CERRADO') {
      throw new Error('Cannot update a closed referral');
    }

    return this.referralRepo.updateStatus(referralId, status, changedById, notes);
  }
}
