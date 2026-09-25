import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { StudentAlert } from '@application/dtos/alert.dto';

const DEFAULT_THRESHOLD = 2; // Valor sembrado por defecto para absence_alert_threshold.
const THRESHOLD_PARAM_KEY = 'absence_alert_threshold';

export interface GetRiskAlertsFilters {
  /** Solo las alertas de los tutorados de este tutor (panel del Docente Tutor). */
  tutorId?: string;
}

/**
 * Motor de alertas de inasistencia y riesgo (HU-26): revisa a los tutorados
 * ya marcados en riesgo (HU-11) — así se cumple "prioriza a los estudiantes
 * en riesgo" por construcción — y avisa cuando el tutor no les programó
 * ninguna sesión, o cuando ya acumulan sesiones individuales pasadas sin
 * asistencia confirmada (Anexo N°4) por encima del umbral configurable.
 * Se calcula al vuelo, sin persistirse, igual que el estado de una sesión.
 */
export class GetRiskAlertsUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly systemParameters: SystemParameterRepository,
  ) {}

  async execute(filters?: GetRiskAlertsFilters): Promise<StudentAlert[]> {
    const atRiskStudents = await this.students.findAll({
      isAtRisk: true,
      isActive: true,
      tutorId: filters?.tutorId,
    });
    if (atRiskStudents.length === 0) return [];

    const threshold = await this.resolveThreshold();
    const now = new Date();

    const tutorIds = new Set(
      atRiskStudents.map((s) => s.tutorId).filter((id): id is string => Boolean(id)),
    );
    const tutorEntries = await Promise.all(
      [...tutorIds].map(async (id) => [id, await this.users.findById(id)] as const),
    );
    const tutorName = (id?: string | null): string | null => {
      if (!id) return null;
      const tutor = tutorEntries.find(([tid]) => tid === id)?.[1];
      return tutor ? `${tutor.firstName} ${tutor.lastName}` : null;
    };

    const alerts = await Promise.all(
      atRiskStudents.map(async (student): Promise<StudentAlert | null> => {
        const sessions = await this.sessions.findByStudent(student.id);

        const base = {
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: `${student.firstName} ${student.lastName}`,
          cycle: student.cycle,
          riskReason: student.riskReason ?? null,
          tutorId: student.tutorId ?? null,
          tutorName: tutorName(student.tutorId),
        };

        if (sessions.length === 0) {
          return { ...base, type: 'NO_SESSIONS' };
        }

        const missedCount = sessions.filter(
          (s) =>
            !s.cancelledAt &&
            s.studentIds.length === 1 &&
            !s.attendance &&
            new Date(s.scheduledAt) < now,
        ).length;

        if (missedCount >= threshold) {
          return { ...base, type: 'MISSED_SESSIONS', missedCount };
        }

        return null;
      }),
    );

    return alerts
      .filter((a): a is StudentAlert => a !== null)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'NO_SESSIONS' ? -1 : 1;
        return (b.missedCount ?? 0) - (a.missedCount ?? 0);
      });
  }

  private async resolveThreshold(): Promise<number> {
    const param = await this.systemParameters.findByKey(THRESHOLD_PARAM_KEY);
    const parsed = param ? Number(param.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_THRESHOLD;
  }
}
