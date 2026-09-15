import { type ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import logoUntrm from '@assets/logo-untrm.png';
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
  path?: string; // con path = página existente; sin path = aún no construida
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
      { label: 'Tutorados', Icon: GraduationCapIcon, path: '/tutorados', roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Asignación', Icon: SwitchIcon, roles: ['coord', 'dbu'] },
      { label: 'Carga masiva', Icon: UploadIcon, path: '/carga-masiva', roles: ['coord', 'dbu'] },
      { label: 'Entrevista inicial', Icon: ClipboardIcon, roles: ['tutor'] },
      { label: 'Expediente', Icon: FolderIcon, roles: ['tutor', 'coord', 'dbu'] },
      { label: 'Sesiones', Icon: CalendarIcon, roles: ['tutor', 'est'] },
      { label: 'Seguimiento', Icon: ActivityIcon, roles: ['tutor'] },
      { label: 'Derivar caso', Icon: SendIcon, roles: ['tutor'] },
      { label: 'Casos derivados', Icon: InboxIcon, roles: ['serv', 'dbu'] },
      { label: 'Evaluar tutoría', Icon: StarIcon, roles: ['est'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Plan semestral', Icon: CalendarRangeIcon, roles: ['coord', 'dbu'] },
      { label: 'Informes', Icon: ReportIcon, roles: ['tutor', 'coord', 'dbu', 'vice'] },
      { label: 'Indicadores', Icon: PieChartIcon, roles: ['dbu', 'coord', 'vice'] },
      { label: 'Administración', Icon: SettingsIcon, path: '/users', roles: ['dbu'] },
    ],
  },
];

interface SidebarProps {
  drawerOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ drawerOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const roleCode = user ? ROLE_CODES[user.role] : undefined;

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
          <img src={logoUntrm} alt="" className={styles.logo} />
          <div className={styles.brandText}>
            <b>SIT · UNTRM</b>
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
                {visible.map((item) =>
                  item.path ? (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                    >
                      <span className={styles.icon}>
                        <item.Icon size={19} />
                      </span>
                      {item.label}
                    </NavLink>
                  ) : (
                    <span
                      key={item.label}
                      className={`${styles.link} ${styles.disabled}`}
                      aria-disabled="true"
                      title="Disponible próximamente"
                    >
                      <span className={styles.icon}>
                        <item.Icon size={19} />
                      </span>
                      {item.label}
                      <span className={styles.soon}>Próx.</span>
                    </span>
                  ),
                )}
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
              <small>{user.role}</small>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
