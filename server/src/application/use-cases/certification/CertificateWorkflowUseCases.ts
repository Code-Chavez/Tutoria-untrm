import { DEFAULT_EVIDENCE_KINDS, DemoRestrictedError, InvalidTransitionError, REVIEWABLE_RESULTS, applyTransition, approvalBlockers, canObserve, canReviewEvidences } from '@domain/certification/certificateWorkflow';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CertificateEvidenceRecord, CertificateRecord, CertificateRepository } from '@domain/repositories/CertificateRepository';
import { CertificatePatch, CertificateWorkflowRepository, TransitionTools } from '@domain/repositories/CertificateWorkflowRepository';
import { CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { CertificateNotFoundError, CertificateScope, CertificateScopeResolver } from './CertificateQueryUseCases';

/** Datos de entrada que no cumplen las reglas (falta un motivo, un resultado inexistente, un docente que no existe…). */
export class InvalidCertificateInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCertificateInputError';
  }
}

/** La acción no procede en el estado actual del trámite, o todavía no se cumplen sus condiciones. */
export class CertificateStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CertificateStateError';
  }
}

/** El docente no puede certificarse en esa escuela y periodo (sin designación aceptada). */
export class CertificateNotEligibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CertificateNotEligibleError';
  }
}

/** La escuela está fuera del alcance de quien actúa: se responde como si no existiera. */
export class CertificateSchoolNotFoundError extends Error {
  constructor() {
    super('Escuela no encontrada');
    this.name = 'CertificateSchoolNotFoundError';
  }
}

const REASON_MIN = 10;
const REASON_MAX = 500;
const COMMENT_MAX = 500;

const covers = (scope: CertificateScope, schoolId: string): boolean => scope.kind === 'ALL' || scope.schoolIds.includes(schoolId);

function requireReason(value: unknown, label: string): string {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) throw new InvalidCertificateInputError(`${label} debe tener entre ${REASON_MIN} y ${REASON_MAX} caracteres`);
  return reason;
}

/** Lo que comparten todas las acciones sobre un trámite existente: alcance, bloqueo, errores de dominio y bitácora. */
export abstract class CertificateStep {
  constructor(
    protected readonly scopes: CertificateScopeResolver,
    protected readonly certificates: CertificateRepository,
    protected readonly workflow: CertificateWorkflowRepository,
    protected readonly audit: AuditLogRepository,
    protected readonly now: () => Date = () => new Date(),
  ) {}

  /** El trámite, si está dentro del alcance de quien actúa; si no, «no encontrado» (no se confirma que exista). */
  protected async visible(requesterId: string, id: string): Promise<CertificateRecord> {
    const scope = await this.scopes.resolve(requesterId);
    const row = await this.certificates.findById(id);
    if (!row || !covers(scope, row.schoolId)) throw new CertificateNotFoundError();
    return row;
  }

  /** Las reglas de dominio que rechazan la acción se informan como conflicto de estado, no como error interno. */
  protected async move(
    id: string,
    decide: (current: CertificateRecord, evidences: CertificateEvidenceRecord[], tools: TransitionTools) => CertificatePatch | Promise<CertificatePatch>,
  ): Promise<CertificateRecord> {
    try {
      const updated = await this.workflow.transition(id, decide);
      if (!updated) throw new CertificateNotFoundError();
      return updated;
    } catch (error) {
      if (error instanceof InvalidTransitionError || error instanceof DemoRestrictedError) throw new CertificateStateError(error.message);
      throw error;
    }
  }

  protected record(requesterId: string, action: string, id: string, details: string, ip?: string | null) {
    // Nunca se guarda el texto libre (comentarios, motivos): solo qué pasó, con qué trámite y quién.
    return this.audit.create({ userId: requesterId, action, entity: 'Certificate', entityId: id, details, ipAddress: ip ?? null });
  }
}

export interface StartCertificateInput {
  tutorId: string;
  periodId: string;
  schoolId: string;
}

/** Inicia el trámite de un docente: solo con una designación aceptada en esa escuela y periodo, dentro del alcance de quien lo inicia. */
export class StartCertificateUseCase {
  constructor(
    private readonly scopes: CertificateScopeResolver,
    private readonly workflow: CertificateWorkflowRepository,
    private readonly users: UserRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly cycleTutors: CycleTutorRepository,
    private readonly schools: SchoolRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  async execute(requesterId: string, input: StartCertificateInput, ip?: string | null): Promise<CertificateRecord> {
    const scope = await this.scopes.resolve(requesterId);
    const school = await this.schools.findById(input.schoolId);
    if (!school || !covers(scope, school.id)) throw new CertificateSchoolNotFoundError();
    if (!(await this.periods.findById(input.periodId))) throw new InvalidCertificateInputError('El periodo no existe');
    const tutor = await this.users.findById(input.tutorId);
    if (!tutor || tutor.isActive === false) throw new InvalidCertificateInputError('El docente no existe o está inactivo');

    const assignments = (await this.cycleTutors.listByTutor(input.periodId, input.tutorId)).filter((a) => a.schoolId === input.schoolId);
    const accepted = assignments.find((a) => a.acceptanceStatus === 'ACEPTADA');
    if (!accepted) throw new CertificateNotEligibleError('El docente no tiene una designación aceptada en esa escuela y periodo');

    const created = await this.workflow.create({
      periodId: input.periodId,
      schoolId: input.schoolId,
      tutorId: input.tutorId,
      assignmentId: accepted.id,
      createdById: requesterId,
      evidences: DEFAULT_EVIDENCE_KINDS.map((kind) => ({ kind, ref: kind === 'ACEPTACION' ? accepted.id : null })),
    });
    await this.audit.create({ userId: requesterId, action: 'CERTIFICATE_STARTED', entity: 'Certificate', entityId: created.id, details: school.name, ipAddress: ip ?? null });
    return created;
  }
}

/** Pasa el trámite a revisión, o lo devuelve a revisión después de una observación. */
export class SubmitCertificateUseCase extends CertificateStep {
  async execute(requesterId: string, id: string, ip?: string | null): Promise<CertificateRecord> {
    await this.visible(requesterId, id);
    let resubmitted = false;
    const updated = await this.move(id, (current) => {
      resubmitted = current.status === 'OBSERVADO';
      const status = applyTransition(current.status, resubmitted ? 'RESUBMIT' : 'SUBMIT', { isDemo: current.isDemo });
      // Al volver de una observación la anterior ya no describe el trámite.
      return { status, ...(resubmitted && { reviewNote: null }) };
    });
    await this.record(requesterId, resubmitted ? 'CERTIFICATE_RESUBMITTED' : 'CERTIFICATE_SUBMITTED', id, `→ ${updated.status}`, ip);
    return updated;
  }
}

export interface ReviewEvidenceInput {
  result: string;
  comment?: string | null;
}

/** Marca una evidencia como conforme, observada o pendiente: lo decide una persona y queda quién y cuándo. */
export class ReviewEvidenceUseCase extends CertificateStep {
  async execute(requesterId: string, certificateId: string, evidenceId: string, input: ReviewEvidenceInput, ip?: string | null): Promise<CertificateEvidenceRecord> {
    if (!(REVIEWABLE_RESULTS as readonly string[]).includes(input.result)) throw new InvalidCertificateInputError(`El resultado debe ser uno de: ${REVIEWABLE_RESULTS.join(', ')}`);
    const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
    if (comment.length > COMMENT_MAX) throw new InvalidCertificateInputError(`El comentario no puede superar ${COMMENT_MAX} caracteres`);
    if (input.result === 'OBSERVADA' && comment.length < 3) throw new InvalidCertificateInputError('Una evidencia observada necesita un comentario que diga qué se observa');

    await this.visible(requesterId, certificateId);
    const reviewedAt = this.now();
    const evidence = await this.workflow.reviewEvidence(certificateId, evidenceId, (current) => {
      if (!canReviewEvidences(current.status)) throw new CertificateStateError('Las evidencias solo se revisan mientras el trámite está en revisión');
      return { result: input.result, comment: comment || null, reviewedById: requesterId, reviewedAt };
    });
    if (!evidence) throw new CertificateNotFoundError();
    await this.record(requesterId, 'CERTIFICATE_EVIDENCE_REVIEWED', certificateId, `${evidence.kind}: ${evidence.result}`, ip);
    return evidence;
  }
}

/** Devuelve el trámite al iniciador con observaciones; exige al menos una evidencia observada (queda dicho qué se observa). */
export class ObserveCertificateUseCase extends CertificateStep {
  async execute(requesterId: string, id: string, input: { note?: string | null }, ip?: string | null): Promise<CertificateRecord> {
    const note = typeof input.note === 'string' ? input.note.trim() : '';
    if (note.length > REASON_MAX) throw new InvalidCertificateInputError(`La nota no puede superar ${REASON_MAX} caracteres`);
    await this.visible(requesterId, id);
    const updated = await this.move(id, (current, evidences) => {
      const status = applyTransition(current.status, 'OBSERVE', { isDemo: current.isDemo });
      if (!canObserve(evidences)) throw new CertificateStateError('Para observar el trámite marca al menos una evidencia como observada');
      return { status, reviewNote: note || null };
    });
    await this.record(requesterId, 'CERTIFICATE_OBSERVED', id, `→ ${updated.status}`, ip);
    return updated;
  }
}

/** Cierra el trámite sin certificar; el motivo es obligatorio y queda guardado (la base de datos lo exige). */
export class RejectCertificateUseCase extends CertificateStep {
  async execute(requesterId: string, id: string, input: { reason?: unknown }, ip?: string | null): Promise<CertificateRecord> {
    const reason = requireReason(input.reason, 'El motivo del rechazo');
    await this.visible(requesterId, id);
    const updated = await this.move(id, (current) => ({ status: applyTransition(current.status, 'REJECT', { isDemo: current.isDemo }), reviewNote: reason }));
    await this.record(requesterId, 'CERTIFICATE_REJECTED', id, `→ ${updated.status}`, ip);
    return updated;
  }
}

/**
 * Aprueba el trámite. El sistema nunca aprueba por sí mismo: exige que una persona haya marcado conformes todas las evidencias y
 * deja su nombre y fecha. Las evidencias se leen dentro del bloqueo del trámite, así que no se puede aprobar mientras otra persona
 * observa una evidencia en ese mismo instante.
 */
export class ApproveCertificateUseCase extends CertificateStep {
  async execute(requesterId: string, id: string, ip?: string | null): Promise<CertificateRecord> {
    await this.visible(requesterId, id);
    const approvedAt = this.now();
    const updated = await this.move(id, (current, evidences) => {
      const status = applyTransition(current.status, 'APPROVE', { isDemo: current.isDemo });
      const blockers = approvalBlockers(evidences);
      if (blockers.length > 0) throw new CertificateStateError(`No se puede aprobar: ${blockers.join('; ')}`);
      return { status, approvedById: requesterId, approvedAt };
    });
    await this.record(requesterId, 'CERTIFICATE_APPROVED', id, `→ ${updated.status}`, ip);
    return updated;
  }
}

/** Anula el trámite (también uno ya aprobado): motivo obligatorio, con quién y cuándo. Un trámite anulado no se reabre. */
export class VoidCertificateUseCase extends CertificateStep {
  async execute(requesterId: string, id: string, input: { reason?: unknown }, ip?: string | null): Promise<CertificateRecord> {
    const reason = requireReason(input.reason, 'El motivo de la anulación');
    await this.visible(requesterId, id);
    const voidedAt = this.now();
    const updated = await this.move(id, (current) => ({
      status: applyTransition(current.status, 'VOID', { isDemo: current.isDemo }),
      voidedById: requesterId,
      voidedAt,
      voidReason: reason,
    }));
    await this.record(requesterId, 'CERTIFICATE_VOIDED', id, `→ ${updated.status}`, ip);
    return updated;
  }
}
