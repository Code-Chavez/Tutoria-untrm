import {
  PageHeader,
  Card,
  CardHeader,
  StatCard,
  Badge,
  EmptyState,
  TableSkeleton,
  Button,
} from '@shared/components/ui';
import { AlertTriangleIcon, ClockIcon, ReportIcon, InboxIcon } from '@shared/components/icons';
import { useReferralTracking } from '../hooks/useReferrals';
import { REFERRAL_SERVICE_LABEL, REFERRAL_STATUS_LABEL } from '../services/referralService';
import styles from './ReferralTrackingPage.module.css';

function formatHours(hours: number): string {
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

// Tablero de seguimiento de casos derivados por la DBU (HU-34, Art. 22.b):
// agrupa los casos por servicio y marca los que llevan más tiempo abiertos
// que el plazo configurado sin pasar a ATENDIDO/CERRADO.
export function ReferralTrackingPage() {
  const { report, loading, error, refresh } = useReferralTracking();

  const totalOverdue = report?.summary.reduce((sum, s) => sum + s.overdue, 0) ?? 0;
  const totalOpen = report
    ? report.items.filter((i) => i.status !== 'ATENDIDO' && i.status !== 'CERRADO').length
    : 0;

  return (
    <div>
      <PageHeader
        title="Seguimiento de Derivaciones"
        subtitle="Casos derivados a los servicios de la DBU, por servicio y estado (Art. 22.b)"
        icon={<ReportIcon size={24} />}
      />

      {loading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : error || !report ? (
        <EmptyState
          variant="error"
          icon={<InboxIcon size={26} />}
          title="No se pudo cargar el seguimiento"
          description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : (
        <>
          <div className={styles.stats}>
            <StatCard
              icon={<InboxIcon size={20} />}
              value={report.items.length}
              label="Derivaciones totales"
              tone="info"
            />
            <StatCard
              icon={<ClockIcon size={20} />}
              value={totalOpen}
              label="Casos abiertos"
              hint="Enviado, recibido o en atención"
              tone="neutral"
            />
            <StatCard
              icon={<AlertTriangleIcon size={20} />}
              value={totalOverdue}
              label="Casos vencidos"
              hint={`Más de ${report.deadlineHours} h sin avanzar de estado`}
              tone={totalOverdue > 0 ? 'danger' : 'success'}
            />
          </div>

          <div className={styles.summaryGrid}>
            {report.summary.map((s) => (
              <Card key={s.service} padded className={styles.serviceCard}>
                <div className={styles.serviceHead}>
                  <b>{REFERRAL_SERVICE_LABEL[s.service]}</b>
                  {s.overdue > 0 && (
                    <Badge tone="danger" icon={<AlertTriangleIcon size={12} />}>
                      {s.overdue} vencido{s.overdue > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className={styles.serviceTotal}>{s.total}</div>
                <div className={styles.serviceStatuses}>
                  {(Object.keys(s.byStatus) as (keyof typeof s.byStatus)[])
                    .filter((status) => s.byStatus[status] > 0)
                    .map((status) => (
                      <span key={status} className={styles.statusChip}>
                        {REFERRAL_STATUS_LABEL[status]}: {s.byStatus[status]}
                      </span>
                    ))}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Detalle de casos"
              description="Ordenado por tiempo transcurrido desde el último cambio de estado"
            />
            {report.items.length === 0 ? (
              <EmptyState
                icon={<InboxIcon size={26} />}
                title="No hay derivaciones registradas"
                description="Aún no se ha derivado ningún caso a los servicios de la DBU."
              />
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID Tutorado</th>
                    <th>Servicio</th>
                    <th>Estado</th>
                    <th>Última actualización</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={item.id} className={item.isOverdue ? styles.rowOverdue : ''}>
                      <td>{item.studentId.slice(0, 8).toUpperCase()}...</td>
                      <td>
                        <Badge tone="info">{REFERRAL_SERVICE_LABEL[item.service]}</Badge>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[`status_${item.status}`] || ''}`}>
                          {REFERRAL_STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td>Hace {formatHours(item.hoursSinceUpdate)}</td>
                      <td>
                        {item.isOverdue && (
                          <Badge tone="danger" icon={<AlertTriangleIcon size={12} />}>
                            Vencido
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
