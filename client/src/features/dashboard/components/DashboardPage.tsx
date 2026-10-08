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
  'my-tutor': <UsersIcon size={22} />,
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

  return (
    <div>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.welcome}>
            Bienvenido{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className={styles.sub}>
            Resumen de tu trabajo en el sistema
            {panel?.periodName ? ` · Periodo académico ${panel.periodName}` : ''}
          </p>
        </div>
        {user && <span className={styles.roleTag}>{user.role}</span>}
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
          (panel?.kpis ?? []).map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)
        )}
      </div>

      <div className={styles.columns}>
        <Card>
          <CardHeader
            title="Acciones rápidas"
            description="Accesos directos a las tareas frecuentes"
          />
          <CardBody>
            <QuickActions />
          </CardBody>
        </Card>

        {/* La bitácora solo la consulta la DBU: para el resto no se muestra un bloque vacío. */}
        {user?.role === 'Administrador DBU' && (
          <Card>
            <CardHeader title="Actividad reciente" description="Últimos movimientos del sistema" />
            <RecentActivity />
          </Card>
        )}
      </div>

      <Card>
        <CardHeader
          title="Alertas de inasistencia y riesgo"
          description="Tutorados en riesgo sin sesiones o con inasistencias por encima del umbral"
        />
        <RiskAlerts />
      </Card>
    </div>
  );
}
