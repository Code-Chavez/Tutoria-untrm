import type { CertificateActionCode, CertificateDetail, CertificateEvidence, CertificateFacts, CertificateStatus } from './services/certificateService';

type Tone = 'success' | 'neutral' | 'danger' | 'warning' | 'info';

export const STATUS_LABEL: Record<CertificateStatus, string> = {
  INICIADO: 'Iniciado',
  EN_REVISION: 'En revisión',
  OBSERVADO: 'Observado',
  RECHAZADO: 'Rechazado',
  APROBADO: 'Aprobado',
  GENERADO_SIN_FIRMA: 'PDF generado, sin firma',
  PENDIENTE_DE_FIRMA: 'Pendiente de firma',
  FIRMADO_INCORPORADO: 'Firmado',
  ENTREGADO: 'Entregado',
  ANULADO: 'Anulado',
};

export const STATUS_TONE: Record<CertificateStatus, Tone> = {
  INICIADO: 'neutral',
  EN_REVISION: 'info',
  OBSERVADO: 'warning',
  RECHAZADO: 'danger',
  APROBADO: 'success',
  GENERADO_SIN_FIRMA: 'success',
  PENDIENTE_DE_FIRMA: 'info',
  FIRMADO_INCORPORADO: 'success',
  ENTREGADO: 'success',
  ANULADO: 'danger',
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as CertificateStatus[]).map((value) => ({ value, label: STATUS_LABEL[value] }));

export const EVIDENCE_LABEL: Record<string, string> = {
  ACEPTACION: 'Aceptación de la designación',
  SESIONES: 'Sesiones realizadas',
  INFORME_SEMESTRAL: 'Informe semestral',
};
export const evidenceLabel = (kind: string): string => EVIDENCE_LABEL[kind] ?? kind;

export const RESULT_LABEL = {
  PENDIENTE: 'Pendiente de revisar',
  CONFORME: 'Conforme',
  OBSERVADA: 'Observada',
} as const;
export const RESULT_TONE: Record<keyof typeof RESULT_LABEL, Tone> = {
  PENDIENTE: 'neutral',
  CONFORME: 'success',
  OBSERVADA: 'warning',
};

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-PE', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      })
    : null;

/**
 * Lo que el sistema sabe para cada evidencia, como información para quien revisa. Nunca dice «cumplió»: que las sesiones o el informe
 * existan no aprueba nada; la persona marca cada evidencia.
 */
export function factFor(kind: string, facts: CertificateFacts | null): string {
  if (!facts) return 'Sin datos del sistema para esta evidencia.';
  if (kind === 'ACEPTACION') {
    if (!facts.acceptance) return 'No consta la designación aceptada (pudo eliminarse después de iniciar el trámite).';
    const when = date(facts.acceptance.respondedAt);
    return `Designación del ciclo ${facts.acceptance.cycle}: ${facts.acceptance.status.toLowerCase()}${when ? ` el ${when}` : ''}.`;
  }
  if (kind === 'SESIONES') return facts.sessionsHeld === 1 ? 'Consta 1 sesión realizada en el periodo.' : `Constan ${facts.sessionsHeld} sesiones realizadas en el periodo.`;
  if (kind === 'INFORME_SEMESTRAL') return facts.semesterReportSubmitted ? 'El docente presentó su informe semestral del periodo.' : 'No consta un informe semestral presentado en el periodo.';
  return 'Sin datos del sistema para esta evidencia.';
}

/** Por qué todavía no se puede aprobar (el servidor aplica la misma regla; aquí solo se anticipa para explicarlo). */
export function approvalBlockers(evidences: readonly Pick<CertificateEvidence, 'result'>[]): string[] {
  if (evidences.length === 0) return ['El trámite no tiene evidencias que revisar'];
  const pending = evidences.filter((e) => e.result === 'PENDIENTE').length;
  const observed = evidences.filter((e) => e.result === 'OBSERVADA').length;
  return [...(pending > 0 ? [`Faltan por revisar ${pending} evidencia(s)`] : []), ...(observed > 0 ? [`Hay ${observed} evidencia(s) observada(s)`] : [])];
}

export const hasObservedEvidence = (evidences: readonly Pick<CertificateEvidence, 'result'>[]): boolean => evidences.some((e) => e.result === 'OBSERVADA');

/** El permiso que exige el servidor para cada acción. */
export const ACTION_PERMISSION: Record<CertificateActionCode, string> = {
  SUBMIT: 'certificados:registrar',
  RESUBMIT: 'certificados:registrar',
  OBSERVE: 'certificados:aprobar',
  REJECT: 'certificados:aprobar',
  APPROVE: 'certificados:aprobar',
  GENERATE: 'certificados:emitir',
  VOID: 'certificados:administrar',
};

/** Las acciones del estado que la persona además puede ejecutar por sus permisos. */
export const actionsFor = (certificate: Pick<CertificateDetail, 'allowedActions'>, can: (permission: string) => boolean): CertificateActionCode[] =>
  certificate.allowedActions.filter((action) => can(ACTION_PERMISSION[action]));
