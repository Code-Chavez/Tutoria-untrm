import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useBranding } from '@shared/theme/BrandingProvider';
import { CloseIcon } from '@shared/components/icons';
import { getRoleLabel } from '@shared/utils/roleLabel';
import { findActiveItem, NAV, ROLE_CODES, type NavItem } from './navigation';
import styles from './Sidebar.module.css';

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

  const canSee = (item: NavItem) =>
    !item.roles || (roleCode !== undefined && item.roles.includes(roleCode));

  // Una sola entrada activa: la más específica entre las visibles para este rol.
  const visibleItems = NAV.flatMap((group) => group.items.filter(canSee));
  const activeItem = findActiveItem(visibleItems, pathname, currentAction);
  const isActive = (item: NavItem) => item === activeItem;

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
