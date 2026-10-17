import type { RoleCode } from './navigation';

export interface SectionTab {
  label: string;
  path: string;
  roles: RoleCode[];
}

export interface Section {
  /** Entrada del menú lateral que abre la sección. */
  title: string;
  /** Ruta de entrada: lleva a la primera pestaña que la persona puede usar. */
  path: string;
  tabs: SectionTab[];
}

// Pantallas que se juntan en una sola, con pestañas, para que el menú sea corto. Cada pestaña conserva su dirección de siempre
// (p. ej. /pedir-listas): la sección solo las envuelve con la barra de pestañas.
export const SECTIONS: Record<'periodo' | 'configuracion', Section> = {
  periodo: {
    title: 'Periodo académico',
    path: '/periodo',
    // En el orden en que se hace: pedir las listas → cargarlas → asignar el tutor de cada ciclo → cerrar el periodo.
    tabs: [
      { label: 'Pedir listas', path: '/pedir-listas', roles: ['coord', 'dbu'] },
      { label: 'Carga de estudiantes', path: '/carga-masiva', roles: ['coord', 'dbu'] },
      { label: 'Carga de docentes', path: '/carga-docentes', roles: ['dbu'] },
      { label: 'Asignación por ciclo', path: '/asignacion', roles: ['coord', 'dbu'] },
      { label: 'Cierre de periodo', path: '/cierre-periodo', roles: ['dbu'] },
    ],
  },
  configuracion: {
    title: 'Configuración',
    path: '/configuracion',
    tabs: [
      { label: 'Correos de las escuelas', path: '/correos-escuelas', roles: ['coord', 'dbu'] },
      { label: 'Sedes', path: '/sedes', roles: ['dbu', 'vice'] },
      { label: 'Evaluación de tutoría', path: '/evaluacion/configuracion', roles: ['dbu'] },
      { label: 'Catálogos', path: '/catalogos', roles: ['dbu'] },
      { label: 'Usuarios y roles', path: '/users', roles: ['dbu'] },
      { label: 'Parámetros', path: '/parametros', roles: ['dbu'] },
      { label: 'Identidad visual', path: '/identidad', roles: ['dbu'] },
      { label: 'Bitácora de auditoría', path: '/auditoria', roles: ['dbu'] },
    ],
  },
};

export type SectionKey = keyof typeof SECTIONS;

export const tabsFor = (section: SectionKey, role: RoleCode | undefined): SectionTab[] =>
  SECTIONS[section].tabs.filter((tab) => role !== undefined && tab.roles.includes(role));
