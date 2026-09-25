import React, { useEffect } from 'react';
import { Badge, Button } from '@shared/components/ui';
import { CalendarIcon, CloseIcon, ClockIcon, UsersIcon, LinkIcon } from '@shared/components/icons';
import { TutoringSession } from '../services/sessionService';
import { getSessionStatus, SESSION_STATUS_LABEL } from '../utils/sessionStatus';
import type { Student } from '@features/tutorados/services/studentService';
import styles from './SessionDetailModal.module.css';

interface SessionDetailModalProps {
  session: TutoringSession;
  students: Student[];
  onClose: () => void;
}

const STATUS_TONE = {
  PROXIMA: 'info',
  EN_CURSO: 'success',
  REALIZADA: 'neutral',
} as const;

// Detalle de una sesión abierto desde el calendario (HU-21).
export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  students,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const start = new Date(session.scheduledAt);
  const end = new Date(session.endsAt);
  const status = getSessionStatus(session);
  const isGroup = session.studentIds.length > 1;

  const participants = session.studentIds.map((id) => {
    const student = students.find((s) => s.id === id);
    return student
      ? `${student.firstName} ${student.lastName} · ${student.studentCode}`
      : 'Tutorado';
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la sesión"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <CalendarIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>{session.topic}</h2>
            <p>{isGroup ? 'Sesión grupal' : 'Sesión individual'}</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.badges}>
            <Badge tone={STATUS_TONE[status]}>{SESSION_STATUS_LABEL[status]}</Badge>
            <Badge tone={isGroup ? 'warning' : 'info'}>{isGroup ? 'Grupal' : 'Individual'}</Badge>
          </div>

          <div className={styles.row}>
            <ClockIcon size={16} />
            <span>
              {start.toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' })} –{' '}
              {end.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })} (
              {session.durationMinutes} min)
            </span>
          </div>

          <div className={styles.row}>
            {session.modality === 'VIRTUAL' ? (
              <>
                <LinkIcon size={16} />
                {session.meetingLink ? (
                  <a href={session.meetingLink} target="_blank" rel="noreferrer">
                    {session.meetingLink}
                  </a>
                ) : (
                  <span>Sin enlace registrado</span>
                )}
              </>
            ) : (
              <>
                <CalendarIcon size={16} />
                <span>{session.location ?? 'Sin lugar registrado'}</span>
              </>
            )}
          </div>

          <div className={styles.participants}>
            <div className={styles.row}>
              <UsersIcon size={16} />
              <span>
                {participants.length} tutorado{participants.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ul>
              {participants.map((name, i) => (
                <li key={session.studentIds[i]}>{name}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
