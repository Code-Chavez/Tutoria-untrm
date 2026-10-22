import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, SendIcon, UploadIcon, UsersPlusIcon, UserPlusIcon, CalendarIcon, InboxIcon, FolderIcon, ClipboardIcon, UsersIcon, SlidersIcon, PaletteIcon, ActivityIcon } from '../icons';
import { useAuth } from '@features/auth/hooks/useAuth';
import { ROLE_CODES } from './navigation';
import { SECTIONS, tabsFor, type SectionKey } from './sections';
import styles from './SectionShell.module.css';

const PERIOD_HELP: Record<string, { purpose: string; check: string }> = {
  '/pedir-listas': { purpose: 'Solicita a las escuelas las listas que necesitas para organizar la tutoría.', check: 'Revisa el correo de destino, los ciclos y el periodo antes de enviar el pedido.' },
  '/carga-masiva': { purpose: 'Registra estudiantes desde la plantilla de Excel y revisa el resultado de la carga.', check: 'Descarga la plantilla, completa los datos y corrige las filas que el resultado señale con errores.' },
  '/carga-docentes': { purpose: 'Registra las cuentas de docentes tutores desde una plantilla de Excel.', check: 'Comprueba la escuela y el correo de cada docente. La carga envía un enlace para crear su contraseña.' },
  '/asignacion': { purpose: 'Elige al docente que atenderá cada ciclo de una escuela.', check: 'Revisa su carga, guarda la asignación y comprueba su respuesta. Asignar y aceptar son pasos distintos.' },
  '/cierre-periodo': { purpose: 'Revisa el resumen del periodo y los informes antes de ejecutar su cierre.', check: 'Lee las consecuencias y comprueba los pendientes antes de confirmar. Este paso cambia el estado del periodo.' },
  '/pendientes': { purpose: 'Encuentra los casos que todavía requieren atención y abre la pantalla donde se resuelven.', check: 'Esta bandeja se consulta durante todo el periodo; no es un paso que debas dejar para el final.' },
};

const PERIOD_NAV = {
  '/pedir-listas': { icon: SendIcon, description: 'Solicitar las listas a las escuelas' },
  '/carga-masiva': { icon: UploadIcon, description: 'Importar estudiantes desde Excel' },
  '/carga-docentes': { icon: UsersPlusIcon, description: 'Registrar docentes tutores' },
  '/asignacion': { icon: UserPlusIcon, description: 'Elegir un tutor para cada ciclo' },
  '/pendientes': { icon: InboxIcon, description: 'Revisar lo que falta resolver' },
  '/cierre-periodo': { icon: CalendarIcon, description: 'Revisar y finalizar el periodo' },
};

const SETTINGS_NAV = {
  '/correos-escuelas': { icon: SendIcon, description: 'Configurar destinatarios para pedir listas' },
  '/sedes': { icon: FolderIcon, description: 'Administrar las sedes de la universidad' },
  '/evaluacion/configuracion': { icon: CalendarIcon, description: 'Abrir o cerrar la evaluación por escuela' },
  '/catalogos': { icon: ClipboardIcon, description: 'Configurar facultades, escuelas y periodos' },
  '/users': { icon: UsersIcon, description: 'Gestionar cuentas, roles y accesos' },
  '/parametros': { icon: SlidersIcon, description: 'Ajustar las reglas generales del sistema' },
  '/identidad': { icon: PaletteIcon, description: 'Personalizar la identidad visual' },
  '/auditoria': { icon: ActivityIcon, description: 'Consultar las acciones registradas' },
};

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
  const navigate = useNavigate();
  const tabs = tabsFor(section, user ? ROLE_CODES[user.role] : undefined);
  const periodSteps = tabs.filter((tab) => tab.path !== '/pendientes');
  const stepIndex = periodSteps.findIndex((tab) => tab.path === pathname);
  const help = section === 'periodo' ? PERIOD_HELP[pathname] : undefined;
  const navRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState({ left: false, right: false });
  const [dismissedHint, setDismissedHint] = useState<string | null>(null);

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

  if (section === 'periodo' || (section === 'configuracion' && tabs.length > 1)) {
    const organization = tabs.filter((tab) => tab.path !== '/pendientes' && tab.path !== '/cierre-periodo');
    const followUp = ['/pendientes', '/cierre-periodo'].flatMap((path) => tabs.filter((tab) => tab.path === path));
    const groups = section === 'periodo'
      ? [{ label: 'Organización', items: organization }, { label: 'Seguimiento y cierre', items: followUp }]
      : [{ label: 'Organización', items: tabs.filter((tab) => ['/correos-escuelas', '/sedes', '/catalogos', '/evaluacion/configuracion'].includes(tab.path)) },
         { label: 'Sistema y acceso', items: tabs.filter((tab) => ['/users', '/parametros', '/identidad', '/auditoria'].includes(tab.path)) }];
    const selectorId = section === 'periodo' ? 'period-task' : 'settings-task';
    return <div className={section === 'configuracion' ? styles.period + ' ' + styles.settings : styles.period} data-section={SECTIONS[section].title} data-tabs={tabs.map((tab) => tab.label).join('|')}>
      <div className={styles.mobilePeriodNav}>
        <label htmlFor={selectorId}>{section === 'periodo' ? 'Tarea del periodo' : 'Sección de configuración'}</label>
        <select id={selectorId} value={pathname} onChange={(event) => navigate(event.target.value)}>
          {groups.filter((group) => group.items.length > 0).map((group) => <optgroup key={group.label} label={group.label}>{group.items.map((tab) => <option key={tab.path} value={tab.path}>{tab.label}</option>)}</optgroup>)}
        </select>
      </div>
      <nav className={styles.periodSidebar} aria-label={`Secciones de ${SECTIONS[section].title}`}>
        <p className={styles.navEyebrow}>{SECTIONS[section].title.toLocaleUpperCase('es')}</p>
        {groups.filter((group) => group.items.length > 0).map((group) => <details key={group.label} className={styles.periodNavGroup} open>
          <summary className={styles.navGroupLabel}>{group.label}<ChevronDownIcon size={15} /></summary>
          {group.items.map((tab) => {
            const meta = section === 'periodo' ? PERIOD_NAV[tab.path as keyof typeof PERIOD_NAV] : SETTINGS_NAV[tab.path as keyof typeof SETTINGS_NAV];
            const Icon = meta.icon;
            const descriptionId = `section-help-${tab.path.slice(1).replaceAll('/', '-')}`;
            return <NavLink key={tab.path} to={tab.path} end aria-label={tab.label} aria-describedby={descriptionId} data-hint-hidden={dismissedHint === tab.path || undefined} onMouseEnter={() => setDismissedHint(null)} onFocus={() => setDismissedHint(null)} onKeyDown={(event) => { if (event.key === 'Escape') setDismissedHint(tab.path); }} className={({ isActive }) => `${styles.periodNavItem} ${isActive ? styles.periodNavActive : ''}`}>
              <span className={styles.periodNavIcon}><Icon size={19} /></span>
              <span className={styles.periodNavTitle}>{tab.label}</span>
              <span id={descriptionId} role="tooltip" className={styles.periodNavDescription}>{meta.description}</span>
            </NavLink>;
          })}
        </details>)}
      </nav>
      <div className={styles.periodContent}>
      {help && <aside className={styles.periodGuide} aria-label="Guía del periodo académico">
        <div className={styles.guideTop}><span className={styles.stepLabel}>{stepIndex >= 0 ? `Paso ${stepIndex + 1} de ${periodSteps.length} del flujo sugerido` : 'Seguimiento durante todo el periodo'}</span>
          <div className={styles.stepActions}>
            {stepIndex > 0 && <button type="button" onClick={() => navigate(periodSteps[stepIndex - 1].path)}>Anterior: {periodSteps[stepIndex - 1].label}</button>}
            {stepIndex >= 0 && stepIndex < periodSteps.length - 1 && <button type="button" onClick={() => navigate(periodSteps[stepIndex + 1].path)}>Siguiente: {periodSteps[stepIndex + 1].label}</button>}
          </div>
        </div>

        <details className={styles.periodHelp}><summary>¿Qué debo revisar aquí?</summary><p>{help.purpose}</p><p>{help.check}</p><p>El menú permite ir directamente a otra tarea. El número de paso indica el orden sugerido; no significa que las tareas anteriores estén completadas.</p></details>
      </aside>}

        <Outlet />
      </div>
    </div>;
  }

  return (
    // data-*: la sección siempre deja constancia de qué pestañas tiene la persona (con una sola no se pinta la barra)
    <div className={section === 'configuracion' ? styles.settings : undefined} data-section={SECTIONS[section].title} data-tabs={tabs.map((tab) => tab.label).join('|')}>
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
