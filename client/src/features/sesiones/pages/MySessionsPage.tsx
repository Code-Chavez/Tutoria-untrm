import { Badge, Button, Card, EmptyState, PageHeader, TableSkeleton } from '@shared/components/ui';
import { CalendarIcon, XCircleIcon } from '@shared/components/icons';
import { Link } from 'react-router-dom';
import { useOwnTutoringRequests } from '@features/solicitudes/hooks/useTutoringRequests';
import { useOwnSessions } from '../hooks/useOwnSessions';
import type { TutoringSession } from '../services/sessionService';
import { getSessionStatus, SESSION_STATUS_LABEL, type SessionStatus } from '../utils/sessionStatus';
import styles from './MySessionsPage.module.css';

const WHEN = new Intl.DateTimeFormat('es-PE', { dateStyle: 'full', timeStyle: 'short' });

const TONE: Record<SessionStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  PROXIMA: 'info',
  EN_CURSO: 'info',
  REALIZADA: 'success',
  POR_REGISTRAR: 'neutral',
  INASISTENCIA: 'warning',
  CANCELADA: 'danger',
};

const isUpcoming = (status: SessionStatus) => status === 'PROXIMA' || status === 'EN_CURSO';

// Un enlace de videollamada solo se abre si es http(s): lo escribe el tutor y no se asume seguro.
const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

// Qué pasó con una cita según las solicitudes del estudiante: la que reemplazó a una cancelada y la cancelada que fue reemplazada.
interface Relations {
  replacedBy: Map<string, string>; // id de la cita cancelada → fecha de la que la reemplazó
  replacements: Set<string>; // ids de las citas vigentes que reemplazaron a una cancelada
}

function SessionItem({ session, relations }: { session: TutoringSession; relations: Relations }) {
  const status = getSessionStatus(session);
  const replacedBy = relations.replacedBy.get(session.id);
  const place =
    session.modality === 'VIRTUAL' ? session.meetingLink : session.location;

  return (
    <li className={styles.item}>
      <div className={styles.head}>
        <b className={styles.topic}>{session.topic}</b>
        <Badge tone={replacedBy ? 'neutral' : TONE[status]}>{replacedBy ? 'Reemplazada' : SESSION_STATUS_LABEL[status]}</Badge>
      </div>
      <p className={styles.when}>
        {WHEN.format(new Date(session.scheduledAt))} · {session.durationMinutes} min
      </p>
      <p className={styles.where}>
        {session.modality === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
        {': '}
        {place ? (
          session.modality === 'VIRTUAL' && isHttpUrl(place) ? (
            <a href={place} target="_blank" rel="noopener noreferrer">
              {place}
            </a>
          ) : (
            place
          )
        ) : (
          'sin lugar ni enlace registrado'
        )}
      </p>
      {relations.replacements.has(session.id) && <p className={styles.when}>Esta cita reemplaza a una que se canceló.</p>}
      {session.cancelledAt && (
        <p className={styles.cancel}>
          Cancelada el {new Date(session.cancelledAt).toLocaleDateString('es-PE')}
          {session.cancelReason ? `: ${session.cancelReason}` : ''}.{' '}
          {replacedBy ? (
            <>Se programó otra cita: {WHEN.format(new Date(replacedBy))}.</>
          ) : (
            <>
              Si necesitas otra fecha, coordínala con tu tutor o escríbela en <Link to="/solicitar-tutoria">Solicitar tutoría</Link>.
            </>
          )}
        </p>
      )}
    </li>
  );
}

// Agenda propia del tutorado (A15): solo consulta; programar, reprogramar y cancelar es del tutor.
export function MySessionsPage() {
  const { sessions, loading, error, refresh } = useOwnSessions();
  const own = useOwnTutoringRequests(); // si no carga, la agenda se muestra igual (sin las notas de reemplazo)
  const relations: Relations = { replacedBy: new Map(), replacements: new Set() };
  for (const request of own.requests) {
    const appointment = request.appointment;
    if (!appointment || appointment.state !== 'VIGENTE' || !request.sessionId) continue;
    for (const id of appointment.replacedSessionIds) relations.replacedBy.set(id, appointment.scheduledAt);
    if (appointment.replacedSessionIds.length > 0) relations.replacements.add(request.sessionId);
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const upcoming = sorted.filter((s) => isUpcoming(getSessionStatus(s)));
  const past = sorted.filter((s) => !isUpcoming(getSessionStatus(s))).reverse();

  return (
    <div>
      <PageHeader
        title="Mis sesiones"
        subtitle="Tus sesiones de tutoría programadas, con fecha, modalidad y lugar o enlace"
        icon={<CalendarIcon size={24} />}
      />

      {loading ? (
        <TableSkeleton rows={4} columns={2} label="Cargando tus sesiones…" onRetry={() => refresh()} />
      ) : error ? (
        <EmptyState
          variant="error"
          icon={<XCircleIcon size={26} />}
          title="No se pudieron cargar tus sesiones"
          description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
          action={
            <Button variant="secondary" onClick={() => refresh()}>
              Reintentar
            </Button>
          }
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={26} />}
          title="Aún no tienes sesiones programadas"
          description="Tu tutor programará las sesiones. Si necesitas una, usa «Solicitar tutoría»."
        />
      ) : (
        <>
          <Card padded className={styles.card}>
            <h2 className={styles.section}>Próximas</h2>
            {upcoming.length === 0 ? (
              <p className={styles.empty}>No tienes sesiones próximas.</p>
            ) : (
              <ul className={styles.list}>
                {upcoming.map((s) => (
                  <SessionItem key={s.id} session={s} relations={relations} />
                ))}
              </ul>
            )}
          </Card>
          {past.length > 0 && (
            <Card padded className={styles.card}>
              <h2 className={styles.section}>Anteriores y canceladas</h2>
              <ul className={styles.list}>
                {past.map((s) => (
                  <SessionItem key={s.id} session={s} relations={relations} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
