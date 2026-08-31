import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SessionTimeout } from '@features/auth/components/SessionTimeout';
import styles from './AppLayout.module.css';

// Título mostrado en el breadcrumb del TopBar según la ruta activa.
const PAGE_TITLES: Record<string, string> = {
  '/': 'Panel de inicio',
  '/users': 'Administración',
  '/profile': 'Mi perfil',
  '/unauthorized': 'Acceso denegado',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'Panel de inicio';

  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.main}>
        <TopBar title={title} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
      <SessionTimeout />
    </div>
  );
}
