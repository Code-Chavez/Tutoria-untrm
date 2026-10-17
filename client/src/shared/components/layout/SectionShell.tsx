import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { ROLE_CODES } from './navigation';
import { SECTIONS, tabsFor, type SectionKey } from './sections';
import styles from './SectionShell.module.css';

/** Entrada de la sección: lleva a la primera pestaña que la persona puede usar. */
export function SectionHome({ section }: { section: SectionKey }) {
  const { user } = useAuth();
  const first = tabsFor(section, user ? ROLE_CODES[user.role] : undefined)[0];
  return <Navigate to={first?.path ?? '/'} replace />;
}

/** Barra de pestañas de una sección; debajo se muestra la pantalla de la pestaña elegida. */
export function SectionShell({ section }: { section: SectionKey }) {
  const { user } = useAuth();
  const tabs = tabsFor(section, user ? ROLE_CODES[user.role] : undefined);

  return (
    <div>
      {tabs.length > 1 && (
        <nav className={styles.tabs} aria-label={`Secciones de ${SECTIONS[section].title}`}>
          {tabs.map((tab) => (
            <NavLink key={tab.path} to={tab.path} end className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
      <Outlet />
    </div>
  );
}
