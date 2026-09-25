import React, { useEffect } from 'react';
import { Badge, Button } from '@shared/components/ui';
import {
  CalendarIcon,
  CloseIcon,
  ClockIcon,
  UsersIcon,
  LinkIcon,
  CheckCircleIcon,
} from '@shared/components/icons';
import { TutoringSession } from '../services/sessionService';
import { getSessionStatus, SESSION_STATUS_LABEL } from '../utils/sessionStatus';
import type { Student } from '@features/tutorados/services/studentService';
import styles from './SessionDetailModal.module.css';

// Tope por defecto (Anexo N°4); el servidor aplica el valor real a partir
// del parámetro del sistema. Aquí solo se usa para el texto informativo.
const DEFAULT_MAX_SESSIONS = 8;

interface SessionDetailModalProps {
  session: TutoringSession;
  students: Student[];
  allSessions: TutoringSession[];
  onClose: () => void;
  onRegisterAttendance: () => void;
  registeringAttendance?: boolean;
  attendanceError?: string;
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
  allSessions,
  onClose,
  onRegisterAttendance,
  registeringAttendance,
  attendanceError,
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

  // Cuántas sesiones individuales de esta misma tutoría (mismo tutor y
  // tutorado) ya tienen asistencia confirmada (Anexo N°4).
  const confirmedCount = isGroup
    ? 0
    : allSessions.filter(
        (s) =>
          s.tutorId === session.tutorId &&
          s.studentIds.length === 1 &&
          s.studentIds[0] === session.studentIds[0] &&
          s.attendance,
      ).length;
  const limitReached = confirmedCount >= DEFAULT_MAX_SESSIONS;
  const canRegister = !isGroup && !session.attendance && status !== 'PROXIMA' && !limitReached;

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

          {!isGroup && (
            <div className={styles.attendance}>
              <div className={styles.row}>
                <CheckCircleIcon size={16} />
                {session.attendance ? (
                  <span>
                    Asistencia registrada · Sesión {session.attendance.sequenceNumber} de{' '}
                    {DEFAULT_MAX_SESSIONS} · Confirmada el{' '}
                    {new Date(session.attendance.confirmedAt).toLocaleString('es-PE', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                ) : status === 'PROXIMA' ? (
                  <span>
                    Podrás registrar la asistencia (Anexo N° 4) cuando la sesión comience.
                  </span>
                ) : limitReached ? (
                  <span>
                    Se alcanzó el máximo de {DEFAULT_MAX_SESSIONS} sesiones registradas para esta
                    tutoría individual.
                  </span>
                ) : (
                  <span>
                    Sesión {confirmedCount + 1} de {DEFAULT_MAX_SESSIONS} · Asistencia sin
                    registrar.
                  </span>
                )}
              </div>
              {canRegister && (
                <Button size="sm" loading={registeringAttendance} onClick={onRegisterAttendance}>
                  Registrar asistencia
                </Button>
              )}
              {attendanceError && <span className={styles.error}>{attendanceError}</span>}
            </div>
          )}
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
