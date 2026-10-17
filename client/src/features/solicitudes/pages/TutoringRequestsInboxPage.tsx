import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useStudents } from '@features/tutorados/hooks/useStudents';
import { SessionFormModal } from '@features/tutorados/components/SessionFormModal';
import { ReferralFormModal } from '@features/derivaciones/components/ReferralFormModal';
import { referralService, type CreateReferralData } from '@features/derivaciones/services/referralService';
import { sessionService, type ScheduleSessionData } from '@features/sesiones/services/sessionService';
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

// Duración habitual (Art. 15.c); el valor real lo fija el servidor. Solo es el texto de ayuda del formulario.
const SESSION_MINUTES = 45;

// Qué se hizo con la solicitud: se dice en la tabla y en el detalle, para no abrirla a ver si ya se atendió.
const followUpLabel = (r: TutoringRequestView) => (r.sessionId ? 'Con sesión programada' : r.referralId ? 'Derivada a un servicio' : null);

const STATUS_TONE: Record<TutoringRequestStatus, 'warning' | 'info' | 'success'> = {
  PENDIENTE: 'warning',
  EN_ATENCION: 'info',
  ATENDIDA: 'success',
};

interface AttendModalProps {
  request: TutoringRequestView;
  onClose: () => void;
  /** Solo quien puede programar y derivar (el docente tutor) ve estas acciones. */
  onSchedule?: () => void;
  onRefer?: () => void;
}

function AttendModal({ request, onClose, onSchedule, onRefer }: AttendModalProps) {
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
        {followUpLabel(request) && (
          <p className={styles.linked} role="status">
            {followUpLabel(request)}: no hace falta crear otra atención para esta solicitud.
          </p>
        )}
        {onSchedule && onRefer && !request.sessionId && !request.referralId && (
          <div className={styles.followUp}>
            <span className={styles.label}>¿Qué hacer con esta solicitud?</span>
            <div className={styles.followUpButtons}>
              <Button variant="secondary" onClick={onSchedule}>
                Programar sesión
              </Button>
              <Button variant="secondary" onClick={onRefer}>
                Derivar a un servicio
              </Button>
            </div>
            <p className={styles.sub}>Ambas parten de esta solicitud: el tutorado y el motivo ya vienen cargados y la solicitud queda vinculada.</p>
          </div>
        )}

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

  // Programar una sesión o derivar el caso parte de la solicitud: el tutorado y el motivo ya vienen cargados.
  const { user } = useAuth();
  const canFollowUp = user?.role === 'Docente Tutor';
  const { students } = useStudents();
  const queryClient = useQueryClient();
  const [followUp, setFollowUp] = useState<{ kind: 'session' | 'referral'; request: TutoringRequestView } | null>(null);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpError, setFollowUpError] = useState('');
  const [feedback, setFeedback] = useState('');
  const followUpStudent = followUp ? students.find((s) => s.id === followUp.request.studentId) : undefined;
  const closeFollowUp = () => {
    setFollowUp(null);
    setFollowUpError('');
  };
  const startFollowUp = (kind: 'session' | 'referral', r: TutoringRequestView) => {
    setSelected(null);
    if (requestedId) clearRequested();
    setFollowUpError('');
    setFollowUp({ kind, request: r });
  };
  const finishFollowUp = async (done: () => Promise<string>) => {
    setFollowUpBusy(true);
    setFollowUpError('');
    try {
      setFeedback(await done());
      setFollowUp(null);
      await queryClient.invalidateQueries({ queryKey: ['tutoringRequests'] });
    } catch (err) {
      setFollowUpError(getApiErrorMessage(err));
    } finally {
      setFollowUpBusy(false);
    }
  };
  const confirmSession = (r: TutoringRequestView, data: ScheduleSessionData) =>
    finishFollowUp(async () => {
      const session = await sessionService.scheduleSession({ ...data, tutoringRequestId: r.id });
      const when = new Date(session.scheduledAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
      return `Sesión programada para el ${when} con ${r.studentName}. Quedó vinculada a su solicitud y la verá en Mis sesiones.`;
    });
  const confirmReferral = (r: TutoringRequestView, data: CreateReferralData) =>
    finishFollowUp(async () => {
      await referralService.createReferral(r.studentId, { ...data, tutoringRequestId: r.id });
      return `Caso de ${r.studentName} derivado. Quedó vinculado a su solicitud; lo sigues en Casos derivados.`;
    });

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

      {feedback && (
        <div className={styles.notice} role="status">
          <span>{feedback}</span>
          <button type="button" className={styles.noticeClose} onClick={() => setFeedback('')}>
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
                      {followUpLabel(r) && <span className={styles.followUpTag}>{followUpLabel(r)}</span>}
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
          onSchedule={canFollowUp ? () => startFollowUp('session', open) : undefined}
          onRefer={canFollowUp ? () => startFollowUp('referral', open) : undefined}
          onClose={() => {
            setSelected(null);
            if (requestedId) clearRequested();
          }}
        />
      )}

      {followUp?.kind === 'session' && followUpStudent && (
        <SessionFormModal
          student={followUpStudent}
          durationMinutes={SESSION_MINUTES}
          defaultTopic={followUp.request.reason.slice(0, 200)}
          context={`Atiende la solicitud de ${followUp.request.studentName}: «${followUp.request.reason}»`}
          loading={followUpBusy}
          serverError={followUpError}
          onSubmit={(data) => confirmSession(followUp.request, data)}
          onCancel={closeFollowUp}
        />
      )}

      {followUp?.kind === 'referral' && followUpStudent && (
        <ReferralFormModal
          student={followUpStudent}
          defaultReason={followUp.request.reason.slice(0, 1000)}
          context={`Atiende la solicitud de ${followUp.request.studentName}: «${followUp.request.reason}»`}
          loading={followUpBusy}
          serverError={followUpError}
          onSubmit={(data) => confirmReferral(followUp.request, data)}
          onCancel={closeFollowUp}
        />
      )}
    </div>
  );
}
