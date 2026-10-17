import { describe, it, expect } from 'vitest';
import { quickActionGroupsFor } from './homeAccess';

describe('accesos del panel de inicio agrupados', () => {
  it('la coordinación ve el periodo académico como un flujo numerado y en orden', () => {
    const periodo = quickActionGroupsFor('Coordinador').find((g) => g.title === 'Periodo académico');

    expect(periodo?.actions.map((a) => [a.step, a.label])).toEqual([
      [1, 'Pedir listas'],
      [2, 'Carga masiva'],
      [3, 'Asignación por ciclo'],
    ]);
  });

  it('la DBU suma el cierre de periodo como último paso y la administración como bloque aparte', () => {
    const groups = quickActionGroupsFor('Administrador DBU');

    expect(groups.find((g) => g.title === 'Periodo académico')?.actions.at(-1)).toMatchObject({ step: 4, label: 'Cierre de periodo' });
    expect(groups.map((g) => g.title)).toContain('Administración');
  });

  it('cada rol solo recibe accesos de su trabajo', () => {
    expect(quickActionGroupsFor('Tutorado').map((g) => g.title)).toEqual(['Mi tutoría']);
    expect(quickActionGroupsFor('Decano').flatMap((g) => g.actions.map((a) => a.label))).toEqual(['Amonestaciones']);
    expect(quickActionGroupsFor('Docente Tutor').map((g) => g.title)).not.toContain('Periodo académico');
    expect(quickActionGroupsFor(undefined)).toEqual([]);
  });
});
