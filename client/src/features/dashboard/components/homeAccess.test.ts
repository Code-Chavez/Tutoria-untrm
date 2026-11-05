import { describe, it, expect } from 'vitest';
import { canSeeRecentActivity, canSeeRiskAlerts, quickActionGroupsFor, quickActionsFor } from './homeAccess';

describe('accesos del panel de inicio agrupados', () => {
  it('la coordinación ve el periodo académico como un flujo numerado y en orden', () => {
    const periodo = quickActionGroupsFor('Coordinador').find((g) => g.title === 'Periodo académico');

    expect(periodo?.actions.map((a) => [a.step, a.label])).toEqual([
      [1, 'Pedir listas'],
      [2, 'Carga de estudiantes'],
      [3, 'Asignación por ciclo'],
    ]);
  });

  it('la DBU suma el cierre de periodo como último paso y la administración como bloque aparte', () => {
    const groups = quickActionGroupsFor('Administrador DBU');

    expect(groups.find((g) => g.title === 'Periodo académico')?.actions.at(-1)).toMatchObject({ step: 5, label: 'Cierre de periodo' });
    expect(groups.map((g) => g.title)).toContain('Configuración');
  });

  it('cada rol solo recibe accesos de su trabajo', () => {
    expect(quickActionGroupsFor('Tutorado').map((g) => g.title)).toEqual(['Mi tutoría']);
    expect(quickActionGroupsFor('Decano').flatMap((g) => g.actions.map((a) => a.label))).toEqual(['Amonestaciones']);
    expect(quickActionGroupsFor('Docente Tutor').map((g) => g.title)).not.toContain('Periodo académico');
    expect(quickActionGroupsFor(undefined)).toEqual([]);
  });
});

describe('accesos del panel de inicio para un rol personalizado', () => {
  const labels = (permissions: string[]) => quickActionsFor('Revisor', permissions).map((a) => a.label);

  it('muestra solo los accesos que sus permisos abren, sin repetir el mismo destino', () => {
    expect(labels(['students:read', 'referrals:read', 'students:import'])).toEqual(['Ver estudiantes', 'Casos derivados', 'Pedir listas', 'Carga de estudiantes']);
    expect(labels(['students:write'])).toEqual(['Registrar estudiante', 'Asignación por ciclo']);
  });

  it('no ofrece accesos exclusivos de un rol base (estudiante, seguimiento DBU) ni sin permisos', () => {
    expect(labels(['students:read', 'sessions:read', 'referrals:read', 'tutoring-requests:self'])).not.toContain('Solicitar tutoría');
    expect(labels(['referrals:read'])).not.toContain('Seguimiento de derivaciones');
    expect(labels([])).toEqual([]);
  });

  it('un rol base sigue por su rol aunque la sesión traiga permisos', () => {
    expect(quickActionsFor('Decano', ['users:read']).map((a) => a.label)).toEqual(['Amonestaciones']);
  });

  it('alertas y actividad: los roles base como siempre; uno personalizado según sus permisos', () => {
    expect(canSeeRiskAlerts('Docente Tutor')).toBe(true);
    expect(canSeeRiskAlerts('Vicerrectorado')).toBe(false);
    expect(canSeeRiskAlerts('Revisor', ['students:read'])).toBe(false);
    expect(canSeeRiskAlerts('Revisor', ['students:read', 'sessions:read'])).toBe(true);
    expect(canSeeRecentActivity('Administrador DBU')).toBe(true);
    expect(canSeeRecentActivity('Coordinador', ['audit:read'])).toBe(false);
    expect(canSeeRecentActivity('Revisor', ['audit:read'])).toBe(true);
  });
});
