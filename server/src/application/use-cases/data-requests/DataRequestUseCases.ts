import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { DataRequest, DataRequestKind, DataRequestRepository, OperationIdTakenError } from '@domain/repositories/DataRequestRepository';
import { randomUUID } from 'node:crypto';
import { SchoolContactRepository } from '@domain/repositories/SchoolContactRepository';
import { Mailer, mailOutcomeOf } from '@application/ports/Mailer';
import {
  contentHash,
  cyclesScope,
  DATA_REQUEST_ATTEMPT_MARGIN_MS,
  DATA_REQUEST_DUPLICATE_WINDOW_MS,
  DATA_REQUEST_SEND_TIMEOUT_MS,
  equivalenceKey,
  withEffectiveStatus,
} from './dataRequestPolicy';
import { StudentTemplateProvider } from '@application/ports/StudentTemplateProvider';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { buildDataRequestEmail } from '@application/services/dataRequestEmail';
import { isValidOptionalEmail, EMAIL_INVALID } from '@application/validation/studentFields';
import { normalizeEmail } from '@application/use-cases/users/normalizeEmail';
import { SchoolNotFoundError } from '@application/use-cases/students/StudentErrors';

export class RequestEmailNotConfiguredError extends Error {
  constructor() {
    super('Esta escuela no tiene configurado el correo al que se piden las listas: configúrelo primero');
    this.name = 'RequestEmailNotConfiguredError';
  }
}

export class NoPeriodToRequestError extends Error {
  constructor() {
    super('No hay un periodo académico vigente para el que pedir las listas');
    this.name = 'NoPeriodToRequestError';
  }
}

export class InvalidDataRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDataRequestError';
  }
}

/** La lista de docentes tutores la pide solo quien crea las cuentas (la DBU). */
export class TeacherListForbiddenError extends Error {
  constructor() {
    super('Solo la DBU pide la lista de docentes tutores');
    this.name = 'TeacherListForbiddenError';
  }
}

export class DataRequestNotFoundError extends Error {
  constructor() {
    super('El pedido no existe');
    this.name = 'DataRequestNotFoundError';
  }
}

export interface DataRequestView extends DataRequest {
  schoolName: string;
  periodName: string;
}

/**
 * Correo al que se piden las listas de una escuela. Lo configura quien administra o la persona que coordina esa escuela (no
 * se fija una sola persona: si deja de responder, se cambia el destinatario y se vuelve a pedir). Vacío lo quita.
 */
export class SetSchoolRequestEmailUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly schools: SchoolRepository,
    private readonly contacts: SchoolContactRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string, schoolId: string, rawEmail: string | null, ipAddress?: string): Promise<string | null> {
    await this.guard.assertSchoolAccess(requesterId, schoolId);
    if (!(await this.schools.findById(schoolId))) throw new SchoolNotFoundError(schoolId);

    const email = rawEmail ? normalizeEmail(rawEmail) : '';
    if (!isValidOptionalEmail(email)) throw new InvalidDataRequestError(EMAIL_INVALID);
    await this.contacts.setRequestEmail(schoolId, email || null);

    await this.auditLogs.create({
      userId: requesterId,
      action: 'SCHOOL_REQUEST_EMAIL_SET',
      entity: 'School',
      entityId: schoolId,
      details: email ? 'Correo de pedido de listas configurado' : 'Correo de pedido de listas quitado',
      ipAddress: ipAddress ?? null,
    });
    return email || null;
  }
}

export interface SendDataRequestInput {
  schoolId: string;
  cycles?: number[];
  note?: string;
  kind?: DataRequestKind;
  /** Identifica la intención de la persona: repetir la misma operación (p. ej. por perder la respuesta) no envía otro correo. */
  operationId?: string;
  /** Id del pedido equivalente anterior que la persona vio y confirma reenviar. Solo vale para ese pedido. */
  confirmDuplicateOf?: string;
}

/** Datos mínimos del pedido anterior que se muestran al advertir (no se revela nada más). */
export interface PreviousRequestSummary {
  id: string;
  createdAt: Date;
  status: DataRequest['status'];
}

const summarize = (r: DataRequest): PreviousRequestSummary => ({ id: r.id, createdAt: r.createdAt, status: r.status });

/** Ya hay un pedido equivalente reciente: el reenvío exige confirmar ESE pedido (`confirmDuplicateOf`). */
export class DuplicateDataRequestError extends Error {
  constructor(readonly previous: PreviousRequestSummary) {
    super('Ya se hizo un pedido equivalente hace poco. Si quieres pedirlo de nuevo, confírmalo expresamente.');
    this.name = 'DuplicateDataRequestError';
  }
}

/** Hay un envío equivalente en curso: no se puede saltar con una confirmación; hay que esperar su resultado. */
export class DataRequestInFlightError extends Error {
  constructor(readonly previous: PreviousRequestSummary) {
    super('Hay un pedido equivalente enviándose en este momento. Espera su resultado antes de volver a pedirlo.');
    this.name = 'DataRequestInFlightError';
  }
}

/** El identificador de operación ya se usó con otro contenido (o no es utilizable): se rechaza sin revelar nada. */
export class OperationIdConflictError extends Error {
  constructor() {
    super('El identificador de la operación ya se usó con otros datos. Vuelve a preparar el pedido.');
    this.name = 'OperationIdConflictError';
  }
}

/** Fin de plazo del envío (el correo pudo haber salido: resultado incierto). */
class SendTimeoutError extends Error {
  constructor() {
    super('Se agotó el tiempo del envío');
    this.name = 'SendTimeoutError';
  }
}

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SendTimeoutError()), ms);
  });
  // Si el envío termina después del plazo, su resultado se ignora; esto evita un rechazo sin atender.
  work.catch(() => undefined);
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

type Reservation = { kind: 'REPLAY'; request: DataRequest } | { kind: 'CREATED'; request: DataRequest; attemptStartedAt: Date };

/**
 * Pide por correo la lista de estudiantes de una escuela para el periodo vigente: formal, con la plantilla Excel adjunta, a
 * nombre de quien la pide (que recibe copia y a quien llegan las respuestas). Queda registrado con su estado de envío.
 *
 * Consistencia (LEV-R04), sin mantener una transacción abierta durante el envío:
 *  1. Una transacción corta, con candado por clave de equivalencia, comprueba la idempotencia y los equivalentes y guarda el
 *     pedido como PENDIENTE.
 *  2. Se envía el correo (con plazo máximo), fuera de toda transacción.
 *  3. Se registra el resultado de forma condicional: ENVIADO, FALLIDO (demostrado que no fue aceptado) o INCIERTO.
 * NO hay entrega «exactamente una vez». Si el proveedor acepta el correo y el servidor cae antes del paso 3, el pedido queda
 * PENDIENTE y, pasado el margen, se muestra como INCIERTO: el correo pudo haber salido y el sistema no lo reenvía por su cuenta;
 * un reenvío posterior es una decisión de la persona, con advertencia. «Aceptado por el servidor» tampoco es «llegó a la bandeja».
 */
export class SendDataRequestUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
    private readonly users: UserRepository,
    private readonly mailer: Mailer,
    private readonly template: StudentTemplateProvider,
    private readonly requests: DataRequestRepository,
    private readonly auditLogs: AuditLogRepository,
    // Plantilla de la lista de docentes tutores (sin ella solo se puede pedir la de estudiantes).
    private readonly teacherTemplate?: StudentTemplateProvider,
    private readonly now: () => Date = () => new Date(),
    private readonly sendTimeoutMs: number = DATA_REQUEST_SEND_TIMEOUT_MS,
  ) {}

  async execute(requesterId: string, input: SendDataRequestInput, ipAddress?: string): Promise<{ request: DataRequest; replayed: boolean }> {
    const kind: DataRequestKind = input.kind === 'DOCENTES' ? 'DOCENTES' : 'ESTUDIANTES';
    if (kind === 'DOCENTES') {
      if (!this.teacherTemplate) throw new InvalidDataRequestError('La lista de docentes no está disponible');
      if ((await this.guard.scopeFor(requesterId)).kind !== 'ALL') throw new TeacherListForbiddenError();
    }
    await this.guard.assertSchoolAccess(requesterId, input.schoolId);
    const school = await this.schools.findById(input.schoolId);
    if (!school) throw new SchoolNotFoundError(input.schoolId);
    if (!school.requestEmail) throw new RequestEmailNotConfiguredError();
    const period = await this.periods.findActive();
    if (!period) throw new NoPeriodToRequestError();

    const requested = [...new Set(input.cycles ?? [])].sort((a, b) => a - b);
    if (requested.some((c) => !Number.isInteger(c) || c < 1 || c > 14)) throw new InvalidDataRequestError('Los ciclos deben ser números enteros entre 1 y 14');
    if (kind === 'ESTUDIANTES' && requested.some((cycle) => cycle > (school.cycleCount ?? 0))) {
      throw new InvalidDataRequestError('Los ciclos elegidos exceden la cantidad configurada para esta escuela');
    }
    // En la lista de docentes los ciclos no aplican: no se guardan.
    const cycles = kind === 'DOCENTES' ? [] : requested;
    const note = input.note?.trim() || null;
    if (note && note.length > 500) throw new InvalidDataRequestError('Las observaciones no pueden pasar de 500 caracteres');

    const requester = await this.users.findById(requesterId);
    if (!requester) throw new InvalidDataRequestError('No se pudo identificar a quien pide');
    const faculty = (await this.faculties.findAll()).find((f) => f.id === school.facultyId);

    const key = equivalenceKey({ kind, schoolId: school.id, periodId: period.id, scope: cyclesScope(kind, cycles, school.cycleCount) });
    const hash = contentHash({ kind, schoolId: school.id, periodId: period.id, toEmail: school.requestEmail, cycles, note });
    // Sin identificador del cliente no hay forma de reconocer una repetición: se genera uno (la equivalencia sigue advirtiendo).
    const operationId = input.operationId ?? randomUUID();

    const reservation = await this.reserveOnce(requesterId, key, hash, operationId, input.confirmDuplicateOf, {
      periodId: period.id,
      schoolId: school.id,
      kind,
      toEmail: school.requestEmail,
      cycles,
      note,
    });
    if (reservation.kind === 'REPLAY') return { request: withEffectiveStatus(reservation.request, this.now()), replayed: true };

    const { request: pending, attemptStartedAt } = reservation;
    let status: 'ENVIADO' | 'FALLIDO' | 'INCIERTO' = 'ENVIADO';
    let error: string | null = null;
    try {
      const message = buildDataRequestEmail({
        toEmail: school.requestEmail,
        requester,
        school: school.name,
        faculty: faculty?.name,
        period: period.name,
        cycles,
        note,
        attachment: await (kind === 'DOCENTES' ? (this.teacherTemplate as StudentTemplateProvider) : this.template).build(),
        kind,
      });
      await withDeadline(this.mailer.send(message), this.sendTimeoutMs);
    } catch (e) {
      // Lo que no se puede demostrar como «no aceptado» (incluido el plazo agotado) queda INCIERTO.
      status = mailOutcomeOf(e) === 'NOT_ACCEPTED' ? 'FALLIDO' : 'INCIERTO';
      error = e instanceof Error ? e.name : 'desconocido';
    }

    const notBefore = new Date(this.now().getTime() - DATA_REQUEST_ATTEMPT_MARGIN_MS);
    const finished = await this.requests.finishAttempt(pending.id, attemptStartedAt, { status, error }, notBefore);
    // Resultado tardío (el margen venció y quedó INCIERTO): no lo pisa; se devuelve lo que quedó guardado.
    const saved = finished ?? withEffectiveStatus((await this.requests.findById(pending.id)) ?? pending, this.now());
    await this.auditLogs.create({
      userId: requesterId,
      action: 'DATA_REQUEST_SENT',
      entity: 'School',
      entityId: school.id,
      details: `Pedido de lista de ${kind === 'DOCENTES' ? 'docentes' : 'estudiantes'} (${period.name}) ${saved.status === 'ENVIADO' ? 'enviado' : saved.status === 'FALLIDO' ? 'no enviado' : 'con resultado de envío incierto'}`,
      ipAddress: ipAddress ?? null,
    });
    return { request: saved, replayed: false };
  }

  /** Reserva en una transacción corta; si dos peticiones del mismo identificador chocan, la segunda se resuelve como repetición. */
  private async reserveOnce(
    requesterId: string,
    key: string,
    hash: string,
    operationId: string,
    confirmDuplicateOf: string | undefined,
    data: { periodId: string; schoolId: string; kind: DataRequestKind; toEmail: string; cycles: number[]; note: string | null },
  ): Promise<Reservation> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.requests.reserve(key, async (tx): Promise<Reservation> => {
          const now = this.now();
          await tx.expireStalePending(key, new Date(now.getTime() - DATA_REQUEST_ATTEMPT_MARGIN_MS));

          // 1. Idempotencia: la misma persona y el mismo identificador. Otra persona nunca ve el pedido ajeno (la búsqueda es suya).
          const existing = await tx.findByOperation(requesterId, operationId);
          if (existing) {
            if (existing.contentHash !== hash) throw new OperationIdConflictError();
            return { kind: 'REPLAY', request: existing };
          }

          // 2. Equivalencia: un envío en curso bloquea sin remedio; uno ya hecho pide confirmar ese pedido concreto.
          const latest = await tx.findLatestCounting(key, new Date(now.getTime() - DATA_REQUEST_DUPLICATE_WINDOW_MS));
          if (latest) {
            if (latest.status === 'PENDIENTE') throw new DataRequestInFlightError(summarize(latest));
            if (confirmDuplicateOf !== latest.id) throw new DuplicateDataRequestError(summarize(latest));
          }

          const created = await tx.insertPending({
            ...data,
            requestedById: requesterId,
            operationId,
            contentHash: hash,
            equivalenceKey: key,
            resendOfId: latest ? latest.id : null,
            attemptStartedAt: now,
          });
          return { kind: 'CREATED', request: created, attemptStartedAt: now };
        });
      } catch (error) {
        if (error instanceof OperationIdTakenError && attempt === 0) continue;
        if (error instanceof OperationIdTakenError) throw new OperationIdConflictError();
        throw error;
      }
    }
    throw new OperationIdConflictError();
  }
}

/** Pedidos hechos (los de las escuelas que la persona administra o coordina), más recientes primero. */
export class ListDataRequestsUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly requests: DataRequestRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string): Promise<DataRequestView[]> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind !== 'ALL' && scope.kind !== 'SCHOOLS') return [];
    const list = await this.requests.list(scope.kind === 'SCHOOLS' ? { schoolIds: scope.schoolIds } : undefined);
    const [schools, periods] = await Promise.all([this.schools.findAll(), this.periods.findAll()]);
    const now = this.now();
    return list.map((r) => withEffectiveStatus(r, now)).map((r) => ({ ...r, schoolName: schools.find((s) => s.id === r.schoolId)?.name ?? '—', periodName: periods.find((p) => p.id === r.periodId)?.name ?? '—' }));
  }
}

/** Marca un pedido como recibido (llegó el Excel). */
export class MarkDataRequestReceivedUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly requests: DataRequestRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string, id: string): Promise<DataRequest> {
    const request = await this.requests.findById(id);
    if (!request) throw new DataRequestNotFoundError();
    await this.guard.assertSchoolAccess(requesterId, request.schoolId);
    const updated = await this.requests.markReceived(id, requesterId, this.now());
    if (!updated) throw new DataRequestNotFoundError();
    return updated;
  }
}
