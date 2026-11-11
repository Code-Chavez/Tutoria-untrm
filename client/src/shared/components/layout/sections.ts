import type { RoleCode } from './navigation';
import { ROUTE_PERMISSIONS, hasAnyPermission } from '../../routePermissions';

export interface SectionTab {
  label: string;
  path: string;
  roles: RoleCode[];
  /** Permisos que abren la pestaña a una cuenta con rol personalizado (basta uno). */
  permissions?: readonly string[];
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
export const SECTIONS: Record<'periodo' | 'informes' | 'configuracion', Section> = {
  periodo: {
    title: 'Periodo académico',
    path: '/periodo',
    // En el orden en que se hace: pedir las listas → cargarlas → asignar el tutor de cada ciclo → cerrar el periodo.
    tabs: [
      { label: 'Pedir listas', path: '/pedir-listas', roles: ['coord', 'dbu'], permissions: ROUTE_PERMISSIONS['/pedir-listas'] },
      { label: 'Carga de estudiantes', path: '/carga-masiva', roles: ['coord', 'dbu'], permissions: ROUTE_PERMISSIONS['/carga-masiva'] },
      { label: 'Carga de docentes', path: '/carga-docentes', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/carga-docentes'] },
      { label: 'Asignación por ciclo', path: '/asignacion', roles: ['coord', 'dbu'], permissions: ROUTE_PERMISSIONS['/asignacion'] },
      // Lista de los docentes del periodo con su designación y su certificado; mismo permiso y alcance por escuela que Certificados.
      { label: 'Docentes tutores', path: '/docentes-tutores', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/docentes-tutores'] },
      { label: 'Cierre de periodo', path: '/cierre-periodo', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/cierre-periodo'] },
      // Certificados de los docentes tutores (demostración): los roles base solo los ve la DBU; una cuenta con rol a medida, si tiene el permiso.
      { label: 'Certificados', path: '/certificados', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/certificados'] },
      // Transversal al orden anterior: lo que quedó sin resolver en cualquiera de esos pasos (y las citas canceladas sin continuación).
      { label: 'Pendientes', path: '/pendientes', roles: ['coord', 'dbu'], permissions: ROUTE_PERMISSIONS['/pendientes'] },
    ],
  },
  informes: {
    title: 'Informes',
    path: '/reportes',
    // Todo lo que se consulta y se exporta, en una pantalla: cada rol ve las pestañas que le corresponden.
    tabs: [
      { label: 'Horarios y asistencia', path: '/informes', roles: ['tutor', 'coord', 'dbu'], permissions: ROUTE_PERMISSIONS['/informes'] },
      { label: 'Informe semestral', path: '/informes/semestral', roles: ['tutor'], permissions: ROUTE_PERMISSIONS['/informes/semestral'] },
      { label: 'Informe consolidado', path: '/informes/consolidado', roles: ['dbu', 'vice'], permissions: ROUTE_PERMISSIONS['/informes/consolidado'] },
      { label: 'Indicadores', path: '/indicadores', roles: ['dbu', 'coord', 'vice'], permissions: ROUTE_PERMISSIONS['/indicadores'] },
      { label: 'Resultados de evaluación', path: '/evaluacion/resultados', roles: ['dbu', 'coord'], permissions: ROUTE_PERMISSIONS['/evaluacion/resultados'] },
      { label: 'Sugerencias de estudiantes', path: '/evaluacion/sugerencias', roles: ['dbu', 'coord'], permissions: ROUTE_PERMISSIONS['/evaluacion/sugerencias'] },
    ],
  },
  configuracion: {
    title: 'Configuración',
    path: '/configuracion',
    tabs: [
      { label: 'Correos para pedidos de listas', path: '/correos-escuelas', roles: ['coord', 'dbu'], permissions: ROUTE_PERMISSIONS['/correos-escuelas'] },
      { label: 'Sedes', path: '/sedes', roles: ['dbu', 'vice'], permissions: ROUTE_PERMISSIONS['/sedes'] },
      { label: 'Evaluación de tutoría', path: '/evaluacion/configuracion', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/evaluacion/configuracion'] },
      { label: 'Catálogos', path: '/catalogos', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/catalogos'] },
      { label: 'Usuarios y roles', path: '/users', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/users'] },
      { label: 'Roles y permisos', path: '/roles', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/roles'] },
      { label: 'Parámetros', path: '/parametros', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/parametros'] },
      { label: 'Identidad visual', path: '/identidad', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/identidad'] },
      { label: 'Bitácora de auditoría', path: '/auditoria', roles: ['dbu'], permissions: ROUTE_PERMISSIONS['/auditoria'] },
    ],
  },
};

export type SectionKey = keyof typeof SECTIONS;

/** Pestañas que ve la persona: por su rol si es uno de los base; con un rol personalizado (sin código), por sus permisos. */
export const tabsFor = (section: SectionKey, role: RoleCode | undefined, permissions: readonly string[] = []): SectionTab[] =>
  SECTIONS[section].tabs.filter((tab) => (role !== undefined ? tab.roles.includes(role) : hasAnyPermission(permissions, tab.permissions)));

/** Todos los permisos que abren alguna pestaña de la sección (para la entrada del menú). */
export const sectionPermissions = (section: SectionKey): string[] => [...new Set(SECTIONS[section].tabs.flatMap((tab) => tab.permissions ?? []))];
