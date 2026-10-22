import { IssueInvitationUseCase } from '@application/use-cases/users/IssueInvitationUseCase';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { Mailer } from '@application/ports/Mailer';
import { generateSecretToken, hashSecretToken } from '@application/use-cases/auth/secretToken';
import { buildTutorAcceptanceEmail, buildTutorDeclinedEmail } from '@application/services/tutorAcceptanceEmail';
import { findParameterDefinition } from '@application/use-cases/system-parameters/parameterDefinitions';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { AvailabilitySlot, CycleTutorAssignment, CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { NoPeriodForCycleTutorsError } from './CycleTutorUseCases';

export const SESSION_MINUTES = 45;
const MAX_SLOTS = 12;

export interface AcceptanceConfig {
  publicUrl: string;
  ttlHours: number;
}

export class CycleTutorNotFoundError extends Error {
  constructor() {
    super('Ese ciclo no tiene tutor asignado');
    this.name = 'CycleTutorNotFoundError';
  }
}
/** El enlace no existe, ya se usó o venció: se responde igual para no revelar cuál. */
export class InvalidAcceptanceLinkError extends Error {
  constructor() {
    super('El enlace no es válido o ya venció. Pida a la coordinación que le envíe uno nuevo.');
    this.name = 'InvalidAcceptanceLinkError';
  }
}
export class InvalidAvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAvailabilityError';
  }
}

const toMinutes = (hhmm: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/** Valida lo que el docente ofrece: tramos de al menos 45 minutos, sin cruzarse y dentro del tope semanal. */
export function validateAvailability(slots: unknown, maxWeeklyHours: number): AvailabilitySlot[] {
  if (!Array.isArray(slots) || slots.length === 0) throw new InvalidAvailabilityError('Indique al menos un día y horario de atención');
  if (slots.length > MAX_SLOTS) throw new InvalidAvailabilityError(`Indique como máximo ${MAX_SLOTS} horarios`);
  const clean: AvailabilitySlot[] = [];
  let total = 0;
  for (const raw of slots as Partial<AvailabilitySlot>[]) {
    const start = toMinutes(String(raw.start ?? ''));
    const end = toMinutes(String(raw.end ?? ''));
    if (!Number.isInteger(raw.day) || (raw.day as number) < 1 || (raw.day as number) > 6) throw new InvalidAvailabilityError('El día debe ser de lunes a sábado');
    if (start === null || end === null) throw new InvalidAvailabilityError('Las horas deben tener el formato HH:MM');
    if (end - start < SESSION_MINUTES) throw new InvalidAvailabilityError(`Cada horario debe durar al menos ${SESSION_MINUTES} minutos (una sesión)`);
    const place = typeof raw.place === 'string' ? raw.place.trim().slice(0, 120) : '';
    clean.push({ day: raw.day as number, start: raw.start as string, end: raw.end as string, ...(place && { place }) });
    total += end - start;
  }
  const sorted = [...clean].sort((a, b) => a.day - b.day || (toMinutes(a.start) as number) - (toMinutes(b.start) as number));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].day === sorted[i - 1].day && (toMinutes(sorted[i].start) as number) < (toMinutes(sorted[i - 1].end) as number)) {
      throw new InvalidAvailabilityError('Hay horarios que se cruzan el mismo día');
    }
  }
  if (total > maxWeeklyHours * 60) throw new InvalidAvailabilityError(`El total semanal no puede pasar de ${maxWeeklyHours} horas`);
  return sorted;
}

async function maxWeeklyHours(parameters: SystemParameterRepository): Promise<number> {
  const definition = findParameterDefinition('tutor_max_weekly_hours');
  const stored = Number((await parameters.findByKey('tutor_max_weekly_hours'))?.value);
  const valid = definition && Number.isInteger(stored) && stored >= definition.min && stored <= definition.max;
  return valid ? stored : (definition?.defaultValue ?? 10);
}

/** Envía (o reenvía) al docente el correo con el enlace de un solo uso para aceptar o rechazar su ciclo. */
export class RequestTutorAcceptanceUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly schools: SchoolRepository,
    private readonly users: UserRepository,
    private readonly cycleTutors: CycleTutorRepository,
    private readonly mailer: Mailer,
    private readonly audit: AuditLogRepository,
    private readonly config: AcceptanceConfig,
  ) {}

  async execute(actingUserId: string, schoolId: string, cycle: number, ip?: string | null): Promise<{ emailSent: boolean }> {
    await this.guard.assertSchoolAccess(actingUserId, schoolId);
    const period = await this.periods.findActive();
    if (!period) throw new NoPeriodForCycleTutorsError();
    const assignment = await this.cycleTutors.find(period.id, schoolId, cycle);
    const tutor = assignment && (await this.users.findById(assignment.tutorId));
    const school = await this.schools.findById(schoolId);
    if (!assignment || !tutor || !school) throw new CycleTutorNotFoundError();

    const token = generateSecretToken();
    const expiresAt = new Date(Date.now() + this.config.ttlHours * 3_600_000);
    await this.cycleTutors.requestAcceptance(assignment.id, hashSecretToken(token), expiresAt, new Date());

    let emailSent = false;
    try {
      await this.mailer.send(
        buildTutorAcceptanceEmail({
          tutor,
          school: school.name,
          cycle,
          period: period.name,
          isException: assignment.isException,
          link: `${this.config.publicUrl.replace(/\/+$/, '')}/aceptar-tutoria/${token}`,
          ttlHours: this.config.ttlHours,
        }),
      );
      emailSent = true;
    } catch (error) {
      // Sin el enlace ni el token en los registros.
      console.error('No se pudo enviar el correo de aceptación', { assignmentId: assignment.id, reason: error instanceof Error ? error.name : 'desconocido' });
    }
    await this.audit.create({
      userId: actingUserId,
      action: 'CYCLE_TUTOR_ACCEPTANCE_REQUESTED',
      entity: 'CycleTutorAssignment',
      entityId: assignment.id,
      details: `${school.name} · ciclo ${cycle}${emailSent ? '' : ' (correo no enviado)'}`,
      ipAddress: ip ?? null,
    });
    return { emailSent };
  }
}

export interface AcceptanceInfo {
  tutorName: string;
  school: string;
  cycle: number;
  period: string;
  isException: boolean;
  maxWeeklyHours: number;
  sessionMinutes: number;
}

async function loadByToken(cycleTutors: CycleTutorRepository, token: string): Promise<CycleTutorAssignment> {
  const assignment = await cycleTutors.findByAcceptanceToken(hashSecretToken(token));
  if (!assignment || assignment.acceptanceStatus !== 'PENDIENTE' || !assignment.acceptanceExpiresAt || assignment.acceptanceExpiresAt.getTime() < Date.now()) {
    throw new InvalidAcceptanceLinkError();
  }
  return assignment;
}

/** Datos que ve el docente al abrir su enlace (sin datos de estudiantes). */
export class GetTutorAcceptanceUseCase {
  constructor(
    private readonly cycleTutors: CycleTutorRepository,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly parameters: SystemParameterRepository,
  ) {}

  async execute(token: string): Promise<AcceptanceInfo> {
    const assignment = await loadByToken(this.cycleTutors, token);
    const [tutor, school, period] = await Promise.all([this.users.findById(assignment.tutorId), this.schools.findById(assignment.schoolId), this.periods.findById(assignment.periodId)]);
    if (!tutor || !school || !period) throw new InvalidAcceptanceLinkError();
    return {
      tutorName: `${tutor.firstName} ${tutor.lastName}`,
      school: school.name,
      cycle: assignment.cycle,
      period: period.name,
      isException: assignment.isException,
      maxWeeklyHours: await maxWeeklyHours(this.parameters),
      sessionMinutes: SESSION_MINUTES,
    };
  }
}

export interface AcceptanceResponse {
  accept: boolean;
  availability?: unknown;
  reason?: string;
}

/** El docente responde con su enlace: acepta con su disponibilidad o rechaza con un motivo (se avisa a la coordinación). */
export class RespondTutorAcceptanceUseCase {
  constructor(
    private readonly cycleTutors: CycleTutorRepository,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly parameters: SystemParameterRepository,
    private readonly mailer: Mailer,
    private readonly audit: AuditLogRepository,
    private readonly invitations: Pick<IssueInvitationUseCase, 'execute'>,
  ) {}

  async execute(token: string, response: AcceptanceResponse, ip?: string | null): Promise<{ accepted: boolean; activationLink?: string; activationUnavailable?: boolean }> {
    const assignment = await loadByToken(this.cycleTutors, token);
    const now = new Date();
    if (response.accept) {
      const availability = validateAvailability(response.availability, await maxWeeklyHours(this.parameters));
      await this.cycleTutors.recordResponse(assignment.id, { accepted: true, availability }, now);
    } else {
      const reason = response.reason?.trim() ?? '';
      if (reason.length < 5) throw new InvalidAvailabilityError('Indique brevemente el motivo por el que no puede asumir el ciclo');
      await this.cycleTutors.recordResponse(assignment.id, { accepted: false, declineReason: reason.slice(0, 500) }, now);
      await this.notifyCoordinator(assignment, reason);
    }
    await this.audit.create({
      userId: assignment.tutorId,
      action: response.accept ? 'CYCLE_TUTOR_ACCEPTED' : 'CYCLE_TUTOR_DECLINED',
      entity: 'CycleTutorAssignment',
      entityId: assignment.id,
      details: `ciclo ${assignment.cycle}`,
      ipAddress: ip ?? null,
    });
    if (response.accept) {
      const tutor = await this.users.findById(assignment.tutorId);
      if (tutor?.isActive && tutor.mustChangePassword) {
        try {
          const invitation = await this.invitations.execute(tutor.id, tutor.id, ip ?? undefined);
          return { accepted: true, activationLink: invitation.link };
        } catch {
          // La aceptación ya quedó registrada. Nunca exponer secretos ni fingir que debe responder de nuevo.
          return { accepted: true, activationUnavailable: true };
        }
      }
    }
    return { accepted: response.accept };
  }

  private async notifyCoordinator(assignment: CycleTutorAssignment, reason: string): Promise<void> {
    try {
      const [tutor, school, period] = await Promise.all([this.users.findById(assignment.tutorId), this.schools.findById(assignment.schoolId), this.periods.findById(assignment.periodId)]);
      const coordinator = school?.coordinatorId ? await this.users.findById(school.coordinatorId) : null;
      if (!tutor || !school || !period || !coordinator) return;
      await this.mailer.send(
        buildTutorDeclinedEmail({ coordinatorEmail: coordinator.email, tutorName: `${tutor.firstName} ${tutor.lastName}`, school: school.name, cycle: assignment.cycle, period: period.name, reason }),
      );
    } catch (error) {
      console.error('No se pudo avisar a la coordinación del rechazo', { assignmentId: assignment.id, reason: error instanceof Error ? error.name : 'desconocido' });
    }
  }
}
