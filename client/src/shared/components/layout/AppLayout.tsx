import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SessionTimeout } from '@features/auth/components/SessionTimeout';
import styles from './AppLayout.module.css';

// Metadatos de ruta para el breadcrumb y el título de sección del TopBar.
const ROUTE_META: Record<string, { title: string; group: string }> = {
  '/': { title: 'Panel de inicio', group: 'Principal' },
  '/tutorados': { title: 'Tutorados', group: 'Principal' },
  '/carga-masiva': { title: 'Carga masiva', group: 'Principal' },
  '/asignacion': { title: 'Asignación', group: 'Principal' },
  '/users': { title: 'Administración', group: 'Gestión' },
  '/profile': { title: 'Mi perfil', group: 'Cuenta' },
  '/unauthorized': { title: 'Acceso denegado', group: '' },
};

export function AppLayout() {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname] ?? { title: 'Panel de inicio', group: 'Principal' };
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={styles.app}>
      <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className={styles.main}>
        <TopBar title={meta.title} group={meta.group} onMenu={() => setDrawerOpen(true)} />
        <div className={styles.scroll}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </div>
      </div>
      <SessionTimeout />
    </div>
  );
}
