import React, { useEffect, useState } from 'react';
import { Button } from '@shared/components/ui';
import { CalendarIcon, CloseIcon, InfoIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import { ScheduleSessionData, SessionModality } from '@features/sesiones/services/sessionService';
import styles from './SessionFormModal.module.css';

interface SessionFormModalProps {
  student: Student;
  durationMinutes: number;
  loading?: boolean;
  serverError?: string;
  onSubmit: (data: ScheduleSessionData) => void;
  onCancel: () => void;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  student,
  durationMinutes,
  loading,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [topic, setTopic] = useState('');
  const [modality, setModality] = useState<SessionModality>('PRESENCIAL');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = () => {
    if (!date || !time) {
      setError('Indica la fecha y la hora de la sesión.');
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('Fecha u hora inválidas.');
      return;
    }
    if (topic.trim().length < 3) {
      setError('Indica el tema de la sesión.');
      return;
    }
    if (modality === 'PRESENCIAL' && !location.trim()) {
      setError('Indica el lugar de la sesión presencial.');
      return;
    }
    if (modality === 'VIRTUAL' && !meetingLink.trim()) {
      setError('Indica el enlace de la videollamada.');
      return;
    }
    onSubmit({
      studentIds: [student.id],
      topic: topic.trim(),
      scheduledAt: scheduledAt.toISOString(),
      modality,
      location: modality === 'PRESENCIAL' ? location.trim() : undefined,
      meetingLink: modality === 'VIRTUAL' ? meetingLink.trim() : undefined,
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Programar sesión de tutoría"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <CalendarIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Programar sesión</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="sessionDate">Fecha</label>
              <input
                id="sessionDate"
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setError('');
                }}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="sessionTime">Hora</label>
              <input
                id="sessionTime"
                type="time"
                className={styles.input}
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setError('');
                }}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="topic">Tema de la sesión</label>
            <input
              id="topic"
              type="text"
              className={styles.input}
              placeholder="Ej. Reforzamiento de Cálculo I"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setError('');
              }}
            />
          </div>

          <label className={styles.label}>Modalidad (Art. 8)</label>
          <div className={styles.sourceOptions}>
            <label className={styles.radio}>
              <input
                type="radio"
                name="modality"
                checked={modality === 'PRESENCIAL'}
                onChange={() => {
                  setModality('PRESENCIAL');
                  setError('');
                }}
              />
              Presencial
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="modality"
                checked={modality === 'VIRTUAL'}
                onChange={() => {
                  setModality('VIRTUAL');
                  setError('');
                }}
              />
              Virtual
            </label>
          </div>

          {modality === 'PRESENCIAL' ? (
            <div className={styles.field}>
              <label htmlFor="location">Lugar</label>
              <input
                id="location"
                type="text"
                className={styles.input}
                placeholder="Ej. Oficina de tutoría 204"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setError('');
                }}
              />
            </div>
          ) : (
            <div className={styles.field}>
              <label htmlFor="meetingLink">Enlace de videollamada</label>
              <input
                id="meetingLink"
                type="text"
                className={styles.input}
                placeholder="Ej. https://meet.google.com/xxx-xxxx-xxx"
                value={meetingLink}
                onChange={(e) => {
                  setMeetingLink(e.target.value);
                  setError('');
                }}
              />
            </div>
          )}

          <div className={styles.hint}>
            <InfoIcon size={16} />
            La sesión tendrá una duración de {durationMinutes} minutos (Art. 15.c del Protocolo). Se
            notificará al tutorado cuando el módulo de notificaciones esté disponible.
          </div>

          {(error || serverError) && (
            <span className={styles.error}>{error || serverError}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} onClick={submit}>
            Programar sesión
          </Button>
        </div>
      </div>
    </div>
  );
};
