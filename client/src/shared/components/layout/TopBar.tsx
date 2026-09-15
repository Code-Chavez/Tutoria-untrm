import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { BellIcon, MenuIcon, ChevronRightIcon, LogOutIcon } from '@shared/components/icons';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
  group?: string;
  onMenu: () => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function TopBar({ title, group, onMenu }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className={styles.top}>
      <div className={styles.left}>
        <button className={styles.menuBtn} type="button" onClick={onMenu} aria-label="Abrir menú">
          <MenuIcon size={20} />
        </button>
        <div className={styles.crumbs}>
          <nav className={styles.breadcrumb} aria-label="Ruta">
            <span className={styles.crumbRoot}>SIT</span>
            {group && (
              <>
                <ChevronRightIcon size={13} />
                <span>{group}</span>
              </>
            )}
          </nav>
          <h1 className={styles.section}>{title}</h1>
        </div>
      </div>

      <div className={styles.right}>
        <button className={styles.bell} type="button" aria-label="Notificaciones">
          <BellIcon size={19} />
          <span className={styles.bellDot} aria-hidden="true" />
        </button>
        {user && (
          <Link className={styles.who} to="/profile" title="Ver mi perfil">
            <div className={styles.avatar}>{getInitials(user.firstName, user.lastName)}</div>
            <div className={styles.whoText}>
              <b>
                {user.firstName} {user.lastName}
              </b>
              <small>{user.role}</small>
            </div>
          </Link>
        )}
        <button type="button" className={styles.logout} onClick={handleLogout} aria-label="Cerrar sesión">
          <LogOutIcon size={17} />
          <span className={styles.logoutText}>Salir</span>
        </button>
      </div>
    </header>
  );
}
