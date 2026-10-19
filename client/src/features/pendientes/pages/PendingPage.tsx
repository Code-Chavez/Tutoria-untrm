import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, EmptyState, PageHeader, SelectField, TableSkeleton } from '@shared/components/ui';
import { InboxIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { pendingService, type PendingItem, type PendingKind } from '../services/pendingService';
import styles from './PendingPage.module.css';

const KIND_LABEL: Record<PendingKind, { label: string; tone: 'danger' | 'warning' | 'info'; action: string }> = {
  DESIGNATION_REJECTED: { label: 'Docente rechazó', tone: 'danger', action: 'Ir a «Asignación por ciclo»' },
  ACCEPTANCE_EMAIL_FAILED: { label: 'Correo no enviado', tone: 'danger', action: 'Ir a «Asignación por ciclo»' },
  DESIGNATION_NO_RESPONSE: { label: 'Sin respuesta', tone: 'warning', action: 'Ir a «Asignación por ciclo»' },
  TUTOR_INACTIVE: { label: 'Cuenta desactivada', tone: 'warning', action: 'Ir a «Asignación por ciclo»' },
  CYCLE_WITHOUT_TUTOR: { label: 'Ciclo sin tutor', tone: 'warning', action: 'Ir a «Asignación por ciclo»' },
  CANCELLED_SESSION_NO_FOLLOWUP: { label: 'Cita cancelada', tone: 'info', action: 'Abrir la solicitud' },
};

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const waiting = (iso: string) => {
  const days = daysSince(iso);
  return days === 0 ? 'desde hoy' : days === 1 ? 'desde hace 1 día' : `desde hace ${days} días`;
};

// Lo que la coordinación y la DBU deben mirar aunque nadie se lo avise: la pantalla solo muestra y lleva a donde se resuelve.
export function PendingPage() {
  const query = useQuery({ queryKey: ['institutional-pending'], queryFn: () => pendingService.list(), retry: false });
  const [kind, setKind] = useState<'ALL' | PendingKind>('ALL');
  const items: PendingItem[] = (query.data ?? []).filter((item) => kind === 'ALL' || item.kind === kind);

  return (
    <div>
      <PageHeader
        title="Pendientes"
        subtitle="Lo que necesita una decisión o un aviso de la coordinación o de la DBU: docentes que no aceptaron, ciclos sin tutor y citas canceladas. Se ordena por lo que lleva más tiempo esperando."
        icon={<InboxIcon size={24} />}
      />

      {query.isLoading ? (
        <TableSkeleton rows={4} />
      ) : query.isError ? (
        <EmptyState variant="error" icon={<InboxIcon size={26} />} title="No se pudieron cargar los pendientes" description={getApiErrorMessage(query.error)} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon={<InboxIcon size={26} />} title="No hay pendientes" description="Todos los ciclos tienen docente que aceptó, y ninguna cita de una solicitud está cancelada sin continuación." />
      ) : (
        <>
          <div className={styles.filter}>
            <label htmlFor="pending-kind">Tipo de pendiente</label>
            <SelectField id="pending-kind" value={kind} onChange={(e) => setKind(e.target.value as 'ALL' | PendingKind)}>
              <option value="ALL">Todos ({(query.data ?? []).length})</option>
              {(Object.keys(KIND_LABEL) as PendingKind[])
                .filter((k) => (query.data ?? []).some((i) => i.kind === k))
                .map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k].label} ({(query.data ?? []).filter((i) => i.kind === k).length})
                  </option>
                ))}
            </SelectField>
          </div>
          <ul className={styles.list} aria-label="Pendientes">
            {items.map((item, index) => {
              const copy = KIND_LABEL[item.kind];
              return (
                <li key={`${item.kind}-${item.schoolId}-${item.cycle ?? 'x'}-${index}`} className={styles.item}>
                  <div className={styles.text}>
                    <Badge tone={copy.tone}>{copy.label}</Badge>
                    <p className={styles.title}>{item.title}</p>
                    <p className={styles.detail}>{item.detail}</p>
                    <p className={styles.meta}>
                      {item.schoolName}
                      {item.cycle ? ` · ciclo ${item.cycle}` : ''} · {waiting(item.since)}
                    </p>
                  </div>
                  <Link to={item.link} className={styles.action}>
                    {copy.action}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
