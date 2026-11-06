import { CERTIFICATE_STATUSES, CertificateStatus } from '../../src/domain/certification/certificateStatus';
import {
  CertificateAction,
  DEMO_BLOCKED_STATUSES,
  DemoRestrictedError,
  InvalidTransitionError,
  TRANSITIONS,
  VOIDABLE_STATUSES,
  applyTransition,
  approvalBlockers,
  availableActions,
  canObserve,
  canReviewEvidences,
} from '../../src/domain/certification/certificateWorkflow';

const ACTIONS = Object.keys(TRANSITIONS) as CertificateAction[];

// Tabla esperada, escrita aparte de la implementación: si alguien cambia una transición, esta prueba obliga a revisarlo.
const VALID: [CertificateStatus, CertificateAction, CertificateStatus][] = [
  ['INICIADO', 'SUBMIT', 'EN_REVISION'],
  ['OBSERVADO', 'RESUBMIT', 'EN_REVISION'],
  ['EN_REVISION', 'OBSERVE', 'OBSERVADO'],
  ['EN_REVISION', 'REJECT', 'RECHAZADO'],
  ['EN_REVISION', 'APPROVE', 'APROBADO'],
  ['APROBADO', 'GENERATE', 'GENERADO_SIN_FIRMA'],
  ...(['INICIADO', 'EN_REVISION', 'OBSERVADO', 'APROBADO', 'GENERADO_SIN_FIRMA', 'PENDIENTE_DE_FIRMA', 'FIRMADO_INCORPORADO', 'ENTREGADO'] as CertificateStatus[]).map(
    (from): [CertificateStatus, CertificateAction, CertificateStatus] => [from, 'VOID', 'ANULADO'],
  ),
];

describe('máquina de estados del certificado (corte 3)', () => {
  it.each(VALID)('desde %s la acción %s lleva a %s', (from, action, to) => {
    expect(applyTransition(from, action, { isDemo: true })).toBe(to);
  });

  it('cualquier otra combinación de estado y acción es inválida', () => {
    const valid = new Set(VALID.map(([from, action]) => `${from}/${action}`));
    let invalid = 0;
    for (const from of CERTIFICATE_STATUSES) {
      for (const action of ACTIONS) {
        if (valid.has(`${from}/${action}`)) continue;
        invalid += 1;
        expect(() => applyTransition(from, action, { isDemo: true })).toThrow(InvalidTransitionError);
      }
    }
    // 10 estados x 7 acciones menos las válidas: ninguna se escapa del recorrido.
    expect(invalid).toBe(CERTIFICATE_STATUSES.length * ACTIONS.length - VALID.length);
  });

  it('un estado desconocido no admite ninguna acción', () => {
    for (const action of ACTIONS) expect(() => applyTransition('INVENTADO', action, { isDemo: true })).toThrow(InvalidTransitionError);
  });

  it('el error de transición dice la acción y el estado de origen', () => {
    try {
      applyTransition('APROBADO', 'APPROVE', { isDemo: true });
      throw new Error('debía fallar');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).action).toBe('APPROVE');
      expect((error as InvalidTransitionError).from).toBe('APROBADO');
    }
  });

  it('los estados finales RECHAZADO y ANULADO no admiten ninguna acción', () => {
    for (const from of ['RECHAZADO', 'ANULADO'] as const) expect(availableActions(from, { isDemo: true })).toEqual([]);
    expect(VOIDABLE_STATUSES).not.toContain('RECHAZADO');
    expect(VOIDABLE_STATUSES).not.toContain('ANULADO');
  });

  it('ninguna acción lleva a un certificado de demostración a firma pendiente, firmado o entregado', () => {
    for (const action of ACTIONS) expect(DEMO_BLOCKED_STATUSES).not.toContain(TRANSITIONS[action].to);
    // Y si una acción futura lo intentara, la regla de demostración lo detiene antes de la base de datos.
    const original = TRANSITIONS.APPROVE.to;
    (TRANSITIONS.APPROVE as { to: CertificateStatus }).to = 'FIRMADO_INCORPORADO';
    try {
      expect(() => applyTransition('EN_REVISION', 'APPROVE', { isDemo: true })).toThrow(DemoRestrictedError);
      expect(applyTransition('EN_REVISION', 'APPROVE', { isDemo: false })).toBe('FIRMADO_INCORPORADO');
    } finally {
      (TRANSITIONS.APPROVE as { to: CertificateStatus }).to = original;
    }
  });

  it('ofrece solo las acciones que proceden desde cada estado', () => {
    expect(availableActions('INICIADO', { isDemo: true })).toEqual(['SUBMIT', 'VOID']);
    expect(availableActions('EN_REVISION', { isDemo: true }).sort()).toEqual(['APPROVE', 'OBSERVE', 'REJECT', 'VOID']);
    expect(availableActions('OBSERVADO', { isDemo: true }).sort()).toEqual(['RESUBMIT', 'VOID']);
    expect(availableActions('APROBADO', { isDemo: true })).toEqual(['GENERATE', 'VOID']);
    // Tras generar el PDF solo queda anular: la firma y la entrega siguen bloqueadas en demostración.
    expect(availableActions('GENERADO_SIN_FIRMA', { isDemo: true })).toEqual(['VOID']);
  });

  it('las evidencias solo se revisan mientras el trámite está en revisión', () => {
    expect(canReviewEvidences('EN_REVISION')).toBe(true);
    for (const status of CERTIFICATE_STATUSES.filter((s) => s !== 'EN_REVISION')) expect(canReviewEvidences(status)).toBe(false);
  });
});

describe('reglas de aprobación y observación', () => {
  const ev = (...results: string[]) => results.map((result) => ({ result }));

  it('no se aprueba sin evidencias', () => {
    expect(approvalBlockers([])).toEqual(['El trámite no tiene evidencias que revisar']);
  });

  it('solo se aprueba cuando todas las evidencias están conformes', () => {
    expect(approvalBlockers(ev('CONFORME', 'CONFORME', 'CONFORME'))).toEqual([]);
    expect(approvalBlockers(ev('CONFORME', 'PENDIENTE', 'CONFORME'))).toEqual(['Faltan por revisar 1 evidencia(s)']);
    expect(approvalBlockers(ev('CONFORME', 'OBSERVADA', 'PENDIENTE'))).toEqual(['Faltan por revisar 1 evidencia(s)', 'Hay 1 evidencia(s) observada(s)']);
  });

  it('observar exige al menos una evidencia observada', () => {
    expect(canObserve(ev('CONFORME', 'PENDIENTE'))).toBe(false);
    expect(canObserve(ev())).toBe(false);
    expect(canObserve(ev('CONFORME', 'OBSERVADA'))).toBe(true);
  });
});
