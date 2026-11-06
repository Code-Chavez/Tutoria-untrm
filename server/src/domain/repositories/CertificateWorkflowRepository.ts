import { CertificateEvidenceRecord, CertificateRecord } from './CertificateRepository';

export interface NewCertificate {
  periodId: string;
  schoolId: string;
  tutorId: string;
  assignmentId: string | null;
  createdById: string;
  /** Evidencias del trámite, todas pendientes de revisión: `ref` enlaza con el registro que el revisor consulta. */
  evidences: { kind: string; ref: string | null }[];
}

/** Lo que cambia en el trámite al pasar de un estado a otro; los campos ausentes no se tocan. */
export interface CertificatePatch {
  status: string;
  approvedById?: string | null;
  approvedAt?: Date | null;
  voidedById?: string | null;
  voidedAt?: Date | null;
  voidReason?: string | null;
  reviewNote?: string | null;
  // Generación del PDF sin firma (corte 4).
  number?: string;
  templateId?: string;
  snapshot?: unknown;
  unsignedSha256?: string;
  unsignedStorageKey?: string;
}

export interface EvidencePatch {
  result: string;
  comment: string | null;
  reviewedById: string;
  reviewedAt: Date;
}

/** Lo que `decide` puede usar dentro de la transacción que bloquea el trámite. */
export interface TransitionTools {
  /** Siguiente número del contador del ámbito y año, tomado en esta misma transacción: si se revierte, no se consume. */
  nextSequence(scope: string, year: number): Promise<number>;
}

/** Ya hay un trámite vigente para ese docente, escuela y periodo (lo impone la base de datos). */
export class CertificateAlreadyExistsError extends Error {
  constructor() {
    super('Ya existe un trámite vigente de certificado para ese docente en esa escuela y periodo');
    this.name = 'CertificateAlreadyExistsError';
  }
}

/**
 * Escritura de los trámites. Cada cambio se hace dentro de una transacción que bloquea la fila del trámite: la decisión se toma con
 * el estado y las evidencias que de verdad hay en ese momento, de modo que dos personas que actúan a la vez sobre el mismo trámite
 * se ordenan (la segunda ve el resultado de la primera) y no pueden aprobar dos veces ni aprobar mientras se observa.
 */
export interface CertificateWorkflowRepository {
  create(input: NewCertificate): Promise<CertificateRecord>;
  /** Devuelve null si el trámite no existe. `decide` puede lanzar un error de dominio: entonces no se escribe nada. */
  transition(
    id: string,
    decide: (current: CertificateRecord, evidences: CertificateEvidenceRecord[], tools: TransitionTools) => CertificatePatch | Promise<CertificatePatch>,
  ): Promise<CertificateRecord | null>;
  /** Devuelve null si el trámite o la evidencia (de ese trámite) no existen. */
  reviewEvidence(
    certificateId: string,
    evidenceId: string,
    decide: (current: CertificateRecord, evidence: CertificateEvidenceRecord) => EvidencePatch,
  ): Promise<CertificateEvidenceRecord | null>;
}
