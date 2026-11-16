import { type ComponentType } from 'react';
import {
  UserPlusIcon, ClipboardIcon, ActivityIcon, FileTextIcon, ListChecksIcon, PaletteIcon, SlidersIcon, ShieldCheckIcon,
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
  UsersPlusIcon,
} from '@shared/components/icons';
import { ROLE_CODES } from '@shared/components/layout/navigation';
import { ROUTE_PERMISSIONS, hasAnyPermission } from '@shared/routePermissions';

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
  { group: 'Mi tutoría', label: 'Mis solicitudes', description: 'Consulta el estado, las respuestas y las citas', to: '/solicitar-tutoria?accion=historial', Icon: InboxIcon, roles: [STUDENT] },
  { group: 'Mi tutoría', label: 'Mis sesiones', description: 'Fecha, modalidad y lugar o enlace', to: '/mis-sesiones', Icon: CalendarIcon, roles: [STUDENT] },
  { group: 'Mi tutoría', label: 'Evaluar tutoría', description: 'Responde la evaluación de tu tutor', to: '/evaluar-tutoria', Icon: StarIcon, roles: [STUDENT] },

  { group: 'Atención a estudiantes', label: 'Ver estudiantes', description: 'Consultar y filtrar estudiantes', to: '/tutorados', Icon: GraduationCapIcon, roles: [TUTOR, COORD, DBU] },
  { group: 'Atención a estudiantes', label: 'Entrevista inicial', description: 'Elige un estudiante y registra su entrevista', to: '/tutorados?accion=entrevista', Icon: ClipboardIcon, roles: [TUTOR] },
  { group: 'Atención a estudiantes', label: 'Seguimiento', description: 'Registra avances y acuerdos de tutoría', to: '/tutorados?accion=seguimiento', Icon: ActivityIcon, roles: [TUTOR] },
  { group: 'Atención a estudiantes', label: 'Derivar caso', description: 'Canaliza el caso al servicio que corresponda', to: '/tutorados?accion=derivar', Icon: SendIcon, roles: [TUTOR] },
  { group: 'Atención a estudiantes', label: 'Registrar estudiante', description: 'Alta individual de un estudiante', to: '/tutorados?accion=nuevo', Icon: UserPlusIcon, roles: [COORD, DBU] },
  { group: 'Atención a estudiantes', label: 'Mi calendario', description: 'Sesiones programadas y asistencia', to: '/sesiones', Icon: CalendarIcon, roles: [TUTOR] },
  { group: 'Atención a estudiantes', label: 'Solicitudes de tutoría', description: 'Recibidas y por atender', to: '/solicitudes', Icon: MessageSquareIcon, roles: [TUTOR, COORD, DBU] },
  { group: 'Atención a estudiantes', label: 'Casos derivados', description: 'Consulta las derivaciones y su estado', to: '/derivaciones', Icon: InboxIcon, roles: [TUTOR, DBU] },
  { group: 'Atención a estudiantes', label: 'Casos derivados', description: 'Bandeja de tu servicio: recibir, atender y cerrar', to: '/derivaciones', Icon: InboxIcon, roles: [SERVICE] },
  { group: 'Atención a estudiantes', label: 'Seguimiento de derivaciones', description: 'Casos de todos los servicios', to: '/derivaciones/seguimiento', Icon: ClockIcon, roles: [DBU] },

  { group: 'Periodo académico', step: 1, label: 'Pedir listas', description: 'Solicita por correo las listas del periodo', to: '/pedir-listas', Icon: SendIcon, roles: [COORD, DBU] },
  { group: 'Periodo académico', step: 2, label: 'Carga de estudiantes', description: 'Importar los estudiantes del periodo desde Excel', to: '/carga-masiva', Icon: UploadIcon, roles: [COORD, DBU] },
  { group: 'Periodo académico', step: 3, label: 'Carga de docentes', description: 'Crear las cuentas de los docentes tutores desde Excel', to: '/carga-docentes', Icon: UsersPlusIcon, roles: [DBU] },
  { group: 'Periodo académico', step: 4, label: 'Asignación por ciclo', description: 'Elige al docente de cada ciclo: todos sus estudiantes pasan a él', to: '/asignacion', Icon: UserPlusIcon, roles: [COORD, DBU] },
  { group: 'Periodo académico', step: 5, label: 'Cierre de periodo', description: 'Cerrar el periodo y dejar la tutoría en solo lectura', to: '/cierre-periodo', Icon: RefreshIcon, roles: [DBU] },

  { group: 'Seguimiento del periodo', label: 'Pendientes', description: 'Encuentra las tareas que todavía requieren atención', to: '/pendientes', Icon: InboxIcon, roles: [COORD, DBU] },
  { group: 'Seguimiento del periodo', label: 'Docentes tutores', description: 'Consulta designaciones y el estado de sus certificados', to: '/docentes-tutores', Icon: UsersPlusIcon, roles: [DBU] },
  { group: 'Seguimiento del periodo', label: 'Certificados', description: 'Revisa evidencias y gestiona los trámites', to: '/certificados', Icon: FileTextIcon, roles: [DBU] },

  { group: 'Planificación y evaluación', label: 'Plan semestral', description: 'Plan de trabajo de tu escuela', to: '/plan-semestral', Icon: CalendarRangeIcon, roles: [COORD] },

  { group: 'Informes', label: 'Horarios y asistencia', description: 'Consulta la programación y la asistencia registrada', to: '/informes', Icon: CalendarRangeIcon, roles: [TUTOR, COORD, DBU] },
  { group: 'Informes', label: 'Informe semestral', description: 'Prepara y consulta tu informe de tutoría', to: '/informes/semestral', Icon: FileTextIcon, roles: [TUTOR] },
  { group: 'Informes', label: 'Resultados de evaluación', description: 'Consulta los resultados agregados de tutoría', to: '/evaluacion/resultados', Icon: ListChecksIcon, roles: [COORD, DBU] },
  { group: 'Informes', label: 'Sugerencias de estudiantes', description: 'Lee los comentarios de la evaluación', to: '/evaluacion/sugerencias', Icon: MessageSquareIcon, roles: [COORD, DBU] },
  { group: 'Informes', label: 'Informe consolidado', description: 'Cifras por escuela y facultad', to: '/informes/consolidado', Icon: FileSpreadsheetIcon, roles: [DBU, VICE] },
  { group: 'Informes', label: 'Indicadores', description: 'Tablero de cobertura y riesgo', to: '/indicadores', Icon: PieChartIcon, roles: [DBU, COORD, VICE] },

  { group: 'Facultad', label: 'Amonestaciones', description: 'Registrar y consultar las de los docentes de tu facultad', to: '/amonestaciones', Icon: AlertTriangleIcon, roles: [DEAN, COORD, DBU] },
  { group: 'Configuración', label: 'Sedes', description: 'Sedes de la universidad y sede de cada escuela', to: '/sedes', Icon: MapPinIcon, roles: [DBU, VICE] },

  { group: 'Configuración', label: 'Correos para pedidos de listas', description: 'Configura dónde se reciben los pedidos de listas', to: '/correos-escuelas', Icon: SendIcon, roles: [COORD, DBU] },
  { group: 'Configuración', label: 'Catálogos', description: 'Gestiona facultades, escuelas, periodos y otros catálogos', to: '/catalogos', Icon: ClipboardIcon, roles: [DBU] },
  { group: 'Configuración', label: 'Evaluación de tutoría', description: 'Gestiona cuándo puede responder cada escuela', to: '/evaluacion/configuracion', Icon: StarIcon, roles: [DBU] },
  { group: 'Configuración', label: 'Roles y permisos', description: 'Configura el acceso de cada rol', to: '/roles', Icon: ShieldCheckIcon, roles: [DBU] },
  { group: 'Configuración', label: 'Parámetros', description: 'Ajusta las reglas generales del sistema', to: '/parametros', Icon: SlidersIcon, roles: [DBU] },
  { group: 'Configuración', label: 'Identidad visual', description: 'Personaliza la presentación del sistema', to: '/identidad', Icon: PaletteIcon, roles: [DBU] },
  { group: 'Configuración', label: 'Bitácora de auditoría', description: 'Consulta las acciones registradas', to: '/auditoria', Icon: ActivityIcon, roles: [DBU] },
  { group: 'Configuración', label: 'Usuarios y roles', description: 'Cuentas del sistema y permisos', to: '/users', Icon: SettingsIcon, roles: [DBU] },
];

/** Los accesos de la persona, agrupados en el orden del menú. */
export function quickActionGroupsFor(role: string | undefined, permissions?: readonly string[]): { title: string; actions: QuickAction[] }[] {
  const groups = new Map<string, QuickAction[]>();
  for (const action of quickActionsFor(role, permissions)) groups.set(action.group, [...(groups.get(action.group) ?? []), action]);
  // El número de paso cuenta solo los pasos que la persona ve (la coordinación no ve la carga de docentes, que es de la DBU).
  return [...groups.entries()].map(([title, actions]) => ({ title, actions: actions.map((a, i) => (a.step ? { ...a, step: i + 1 } : a)) }));
}

/** Un rol personalizado no tiene código de rol: lo que ve el panel depende de los permisos que su rol concede. */
export const isCustomRole = (role: string | undefined): boolean => !!role && ROLE_CODES[role] === undefined;

/** Permiso que abre el destino de un acceso (el de su pantalla); sin permiso declarado, solo lo ven los roles base. */
function permissionsOfAction(action: QuickAction): readonly string[] | undefined {
  const actionPermissions: Record<string, string> = {
    '/tutorados?accion=nuevo': 'students:write',
    '/tutorados?accion=entrevista': 'interviews:write',
    '/tutorados?accion=seguimiento': 'followups:write',
    '/tutorados?accion=derivar': 'referrals:write',
  };
  const actionPermission = actionPermissions[action.to];
  if (actionPermission) return [actionPermission];
  return (ROUTE_PERMISSIONS as Record<string, readonly string[]>)[action.to.split('?')[0] ?? ''];
}

export function quickActionsFor(role: string | undefined, permissions: readonly string[] = []): QuickAction[] {
  if (!role) return [];
  if (!isCustomRole(role)) return QUICK_ACTIONS.filter((a) => !a.roles || a.roles.includes(role));
  // Un mismo destino lo ofrecen dos roles base con distinta descripción: a un rol personalizado se le muestra una sola vez.
  const seen = new Set<string>();
  return QUICK_ACTIONS.filter((a) => {
    if (!a.roles || !hasAnyPermission(permissions, permissionsOfAction(a))) return !a.roles;
    if (a.to.startsWith('/tutorados?accion=') && !permissions.includes('students:read')) return false;
    const key = `${a.label}|${a.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Roles base que consultan las alertas de inasistencia y riesgo (students:read y sessions:read en el servidor). */
export const ALERT_ROLES = [TUTOR, COORD, DBU];

/** Quién ve las alertas de riesgo: los roles base que las consultan, o un rol personalizado con ambos permisos. */
export const canSeeRiskAlerts = (role: string | undefined, permissions: readonly string[] = []): boolean =>
  !!role && (isCustomRole(role) ? permissions.includes('students:read') && permissions.includes('sessions:read') : ALERT_ROLES.includes(role));

/** Quién ve la actividad reciente (bitácora): la DBU, o un rol personalizado con `audit:read`. */
export const canSeeRecentActivity = (role: string | undefined, permissions: readonly string[] = []): boolean =>
  role === DBU || (isCustomRole(role) && permissions.includes('audit:read'));
