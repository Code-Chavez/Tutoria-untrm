import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { ReferralNotFoundError, ReferralForbiddenError } from './ReferralErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { canViewReferral, ReferralView, resolveReferralActor, toReferralView, withStudent } from './referralAccess';

export class GetReferralByIdUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly students?: StudentRepository,
  ) {}

  async execute(referralId: string, userId: string): Promise<ReferralView> {
    const actor = await resolveReferralActor(this.users, this.roles, userId);

    const referral = await this.referrals.findById(referralId);
    if (!referral) {
      throw new ReferralNotFoundError(referralId);
    }

    // Validación de visibilidad (HU-30), compartida con la constancia y el cambio de estado.
    if (!canViewReferral(actor, referral)) throw new ReferralForbiddenError();

    const [view] = await withStudent(this.students, [toReferralView(referral, actor)]);
    return view;
  }
}
