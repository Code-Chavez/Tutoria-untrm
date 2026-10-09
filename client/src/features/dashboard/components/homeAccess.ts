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
} from '@shared/components/icons';

export interface QuickAction {
  label: string;
  description: string;
  to: string;
  Icon: ComponentType<{ size?: number }>;
  /** Roles a los que se ofrece; sin roles = todos. */
  roles?: string[];
}

const TUTOR = 'Docente Tutor';
const COORD = 'Coordinador';
const DBU = 'Administrador DBU';
const STUDENT = 'Tutorado';
const SERVICE = 'Profesional de Servicio';
const VICE = 'Vicerrectorado';

// Accesos del panel de inicio: cada rol ve solo tareas que puede hacer (R02).
export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Solicitar tutoría', description: 'Cuéntanos qué necesitas', to: '/solicitar-tutoria', Icon: SendIcon, roles: [STUDENT] },
  { label: 'Mis sesiones', description: 'Fecha, modalidad y lugar o enlace', to: '/mis-sesiones', Icon: CalendarIcon, roles: [STUDENT] },
  { label: 'Evaluar tutoría', description: 'Responde la evaluación de tu tutor', to: '/evaluar-tutoria', Icon: StarIcon, roles: [STUDENT] },

  { label: 'Registrar tutorado', description: 'Alta individual de un estudiante', to: '/tutorados?accion=nuevo', Icon: UserPlusIcon, roles: [COORD, DBU] },
  { label: 'Carga masiva', description: 'Importar estudiantes desde Excel', to: '/carga-masiva', Icon: UploadIcon, roles: [COORD, DBU] },
  { label: 'Ver tutorados', description: 'Consultar y filtrar estudiantes', to: '/tutorados', Icon: GraduationCapIcon, roles: [TUTOR, COORD, DBU] },
  { label: 'Mi calendario', description: 'Sesiones programadas y asistencia', to: '/sesiones', Icon: CalendarIcon, roles: [TUTOR] },
  { label: 'Solicitudes de tutoría', description: 'Recibidas y por atender', to: '/solicitudes', Icon: MessageSquareIcon, roles: [TUTOR, COORD, DBU] },
  { label: 'Casos derivados', description: 'Tus derivaciones y su estado', to: '/derivaciones', Icon: InboxIcon, roles: [TUTOR] },
  { label: 'Plan semestral', description: 'Plan de trabajo de tu escuela', to: '/plan-semestral', Icon: CalendarRangeIcon, roles: [COORD] },
  { label: 'Seguimiento de derivaciones', description: 'Casos de todos los servicios', to: '/derivaciones/seguimiento', Icon: ClockIcon, roles: [DBU] },
  { label: 'Usuarios y roles', description: 'Cuentas del sistema y permisos', to: '/users', Icon: SettingsIcon, roles: [DBU] },

  { label: 'Casos derivados', description: 'Bandeja de tu servicio: recibir, atender y cerrar', to: '/derivaciones', Icon: InboxIcon, roles: [SERVICE] },

  { label: 'Informe consolidado', description: 'Cifras por escuela y facultad', to: '/informes/consolidado', Icon: FileSpreadsheetIcon, roles: [VICE] },
  { label: 'Indicadores', description: 'Tablero de cobertura y riesgo', to: '/indicadores', Icon: PieChartIcon, roles: [VICE] },
];

export function quickActionsFor(role: string | undefined): QuickAction[] {
  if (!role) return [];
  return QUICK_ACTIONS.filter((a) => !a.roles || a.roles.includes(role));
}

/** Roles que consultan las alertas de inasistencia y riesgo (students:read y sessions:read en el servidor). */
export const ALERT_ROLES = [TUTOR, COORD, DBU];
