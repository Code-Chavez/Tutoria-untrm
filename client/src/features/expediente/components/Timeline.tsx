import React from 'react';
import { Badge, EmptyState } from '@shared/components/ui';
import { ClipboardIcon, SwitchIcon, FolderIcon } from '@shared/components/icons';
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

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<FolderIcon size={26} />}
        title="Sin registros en el expediente"
        description="Aquí aparecerán la entrevista inicial, la asignación de tutor y, en próximas iteraciones, sesiones, seguimientos y derivaciones."
      />
    );
  }

  return (
    <ol className={styles.timeline}>
      {events.map((event) => (
        <li key={`${event.type}-${event.id}`} className={styles.item}>
          <span className={`${styles.icon} ${styles[event.type]}`}>
            {event.type === 'interview' ? <ClipboardIcon size={16} /> : <SwitchIcon size={16} />}
          </span>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <b>{event.type === 'interview' ? 'Entrevista inicial tutorial' : 'Asignación de tutor'}</b>
              <span className={styles.date}>{formatDate(event.date)}</span>
            </div>

            {event.type === 'interview' ? (
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
            ) : (
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
          </div>
        </li>
      ))}
    </ol>
  );
};
