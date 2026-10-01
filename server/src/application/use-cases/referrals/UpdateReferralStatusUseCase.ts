import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import {
  ReferralNotFoundError,
  ReferralClosedError,
  ClosureNotesRequiredError,
  InvalidReferralStatusError,
} from './ReferralErrors';

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

    const updated = await this.referralRepo.updateStatus(referralId, status, changedById, notes?.trim());

    await this.notifications.create({
      userId: updated.referredById,
      type: 'REFERRAL_STATUS_CHANGED',
      message: `Tu derivación cambió de estado a "${STATUS_LABEL[status] ?? status}"`,
      referralId: updated.id,
    });

    return updated;
  }
}

