import { CertificateStatus, EvidenceResult } from './certificateStatus';

/**
 * Máquina de estados del trámite de certificación del docente tutor (corte 3 del plan de
 * docs/levantamiento/17_DISENO_CERTIFICACION_DEMOSTRACION.md). Es una función pura: no consulta nada y es la única fuente de qué
 * transiciones existen. Quién puede ejecutar cada acción lo decide el permiso de la ruta, no esta tabla.
 *
 * Los estados PENDIENTE_DE_FIRMA, FIRMADO_INCORPORADO y ENTREGADO siguen definidos (los usará la entrega con plantilla oficial),
 * pero ninguna acción de esta entrega llega a ellos, y la base de datos impide además que un certificado de demostración los tome.
 */
export type CertificateAction = 'SUBMIT' | 'RESUBMIT' | 'OBSERVE' | 'REJECT' | 'APPROVE' | 'VOID';

interface Transition {
  from: readonly CertificateStatus[];
  to: CertificateStatus;
}

/** Estados en los que un trámite sigue vivo: los únicos desde los que se puede anular. RECHAZADO y ANULADO son finales. */
export const VOIDABLE_STATUSES: readonly CertificateStatus[] = ['INICIADO', 'EN_REVISION', 'OBSERVADO', 'APROBADO', 'GENERADO_SIN_FIRMA', 'PENDIENTE_DE_FIRMA', 'FIRMADO_INCORPORADO', 'ENTREGADO'];

export const TRANSITIONS: Readonly<Record<CertificateAction, Transition>> = {
  SUBMIT: { from: ['INICIADO'], to: 'EN_REVISION' },
  RESUBMIT: { from: ['OBSERVADO'], to: 'EN_REVISION' },
  OBSERVE: { from: ['EN_REVISION'], to: 'OBSERVADO' },
  REJECT: { from: ['EN_REVISION'], to: 'RECHAZADO' },
  APPROVE: { from: ['EN_REVISION'], to: 'APROBADO' },
  VOID: { from: VOIDABLE_STATUSES, to: 'ANULADO' },
};

/** Estados que un certificado de demostración nunca puede tomar (también lo impone la base de datos). */
export const DEMO_BLOCKED_STATUSES: readonly CertificateStatus[] = ['PENDIENTE_DE_FIRMA', 'FIRMADO_INCORPORADO', 'ENTREGADO'];

export class InvalidTransitionError extends Error {
  constructor(
    readonly action: CertificateAction,
    readonly from: string,
  ) {
    super(`La acción no se puede hacer con el trámite en estado ${from}`);
    this.name = 'InvalidTransitionError';
  }
}

export class DemoRestrictedError extends Error {
  constructor(readonly to: CertificateStatus) {
    super(`Un certificado de demostración no puede pasar a ${to}`);
    this.name = 'DemoRestrictedError';
  }
}

/** El estado al que lleva la acción, o un error si desde el estado actual no se puede hacer. */
export function applyTransition(from: string, action: CertificateAction, options: { isDemo: boolean }): CertificateStatus {
  const transition = TRANSITIONS[action];
  if (!(transition.from as readonly string[]).includes(from)) throw new InvalidTransitionError(action, from);
  if (options.isDemo && DEMO_BLOCKED_STATUSES.includes(transition.to)) throw new DemoRestrictedError(transition.to);
  return transition.to;
}

/** Las acciones posibles desde un estado (para que la pantalla ofrezca solo lo que procede). */
export function availableActions(from: string, options: { isDemo: boolean }): CertificateAction[] {
  return (Object.keys(TRANSITIONS) as CertificateAction[]).filter((action) => {
    try {
      applyTransition(from, action, options);
      return true;
    } catch {
      return false;
    }
  });
}

/** Las evidencias se revisan solo mientras el trámite está en revisión. */
export const canReviewEvidences = (status: string): boolean => status === 'EN_REVISION';

export interface EvidenceState {
  result: string;
}

/**
 * Por qué todavía no se puede aprobar. La conformidad de cada evidencia la decide una persona; aquí solo se exige que existan
 * evidencias y que todas estén marcadas conformes: el sistema no aprueba por sí mismo ni por tener actividad registrada.
 */
export function approvalBlockers(evidences: readonly EvidenceState[]): string[] {
  if (evidences.length === 0) return ['El trámite no tiene evidencias que revisar'];
  const blockers: string[] = [];
  const pending = evidences.filter((e) => e.result === 'PENDIENTE').length;
  const observed = evidences.filter((e) => e.result === 'OBSERVADA').length;
  if (pending > 0) blockers.push(`Faltan por revisar ${pending} evidencia(s)`);
  if (observed > 0) blockers.push(`Hay ${observed} evidencia(s) observada(s)`);
  return blockers;
}

/** Observar un trámite exige dejar constancia de qué se observó: al menos una evidencia observada. */
export const canObserve = (evidences: readonly EvidenceState[]): boolean => evidences.some((e) => e.result === 'OBSERVADA');

export const REVIEWABLE_RESULTS: readonly EvidenceResult[] = ['PENDIENTE', 'CONFORME', 'OBSERVADA'];

/** Evidencias que se crean con cada trámite: el revisor las marca; el sistema solo las enlaza con su registro. */
export const DEFAULT_EVIDENCE_KINDS = ['ACEPTACION', 'SESIONES', 'INFORME_SEMESTRAL'] as const;
