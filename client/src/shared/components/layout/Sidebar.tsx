import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const navItems = [
  { label: 'Panel de inicio', path: '/', icon: '▚' },
];

export function Sidebar() {
  return (
    <aside className={styles.side}>
      <div className={styles.brand}>
        <b>SIT · UNTRM</b>
      </div>
      <nav className={styles.nav}>
        <span className={styles.group}>Principal</span>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.icon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
