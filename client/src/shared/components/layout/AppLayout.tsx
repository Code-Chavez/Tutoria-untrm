import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { resolveMeta } from './navigation';
import { SECTIONS } from './sections';
import { PeriodStatusBanner } from '@features/periodo/components/PeriodStatusBanner';
import { SessionTimeout } from '@features/auth/components/SessionTimeout';
import styles from './AppLayout.module.css';

const COMPACT_MENU_KEY = 'sit.main-menu.compact';

export function AppLayout() {
  const { pathname, search } = useLocation();
  const meta = resolveMeta(pathname, new URLSearchParams(search).get('accion') ?? '');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compact, setCompact] = useState(() => {
    try { return localStorage.getItem(COMPACT_MENU_KEY) === 'true'; } catch { return false; }
  });

  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    try { localStorage.setItem(COMPACT_MENU_KEY, String(next)); } catch { /* La preferencia sigue activa durante esta sesión. */ }
  };

  const hasSectionSidebar = [...SECTIONS.periodo.tabs, ...SECTIONS.configuracion.tabs, ...SECTIONS.informes.tabs].some((tab) => tab.path === pathname);

  return (
    <div className={styles.app} data-sidebar-compact={compact}>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Sidebar compact={compact} onToggleCompact={toggleCompact} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className={styles.main}>
        <TopBar title={meta.title} group={meta.group} onMenu={() => setDrawerOpen(true)} />
        <div className={styles.scroll}>
          <main id="contenido" tabIndex={-1} className={`${styles.content} ${hasSectionSidebar ? styles.contentWide : ''}`}>
            <PeriodStatusBanner />
            <Outlet />
          </main>
        </div>
      </div>
      <SessionTimeout />
    </div>
  );
}
