import { Badge, Button, Card, EmptyState, PageHeader, TableSkeleton } from '@shared/components/ui';
import { CalendarIcon, XCircleIcon } from '@shared/components/icons';
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

function SessionItem({ session }: { session: TutoringSession }) {
  const status = getSessionStatus(session);
  const place =
    session.modality === 'VIRTUAL' ? session.meetingLink : session.location;

  return (
    <li className={styles.item}>
      <div className={styles.head}>
        <b className={styles.topic}>{session.topic}</b>
        <Badge tone={TONE[status]}>{SESSION_STATUS_LABEL[status]}</Badge>
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
      {session.cancelledAt && (
        <p className={styles.cancel}>
          Cancelada el {new Date(session.cancelledAt).toLocaleDateString('es-PE')}
          {session.cancelReason ? `: ${session.cancelReason}` : ''}. Si necesitas otra fecha, coordínala con tu
          tutor.
        </p>
      )}
    </li>
  );
}

// Agenda propia del tutorado (A15): solo consulta; programar, reprogramar y cancelar es del tutor.
export function MySessionsPage() {
  const { sessions, loading, error, refresh } = useOwnSessions();

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
        <TableSkeleton rows={4} columns={2} />
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
            <h3 className={styles.section}>Próximas</h3>
            {upcoming.length === 0 ? (
              <p className={styles.empty}>No tienes sesiones próximas.</p>
            ) : (
              <ul className={styles.list}>
                {upcoming.map((s) => (
                  <SessionItem key={s.id} session={s} />
                ))}
              </ul>
            )}
          </Card>
          {past.length > 0 && (
            <Card padded className={styles.card}>
              <h3 className={styles.section}>Anteriores y canceladas</h3>
              <ul className={styles.list}>
                {past.map((s) => (
                  <SessionItem key={s.id} session={s} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
