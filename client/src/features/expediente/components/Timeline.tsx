import React from 'react';
import { Badge, EmptyState } from '@shared/components/ui';
import {
  ClipboardIcon,
  SwitchIcon,
  FolderIcon,
  CheckCircleIcon,
  ActivityIcon,
  SendIcon,
} from '@shared/components/icons';
import {
  REFERRAL_SERVICE_LABEL,
  REFERRAL_STATUS_LABEL,
} from '@features/derivaciones/services/referralService';
import { StudentRecordEvent } from '../services/studentRecordService';
import styles from './Timeline.module.css';

interface TimelineProps {
  events: StudentRecordEvent[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const EVENT_TITLES: Record<StudentRecordEvent['type'], string> = {
  interview: 'Entrevista inicial tutorial',
  assignment: 'Asignación de tutor',
  attendance: 'Asistencia a sesión',
  followUp: 'Ficha de seguimiento',
  referral: 'Derivación a servicio',
};

function EventIcon({ type }: { type: StudentRecordEvent['type'] }) {
  switch (type) {
    case 'interview':
      return <ClipboardIcon size={16} />;
    case 'assignment':
      return <SwitchIcon size={16} />;
    case 'followUp':
      return <ActivityIcon size={16} />;
    case 'referral':
      return <SendIcon size={16} />;
    default:
      return <CheckCircleIcon size={16} />;
  }
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<FolderIcon size={26} />}
        title="Sin registros en el expediente"
        description="Aquí aparecerán la entrevista inicial, la asignación de tutor, la asistencia a sesiones, los seguimientos y las derivaciones."
      />
    );
  }

  return (
    <ol className={styles.timeline}>
      {events.map((event) => (
        <li key={`${event.type}-${event.id}`} className={styles.item}>
          <span className={`${styles.icon} ${styles[event.type]}`}>
            <EventIcon type={event.type} />
          </span>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <b>{EVENT_TITLES[event.type]}</b>
              <span className={styles.date}>{formatDate(event.date)}</span>
            </div>

            {event.type === 'interview' && (
              <div className={styles.cardBody}>
                <div className={styles.motives}>
                  {event.motives.map((m) => (
                    <Badge key={m} tone="info">
                      {m}
                    </Badge>
                  ))}
                </div>
                <p>
                  <b>Aspectos tratados:</b> {event.aspectsDiscussed}
                </p>
                <p>
                  <b>Acuerdos:</b> {event.agreements}
                </p>
                <span className={styles.meta}>Registrada por {event.conductedByName}</span>
              </div>
            )}

            {event.type === 'assignment' && (
              <div className={styles.cardBody}>
                <p>
                  {event.previousTutorName ? (
                    <>
                      De <b>{event.previousTutorName}</b> a <b>{event.newTutorName}</b>
                    </>
                  ) : (
                    <>
                      Asignado a <b>{event.newTutorName}</b>
                    </>
                  )}
                </p>
                <span className={styles.meta}>Motivo: {event.reason}</span>
              </div>
            )}

            {event.type === 'attendance' && (
              <div className={styles.cardBody}>
                <p>
                  Sesión {event.sequenceNumber} de 8 (Anexo N° 4): <b>{event.topic}</b>
                </p>
                <span className={styles.meta}>Confirmada con {event.tutorName}</span>
              </div>
            )}

            {event.type === 'followUp' && (
              <div className={styles.cardBody}>
                <p>
                  <b>Motivo:</b> {event.reason}
                </p>
                <p>
                  <b>Acuerdos:</b> {event.agreements}
                </p>
                {event.instructorName && (
                  <p>
                    Con <b>{event.instructorName}</b> · {event.courseName} · Ciclo{' '}
                    {event.courseCycle}
                  </p>
                )}
                <span className={styles.meta}>Registrada por {event.conductedByName}</span>
              </div>
            )}

            {event.type === 'referral' && (
              <div className={styles.cardBody}>
                <div className={styles.motives}>
                  <Badge tone="info">{REFERRAL_SERVICE_LABEL[event.service]}</Badge>
                  <Badge tone="neutral">{REFERRAL_STATUS_LABEL[event.status]}</Badge>
                </div>
                {event.receivingInstance && (
                  <span className={styles.meta}>Recibe: {event.receivingInstance}</span>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};
