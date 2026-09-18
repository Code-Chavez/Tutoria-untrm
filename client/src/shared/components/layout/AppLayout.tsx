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
  '/expediente': { title: 'Expediente', group: 'Principal' },
  '/users': { title: 'Administración', group: 'Gestión' },
  '/profile': { title: 'Mi perfil', group: 'Cuenta' },
  '/unauthorized': { title: 'Acceso denegado', group: '' },
};

// Rutas con parámetro (p. ej. /expediente/:id) comparten el título de su base.
function resolveMeta(pathname: string) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  const base = '/' + pathname.split('/')[1];
  return ROUTE_META[base] ?? { title: 'Panel de inicio', group: 'Principal' };
}

export function AppLayout() {
  const { pathname } = useLocation();
  const meta = resolveMeta(pathname);
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
