import { StudentReferral } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { ReferralNotFoundError, ReferralForbiddenError } from './ReferralErrors';

export class GetReferralByIdUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(referralId: string, userId: string): Promise<StudentReferral> {
    const referral = await this.referrals.findById(referralId);
    if (!referral) {
      throw new ReferralNotFoundError(referralId);
    }

    const user = await this.users.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');

    const role = await this.roles.findById(user.roleId);
    if (!role) throw new Error('Rol no encontrado');

    // Validación de visibilidad (HU-30)
    if (role.name === 'Administrador DBU') {
      return referral;
    }

    if (role.name === 'Docente Tutor') {
      if (referral.referredById !== userId) {
        throw new ReferralForbiddenError();
      }
      return referral;
    }

    if (role.name === 'Profesional de Servicio') {
      if (referral.service !== user.service) {
        throw new ReferralForbiddenError();
      }
      return referral;
    }

    throw new ReferralForbiddenError();
  }
}
