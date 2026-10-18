import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';
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
  const { pathname } = useLocation();
  const tabs = tabsFor(section, user ? ROLE_CODES[user.role] : undefined);
  const navRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState({ left: false, right: false });

  // En pantallas estrechas las pestañas no caben: la activa se lleva a la vista y se avisa si quedan pestañas fuera (U05).
  const measure = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setHidden({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.querySelector('[aria-current="page"]')?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pathname, tabs.length, measure]);

  const scrollTabs = (direction: -1 | 1) => navRef.current?.scrollBy?.({ left: direction * 160, behavior: 'smooth' });

  return (
    // data-*: la sección siempre deja constancia de qué pestañas tiene la persona (con una sola no se pinta la barra)
    <div data-section={SECTIONS[section].title} data-tabs={tabs.map((tab) => tab.label).join('|')}>
      {tabs.length > 1 && (
        <div className={styles.tabsWrap}>
          {hidden.left && (
            <button type="button" className={`${styles.more} ${styles.moreLeft}`} aria-label="Ver pestañas anteriores" onClick={() => scrollTabs(-1)}>
              <ChevronLeftIcon size={16} />
            </button>
          )}
          <nav ref={navRef} className={styles.tabs} aria-label={`Secciones de ${SECTIONS[section].title}`} onScroll={measure}>
            {tabs.map((tab) => (
              <NavLink key={tab.path} to={tab.path} end className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
                {tab.label}
              </NavLink>
            ))}
          </nav>
          {hidden.right && (
            <button type="button" className={`${styles.more} ${styles.moreRight}`} aria-label="Ver más pestañas" onClick={() => scrollTabs(1)}>
              <ChevronRightIcon size={16} />
            </button>
          )}
        </div>
      )}
      <Outlet />
    </div>
  );
}
