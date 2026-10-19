import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { resolveMeta } from './navigation';
import { PeriodStatusBanner } from '@features/periodo/components/PeriodStatusBanner';
import { SessionTimeout } from '@features/auth/components/SessionTimeout';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { pathname } = useLocation();
  const meta = resolveMeta(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={styles.app}>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className={styles.main}>
        <TopBar title={meta.title} group={meta.group} onMenu={() => setDrawerOpen(true)} />
        <div className={styles.scroll}>
          <main id="contenido" tabIndex={-1} className={styles.content}>
            <PeriodStatusBanner />
            <Outlet />
          </main>
        </div>
      </div>
      <SessionTimeout />
    </div>
  );
}
