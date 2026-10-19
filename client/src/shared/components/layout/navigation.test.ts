import { describe, it, expect } from 'vitest';
import { ALL_NAV_ITEMS, NAV, ROLE_CODES, findActiveItem, resolveMeta, type NavItem } from './navigation';
import { SECTIONS, tabsFor } from './sections';

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
    expect(findActiveItem(dbu, '/informes/consolidado', '')?.label).toBe('Informes');
    expect(findActiveItem(dbu, '/informes', '')?.label).toBe('Informes');
    expect(findActiveItem(dbu, '/expediente/abc-123', '')?.label).toBe('Estudiantes');
  });

  it('en el perfil no hay entrada activa', () => {
    expect(findActiveItem(visibleFor('Administrador DBU'), '/profile', '')).toBeUndefined();
  });

  it('el título de la barra superior describe la misma tarea que el menú', () => {
    expect(resolveMeta('/informes').title).toBe('Informes'); // pestaña de la sección Informes
    expect(resolveMeta('/derivaciones/seguimiento').title).toBe('Seguimiento de derivaciones');
    expect(resolveMeta('/derivaciones').title).toBe('Casos derivados');
    expect(resolveMeta('/expediente/abc')).toEqual({ title: 'Expediente', group: 'Atención a estudiantes' });
    expect(resolveMeta('/users').title).toBe('Configuración'); // pestaña de la sección Configuración
    expect(resolveMeta('/pedir-listas').title).toBe('Periodo académico'); // pestaña de la sección Periodo académico
    expect(resolveMeta('/profile').title).toBe('Mi perfil');
  });

  it('las entradas de gestión no comparten icono', () => {
    const labels = ['Periodo académico', 'Plan semestral', 'Informes', 'Amonestaciones', 'Configuración', 'Seguimiento DBU'];
    const icons = labels.map((l) => ALL_NAV_ITEMS.find((i) => i.label === l)?.Icon);
    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(labels.length);
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
    const labelsFor = (role: string) => groupsFor(role).flatMap((g) => g.labels);

    it('cada rol ve solo los grupos que le sirven, en el orden del trabajo', () => {
      expect(groupsFor('Tutorado').map((g) => g.title)).toEqual(['Inicio', 'Mi tutoría']);
      expect(groupsFor('Docente Tutor').map((g) => g.title)).toEqual(['Inicio', 'Atención a estudiantes', 'Gestión']);
      expect(groupsFor('Coordinador').map((g) => g.title)).toEqual(['Inicio', 'Atención a estudiantes', 'Gestión', '']);
      expect(groupsFor('Decano').map((g) => g.title)).toEqual(['Inicio', 'Gestión']);
      expect(groupsFor('Vicerrectorado').map((g) => g.title)).toEqual(['Inicio', 'Gestión', '']);
      expect(groupsFor('Administrador DBU').map((g) => g.title)).toEqual(['Inicio', 'Atención a estudiantes', 'Gestión', '']);
    });

    it('el menú es corto: Periodo académico, Informes y Configuración juntan varias pantallas con pestañas', () => {
      expect(labelsFor('Administrador DBU')).toEqual([
        'Panel de inicio',
        'Estudiantes', 'Solicitudes de tutoría', 'Casos derivados', 'Seguimiento DBU',
        'Periodo académico', 'Plan semestral', 'Informes', 'Amonestaciones',
        'Configuración',
      ]);
      expect(labelsFor('Administrador DBU').length).toBeLessThanOrEqual(10);
      expect(labelsFor('Coordinador')).toEqual(['Panel de inicio', 'Estudiantes', 'Solicitudes de tutoría', 'Periodo académico', 'Plan semestral', 'Informes', 'Amonestaciones', 'Configuración']);
      expect(labelsFor('Vicerrectorado')).toEqual(['Panel de inicio', 'Informes', 'Configuración']);
    });

    it('el expediente no es una entrada del menú: se abre desde Tutorados, que queda activa mientras se ve uno', () => {
      expect(ALL_NAV_ITEMS.map((i) => i.label)).not.toContain('Expediente');
      const coord = visibleFor('Coordinador');
      expect(findActiveItem(coord, '/expediente/abc-123', '')?.label).toBe('Estudiantes');
    });

    describe('las pestañas de cada sección', () => {
      const tabs = (section: 'periodo' | 'informes' | 'configuracion', role: string) => tabsFor(section, ROLE_CODES[role]).map((t) => t.label);

      it('el periodo académico sigue el flujo real: pedir listas, cargar, asignar por ciclo y cerrar', () => {
        expect(tabs('periodo', 'Administrador DBU')).toEqual(['Pedir listas', 'Carga de estudiantes', 'Carga de docentes', 'Asignación por ciclo', 'Cierre de periodo', 'Pendientes']);
        expect(tabs('periodo', 'Coordinador')).toEqual(['Pedir listas', 'Carga de estudiantes', 'Asignación por ciclo', 'Pendientes']);
        expect(tabs('periodo', 'Docente Tutor')).toEqual([]);
      });

      it('todo lo que se consulta y se exporta está en Informes, y cada rol ve solo sus pestañas', () => {
        expect(tabs('informes', 'Administrador DBU')).toEqual(['Horarios y asistencia', 'Informe consolidado', 'Indicadores', 'Resultados de evaluación', 'Sugerencias de estudiantes']);
        expect(tabs('informes', 'Docente Tutor')).toEqual(['Horarios y asistencia', 'Informe semestral']);
        expect(tabs('informes', 'Coordinador')).toEqual(['Horarios y asistencia', 'Indicadores', 'Resultados de evaluación', 'Sugerencias de estudiantes']);
        expect(tabs('informes', 'Vicerrectorado')).toEqual(['Informe consolidado', 'Indicadores']);
        for (const role of ['Tutorado', 'Profesional de Servicio', 'Decano']) expect(tabs('informes', role), role).toEqual([]);
      });

      it('todo lo que se configura está en Configuración, y cada rol ve solo lo suyo', () => {
        expect(tabs('configuracion', 'Administrador DBU')).toEqual([
          'Correos de las escuelas', 'Sedes', 'Evaluación de tutoría', 'Catálogos', 'Usuarios y roles', 'Parámetros', 'Identidad visual', 'Bitácora de auditoría',
        ]);
        expect(tabs('configuracion', 'Coordinador')).toEqual(['Correos de las escuelas']);
        expect(tabs('configuracion', 'Vicerrectorado')).toEqual(['Sedes']);
        for (const role of ['Docente Tutor', 'Tutorado', 'Profesional de Servicio', 'Decano']) expect(tabs('configuracion', role), role).toEqual([]);
      });

      it('una pestaña deja activa la entrada de su sección', () => {
        const dbu = visibleFor('Administrador DBU');
        expect(findActiveItem(dbu, '/pedir-listas', '')?.label).toBe('Periodo académico');
        expect(findActiveItem(dbu, '/asignacion', '')?.label).toBe('Periodo académico');
        expect(findActiveItem(dbu, '/users', '')?.label).toBe('Configuración');
        expect(findActiveItem(dbu, '/evaluacion/configuracion', '')?.label).toBe('Configuración');
        expect(findActiveItem(dbu, '/evaluacion/resultados', '')?.label).toBe('Informes'); // no es de Configuración
        expect(findActiveItem(dbu, '/informes/consolidado', '')?.label).toBe('Informes');
        expect(findActiveItem(dbu, '/indicadores', '')?.label).toBe('Informes');
      });

      it('ninguna dirección de pestaña se repite en otra sección o entrada del menú', () => {
        const paths = [...SECTIONS.periodo.tabs, ...SECTIONS.informes.tabs, ...SECTIONS.configuracion.tabs].map((t) => t.path);
        expect(new Set(paths).size).toBe(paths.length);
        const menuPaths = ALL_NAV_ITEMS.map((i) => i.path);
        for (const path of paths) expect(menuPaths).not.toContain(path);
      });
    });

    it('solo «Inicio» y «Configuración» son entradas fijas (el resto de los grupos se pliega)', () => {
      expect(NAV.filter((g) => g.fixed).map((g) => g.title)).toEqual(['Inicio', '']);
    });

    it('no hay dos entradas con la misma etiqueta dentro de un mismo grupo', () => {
      for (const group of NAV) {
        const labels = group.items.map((i) => i.label);
        expect(new Set(labels).size, group.title).toBe(labels.length);
      }
    });
  });
});
