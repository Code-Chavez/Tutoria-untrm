import { describe, it, expect } from 'vitest';
import { ALL_NAV_ITEMS, NAV, ROLE_CODES, findActiveItem, resolveMeta, type NavItem } from './navigation';

const visibleFor = (role: string) =>
  ALL_NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(ROLE_CODES[role]));

const urlOf = (item: NavItem) => ({ pathname: item.path, action: item.action ?? '' });

describe('navegación (UI-01, UI-04, UI-07)', () => {
  it.each(Object.keys(ROLE_CODES))('%s: cada página tiene exactamente una entrada activa', (role) => {
    const items = visibleFor(role);
    for (const item of items) {
      const { pathname, action } = urlOf(item);
      const active = items.filter((i) => i === findActiveItem(items, pathname, action));
      expect(active, `${item.label} (${pathname})`).toEqual([item]);
    }
  });

  it('una subruta activa solo la entrada más específica', () => {
    const dbu = visibleFor('Administrador DBU');
    expect(findActiveItem(dbu, '/derivaciones/seguimiento', '')?.label).toBe('Seguimiento DBU');
    expect(findActiveItem(dbu, '/informes/consolidado', '')?.label).toBe('Informe consolidado');
    expect(findActiveItem(dbu, '/informes', '')?.label).toBe('Horarios y asistencia');
    expect(findActiveItem(dbu, '/expediente/abc-123', '')?.label).toBe('Expediente');
  });

  it('en el perfil no hay entrada activa', () => {
    expect(findActiveItem(visibleFor('Administrador DBU'), '/profile', '')).toBeUndefined();
  });

  it('el título de la barra superior describe la misma tarea que el menú', () => {
    expect(resolveMeta('/informes')).toEqual({ title: 'Consolidado de horarios y asistencia', group: 'Informes' });
    expect(resolveMeta('/derivaciones/seguimiento').title).toBe('Seguimiento de derivaciones');
    expect(resolveMeta('/derivaciones').title).toBe('Casos derivados');
    expect(resolveMeta('/expediente/abc').title).toBe('Expediente');
    expect(resolveMeta('/users').title).toBe('Usuarios y roles');
    expect(resolveMeta('/profile').title).toBe('Mi perfil');
  });

  it('las funciones del menú de configuración no comparten icono', () => {
    const labels = ['Usuarios y roles', 'Catálogos', 'Parámetros', 'Identidad visual', 'Evaluación de tutoría'];
    const icons = labels.map((l) => ALL_NAV_ITEMS.find((i) => i.label === l)?.Icon);
    expect(new Set(icons).size).toBe(labels.length);
    const reportLabels = ['Horarios y asistencia', 'Informe consolidado', 'Seguimiento DBU'];
    const reportIcons = reportLabels.map((l) => ALL_NAV_ITEMS.find((i) => i.label === l)?.Icon);
    expect(new Set(reportIcons).size).toBe(reportLabels.length);
    expect(ALL_NAV_ITEMS.find((i) => i.label === 'Indicadores')?.Icon).not.toBe(
      ALL_NAV_ITEMS.find((i) => i.label === 'Resultados de evaluación')?.Icon,
    );
  });

  it('no hay etiquetas repetidas dentro de un mismo rol', () => {
    for (const role of Object.keys(ROLE_CODES)) {
      const labels = visibleFor(role).map((i) => i.label);
      expect(new Set(labels).size, role).toBe(labels.length);
    }
    expect(NAV.length).toBeGreaterThan(0);
  });

  it('dentro del menú de un mismo rol, cada función tiene su propio icono (R04)', () => {
    for (const role of Object.keys(ROLE_CODES)) {
      const seen = new Map<unknown, string>();
      for (const item of visibleFor(role)) {
        expect(seen.get(item.Icon), `${role}: «${item.label}» repite el icono de «${seen.get(item.Icon)}»`).toBeUndefined();
        seen.set(item.Icon, item.label);
      }
    }
  });

  describe('estructura del menú por tareas', () => {
    const groupsFor = (role: string) =>
      NAV.map((g) => ({ title: g.title, labels: g.items.filter((i) => !i.roles || i.roles.includes(ROLE_CODES[role])).map((i) => i.label) })).filter((g) => g.labels.length > 0);

    it('cada rol ve solo los grupos que le sirven, en el orden del trabajo', () => {
      expect(groupsFor('Tutorado').map((g) => g.title)).toEqual(['Inicio', 'Mi tutoría']);
      expect(groupsFor('Docente Tutor').map((g) => g.title)).toEqual(['Inicio', 'Atención a tutorados', 'Informes']);
      expect(groupsFor('Coordinador').map((g) => g.title)).toEqual(['Inicio', 'Atención a tutorados', 'Periodo académico', 'Planificación y evaluación', 'Informes', 'Facultad y sedes']);
      expect(groupsFor('Decano').map((g) => g.title)).toEqual(['Inicio', 'Facultad y sedes']);
      expect(groupsFor('Vicerrectorado').map((g) => g.title)).toEqual(['Inicio', 'Informes', 'Facultad y sedes']);
      expect(groupsFor('Administrador DBU').map((g) => g.title)).toEqual(['Inicio', 'Atención a tutorados', 'Periodo académico', 'Planificación y evaluación', 'Informes', 'Facultad y sedes', 'Administración']);
    });

    it('el periodo académico sigue el flujo real: pedir listas, cargar, tutor por ciclo, asignar y cerrar', () => {
      const flow = groupsFor('Administrador DBU').find((g) => g.title === 'Periodo académico');
      expect(flow?.labels).toEqual(['Pedir listas', 'Carga masiva', 'Tutores por ciclo', 'Asignación', 'Cierre de periodo']);
    });

    it('la administración (usuarios, catálogos, parámetros…) es solo de la DBU', () => {
      for (const role of Object.keys(ROLE_CODES).filter((r) => r !== 'Administrador DBU')) {
        expect(groupsFor(role).map((g) => g.title), role).not.toContain('Administración');
      }
    });

    it('no hay dos entradas con la misma etiqueta dentro de un mismo grupo', () => {
      for (const group of NAV) {
        const labels = group.items.map((i) => i.label);
        expect(new Set(labels).size, group.title).toBe(labels.length);
      }
    });
  });
});
