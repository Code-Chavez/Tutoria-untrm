import { NavLink } from 'react-router-dom';
import { DashboardIcon, UsersIcon } from '@shared/components/icons';
import styles from './Sidebar.module.css';

const navItems = [
  { label: 'Panel de inicio', path: '/', Icon: DashboardIcon },
  { label: 'Gestión de Usuarios', path: '/users', Icon: UsersIcon },
];

export function Sidebar() {
  return (
    <aside className={styles.side}>
      <div className={styles.brand}>
        <b>SIT · UNTRM</b>
      </div>
      <nav className={styles.nav}>
        <span className={styles.group}>Principal</span>
        {navItems.map(({ label, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.icon}>
              <Icon size={18} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
