import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { PeriodSummary, PeriodSummaryRepository } from '@domain/repositories/PeriodSummaryRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { PeriodEnrollmentRepository } from '@domain/repositories/PeriodEnrollmentRepository';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';

export class PeriodNotFoundError extends Error {
  constructor() {
    super('El periodo académico no existe');
    this.name = 'PeriodNotFoundError';
  }
}

export class PeriodNotActiveError extends Error {
  constructor() {
    super('Solo se puede cerrar el periodo vigente');
    this.name = 'PeriodNotActiveError';
  }
}

export class PeriodConfirmationError extends Error {
  constructor() {
    super('Para cerrar el periodo escriba su nombre exacto como confirmación');
    this.name = 'PeriodConfirmationError';
  }
}

export class PeriodReopenError extends Error {
  constructor() {
    super('Solo se puede reabrir un periodo cerrado y únicamente si no hay otro periodo vigente');
    this.name = 'PeriodReopenError';
  }
}

export type PeriodState = 'VIGENTE' | 'CERRADO' | 'SIN_ABRIR';

export interface PeriodClosureView {
  period: { id: string; name: string; startDate: Date; endDate: Date };
  state: PeriodState;
  closedAt: Date | null;
  /** Vigente o sin abrir: resumen calculado ahora (vista previa). Cerrado: el resumen guardado al cerrarlo. */
  summary: PeriodSummary;
  isPreview: boolean;
}

const stateOf = (period: AcademicPeriod): PeriodState => (period.isActive ? 'VIGENTE' : period.closedAt ? 'CERRADO' : 'SIN_ABRIR');
const brief = (p: AcademicPeriod) => ({ id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate });

/** Estado de un periodo y su resumen (vista previa antes de cerrar, o el resumen guardado si ya está cerrado). */
export class GetPeriodClosureUseCase {
  constructor(
    private readonly periods: AcademicPeriodRepository,
    private readonly summaries: PeriodSummaryRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(periodId: string): Promise<PeriodClosureView> {
    const period = await this.periods.findById(periodId);
    if (!period) throw new PeriodNotFoundError();
    const stored = period.closedAt ? (period.closureSummary as PeriodSummary | null | undefined) : null;
    const summary = stored ?? (await this.summaries.summarize(period, this.now()));
    return { period: brief(period), state: stateOf(period), closedAt: period.closedAt ?? null, summary, isPreview: !stored };
  }
}

/**
 * Cierra el periodo vigente (solo la DBU): guarda el resumen de lo ocurrido, congela la matrícula y lo deja no vigente.
 * Desde ese momento la tutoría queda en **solo lectura** (los registros operativos se rechazan) y los estudiantes solo ven su
 * historial. Pide escribir el nombre del periodo para evitar un cierre accidental. Los registros no se borran ni se alteran.
 */
export class ClosePeriodUseCase {
  constructor(
    private readonly periods: AcademicPeriodRepository,
    private readonly summaries: PeriodSummaryRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string, periodId: string, confirmName: string, ipAddress?: string): Promise<PeriodClosureView> {
    const period = await this.periods.findById(periodId);
    if (!period) throw new PeriodNotFoundError();
    if (!period.isActive) throw new PeriodNotActiveError();
    if (confirmName.trim() !== period.name) throw new PeriodConfirmationError();

    const at = this.now();
    const summary = await this.summaries.summarize(period, at);
    if (!(await this.periods.close(period.id, requesterId, at, summary))) throw new PeriodNotActiveError();

    await this.auditLogs.create({
      userId: requesterId,
      action: 'PERIOD_CLOSED',
      entity: 'AcademicPeriod',
      entityId: period.id,
      details: `Periodo ${period.name} cerrado: ${summary.students.total} estudiantes, ${summary.sessions.total} sesiones, ${summary.referrals.total} derivaciones, ${summary.pending.openRequests} solicitudes y ${summary.pending.openReferrals} derivaciones abiertas`,
      ipAddress: ipAddress ?? null,
    });
    return { period: brief(period), state: 'CERRADO', closedAt: at, summary, isPreview: false };
  }
}

/** Reabre un periodo cerrado (recuperación de un cierre por error). No hay otro vigente. Queda en la bitácora. */
export class ReopenPeriodUseCase {
  constructor(
    private readonly periods: AcademicPeriodRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string, periodId: string, ipAddress?: string): Promise<void> {
    const period = await this.periods.findById(periodId);
    if (!period) throw new PeriodNotFoundError();
    if (!(await this.periods.reopen(period.id))) throw new PeriodReopenError();
    await this.auditLogs.create({
      userId: requesterId,
      action: 'PERIOD_REOPENED',
      entity: 'AcademicPeriod',
      entityId: period.id,
      details: `Periodo ${period.name} reabierto`,
      ipAddress: ipAddress ?? null,
    });
  }
}

/** Periodo vigente, para que el cliente sepa si la tutoría está abierta o en solo lectura. */
export class GetCurrentPeriodUseCase {
  constructor(
    private readonly periods: AcademicPeriodRepository,
    private readonly students: StudentRepository,
    private readonly enrollments: PeriodEnrollmentRepository,
  ) {}

  /**
   * `enrolled`: para una persona con perfil de estudiante, si figura en la carga del periodo vigente (sin matrícula solo
   * puede consultar su historial). Para el resto de roles es null: no aplica.
   */
  async execute(userId?: string): Promise<{ open: boolean; period: { id: string; name: string; startDate: Date; endDate: Date } | null; enrolled: boolean | null }> {
    const period = await this.periods.findActive();
    let enrolled: boolean | null = null;
    if (period && userId) {
      const student = await this.students.findByUserId(userId);
      if (student) enrolled = await this.enrollments.isEnrolled(period.id, student.id);
    }
    return { open: period !== null, period: period ? brief(period) : null, enrolled };
  }
}
