import { StudentReferral } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { ReferralNotFoundError, ReferralForbiddenError } from './ReferralErrors';
import { canViewReferral, resolveReferralActor, toReferralView } from './referralAccess';

export class GetReferralByIdUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(referralId: string, userId: string): Promise<StudentReferral> {
    const actor = await resolveReferralActor(this.users, this.roles, userId);

    const referral = await this.referrals.findById(referralId);
    if (!referral) {
      throw new ReferralNotFoundError(referralId);
    }

    // Validación de visibilidad (HU-30), compartida con la constancia y el cambio de estado.
    if (!canViewReferral(actor, referral)) throw new ReferralForbiddenError();

    return toReferralView(referral, actor);
  }
}
