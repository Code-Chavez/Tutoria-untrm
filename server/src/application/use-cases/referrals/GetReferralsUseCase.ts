import { StudentReferral } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';

export class GetReferralsUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(userId: string): Promise<StudentReferral[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');

    const role = await this.roles.findById(user.roleId);
    if (!role) throw new Error('Rol no encontrado');

    // HU-30: Visibilidad restringida del caso
    // "la DBU tiene visibilidad de seguimiento" -> Administrador DBU
    if (role.name === 'Administrador DBU') {
      return this.referrals.findMany({});
    }

    // "el tutor emisor mantiene los suyos" -> Docente Tutor
    if (role.name === 'Docente Tutor') {
      return this.referrals.findMany({ referredById: userId });
    }

    // "el profesional solo ve los casos de su servicio" -> Profesional de Servicio
    if (role.name === 'Profesional de Servicio') {
      if (!user.service) {
        // Si el profesional no tiene servicio asignado, no puede ver casos
        return [];
      }
      return this.referrals.findMany({ service: user.service });
    }

    // Para otros roles que por algún motivo llamen a este endpoint
    return [];
  }
}
