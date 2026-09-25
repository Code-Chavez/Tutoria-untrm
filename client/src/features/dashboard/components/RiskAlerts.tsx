import { Badge, EmptyState } from '@shared/components/ui';
import { AlertTriangleIcon } from '@shared/components/icons';
import { useRiskAlerts } from '../hooks/useRiskAlerts';
import type { StudentAlert } from '../services/alertService';
import styles from './RiskAlerts.module.css';

function alertMeta(alert: StudentAlert): string {
  return alert.type === 'NO_SESSIONS'
    ? 'Sin sesiones registradas'
    : `${alert.missedCount} sesiones sin asistencia confirmada`;
}

// Alertas de inasistencia y riesgo (HU-26): tutorados en riesgo (HU-11) sin
// sesiones programadas, o con inasistencias por encima del umbral
// configurable — para que el tutor y el coordinador intervengan a tiempo.
export function RiskAlerts() {
  const { alerts, loading, forbidden } = useRiskAlerts();

  if (loading) {
    return <p className={styles.loading}>Cargando alertas…</p>;
  }

  if (forbidden) {
    return (
      <EmptyState
        icon={<AlertTriangleIcon size={26} />}
        title="Sin acceso a las alertas"
        description="Tu rol no tiene permiso para ver esta información."
      />
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangleIcon size={26} />}
        title="Sin alertas activas"
        description="Ningún tutorado en riesgo requiere intervención en este momento."
      />
    );
  }

  return (
    <ul className={styles.list}>
      {alerts.map((alert) => (
        <li key={alert.studentId} className={styles.item}>
          <span className={styles.icon}>
            <AlertTriangleIcon size={16} />
          </span>
          <div className={styles.info}>
            <b>
              {alert.studentName} · {alert.studentCode}
            </b>
            <span className={styles.meta}>
              Ciclo {alert.cycle} · {alertMeta(alert)}
              {alert.tutorName ? ` · Tutor: ${alert.tutorName}` : ''}
            </span>
          </div>
          <Badge tone={alert.type === 'NO_SESSIONS' ? 'danger' : 'warning'}>
            {alert.type === 'NO_SESSIONS' ? 'Sin sesiones' : 'Inasistencias'}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
