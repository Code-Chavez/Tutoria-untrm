import { describe, it, expect } from 'vitest';
import { ACTION_PERMISSION, STATUS_LABEL, STATUS_OPTIONS, actionsFor, approvalBlockers, evidenceLabel, factFor, hasObservedEvidence } from './certificateLabels';

describe('estados y evidencias', () => {
  it('cada estado del servidor tiene su nombre en español y sale en el filtro', () => {
    expect(Object.keys(STATUS_LABEL)).toHaveLength(10);
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(Object.keys(STATUS_LABEL));
    for (const label of Object.values(STATUS_LABEL)) expect(label.trim()).not.toBe('');
  });

  it('una evidencia desconocida se muestra con su código en lugar de romper', () => {
    expect(evidenceLabel('SESIONES')).toBe('Sesiones realizadas');
    expect(evidenceLabel('OTRA_COSA')).toBe('OTRA_COSA');
  });
});

describe('hechos del sistema (solo informativos)', () => {
  const facts = { acceptance: { status: 'ACEPTADA', respondedAt: '2026-10-20T12:00:00.000Z', cycle: 3 }, sessionsHeld: 1, semesterReportSubmitted: true };

  it('describe cada evidencia con lo que el sistema sabe, sin afirmar que cumplió', () => {
    expect(factFor('ACEPTACION', facts)).toMatch(/^Designación del ciclo 3: aceptada el 20 oct\.? 2026\.$/); // el punto de «oct.» depende del ICU
    expect(factFor('SESIONES', facts)).toBe('Consta 1 sesión realizada en el periodo.');
    expect(factFor('SESIONES', { ...facts, sessionsHeld: 0 })).toBe('Constan 0 sesiones realizadas en el periodo.');
    expect(factFor('INFORME_SEMESTRAL', facts)).toBe('El docente presentó su informe semestral del periodo.');
    expect(factFor('INFORME_SEMESTRAL', { ...facts, semesterReportSubmitted: false })).toBe('No consta un informe semestral presentado en el periodo.');
    for (const kind of ['ACEPTACION', 'SESIONES', 'INFORME_SEMESTRAL']) expect(factFor(kind, facts)).not.toMatch(/cumpli/i);
  });

  it('sin datos o con una designación que ya no existe lo dice', () => {
    expect(factFor('SESIONES', null)).toMatch(/Sin datos del sistema/);
    expect(factFor('ACEPTACION', { ...facts, acceptance: null })).toMatch(/No consta la designación aceptada/);
    expect(factFor('OTRA_COSA', facts)).toMatch(/Sin datos del sistema/);
  });
});

describe('reglas que se anticipan en pantalla', () => {
  const ev = (...results: string[]) => results.map((result) => ({ result })) as never;

  it('no se aprueba sin evidencias ni con alguna pendiente u observada', () => {
    expect(approvalBlockers([])).toEqual(['El trámite no tiene evidencias que revisar']);
    expect(approvalBlockers(ev('CONFORME', 'CONFORME'))).toEqual([]);
    expect(approvalBlockers(ev('CONFORME', 'PENDIENTE'))).toEqual(['Faltan por revisar 1 evidencia(s)']);
    expect(approvalBlockers(ev('PENDIENTE', 'OBSERVADA'))).toEqual(['Faltan por revisar 1 evidencia(s)', 'Hay 1 evidencia(s) observada(s)']);
  });

  it('observar necesita al menos una evidencia observada', () => {
    expect(hasObservedEvidence(ev('CONFORME', 'PENDIENTE'))).toBe(false);
    expect(hasObservedEvidence(ev('OBSERVADA'))).toBe(true);
  });

  it('las acciones que se ofrecen son las del estado que la persona puede hacer por sus permisos', () => {
    const certificate = { allowedActions: ['SUBMIT', 'APPROVE', 'GENERATE', 'VOID'] as never };
    expect(actionsFor(certificate, () => true)).toEqual(['SUBMIT', 'APPROVE', 'GENERATE', 'VOID']);
    expect(actionsFor(certificate, () => false)).toEqual([]);
    expect(actionsFor(certificate, (p) => p === 'certificados:aprobar')).toEqual(['APPROVE']);
    expect(ACTION_PERMISSION.VOID).toBe('certificados:administrar');
    expect(ACTION_PERMISSION.GENERATE).toBe('certificados:emitir');
  });
});
