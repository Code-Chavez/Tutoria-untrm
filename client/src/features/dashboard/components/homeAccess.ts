import { type ComponentType } from 'react';
import {
  UserPlusIcon,
  UploadIcon,
  GraduationCapIcon,
  SettingsIcon,
  SendIcon,
  CalendarIcon,
  CalendarRangeIcon,
  StarIcon,
  InboxIcon,
  ClockIcon,
  MessageSquareIcon,
  FileSpreadsheetIcon,
  PieChartIcon,
  AlertTriangleIcon,
  MapPinIcon,
  RefreshIcon,
} from '@shared/components/icons';

export interface QuickAction {
  label: string;
  description: string;
  to: string;
  Icon: ComponentType<{ size?: number }>;
  /** Roles a los que se ofrece; sin roles = todos. */
  roles?: string[];
  /** Bloque del panel de inicio (los mismos grupos del menú). */
  group: string;
  /** Posición en un flujo ordenado (se muestra como «Paso N»). */
  step?: number;
}

const TUTOR = 'Docente Tutor';
const COORD = 'Coordinador';
const DBU = 'Administrador DBU';
const STUDENT = 'Tutorado';
const SERVICE = 'Profesional de Servicio';
const VICE = 'Vicerrectorado';
const DEAN = 'Decano';

// Accesos del panel de inicio: cada rol ve solo tareas que puede hacer (R02), agrupadas como en el menú y, en el
// periodo académico, en el orden en que se hacen.
export const QUICK_ACTIONS: QuickAction[] = [
  { group: 'Mi tutoría', label: 'Solicitar tutoría', description: 'Cuéntanos qué necesitas', to: '/solicitar-tutoria', Icon: SendIcon, roles: [STUDENT] },
  { group: 'Mi tutoría', label: 'Mis sesiones', description: 'Fecha, modalidad y lugar o enlace', to: '/mis-sesiones', Icon: CalendarIcon, roles: [STUDENT] },
  { group: 'Mi tutoría', label: 'Evaluar tutoría', description: 'Responde la evaluación de tu tutor', to: '/evaluar-tutoria', Icon: StarIcon, roles: [STUDENT] },

  { group: 'Atención a tutorados', label: 'Ver tutorados', description: 'Consultar y filtrar estudiantes', to: '/tutorados', Icon: GraduationCapIcon, roles: [TUTOR, COORD, DBU] },
  { group: 'Atención a tutorados', label: 'Registrar tutorado', description: 'Alta individual de un estudiante', to: '/tutorados?accion=nuevo', Icon: UserPlusIcon, roles: [COORD, DBU] },
  { group: 'Atención a tutorados', label: 'Mi calendario', description: 'Sesiones programadas y asistencia', to: '/sesiones', Icon: CalendarIcon, roles: [TUTOR] },
  { group: 'Atención a tutorados', label: 'Solicitudes de tutoría', description: 'Recibidas y por atender', to: '/solicitudes', Icon: MessageSquareIcon, roles: [TUTOR, COORD, DBU] },
  { group: 'Atención a tutorados', label: 'Casos derivados', description: 'Tus derivaciones y su estado', to: '/derivaciones', Icon: InboxIcon, roles: [TUTOR] },
  { group: 'Atención a tutorados', label: 'Casos derivados', description: 'Bandeja de tu servicio: recibir, atender y cerrar', to: '/derivaciones', Icon: InboxIcon, roles: [SERVICE] },
  { group: 'Atención a tutorados', label: 'Seguimiento de derivaciones', description: 'Casos de todos los servicios', to: '/derivaciones/seguimiento', Icon: ClockIcon, roles: [DBU] },

  { group: 'Periodo académico', step: 1, label: 'Pedir listas', description: 'Pide a cada escuela la lista de estudiantes por correo', to: '/pedir-listas', Icon: SendIcon, roles: [COORD, DBU] },
  { group: 'Periodo académico', step: 2, label: 'Carga masiva', description: 'Importar estudiantes desde Excel', to: '/carga-masiva', Icon: UploadIcon, roles: [COORD, DBU] },
  { group: 'Periodo académico', step: 3, label: 'Asignación por ciclo', description: 'Elige al docente de cada ciclo: todos sus estudiantes pasan a él', to: '/asignacion', Icon: UserPlusIcon, roles: [COORD, DBU] },
  { group: 'Periodo académico', step: 4, label: 'Cierre de periodo', description: 'Cerrar el periodo y dejar la tutoría en solo lectura', to: '/cierre-periodo', Icon: RefreshIcon, roles: [DBU] },

  { group: 'Planificación y evaluación', label: 'Plan semestral', description: 'Plan de trabajo de tu escuela', to: '/plan-semestral', Icon: CalendarRangeIcon, roles: [COORD] },

  { group: 'Informes', label: 'Informe consolidado', description: 'Cifras por escuela y facultad', to: '/informes/consolidado', Icon: FileSpreadsheetIcon, roles: [VICE] },
  { group: 'Informes', label: 'Indicadores', description: 'Tablero de cobertura y riesgo', to: '/indicadores', Icon: PieChartIcon, roles: [VICE] },

  { group: 'Facultad y sedes', label: 'Amonestaciones', description: 'Registrar y consultar las de los docentes de tu facultad', to: '/amonestaciones', Icon: AlertTriangleIcon, roles: [DEAN] },
  { group: 'Facultad y sedes', label: 'Sedes', description: 'Sedes de la universidad y sede de cada escuela', to: '/sedes', Icon: MapPinIcon, roles: [VICE] },

  { group: 'Administración', label: 'Usuarios y roles', description: 'Cuentas del sistema y permisos', to: '/users', Icon: SettingsIcon, roles: [DBU] },
];

/** Los accesos del rol, agrupados en el orden del menú. */
export function quickActionGroupsFor(role: string | undefined): { title: string; actions: QuickAction[] }[] {
  const groups = new Map<string, QuickAction[]>();
  for (const action of quickActionsFor(role)) groups.set(action.group, [...(groups.get(action.group) ?? []), action]);
  return [...groups.entries()].map(([title, actions]) => ({ title, actions }));
}

export function quickActionsFor(role: string | undefined): QuickAction[] {
  if (!role) return [];
  return QUICK_ACTIONS.filter((a) => !a.roles || a.roles.includes(role));
}

/** Roles que consultan las alertas de inasistencia y riesgo (students:read y sessions:read en el servidor). */
export const ALERT_ROLES = [TUTOR, COORD, DBU];
