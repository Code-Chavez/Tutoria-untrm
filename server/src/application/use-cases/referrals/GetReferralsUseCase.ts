import { StudentReferral } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { resolveReferralActor, toReferralView } from './referralAccess';
import { ReferralListNotAllowedError } from './ReferralErrors';

export class GetReferralsUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(userId: string): Promise<StudentReferral[]> {
    const actor = await resolveReferralActor(this.users, this.roles, userId);

    // HU-30: visibilidad restringida del caso.
    let visible: StudentReferral[];
    if (actor.roleName === 'Administrador DBU') {
      // La DBU tiene visibilidad de seguimiento.
      visible = await this.referrals.findMany({});
    } else if (actor.roleName === 'Docente Tutor') {
      // El tutor emisor mantiene los suyos.
      visible = await this.referrals.findMany({ referredById: actor.id });
    } else if (actor.roleName === 'Profesional de Servicio' && actor.service) {
      // El profesional solo ve los casos de su servicio.
      visible = await this.referrals.findMany({ service: actor.service });
    } else if (actor.roleName === 'Profesional de Servicio') {
      throw new ReferralListNotAllowedError(
        'Tu cuenta no tiene un servicio asignado, por eso no se muestran casos. Pide a la DBU que lo configure.',
      );
    } else {
      // Coordinación, Vicerrectorado y el tutorado no ven casos individuales: se dice por qué en vez de mostrar una bandeja vacía (A15).
      throw new ReferralListNotAllowedError(
        'Los casos derivados son confidenciales: solo los ve la DBU, el tutor que derivó y el profesional del servicio de destino.',
      );
    }

    // Las notas internas de atención no salen en la respuesta para quien no gestiona el caso.
    return visible.map((referral) => toReferralView(referral, actor));
  }
}
