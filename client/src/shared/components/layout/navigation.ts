import { type ComponentType } from 'react';
import {
  DashboardIcon,
  GraduationCapIcon,
  SwitchIcon,
  UploadIcon,
  ClipboardIcon,
  FolderIcon,
  CalendarIcon,
  ActivityIcon,
  SendIcon,
  InboxIcon,
  StarIcon,
  CalendarRangeIcon,
  ReportIcon,
  PieChartIcon,
  UsersIcon,
  LayersIcon,
  SlidersIcon,
  PaletteIcon,
  ListChecksIcon,
  BarChartIcon,
  ClockIcon,
  FileSpreadsheetIcon,
  ShieldCheckIcon,
  MessageSquareIcon,
  FileTextIcon,
} from '@shared/components/icons';

export type RoleCode = 'tutor' | 'coord' | 'dbu' | 'serv' | 'est' | 'vice';

// El JWT trae el nombre del rol; lo traducimos al código con que se filtra el menú.
export const ROLE_CODES: Record<string, RoleCode> = {
  'Administrador DBU': 'dbu',
  Coordinador: 'coord',
  'Docente Tutor': 'tutor',
  Tutorado: 'est',
  'Profesional de Servicio': 'serv',
  Vicerrectorado: 'vice',
};

export interface NavItem {
  label: string;
  /** Título de la barra superior si difiere de la etiqueta del menú. */
  title?: string;
  Icon: ComponentType<{ size?: number }>;
  path: string;
  /** Acción que abre la lista de tutorados en modo «elegir estudiante» (?accion=…). */
  action?: string;
  roles?: RoleCode[]; // sin roles = visible para todos
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Única fuente de verdad: el menú, el título de la barra superior y la entrada activa salen de aquí.
// Cada función tiene su propio icono; los grupos siguen el trabajo de cada rol.
export const NAV: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Panel de inicio', Icon: DashboardIcon, path: '/' },
      { label: 'Tutorados', Icon: GraduationCapIcon, path: '/tutorados', action: '', roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Asignación', Icon: SwitchIcon, path: '/asignacion', roles: ['coord', 'dbu'] },
      { label: 'Carga masiva', Icon: UploadIcon, path: '/carga-masiva', roles: ['coord', 'dbu'] },
      { label: 'Entrevista inicial', Icon: ClipboardIcon, path: '/tutorados', action: 'entrevista', roles: ['tutor'] },
      { label: 'Expediente', Icon: FolderIcon, path: '/expediente', roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Sesiones', Icon: CalendarIcon, path: '/sesiones', roles: ['tutor'] },
      { label: 'Mis sesiones', Icon: CalendarIcon, path: '/mis-sesiones', roles: ['est'] },
      { label: 'Seguimiento', Icon: ActivityIcon, path: '/tutorados', action: 'seguimiento', roles: ['tutor'] },
      { label: 'Derivar caso', Icon: SendIcon, path: '/tutorados', action: 'derivar', roles: ['tutor'] },
      { label: 'Solicitar tutoría', Icon: SendIcon, path: '/solicitar-tutoria', roles: ['est'] },
      { label: 'Solicitudes de tutoría', Icon: MessageSquareIcon, path: '/solicitudes', roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Casos derivados', Icon: InboxIcon, path: '/derivaciones', roles: ['tutor', 'serv', 'dbu'] },
      {
        label: 'Seguimiento DBU',
        title: 'Seguimiento de derivaciones',
        Icon: ClockIcon,
        path: '/derivaciones/seguimiento',
        roles: ['dbu'],
      },
      { label: 'Evaluar tutoría', Icon: StarIcon, path: '/evaluar-tutoria', roles: ['est'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Plan semestral', Icon: CalendarRangeIcon, path: '/plan-semestral', roles: ['coord', 'dbu'] },
      {
        label: 'Horarios y asistencia',
        title: 'Consolidado de horarios y asistencia',
        Icon: ReportIcon,
        path: '/informes',
        roles: ['tutor', 'coord', 'dbu'],
      },
      { label: 'Informe semestral', Icon: FileTextIcon, path: '/informes/semestral', roles: ['tutor'] },
      { label: 'Informe consolidado', Icon: FileSpreadsheetIcon, path: '/informes/consolidado', roles: ['dbu', 'vice'] },
      { label: 'Indicadores', Icon: PieChartIcon, path: '/indicadores', roles: ['dbu', 'coord', 'vice'] },
      { label: 'Usuarios y roles', Icon: UsersIcon, path: '/users', roles: ['dbu'] },
      { label: 'Catálogos', Icon: LayersIcon, path: '/catalogos', roles: ['dbu'] },
      { label: 'Parámetros', Icon: SlidersIcon, path: '/parametros', roles: ['dbu'] },
      { label: 'Identidad visual', Icon: PaletteIcon, path: '/identidad', roles: ['dbu'] },
      { label: 'Bitácora de auditoría', Icon: ShieldCheckIcon, path: '/auditoria', roles: ['dbu'] },
      { label: 'Evaluación de tutoría', Icon: ListChecksIcon, path: '/evaluacion/configuracion', roles: ['dbu'] },
      { label: 'Resultados de evaluación', Icon: BarChartIcon, path: '/evaluacion/resultados', roles: ['dbu', 'coord'] },
      { label: 'Sugerencias de estudiantes', Icon: StarIcon, path: '/evaluacion/sugerencias', roles: ['dbu', 'coord'] },
    ],
  },
];

const matchesPath = (item: NavItem, pathname: string) =>
  item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`);

const matchesAction = (item: NavItem, action: string) => item.action === undefined || item.action === action;

/**
 * La entrada que corresponde a la URL: la más específica entre las que coinciden, de modo
 * que /derivaciones/seguimiento no deje también activa a /derivaciones (UI-01).
 */
export function findActiveItem(items: NavItem[], pathname: string, action: string): NavItem | undefined {
  return items
    .filter((item) => matchesPath(item, pathname) && matchesAction(item, action))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((group) => group.items);

// Pantallas fuera del menú (el resto sale de navigation.ts).
const EXTRA_META: Record<string, { title: string; group: string }> = {
  '/profile': { title: 'Mi perfil', group: 'Cuenta' },
  '/unauthorized': { title: 'Acceso denegado', group: '' },
};

// La entrada de menú más específica da el título; las rutas con parámetro (p. ej. /expediente/:id)
// heredan el de su base.
export function resolveMeta(pathname: string) {
  if (EXTRA_META[pathname]) return EXTRA_META[pathname];
  const item = findActiveItem(ALL_NAV_ITEMS, pathname, '');
  if (!item) return { title: 'Panel de inicio', group: 'Principal' };
  const group = NAV.find((g) => g.items.includes(item));
  return { title: item.title ?? item.label, group: group?.title ?? 'Principal' };
}
