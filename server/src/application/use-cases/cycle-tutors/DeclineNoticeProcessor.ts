import { Mailer, mailOutcomeOf } from '@application/ports/Mailer';
import { withDeadline } from '@application/services/sendWithDeadline';
import { buildTutorDeclinedEmail } from '@application/services/tutorAcceptanceEmail';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { DeclineNoticeAttempt, DeclineNoticeRepository, FinalDeclineNoticeStatus } from '@domain/repositories/DeclineNoticeRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';

/**
 * Margen de un intento en curso: pasado este tiempo sin resultado se trata como INCIERTO y un resultado tardío ya no lo modifica.
 * Mismo valor que usan la cola de avisos (LEASE_MS) y los pedidos de lista.
 */
export const DECLINE_NOTICE_ATTEMPT_MARGIN_MS = 5 * 60_000;
/** Tiempo máximo que se ESPERA un envío (no cancela el transporte SMTP; vencerlo deja el resultado INCIERTO). Menor que el margen. */
export const DECLINE_NOTICE_SEND_TIMEOUT_MS = 60_000;

type Logger = Pick<Console, 'warn' | 'error'>;

/**
 * Entrega el aviso a la coordinación del rechazo de un docente (LEV-R05). Lo usan el intento inmediato, el reenvío y el proceso de
 * fondo; los tres pasan por la MISMA reserva atómica (`claim`), así que un intento lo envía exactamente uno.
 *
 * Garantías y límites:
 *  - UN solo intento automático por aviso: un intento iniciado sin resultado pasa a INCIERTO y nunca se repite solo; un FALLIDO
 *    tampoco se reintenta solo (lo resuelve una persona con el reenvío).
 *  - Lo EN_COLA que nunca se intentó sí lo toma el proceso de fondo (también tras un reinicio).
 *  - Antes de enviar se vuelve a comprobar que la designación siga rechazada por ese mismo rechazo y se resuelve el destinatario
 *    habilitado ACTUAL; si no, no se envía (OBSOLETO, SIN_DESTINATARIO, DATOS_INCOMPLETOS).
 *  - Ninguna transacción permanece abierta durante el envío SMTP.
 *  - No hay entrega «exactamente una vez»: si el servidor de correo acepta el mensaje y el proceso muere antes de anotarlo, el intento
 *    queda INCIERTO (el correo pudo haber salido). «Aceptado» no es «leído».
 */
export class DeclineNoticeProcessor {
  constructor(
    private readonly notices: DeclineNoticeRepository,
    private readonly cycleTutors: CycleTutorRepository,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly mailer: Mailer,
    private readonly audit: AuditLogRepository,
    /** Si no hay correo configurado no se intenta nada: el aviso queda EN_COLA y se explica el motivo. */
    private readonly deliveryEnabled: boolean,
    private readonly now: () => Date = () => new Date(),
    private readonly sendTimeoutMs: number = DECLINE_NOTICE_SEND_TIMEOUT_MS,
    private readonly logger: Logger = console,
  ) {}

  get enabled(): boolean {
    return this.deliveryEnabled;
  }

  /** Intento inmediato (no lanza: nunca debe romper la respuesta al docente ni al responsable). */
  async attemptNow(attemptId: string): Promise<DeclineNoticeAttempt | null> {
    try {
      return await this.attempt(attemptId);
    } catch (error) {
      this.logger.error('[aviso de rechazo] No se pudo procesar el aviso', { attemptId, error: error instanceof Error ? error.name : 'desconocido' });
      return null;
    }
  }

  /** Lo que hace el proceso de fondo en cada revisión: marca los intentos sin resultado y toma lo EN_COLA. Devuelve cuántos tomó. */
  async processDue(limit = 20): Promise<number> {
    if (!this.deliveryEnabled) return 0;
    await this.sweepStale();
    let taken = 0;
    for (const queued of await this.notices.findQueued(limit)) {
      if ((await this.attemptNow(queued.id)) !== null) taken += 1;
    }
    return taken;
  }

  /** Un intento en curso que superó el margen queda INCIERTO (se deja constancia una sola vez). */
  async sweepStale(): Promise<void> {
    const cutoff = new Date(this.now().getTime() - DECLINE_NOTICE_ATTEMPT_MARGIN_MS);
    for (const expired of await this.notices.expireStale(cutoff)) await this.recordResult(expired);
  }

  /** Toma el intento y lo entrega. Devuelve el intento ya resuelto, o null si no le tocaba (otro lo tomó o no hay envío habilitado). */
  async attempt(attemptId: string): Promise<DeclineNoticeAttempt | null> {
    if (!this.deliveryEnabled) return null;
    const claimed = await this.notices.claim(attemptId, this.now());
    if (!claimed || !claimed.startedAt) return null;
    const startedAt = claimed.startedAt;
    const finish = (status: FinalDeclineNoticeStatus, errorCode: string | null) => this.finish(claimed, startedAt, status, errorCode);

    const assignment = await this.cycleTutors.findById(claimed.assignmentId);
    // Trabajo obsoleto: la designación cambió de docente, volvió a empezar o ya no está rechazada por este mismo rechazo.
    if (!assignment || assignment.acceptanceStatus !== 'RECHAZADA' || assignment.tutorId !== claimed.tutorId || assignment.respondedAt?.getTime() !== claimed.declinedAt.getTime()) {
      return finish('OBSOLETO', null);
    }
    const [tutor, school, period] = await Promise.all([this.users.findById(assignment.tutorId), this.schools.findById(assignment.schoolId), this.periods.findById(assignment.periodId)]);
    if (!tutor || !school || !period || !assignment.declineReason) return finish('DATOS_INCOMPLETOS', null);

    // Destinatario habilitado ACTUAL: la coordinación vigente de la escuela, con cuenta activa y correo.
    const coordinator = school.coordinatorId ? await this.users.findById(school.coordinatorId) : null;
    if (!coordinator || !coordinator.isActive || !coordinator.email) return finish('SIN_DESTINATARIO', null);
    await this.notices.setRecipient(claimed.id, startedAt, { userId: coordinator.id, email: coordinator.email });

    let status: FinalDeclineNoticeStatus = 'ENVIADO';
    let errorCode: string | null = null;
    try {
      const message = buildTutorDeclinedEmail({
        coordinatorEmail: coordinator.email,
        tutorName: `${tutor.firstName} ${tutor.lastName}`,
        school: school.name,
        cycle: assignment.cycle,
        period: period.name,
        reason: assignment.declineReason,
      });
      await withDeadline(this.mailer.send(message), this.sendTimeoutMs);
    } catch (error) {
      // Lo que no se puede demostrar como «no aceptado» (incluido el plazo agotado) queda INCIERTO.
      status = mailOutcomeOf(error) === 'NOT_ACCEPTED' ? 'FALLIDO' : 'INCIERTO';
      errorCode = error instanceof Error ? error.name.slice(0, 60) : 'desconocido';
    }
    return finish(status, errorCode);
  }

  private async finish(claimed: DeclineNoticeAttempt, startedAt: Date, status: FinalDeclineNoticeStatus, errorCode: string | null): Promise<DeclineNoticeAttempt | null> {
    const now = this.now();
    const notBefore = new Date(now.getTime() - DECLINE_NOTICE_ATTEMPT_MARGIN_MS);
    const done = await this.notices.finish(claimed.id, startedAt, { status, errorCode }, now, notBefore);
    // Resultado tardío (el margen venció y quedó INCIERTO): no lo pisa y no deja otra entrada.
    if (!done) return this.notices.findById(claimed.id);
    await this.recordResult(done);
    return done;
  }

  /** Una entrada de bitácora por resultado de intento: vinculada al intento, sin tokens ni mensajes técnicos. */
  private async recordResult(attempt: DeclineNoticeAttempt): Promise<void> {
    try {
      const recipient = attempt.recipientUserId ? `; destinatario ${attempt.recipientUserId}` : '';
      await this.audit.create({
        userId: attempt.requestedById ?? attempt.tutorId,
        action: 'CYCLE_TUTOR_DECLINE_NOTICE_RESULT',
        entity: 'CycleTutorAssignment',
        entityId: attempt.assignmentId,
        details: `intento ${attempt.id} (${attempt.kind === 'ORIGINAL' ? 'original' : 'reenvío'}): ${attempt.status}${recipient}`,
        ipAddress: null,
      });
    } catch (error) {
      this.logger.warn('[aviso de rechazo] No se pudo registrar el resultado en la bitácora', { attemptId: attempt.id, error: error instanceof Error ? error.name : 'desconocido' });
    }
  }
}
