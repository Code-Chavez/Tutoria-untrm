import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { Badge, Button, Card, EmptyState, PageHeader, SelectField, TableSkeleton } from '@shared/components/ui';
import { InboxIcon, XCircleIcon } from '@shared/components/icons';
import table from '@shared/components/ui/DataTable.module.css';
import { useDialog } from '@shared/hooks/useDialog';
import { useTutoringRequestsInbox, useUpdateTutoringRequestStatus } from '../hooks/useTutoringRequests';
import {
  CASE_TYPE_LABEL,
  REQUEST_STATUS_LABEL,
  type TutoringRequestStatus,
  type TutoringRequestView,
} from '../services/tutoringRequestService';
import styles from './TutoringRequestsInboxPage.module.css';

const STATUS_TONE: Record<TutoringRequestStatus, 'warning' | 'info' | 'success'> = {
  PENDIENTE: 'warning',
  EN_ATENCION: 'info',
  ATENDIDA: 'success',
};

function AttendModal({ request, onClose }: { request: TutoringRequestView; onClose: () => void }) {
  const dialogRef = useDialog(onClose);
  const update = useUpdateTutoringRequestStatus();
  const [note, setNote] = useState(request.responseNote ?? '');
  const [error, setError] = useState('');

  const apply = async (status: 'EN_ATENCION' | 'ATENDIDA') => {
    setError('');
    if (status === 'ATENDIDA' && note.trim().length === 0) {
      setError('Escribe la respuesta para el estudiante antes de marcarla atendida.');
      return;
    }
    try {
      await update.mutateAsync({ id: request.id, data: { status, note: note.trim() || undefined } });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Atender solicitud de tutoría"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.title}>Solicitud de {request.studentName}</h2>
        <p className={styles.sub}>
          {request.studentCode} · {CASE_TYPE_LABEL[request.caseType]} · {new Date(request.createdAt).toLocaleDateString('es-PE')}
        </p>
        {request.source === 'INSTRUCTOR' && (
          <p className={styles.sub}>
            Solicitada por el docente {request.instructorName} ({request.courseName})
          </p>
        )}
        <p className={styles.reason}>{request.reason}</p>

        {request.status === 'ATENDIDA' ? (
          <p className={styles.done}>
            <b>Atendida{request.handledByName ? ` por ${request.handledByName}` : ''}:</b> {request.responseNote}
          </p>
        ) : (
          <>
            <label htmlFor="response-note" className={styles.label}>
              Respuesta para el estudiante
            </label>
            <textarea
              id="response-note"
              className={styles.textarea}
              rows={4}
              maxLength={1000}
              value={note}
              placeholder="Fecha y lugar de la sesión, indicaciones o la derivación que corresponda…"
              onChange={(e) => setNote(e.target.value)}
            />
          </>
        )}

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {request.status === 'PENDIENTE' && (
            <Button variant="secondary" loading={update.isPending} onClick={() => apply('EN_ATENCION')}>
              Pasar a en atención
            </Button>
          )}
          {request.status !== 'ATENDIDA' && (
            <Button loading={update.isPending} onClick={() => apply('ATENDIDA')}>
              Marcar atendida
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Bandeja de solicitudes de tutoría (R01): tutor, coordinación y DBU reciben, revisan y atienden.
export function TutoringRequestsInboxPage() {
  const [status, setStatus] = useState<TutoringRequestStatus | ''>('');
  const { requests, loading, error, refresh } = useTutoringRequestsInbox(status || undefined);
  const [selected, setSelected] = useState<TutoringRequestView | null>(null);
  // Un aviso llega con ?solicitud=<id>: se abre esa solicitud, o se explica que ya no está disponible (R03).
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get('solicitud');
  const requested = requestedId ? requests.find((r) => r.id === requestedId) ?? null : null;
  const unavailable = !!requestedId && !loading && !error && !requested;
  const clearRequested = () => setSearchParams({}, { replace: true });
  const open = selected ?? requested;

  return (
    <div>
      <PageHeader
        title="Solicitudes de tutoría"
        subtitle="Las solicitudes de tus tutorados (o de tu escuela) y las que se te enrutaron, con su estado de atención"
        icon={<InboxIcon size={24} />}
      />

      {unavailable && (
        <div className={styles.notice} role="status">
          <span>Esa solicitud ya no está disponible para tu cuenta: fue eliminada, se atendió en otro filtro o dejó de estar a tu cargo.</span>
          <button type="button" className={styles.noticeClose} onClick={clearRequested}>
            Cerrar
          </button>
        </div>
      )}

      <Card>
        <div className={styles.bar}>
          <SelectField value={status} onChange={(e) => setStatus(e.target.value as TutoringRequestStatus | '')} aria-label="Filtrar por estado" wrapClassName={styles.filter}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_ATENCION">En atención</option>
            <option value="ATENDIDA">Atendidas</option>
          </SelectField>
        </div>

        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<XCircleIcon size={26} />}
            title="No se pudieron cargar las solicitudes"
            description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
            action={
              <Button variant="secondary" onClick={() => refresh()}>
                Reintentar
              </Button>
            }
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<InboxIcon size={26} />}
            title={status ? 'Sin solicitudes con ese estado' : 'Aún no hay solicitudes'}
            description="Cuando un tutorado de tu alcance solicite tutoría, la verás aquí y recibirás un aviso."
          />
        ) : (
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>Tutorado</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                  <th>Enrutada a</th>
                  <th>Estado</th>
                  <th className={table.right}></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className={table.stack}>
                        <span className={table.name}>{r.studentName}</span>
                        <span className={table.sub}>{r.studentCode}</span>
                      </div>
                    </td>
                    <td>{CASE_TYPE_LABEL[r.caseType]}</td>
                    <td className={styles.reasonCell}>{r.reason}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString('es-PE')}</td>
                    <td>{r.routedToName}</td>
                    <td>
                      <Badge tone={STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                    </td>
                    <td className={table.right}>
                      <Button size="sm" variant={r.status === 'ATENDIDA' ? 'ghost' : 'secondary'} onClick={() => setSelected(r)}>
                        {r.status === 'ATENDIDA' ? 'Ver' : 'Atender'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && (
        <AttendModal
          key={open.id}
          request={open}
          onClose={() => {
            setSelected(null);
            if (requestedId) clearRequested();
          }}
        />
      )}
    </div>
  );
}
