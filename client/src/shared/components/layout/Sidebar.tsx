import { type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useBranding } from '@shared/theme/BrandingProvider';
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
  SettingsIcon,
  CloseIcon,
} from '@shared/components/icons';
import { getRoleLabel } from '@shared/utils/roleLabel';
import styles from './Sidebar.module.css';

type RoleCode = 'tutor' | 'coord' | 'dbu' | 'serv' | 'est' | 'vice';

// El JWT trae el nombre del rol; lo traducimos al código con que se filtra el menú.
const ROLE_CODES: Record<string, RoleCode> = {
  'Administrador DBU': 'dbu',
  Coordinador: 'coord',
  'Docente Tutor': 'tutor',
  Tutorado: 'est',
  'Profesional de Servicio': 'serv',
  Vicerrectorado: 'vice',
};

interface NavItem {
  label: string;
  Icon: ComponentType<{ size?: number }>;
  path: string;
  /** Acción que abre la lista de tutorados en modo «elegir estudiante» (?accion=…). */
  action?: string;
  roles?: RoleCode[]; // sin roles = visible para todos
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Estructura tomada del mockup (grupos Principal y Gestión) con su visibilidad por rol.
const NAV: NavGroup[] = [
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
      { label: 'Casos derivados', Icon: InboxIcon, path: '/derivaciones', roles: ['tutor', 'serv', 'dbu'] },
      { label: 'Seguimiento DBU', Icon: ReportIcon, path: '/derivaciones/seguimiento', roles: ['dbu'] },
      { label: 'Evaluar tutoría', Icon: StarIcon, path: '/evaluar-tutoria', roles: ['est'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Plan semestral', Icon: CalendarRangeIcon, path: '/plan-semestral', roles: ['coord', 'dbu'] },
      { label: 'Informes', Icon: ReportIcon, path: '/informes', roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Informe semestral', Icon: ReportIcon, path: '/informes/semestral', roles: ['tutor'] },
      { label: 'Informe consolidado', Icon: ReportIcon, path: '/informes/consolidado', roles: ['dbu', 'vice'] },
      { label: 'Indicadores', Icon: PieChartIcon, path: '/indicadores', roles: ['dbu', 'coord', 'vice'] },
      { label: 'Administración', Icon: SettingsIcon, path: '/users', roles: ['dbu'] },
      { label: 'Catálogos', Icon: SettingsIcon, path: '/catalogos', roles: ['dbu'] },
      { label: 'Parámetros', Icon: SettingsIcon, path: '/parametros', roles: ['dbu'] },
      { label: 'Identidad visual', Icon: SettingsIcon, path: '/identidad', roles: ['dbu'] },
      { label: 'Evaluación de tutoría', Icon: SettingsIcon, path: '/evaluacion/configuracion', roles: ['dbu'] },
      { label: 'Resultados de evaluación', Icon: PieChartIcon, path: '/evaluacion/resultados', roles: ['dbu', 'coord'] },
      { label: 'Sugerencias de estudiantes', Icon: StarIcon, path: '/evaluacion/sugerencias', roles: ['dbu', 'coord'] },
    ],
  },
];

interface SidebarProps {
  drawerOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ drawerOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { branding, logoSrc } = useBranding();
  const roleCode = user ? ROLE_CODES[user.role] : undefined;

  const { pathname, search } = useLocation();
  const currentAction = new URLSearchParams(search).get('accion') ?? '';

  // Varios accesos comparten /tutorados: se distinguen por la acción de la URL.
  const isActive = (item: NavItem) => {
    const onPath = item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`);
    return onPath && (item.action === undefined || item.action === currentAction);
  };

  const canSee = (item: NavItem) =>
    !item.roles || (roleCode !== undefined && item.roles.includes(roleCode));

  return (
    <>
      <div
        className={`${styles.backdrop} ${drawerOpen ? styles.backdropOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`${styles.side} ${drawerOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <img src={logoSrc} alt="" className={styles.logo} />
          <div className={styles.brandText}>
            <b>{branding.shortName}</b>
            <small>Bienestar Universitario</small>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar menú">
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Navegación principal">
          {NAV.map((group) => {
            const visible = group.items.filter(canSee);
            if (visible.length === 0) return null;

            return (
              <div key={group.title} className={styles.navGroup}>
                <span className={styles.group}>{group.title}</span>
                {visible.map((item) => (
                  <Link
                    key={item.label}
                    to={item.action ? `${item.path}?accion=${item.action}` : item.path}
                    onClick={onClose}
                    className={`${styles.link} ${isActive(item) ? styles.active : ''}`}
                    aria-current={isActive(item) ? 'page' : undefined}
                  >
                    <span className={styles.icon}>
                      <item.Icon size={19} />
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        {user && (
          <div className={styles.foot}>
            <div className={styles.footAvatar}>
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </div>
            <div className={styles.footText}>
              <b>
                {user.firstName} {user.lastName}
              </b>
              <small>{getRoleLabel(user.role, user.service)}</small>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
