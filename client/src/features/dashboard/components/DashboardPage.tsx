import { useAuth } from '@features/auth/hooks/useAuth';
import { StatCard, Card, CardHeader, CardBody } from '@shared/components/ui';
import {
  GraduationCapIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CalendarIcon,
} from '@shared/components/icons';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { user } = useAuth();
  const { metrics, loading, forbidden } = useDashboardMetrics();

  const firstName = user?.firstName ?? '';
  // Muestra "—" cuando el dato no está disponible para el rol, en vez de inventarlo.
  const na = forbidden ? '—' : '0';
  const val = (n?: number) => (metrics ? String(n ?? 0) : na);

  return (
    <div>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.welcome}>
            Bienvenido{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className={styles.sub}>
            Resumen general del sistema · Periodo académico 2026-II · FISME
          </p>
        </div>
        {user && <span className={styles.roleTag}>{user.role}</span>}
      </div>

      <div className={styles.kpis}>
        <StatCard
          icon={<GraduationCapIcon size={22} />}
          value={val(metrics?.totalStudents)}
          label="Total de tutorados"
          hint="Estudiantes registrados"
          tone="info"
          loading={loading}
        />
        <StatCard
          icon={<CheckCircleIcon size={22} />}
          value={val(metrics?.activeStudents)}
          label="Tutorados activos"
          hint="Con matrícula vigente"
          tone="success"
          loading={loading}
        />
        <StatCard
          icon={<AlertTriangleIcon size={22} />}
          value={val(metrics?.atRiskStudents)}
          label="En riesgo académico"
          hint="Requieren seguimiento"
          tone="warning"
          loading={loading}
        />
        <StatCard
          icon={<CalendarIcon size={22} />}
          value="—"
          label="Sesiones programadas"
          hint="Módulo en desarrollo"
          tone="neutral"
        />
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

        <Card>
          <CardHeader title="Actividad reciente" description="Últimos movimientos del sistema" />
          <RecentActivity />
        </Card>
      </div>
    </div>
  );
}
