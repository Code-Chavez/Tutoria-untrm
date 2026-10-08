import { Link } from 'react-router-dom';
import { EmptyState } from '@shared/components/ui';
import { ClockIcon } from '@shared/components/icons';
import { useAuditLog } from '@features/auditoria/hooks/useAuditLog';
import { actionLabel, entityLabel } from '@features/auditoria/services/auditService';
import styles from './RecentActivity.module.css';

const WHEN = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' });

/** Últimos movimientos de la bitácora de auditoría (solo la DBU los consulta). */
export function RecentActivity() {
  const { data, loading, error } = useAuditLog({ page: 1, pageSize: 6 });

  if (loading) return <p className={styles.note}>Cargando actividad…</p>;
  if (error) return <p role="alert" className={styles.note}>No se pudo cargar la actividad reciente.</p>;
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<ClockIcon size={26} />}
        title="Sin actividad reciente"
        description="Las operaciones críticas aparecerán aquí con su autor y fecha."
      />
    );
  }

  return (
    <div>
      <ul className={styles.list}>
        {data.items.map((entry) => (
          <li key={entry.id} className={styles.item}>
            <span className={styles.what}>
              <b>{actionLabel(entry.action)}</b> · {entityLabel(entry.entity)}
            </span>
            <span className={styles.who}>
              {entry.actorName} · {WHEN.format(new Date(entry.createdAt))}
            </span>
          </li>
        ))}
      </ul>
      <Link to="/auditoria" className={styles.more}>
        Ver la bitácora completa
      </Link>
    </div>
  );
}
