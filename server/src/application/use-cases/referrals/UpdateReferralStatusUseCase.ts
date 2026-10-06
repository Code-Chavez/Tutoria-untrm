import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import {
  ReferralNotFoundError,
  ReferralClosedError,
  ClosureNotesRequiredError,
  InvalidReferralStatusError,
  InvalidReferralTransitionError,
  ReferralConflictError,
  ReferralForbiddenError,
  ReferralStatusForbiddenError,
} from './ReferralErrors';
import {
  canManageReferral,
  canViewReferral,
  isForwardTransition,
  resolveReferralActor,
  toReferralView,
} from './referralAccess';

const VALID_STATUSES = ['ENVIADO', 'RECIBIDO', 'EN_ATENCION', 'ATENDIDO', 'CERRADO'];

const STATUS_LABEL: Record<string, string> = {
  ENVIADO: 'Enviado',
  RECIBIDO: 'Recibido',
  EN_ATENCION: 'En atención',
  ATENDIDO: 'Atendido',
  CERRADO: 'Cerrado',
};

// HU-33: cada cambio de estado notifica al tutor que emitió la derivación
// (sin exponer las notas de atención, que son de uso interno del servicio).
export class UpdateReferralStatusUseCase {
  constructor(
    private readonly referralRepo: StudentReferralRepository,
    private readonly notifications: NotificationRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(
    referralId: string,
    status: string,
    changedById: string,
    notes?: string
  ): Promise<StudentReferral> {
    if (!VALID_STATUSES.includes(status)) {
      throw new InvalidReferralStatusError(status);
    }

    const actor = await resolveReferralActor(this.users, this.roles, changedById);

    const referral = await this.referralRepo.findById(referralId);
    if (!referral) {
      throw new ReferralNotFoundError(referralId);
    }

    // Quien no puede ver el caso no debe ni saber que existe; quien lo ve
    // pero no lo gestiona (el tutor emisor) no registra su atención.
    if (!canViewReferral(actor, referral)) throw new ReferralForbiddenError();
    if (!canManageReferral(actor, referral)) throw new ReferralStatusForbiddenError();

    if (referral.status === 'CERRADO') {
      throw new ReferralClosedError();
    }

    if (!isForwardTransition(referral.status, status)) {
      throw new InvalidReferralTransitionError(referral.status, status);
    }

    if ((status === 'ATENDIDO' || status === 'CERRADO') && (!notes || !notes.trim())) {
      throw new ClosureNotesRequiredError();
    }

    const updated = await this.referralRepo.updateStatus(referralId, status, changedById, notes?.trim(), referral.status);
    if (!updated) throw new ReferralConflictError();

    await this.notifications.create({
      userId: updated.referredById,
      type: 'REFERRAL_STATUS_CHANGED',
      message: `Tu derivación cambió de estado a "${STATUS_LABEL[status] ?? status}"`,
      referralId: updated.id,
    });

    return toReferralView(updated, actor);
  }
}

