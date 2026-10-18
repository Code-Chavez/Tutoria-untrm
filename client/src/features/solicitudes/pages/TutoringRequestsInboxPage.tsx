import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useStudents } from '@features/tutorados/hooks/useStudents';
import { SessionFormModal } from '@features/tutorados/components/SessionFormModal';
import { ReferralFormModal } from '@features/derivaciones/components/ReferralFormModal';
import { referralService, type CreateReferralData } from '@features/derivaciones/services/referralService';
import { sessionService, type ScheduleSessionData } from '@features/sesiones/services/sessionService';
import { sessionNoticeText } from '@features/sesiones/utils/sessionNotice';
import { Badge, Button, Card, DraftNotice, EmptyState, InboxToolbar, PageHeader, TableSkeleton } from '@shared/components/ui';
import { useDraft } from '@shared/hooks/useDraft';
import { InboxIcon, XCircleIcon } from '@shared/components/icons';
import { parseFilterParam, waitingText } from '@shared/utils/inbox';
import table from '@shared/components/ui/DataTable.module.css';
import { useDialog } from '@shared/hooks/useDialog';
import { useTutoringRequestsInbox, useUpdateTutoringRequestStatus } from '../hooks/useTutoringRequests';
import {
  CASE_TYPE_LABEL,
  REQUEST_STATUS_LABEL,
  type TutoringRequestStatus,
  type TutoringRequestView,
} from '../services/tutoringRequestService';
import {
  countRequests,
  DEFAULT_REQUEST_FILTER,
  isOpenRequest,
  REQUEST_FILTER_LABEL,
  REQUEST_FILTERS,
  viewRequests,
  type RequestFilter,
} from '../utils/requestInbox';
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
  const { user } = useAuth();
  // La respuesta a medio escribir se conserva si cierra la ventana sin querer o la interrumpen (solo en esta pestaña).
  const saved = request.responseNote ?? '';
  const isUnchanged = useCallback((value: string) => value.trim() === saved.trim(), [saved]);
  const { value: note, setValue: setNote, restored, discard } = useDraft(user?.id, `respuesta-${request.id}`, saved, isUnchanged);
  const [error, setError] = useState('');

  const apply = async (status: 'EN_ATENCION' | 'ATENDIDA') => {
    setError('');
    if (status === 'ATENDIDA' && note.trim().length === 0) {
      setError('Escribe la respuesta para el estudiante antes de marcarla atendida.');
      return;
    }
    try {
      await update.mutateAsync({ id: request.id, data: { status, note: note.trim() || undefined } });
      discard();
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
            <p className={styles.sub}>Ambas parten de esta solicitud: el estudiante y el motivo ya vienen cargados y la solicitud queda vinculada.</p>
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
            {restored && <DraftNotice onDiscard={discard} />}
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
  // Se trae todo y se filtra aquí: la vista inicial es «Por atender» (lo que espera respuesta) y cada contador del inicio
  // abre la bandeja ya filtrada con ?estado=… (U04, U09).
  const { requests: all, loading, error, refresh } = useTutoringRequestsInbox();
  const [selected, setSelected] = useState<TutoringRequestView | null>(null);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseFilterParam(searchParams.get('estado'), REQUEST_FILTERS, DEFAULT_REQUEST_FILTER);
  const changeFilter = (next: RequestFilter) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('estado', next);
        return params;
      },
      { replace: true },
    );
  const counts = countRequests(all);
  const requests = viewRequests(all, filter, search);
  // Un aviso llega con ?solicitud=<id>: se abre esa solicitud (esté en la vista que esté), o se explica que ya no está disponible (R03).
  const requestedId = searchParams.get('solicitud');
  const requested = requestedId ? all.find((r) => r.id === requestedId) ?? null : null;
  const unavailable = !!requestedId && !loading && !error && !requested;
  const clearRequested = () =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete('solicitud');
        return params;
      },
      { replace: true },
    );
  const open = selected ?? requested;

  // Programar una sesión o derivar el caso parte de la solicitud: el estudiante y el motivo ya vienen cargados.
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
      // El aviso de la sesión es el de la solicitud vinculada (no se repite): se le dice a quien programó si no se pudo avisar.
      return `Sesión programada para el ${when} con ${r.studentName}. Quedó vinculada a su solicitud y la verá en Mis sesiones.${sessionNoticeText(session.notice)}`;
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
        subtitle="Las solicitudes de tus estudiantes (o de tu escuela) y las que se te enviaron, con su estado de atención"
        icon={<InboxIcon size={24} />}
      />

      {unavailable && (
        <div className={styles.notice} role="status">
          <span>Esa solicitud ya no está disponible para tu cuenta: fue eliminada o dejó de estar a tu cargo.</span>
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
        <InboxToolbar
          label="Filtrar por estado"
          options={REQUEST_FILTERS.map((key) => ({ key, label: REQUEST_FILTER_LABEL[key], count: counts[key] }))}
          active={filter}
          onChange={changeFilter}
          search={search}
          onSearch={setSearch}
          searchLabel="Buscar solicitud"
          searchPlaceholder="Buscar estudiante o motivo"
        />

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
        ) : all.length === 0 ? (
          <EmptyState
            icon={<InboxIcon size={26} />}
            title="Aún no hay solicitudes"
            description="Cuando un estudiante de tu alcance solicite tutoría, la verás aquí y recibirás un aviso."
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<InboxIcon size={26} />}
            title={search ? 'Ninguna solicitud coincide con la búsqueda' : filter === 'por-atender' ? 'No hay solicitudes por atender' : 'No hay solicitudes en esta vista'}
            description={filter === 'por-atender' && !search ? 'Todo lo recibido ya se atendió. Puedes revisar lo atendido o ver todas.' : 'Prueba con otra búsqueda o cambia de vista.'}
            action={
              filter !== 'todas' ? (
                <Button variant="secondary" onClick={() => changeFilter('todas')}>
                  Ver todas
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={table.scroll}>
            <table className={`${table.table} ${table.stacked}`}>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th className={table.right}></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Estudiante">
                      <div className={table.stack}>
                        <span className={table.name}>{r.studentName}</span>
                        <span className={table.sub}>{r.studentCode}</span>
                      </div>
                    </td>
                    <td data-label="Tipo">{CASE_TYPE_LABEL[r.caseType]}</td>
                    <td data-label="Motivo" className={styles.reasonCell}>{r.reason}</td>
                    <td data-label="Fecha">
                      <div className={table.stack}>
                        <span>{new Date(r.createdAt).toLocaleDateString('es-PE')}</span>
                        {isOpenRequest(r) && <span className={table.sub}>Espera desde {waitingText(r.createdAt)}</span>}
                      </div>
                    </td>
                    <td data-label="Responsable">{r.routedToName}</td>
                    <td data-label="Estado">
                      <Badge tone={STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                      {followUpLabel(r) && <span className={styles.followUpTag}>{followUpLabel(r)}</span>}
                    </td>
                    <td className={`${table.right} ${table.cardAction}`}>
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
