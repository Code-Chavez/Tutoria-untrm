import { StudentReferral } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { resolveReferralActor, toReferralView } from './referralAccess';

export class GetReferralsUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(userId: string): Promise<StudentReferral[]> {
    const actor = await resolveReferralActor(this.users, this.roles, userId);

    // HU-30: visibilidad restringida del caso.
    let visible: StudentReferral[] = [];
    if (actor.roleName === 'Administrador DBU') {
      // La DBU tiene visibilidad de seguimiento.
      visible = await this.referrals.findMany({});
    } else if (actor.roleName === 'Docente Tutor') {
      // El tutor emisor mantiene los suyos.
      visible = await this.referrals.findMany({ referredById: actor.id });
    } else if (actor.roleName === 'Profesional de Servicio' && actor.service) {
      // El profesional solo ve los casos de su servicio; sin servicio asignado, ninguno.
      visible = await this.referrals.findMany({ service: actor.service });
    }

    // Las notas internas de atención no salen en la respuesta para quien no gestiona el caso.
    return visible.map((referral) => toReferralView(referral, actor));
  }
}
