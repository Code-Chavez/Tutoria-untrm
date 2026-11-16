import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, SendIcon, UploadIcon, UsersPlusIcon, UserPlusIcon, CalendarIcon, ReportIcon, BarChartIcon, ListChecksIcon, MessageSquareIcon, InboxIcon, FolderIcon, ClipboardIcon, FileTextIcon, UsersIcon, SlidersIcon, PaletteIcon, ActivityIcon } from '../icons';
import { CatalogNavigation } from '@features/catalogos/components/CatalogNavigation';
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
  '/docentes-tutores': { purpose: 'Consulta qué docentes tienen designación en el periodo, si la aceptaron y cómo va su certificado.', check: 'Distingue al docente sin asignación del que tiene la aceptación pendiente. Desde aquí se abre o se inicia su trámite de certificado.' },
  '/certificados': { purpose: 'Inicia, revisa y aprueba el certificado de cada docente tutor y genera su PDF de demostración.', check: 'Revisa cada evidencia antes de marcarla conforme: lo que el sistema muestra es solo información. Todo certificado es de demostración y no tiene valor.' },
  '/pendientes': { purpose: 'Encuentra los casos que todavía requieren atención y abre la pantalla donde se resuelven.', check: 'Esta bandeja se consulta durante todo el periodo; no es un paso que debas dejar para el final.' },
};

const PERIOD_NAV = {
  '/pedir-listas': { icon: SendIcon, description: 'Solicitar las listas a las escuelas' },
  '/carga-masiva': { icon: UploadIcon, description: 'Importar estudiantes desde Excel' },
  '/carga-docentes': { icon: UsersPlusIcon, description: 'Registrar docentes tutores' },
  '/asignacion': { icon: UserPlusIcon, description: 'Elegir un tutor para cada ciclo' },
  '/pendientes': { icon: InboxIcon, description: 'Revisar lo que falta resolver' },
  '/docentes-tutores': { icon: UsersIcon, description: 'Ver docentes, designación y certificado' },
  '/certificados': { icon: FileTextIcon, description: 'Certificados de los docentes tutores' },
  '/cierre-periodo': { icon: CalendarIcon, description: 'Revisar y finalizar el periodo' },
};

const REPORTS_NAV = {
  '/informes': { icon: CalendarIcon, description: 'Consultar horarios y asistencia de tutoría' },
  '/informes/semestral': { icon: FileTextIcon, description: 'Preparar el informe del semestre' },
  '/informes/consolidado': { icon: ReportIcon, description: 'Consultar el consolidado institucional' },
  '/indicadores': { icon: BarChartIcon, description: 'Revisar los indicadores de tutoría' },
  '/evaluacion/resultados': { icon: ListChecksIcon, description: 'Consultar los resultados de la evaluación' },
  '/evaluacion/sugerencias': { icon: MessageSquareIcon, description: 'Leer las sugerencias de estudiantes' },
};

const SETTINGS_NAV = {
  '/correos-escuelas': { icon: SendIcon, description: 'Configurar destinatarios para pedir listas' },
  '/sedes': { icon: FolderIcon, description: 'Administrar las sedes de la universidad' },
  '/evaluacion/configuracion': { icon: CalendarIcon, description: 'Abrir o cerrar la evaluación por escuela' },
  '/catalogos': { icon: ClipboardIcon, description: 'Configurar facultades, escuelas y periodos' },
  '/users': { icon: UsersIcon, description: 'Gestionar cuentas, roles y accesos' },
  '/roles': { icon: UsersIcon, description: 'Crear roles y elegir sus permisos' },
  '/parametros': { icon: SlidersIcon, description: 'Ajustar las reglas generales del sistema' },
  '/identidad': { icon: PaletteIcon, description: 'Personalizar la identidad visual' },
  '/auditoria': { icon: ActivityIcon, description: 'Consultar las acciones registradas' },
};

/** Entrada de la sección: lleva a la primera pestaña que la persona puede usar. */
export function SectionHome({ section }: { section: SectionKey }) {
  const { user } = useAuth();
  const first = tabsFor(section, user ? ROLE_CODES[user.role] : undefined, user?.permissions)[0];
  return <Navigate to={first?.path ?? '/'} replace />;
}

/** Navegación interna de una sección y contenido de la opción elegida. */
export function SectionShell({ section }: { section: SectionKey }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tabs = tabsFor(section, user ? ROLE_CODES[user.role] : undefined, user?.permissions);
  const periodSteps = tabs.filter((tab) => tab.path !== '/pendientes');
  const stepIndex = periodSteps.findIndex((tab) => tab.path === pathname);
  const help = section === 'periodo' ? PERIOD_HELP[pathname] : undefined;
  const [catalogOpen, setCatalogOpen] = useState<boolean | null>(null);
  const groupCampuses = section === 'configuracion' && tabs.some((tab) => tab.path === '/catalogos') && tabs.some((tab) => tab.path === '/sedes');
  const showCatalogs = catalogOpen ?? (pathname === '/catalogos' || (groupCampuses && pathname === '/sedes'));
  const [dismissedHint, setDismissedHint] = useState<string | null>(null);

  if (section === 'periodo' || tabs.length > 1) {
    const organization = tabs.filter((tab) => !['/pendientes', '/certificados', '/cierre-periodo'].includes(tab.path));
    const followUp = ['/pendientes', '/certificados', '/cierre-periodo'].flatMap((path) => tabs.filter((tab) => tab.path === path));
    const groups = section === 'periodo'
      ? [{ label: 'Organización', items: organization }, { label: 'Seguimiento y cierre', items: followUp }]
      : section === 'informes'
        ? [{ label: 'Informes', items: tabs }]
        : [{ label: 'Organización', items: tabs.filter((tab) => ['/correos-escuelas', '/sedes', '/catalogos', '/evaluacion/configuracion'].includes(tab.path)) },
         { label: 'Sistema y acceso', items: tabs.filter((tab) => ['/users', '/roles', '/parametros', '/identidad', '/auditoria'].includes(tab.path)) }];
    const selectorId = { periodo: 'period-task', configuracion: 'settings-task', informes: 'report-task' }[section];
    const selectorLabel = { periodo: 'Tarea del periodo', configuracion: 'Sección de configuración', informes: 'Tipo de informe' }[section];
    const navItems = { periodo: PERIOD_NAV, configuracion: SETTINGS_NAV, informes: REPORTS_NAV }[section] as Record<string, { icon: typeof CalendarIcon; description: string }>;
    return <div className={section === 'configuracion' ? styles.period + ' ' + styles.settings : styles.period} data-section={SECTIONS[section].title} data-tabs={tabs.map((tab) => tab.label).join('|')}>
      <div className={styles.mobilePeriodNav}>
        <label htmlFor={selectorId}>{selectorLabel}</label>
        <select id={selectorId} value={pathname} onChange={(event) => navigate(event.target.value)}>
          {groups.filter((group) => group.items.length > 0).map((group) => <optgroup key={group.label} label={group.label}>{group.items.map((tab) => <option key={tab.path} value={tab.path}>{tab.label}</option>)}</optgroup>)}
        </select>
      </div>
      <nav className={styles.periodSidebar} aria-label={`Secciones de ${SECTIONS[section].title}`}>
        <p className={styles.navEyebrow}>{SECTIONS[section].title.toLocaleUpperCase('es')}</p>
        {groups.filter((group) => group.items.length > 0).map((group) => <details key={group.label} className={styles.periodNavGroup} open>
          <summary className={styles.navGroupLabel} hidden={section === 'informes'}>{group.label}<ChevronDownIcon size={15} /></summary>
          {group.items.filter((tab) => !groupCampuses || tab.path !== '/sedes').map((tab) => {
            const meta = navItems[tab.path];
            const Icon = meta.icon;
            const descriptionId = `section-help-${tab.path.slice(1).replaceAll('/', '-')}`;
            const link = <NavLink key={tab.path} to={tab.path} end aria-describedby={descriptionId} data-hint-hidden={dismissedHint === tab.path || undefined} onMouseEnter={() => setDismissedHint(null)} onFocus={() => setDismissedHint(null)} onKeyDown={(event) => { if (event.key === 'Escape') setDismissedHint(tab.path); }} className={({ isActive }) => `${styles.periodNavItem} ${isActive ? styles.periodNavActive : ''}`}>
              <span className={styles.periodNavIcon}><Icon size={19} /></span>
              <span className={styles.periodNavTitle}>{tab.label}</span>
              <span id={descriptionId} role="tooltip" className={styles.periodNavDescription}>{meta.description}</span>
            </NavLink>;
            if (tab.path !== '/catalogos') return link;

            return <div key={tab.path}>
              <div className={styles.catalogRow}>
                {link}
                <button
                  type="button"
                  className={styles.catalogToggle}
                  aria-label="Categorías de Catálogos"
                  aria-expanded={showCatalogs}
                  aria-controls="catalog-sidebar-options"
                  onClick={() => setCatalogOpen(!showCatalogs)}
                >
                  <ChevronDownIcon size={16} />
                </button>
              </div>
              <div id="catalog-sidebar-options" hidden={!showCatalogs}>
                <CatalogNavigation showCampuses={groupCampuses} onSelect={() => setCatalogOpen(true)} />
              </div>
            </div>;;
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
    <div className={section === 'configuracion' ? styles.settings : undefined} data-section={SECTIONS[section].title} data-tabs={tabs.map((tab) => tab.label).join('|')}>
      <Outlet />
    </div>
  );
}
