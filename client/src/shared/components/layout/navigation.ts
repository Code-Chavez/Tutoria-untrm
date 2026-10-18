import { type ComponentType } from 'react';
import {
  DashboardIcon,
  GraduationCapIcon,
  ClipboardIcon,
  CalendarIcon,
  ActivityIcon,
  SendIcon,
  InboxIcon,
  StarIcon,
  CalendarRangeIcon,
  ReportIcon,
  RefreshIcon,
  ClockIcon,
  MessageSquareIcon,
  SettingsIcon,
  AlertTriangleIcon,
} from '@shared/components/icons';

import { SECTIONS } from './sections';

export type RoleCode = 'tutor' | 'coord' | 'dbu' | 'serv' | 'est' | 'vice' | 'dec';

// El JWT trae el nombre del rol; lo traducimos al código con que se filtra el menú.
export const ROLE_CODES: Record<string, RoleCode> = {
  'Administrador DBU': 'dbu',
  Coordinador: 'coord',
  'Docente Tutor': 'tutor',
  Tutorado: 'est',
  'Profesional de Servicio': 'serv',
  Vicerrectorado: 'vice',
  Decano: 'dec',
};

export interface NavItem {
  label: string;
  /** Título de la barra superior si difiere de la etiqueta del menú. */
  title?: string;
  Icon: ComponentType<{ size?: number }>;
  path: string;
  /** Acción que abre la lista de estudiantes en modo «elegir estudiante» (?accion=…). */
  action?: string;
  roles?: RoleCode[]; // sin roles = visible para todos
  /** Otras direcciones que también dejan esta entrada activa (las pestañas de una sección). */
  alsoPaths?: string[];
}

export interface NavGroup {
  /** Vacío = grupo sin título (una entrada suelta, como «Configuración»). */
  title: string;
  items: NavItem[];
  /** Grupo sin título desplegable (p. ej. «Inicio», que es una sola entrada). Por omisión, todos los grupos se despliegan y pliegan. */
  fixed?: boolean;
  /** Arranca plegado (se muestra abierto si la página actual está dentro). Por omisión arranca abierto. */
  startsCollapsed?: boolean;
}

const sectionPaths = (key: keyof typeof SECTIONS) => SECTIONS[key].tabs.map((tab) => tab.path);

// Única fuente de verdad: el menú, el título de la barra superior y la entrada activa salen de aquí.
// El menú es corto a propósito: «Periodo académico» y «Configuración» juntan varias pantallas en una sola, con pestañas
// (ver sections.ts). Los grupos siguen el trabajo de cada persona y se pliegan; un grupo sin entradas para el rol no se muestra.
export const NAV: NavGroup[] = [
  {
    title: 'Inicio',
    fixed: true,
    items: [{ label: 'Panel de inicio', Icon: DashboardIcon, path: '/' }],
  },
  {
    // El estudiante: pedir, ver y evaluar su tutoría.
    title: 'Mi tutoría',
    items: [
      { label: 'Solicitar tutoría', Icon: SendIcon, path: '/solicitar-tutoria', roles: ['est'] },
      { label: 'Mis sesiones', Icon: CalendarIcon, path: '/mis-sesiones', roles: ['est'] },
      { label: 'Evaluar tutoría', Icon: StarIcon, path: '/evaluar-tutoria', roles: ['est'] },
    ],
  },
  {
    // Quien atiende a los tutorados: el docente tutor y quien lo supervisa (coordinación, DBU) o recibe sus derivaciones (servicios).
    title: 'Atención a estudiantes',
    items: [
      // El expediente se abre desde la lista de estudiantes («Ver expediente»); mientras se ve uno, esta entrada queda activa.
      { label: 'Estudiantes', Icon: GraduationCapIcon, path: '/tutorados', alsoPaths: ['/expediente'], action: '', roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Entrevista inicial', Icon: ClipboardIcon, path: '/tutorados', action: 'entrevista', roles: ['tutor'] },
      { label: 'Sesiones', Icon: CalendarIcon, path: '/sesiones', roles: ['tutor'] },
      { label: 'Seguimiento', Icon: ActivityIcon, path: '/tutorados', action: 'seguimiento', roles: ['tutor'] },
      { label: 'Derivar caso', Icon: SendIcon, path: '/tutorados', action: 'derivar', roles: ['tutor'] },
      { label: 'Solicitudes de tutoría', Icon: MessageSquareIcon, path: '/solicitudes', roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Casos derivados', Icon: InboxIcon, path: '/derivaciones', roles: ['tutor', 'serv', 'dbu'] },
      {
        label: 'Seguimiento DBU',
        title: 'Seguimiento de derivaciones',
        Icon: ClockIcon,
        path: '/derivaciones/seguimiento',
        roles: ['dbu'],
      },
    ],
  },
  {
    // Lo que hacen la coordinación y la DBU en cada periodo (una sola pantalla con pestañas, en el orden en que se hace), la
    // planificación, los informes (otra pantalla con pestañas) y las amonestaciones.
    title: 'Gestión',
    items: [
      { label: SECTIONS.periodo.title, Icon: RefreshIcon, path: SECTIONS.periodo.path, alsoPaths: sectionPaths('periodo'), roles: ['coord', 'dbu'] },
      { label: 'Plan semestral', Icon: CalendarRangeIcon, path: '/plan-semestral', roles: ['coord', 'dbu'] },
      { label: SECTIONS.informes.title, Icon: ReportIcon, path: SECTIONS.informes.path, alsoPaths: sectionPaths('informes'), roles: ['tutor', 'coord', 'dbu', 'vice'] },
      { label: 'Amonestaciones', Icon: AlertTriangleIcon, path: '/amonestaciones', roles: ['dec', 'dbu', 'coord'] },
    ],
  },
  {
    // Todo lo que se configura, en una sola pantalla con pestañas (correos, sedes, catálogos, usuarios, parámetros…).
    title: '',
    fixed: true,
    items: [{ label: SECTIONS.configuracion.title, Icon: SettingsIcon, path: SECTIONS.configuracion.path, alsoPaths: sectionPaths('configuracion'), roles: ['coord', 'dbu', 'vice'] }],
  },
];

const pathMatches = (path: string, pathname: string) => (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));

const matchesPath = (item: NavItem, pathname: string) => [item.path, ...(item.alsoPaths ?? [])].some((path) => pathMatches(path, pathname));

const matchesAction = (item: NavItem, action: string) => item.action === undefined || item.action === action;

const matchedLength = (item: NavItem, pathname: string) =>
  Math.max(0, ...[item.path, ...(item.alsoPaths ?? [])].filter((path) => pathMatches(path, pathname)).map((path) => path.length));

/**
 * La entrada que corresponde a la URL: la más específica entre las que coinciden, de modo
 * que /derivaciones/seguimiento no deje también activa a /derivaciones (UI-01).
 */
export function findActiveItem(items: NavItem[], pathname: string, action: string): NavItem | undefined {
  return items
    .filter((item) => matchesPath(item, pathname) && matchesAction(item, action))
    .sort((a, b) => matchedLength(b, pathname) - matchedLength(a, pathname))[0];
}

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((group) => group.items);

// Pantallas fuera del menú (el resto sale de navigation.ts).
const EXTRA_META: Record<string, { title: string; group: string }> = {
  '/profile': { title: 'Mi perfil', group: 'Cuenta' },
  '/unauthorized': { title: 'Acceso denegado', group: '' },
  '/expediente': { title: 'Expediente', group: 'Atención a estudiantes' },
};

// La entrada de menú más específica da el título; las rutas con parámetro (p. ej. /expediente/:id)
// heredan el de su base.
export function resolveMeta(pathname: string) {
  if (EXTRA_META[pathname]) return EXTRA_META[pathname];
  if (pathname.startsWith('/expediente/')) return EXTRA_META['/expediente'];
  const item = findActiveItem(ALL_NAV_ITEMS, pathname, '');
  if (!item) return { title: 'Panel de inicio', group: 'Inicio' };
  const group = NAV.find((g) => g.items.includes(item));
  return { title: item.title ?? item.label, group: group?.title ?? 'Inicio' };
}
