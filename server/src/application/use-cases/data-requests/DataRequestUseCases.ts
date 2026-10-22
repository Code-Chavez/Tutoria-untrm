import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { DataRequest, DataRequestKind, DataRequestRepository } from '@domain/repositories/DataRequestRepository';
import { SchoolContactRepository } from '@domain/repositories/SchoolContactRepository';
import { Mailer } from '@application/ports/Mailer';
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
}

/**
 * Pide por correo la lista de estudiantes de una escuela para el periodo vigente: formal, con la plantilla Excel adjunta, a
 * nombre de quien la pide (que recibe copia y a quien llegan las respuestas). Queda registrado, enviado o fallido.
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
  ) {}

  async execute(requesterId: string, input: SendDataRequestInput, ipAddress?: string): Promise<DataRequest> {
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

    const cycles = [...new Set(input.cycles ?? [])].sort((a, b) => a - b);
    if (cycles.some((c) => !Number.isInteger(c) || c < 1 || c > 14)) throw new InvalidDataRequestError('Los ciclos deben ser números enteros entre 1 y 14');
    if (kind === 'ESTUDIANTES' && cycles.some((cycle) => cycle > (school.cycleCount ?? 0))) {
      throw new InvalidDataRequestError('Los ciclos elegidos exceden la cantidad configurada para esta escuela');
    }
    const note = input.note?.trim() || null;
    if (note && note.length > 500) throw new InvalidDataRequestError('Las observaciones no pueden pasar de 500 caracteres');

    const requester = await this.users.findById(requesterId);
    if (!requester) throw new InvalidDataRequestError('No se pudo identificar a quien pide');
    const faculty = (await this.faculties.findAll()).find((f) => f.id === school.facultyId);

    let status: DataRequest['status'] = 'ENVIADO';
    let error: string | null = null;
    try {
      await this.mailer.send(
        buildDataRequestEmail({
          toEmail: school.requestEmail,
          requester,
          school: school.name,
          faculty: faculty?.name,
          period: period.name,
          cycles,
          note,
          attachment: await (kind === 'DOCENTES' ? (this.teacherTemplate as StudentTemplateProvider) : this.template).build(),
          kind,
        }),
      );
    } catch (e) {
      status = 'FALLIDO';
      error = e instanceof Error ? e.name : 'desconocido';
    }

    const saved = await this.requests.create({ periodId: period.id, schoolId: school.id, kind, toEmail: school.requestEmail, cycles, note, requestedById: requesterId, status, error });
    await this.auditLogs.create({
      userId: requesterId,
      action: 'DATA_REQUEST_SENT',
      entity: 'School',
      entityId: school.id,
      details: `Pedido de lista de ${kind === 'DOCENTES' ? 'docentes' : 'estudiantes'} (${period.name}) ${status === 'ENVIADO' ? 'enviado' : 'no enviado'}`,
      ipAddress: ipAddress ?? null,
    });
    return saved;
  }
}

/** Pedidos hechos (los de las escuelas que la persona administra o coordina), más recientes primero. */
export class ListDataRequestsUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly requests: DataRequestRepository,
  ) {}

  async execute(requesterId: string): Promise<DataRequestView[]> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind !== 'ALL' && scope.kind !== 'SCHOOLS') return [];
    const list = await this.requests.list(scope.kind === 'SCHOOLS' ? { schoolIds: scope.schoolIds } : undefined);
    const [schools, periods] = await Promise.all([this.schools.findAll(), this.periods.findAll()]);
    return list.map((r) => ({ ...r, schoolName: schools.find((s) => s.id === r.schoolId)?.name ?? '—', periodName: periods.find((p) => p.id === r.periodId)?.name ?? '—' }));
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
