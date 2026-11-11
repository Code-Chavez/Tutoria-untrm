import { useAuth } from '@features/auth/hooks/useAuth';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StatCard, Card, CardHeader, CardBody } from '@shared/components/ui';
import {
  GraduationCapIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ActivityIcon,
  SendIcon,
  StarIcon,
  UsersIcon,
  InboxIcon,
} from '@shared/components/icons';
import { useHomePanel } from '../hooks/useHomePanel';
import type { HomeKpi } from '../services/homePanelService';
import { QuickActions } from './QuickActions';
import { canSeeRecentActivity, canSeeRiskAlerts, quickActionsFor } from './homeAccess';
import { getRoleLabel } from '@shared/utils/roleLabel';
import { RecentActivity } from './RecentActivity';
import { RiskAlerts } from './RiskAlerts';
import styles from './DashboardPage.module.css';

// Icono de cada indicador del panel; los que no figuran usan uno genérico.
const KPI_ICON: Record<string, ReactNode> = {
  'my-students': <GraduationCapIcon size={22} />,
  students: <GraduationCapIcon size={22} />,
  'upcoming-sessions': <CalendarIcon size={22} />,
  'next-session': <CalendarIcon size={22} />,
  coverage: <ActivityIcon size={22} />,
  alerts: <AlertTriangleIcon size={22} />,
  risk: <AlertTriangleIcon size={22} />,
  'open-referrals': <SendIcon size={22} />,
  referrals: <SendIcon size={22} />,
  'to-receive': <InboxIcon size={22} />,
  'in-care': <ActivityIcon size={22} />,
  attended: <CheckCircleIcon size={22} />,
  closed: <CheckCircleIcon size={22} />,
  evaluation: <StarIcon size={22} />,
  'my-requests': <InboxIcon size={22} />,
  'my-tutor': <UsersIcon size={22} />,
};

const ROLE_INTRO: Record<string, string> = {
  Tutorado: 'Encuentra apoyo, revisa tus citas y sigue las respuestas a tus solicitudes.',
  'Docente Tutor': 'Organiza tus sesiones, atiende solicitudes y da seguimiento a tus estudiantes.',
  Coordinador: 'Organiza la tutoría de tu escuela y revisa las tareas pendientes del periodo.',
  'Administrador DBU': 'Supervisa la tutoría, gestiona el periodo y administra los accesos del sistema.',
  'Profesional de Servicio': 'Consulta los casos derivados a tu servicio y registra su atención.',
  Vicerrectorado: 'Consulta los informes y revisa la cobertura de la tutoría.',
  Decano: 'Consulta y registra las amonestaciones de tu facultad.',
};

function KpiCard({ kpi }: { kpi: HomeKpi }) {
  const card = (
    <StatCard
      icon={KPI_ICON[kpi.key] ?? <CheckCircleIcon size={22} />}
      value={kpi.value}
      label={kpi.label}
      hint={kpi.hint}
      tone={kpi.tone}
    />
  );
  return kpi.link ? (
    <Link to={kpi.link} className={styles.kpiLink} aria-label={`${kpi.label}: ${kpi.value}`}>
      {card}
    </Link>
  ) : (
    card
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { panel, loading, error } = useHomePanel();

  const firstName = user?.firstName ?? '';
  const student = user?.role === 'Tutorado';
  const tutor = user?.role === 'Docente Tutor';
  const role = user?.role ?? '';
  const kpis = panel?.kpis ?? [];
  const visibleKpis = student
    ? [...kpis.filter((kpi) => kpi.key === 'next-session'), ...kpis.filter((kpi) => kpi.key !== 'next-session')]
    : kpis;
  // Solo se muestra lo que la persona puede usar: sin tarjetas vacías ni «sin acceso» (R02).
  const hasQuickActions = quickActionsFor(user?.role, user?.permissions).length > 0;
  const canSeeAlerts = canSeeRiskAlerts(user?.role, user?.permissions);
  const canSeeActivity = canSeeRecentActivity(user?.role, user?.permissions);

  return (
    <div>
      <div className={styles.hero} data-personal={student || tutor}>
        <div>
          {(student || tutor) && <span className={styles.eyebrow}>{student ? 'Mi espacio de tutoría' : 'Mi espacio docente'}</span>}
          <h1 className={styles.welcome}>
            Bienvenido{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className={styles.sub}>
            {ROLE_INTRO[role] ?? 'Consulta la información y las tareas que tienes disponibles.'}
          </p>
          {panel?.periodName && <p className={styles.period}>Periodo académico {panel.periodName}</p>}
        </div>
        {user && <span className={styles.roleTag}>{getRoleLabel(user.role, user.service)}</span>}
      </div>

      <div className={styles.kpis}>
        {loading ? (
          <>
            <StatCard icon={<ActivityIcon size={22} />} value="" label="" loading />
            <StatCard icon={<ActivityIcon size={22} />} value="" label="" loading />
            <StatCard icon={<ActivityIcon size={22} />} value="" label="" loading />
          </>
        ) : error ? (
          <p role="alert" className={styles.kpiError}>
            No se pudieron cargar tus indicadores. Recarga la página para intentarlo de nuevo.
          </p>
        ) : (
          visibleKpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)
        )}
      </div>

      <div className={styles.columns}>
        {hasQuickActions && (
          <Card>
            <CardHeader
              title="Acciones rápidas"
              description={student ? 'Pide ayuda, revisa tus solicitudes o consulta tu próxima cita.' : tutor ? 'Accesos para atender, registrar y consultar tu trabajo de tutoría.' : 'Encuentra tus tareas organizadas por área.'}
            />
            <CardBody>
              <QuickActions />
            </CardBody>
          </Card>
        )}

        {/* La bitácora solo la consulta la DBU. */}
        {canSeeActivity && (
          <Card>
            <CardHeader title="Actividad reciente" description="Últimos movimientos del sistema" />
            <RecentActivity />
          </Card>
        )}
      </div>

      {canSeeAlerts && (
        <Card>
          <CardHeader
            title="Alertas de inasistencia y riesgo"
            description="Estudiantes en riesgo sin sesiones o con inasistencias por encima del umbral"
          />
          <RiskAlerts />
        </Card>
      )}
    </div>
  );
}
