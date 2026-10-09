import { StudentReferral } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { CreateReferralInput } from '@application/dtos/referral.dto';

const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela Profesional',
  PSICOPEDAGOGIA: 'Servicio de Psicopedagogía',
  PSICOLOGIA: 'Servicio de Psicología',
  ASISTENCIA_SOCIAL: 'Servicio de Asistencia Social',
  SALUD: 'Servicio de Salud',
};

/**
 * Ficha de derivación (HU-28, Anexo N°6): el docente tutor registra el
 * checklist de aspectos observados, el motivo, el servicio destino y,
 * opcionalmente, la instancia o profesional que la recibe (HU-29). El
 * servicio ya llega elegido por el tutor — la sugerencia por aspecto (Art.
 * 21) es solo una guía en el cliente, no un bloqueo aquí.
 *
 * HU-33: al registrarse, se notifica a los profesionales del servicio
 * destino. El mensaje no incluye el motivo ni los aspectos observados
 * (confidencialidad, HU-30) — solo avisa que hay un caso nuevo por atender.
 */
export class CreateReferralUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly guard: StudentAccessGuard,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(
    studentId: string,
    referredById: string,
    input: CreateReferralInput,
  ): Promise<StudentReferral> {
    await this.guard.assertAccess(referredById, studentId);

    const referral = await this.referrals.create({
      studentId,
      referredById,
      checkedAspects: input.checkedAspects,
      reason: input.reason,
      service: input.service,
      receivingInstance: input.receivingInstance?.trim() || null,
    });

    const serviceRole = await this.roles.findByName('Profesional de Servicio');
    if (serviceRole) {
      const recipients = await this.users.findAll({
        roleId: serviceRole.id,
        service: referral.service,
        isActive: true,
      });
      const serviceLabel = SERVICE_LABEL[referral.service] ?? referral.service;
      await Promise.all(
        recipients.map((recipient) =>
          this.notifications.create({
            userId: recipient.id,
            type: 'REFERRAL_CREATED',
            message: `Nueva derivación recibida en ${serviceLabel}`,
            referralId: referral.id,
          }),
        ),
      );
    }

    return referral;
  }
}
