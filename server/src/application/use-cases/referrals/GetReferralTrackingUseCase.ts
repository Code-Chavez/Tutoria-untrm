import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import {
  ReferralService,
  ReferralStatus,
  REFERRAL_SERVICES,
} from '@domain/entities/StudentReferral';
import {
  ReferralTrackingItem,
  ReferralTrackingReport,
  ReferralTrackingServiceSummary,
} from '@application/dtos/referralTracking.dto';
import { ReferralForbiddenError } from './ReferralErrors';

const DEFAULT_DEADLINE_HOURS = 48;
const DEADLINE_PARAM_KEY = 'referral_followup_deadline_hours';
const OPEN_STATUSES: ReferralStatus[] = ['ENVIADO', 'RECIBIDO', 'EN_ATENCION'];

function emptyStatusCount(): Record<ReferralStatus, number> {
  return { ENVIADO: 0, RECIBIDO: 0, EN_ATENCION: 0, ATENDIDO: 0, CERRADO: 0 };
}

/**
 * Seguimiento de casos derivados por la DBU (HU-34, Art. 22.b): "la DBU,
 * mediante la unidad de servicios asistenciales, realizará el seguimiento a
 * los casos de atención especializada". El artículo no fija un plazo
 * numérico, así que el umbral de "sin atención en plazo" es configurable
 * (SystemParameter), con 48 h de valor por defecto. Un caso vencido es uno
 * que sigue ENVIADO/RECIBIDO/EN_ATENCION más tiempo que ese umbral desde su
 * último cambio de estado (o desde su creación, si nunca cambió).
 * Restringido al Administrador DBU: es quien tiene la visibilidad de
 * seguimiento sobre todos los servicios (HU-30).
 */
export class GetReferralTrackingUseCase {
  constructor(
    private readonly referrals: StudentReferralRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly systemParameters: SystemParameterRepository,
  ) {}

  async execute(userId: string): Promise<ReferralTrackingReport> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');

    const role = await this.roles.findById(user.roleId);
    if (!role || role.name !== 'Administrador DBU') {
      throw new ReferralForbiddenError();
    }

    const deadlineHours = await this.resolveDeadlineHours();
    const now = Date.now();
    const referrals = await this.referrals.findMany({});

    const items: ReferralTrackingItem[] = referrals.map((referral) => {
      const lastUpdatedAt = referral.statusHistory?.[0]?.createdAt ?? referral.createdAt;
      const hoursSinceUpdate = (now - new Date(lastUpdatedAt).getTime()) / (60 * 60 * 1000);
      const isOverdue = OPEN_STATUSES.includes(referral.status) && hoursSinceUpdate > deadlineHours;

      return {
        id: referral.id,
        studentId: referral.studentId,
        service: referral.service,
        status: referral.status,
        createdAt: referral.createdAt,
        lastUpdatedAt,
        hoursSinceUpdate: Math.floor(hoursSinceUpdate),
        isOverdue,
      };
    });

    const summary: ReferralTrackingServiceSummary[] = REFERRAL_SERVICES.map(
      (service: ReferralService) => {
        const serviceItems = items.filter((i) => i.service === service);
        const byStatus = emptyStatusCount();
        for (const item of serviceItems) {
          byStatus[item.status] += 1;
        }
        return {
          service,
          total: serviceItems.length,
          overdue: serviceItems.filter((i) => i.isOverdue).length,
          byStatus,
        };
      },
    );

    return {
      deadlineHours,
      generatedAt: new Date(),
      items: items.sort((a, b) => b.hoursSinceUpdate - a.hoursSinceUpdate),
      summary,
    };
  }

  private async resolveDeadlineHours(): Promise<number> {
    const param = await this.systemParameters.findByKey(DEADLINE_PARAM_KEY);
    const parsed = param ? Number(param.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DEADLINE_HOURS;
  }
}

