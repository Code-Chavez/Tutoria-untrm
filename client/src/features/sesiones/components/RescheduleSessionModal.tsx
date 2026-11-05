import React, { useEffect, useState } from 'react';
import { useDialogFocus } from '@shared/hooks/useDialog';
import { useDraftForm } from '@shared/hooks/useDraftForm';
import { DraftNotice } from '@shared/components/ui';
import { Button } from '@shared/components/ui';
import { CalendarIcon, CloseIcon } from '@shared/components/icons';
import { TutoringSession, RescheduleSessionData } from '../services/sessionService';
import styles from './RescheduleSessionModal.module.css';

interface RescheduleSessionModalProps {
  session: TutoringSession;
  loading?: boolean;
  serverError?: string;
  /** Quien escribe y la clave del borrador: con ellos, lo escrito se guarda en la pestaña y se recupera al recargar. */
  draftOwnerId?: string;
  draftKey?: string;
  onSubmit: (data: RescheduleSessionData) => void;
  onCancel: () => void;
}

// Reprogramación de sesión (HU-23): exige motivo y conserva la trazabilidad
// del cambio; no se puede reprogramar una sesión ya realizada.
export const RescheduleSessionModal: React.FC<RescheduleSessionModalProps> = ({
  session,
  loading,
  serverError,
  draftOwnerId,
  draftKey,
  onSubmit,
  onCancel,
}) => {
  const { form, set, restored, discard } = useDraftForm(draftOwnerId, draftKey ?? `reprogramar.${session.id}`, { date: '', time: '', reason: '' });
  const { date, time, reason } = form;
  const setDate = (v: typeof form.date) => set({ date: v });
  const setTime = (v: typeof form.time) => set({ time: v });
  const setReason = (v: typeof form.reason) => set({ reason: v });
  const [error, setError] = useState('');

  const dialogRef = useDialogFocus();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = () => {
    if (!date || !time) {
      setError('Indica la nueva fecha y hora de la sesión.');
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('Fecha u hora inválidas.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Indica el motivo de la reprogramación.');
      return;
    }
    onSubmit({ scheduledAt: scheduledAt.toISOString(), reason: reason.trim() });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-label="Reprogramar sesión"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <CalendarIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Reprogramar sesión</h2>
            <p>{session.topic}</p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {restored && <DraftNotice onDiscard={discard} />}
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="rescheduleDate">Nueva fecha</label>
              <input
                id="rescheduleDate"
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
              <label htmlFor="rescheduleTime">Nueva hora</label>
              <input
                id="rescheduleTime"
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
            <label htmlFor="rescheduleReason">Motivo de la reprogramación</label>
            <textarea
              id="rescheduleReason"
              className={styles.textarea}
              rows={3}
              value={reason}
              maxLength={500}
              placeholder="Ej. El estudiante solicitó cambio de horario…"
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
            />
          </div>

          <p className={styles.note}>Cada estudiante con cuenta del portal recibe un aviso con el nuevo horario y este motivo.</p>

          {(error || serverError) && <span className={styles.error}>{error || serverError}</span>}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Volver
          </Button>
          <Button variant="primary" loading={loading} onClick={submit}>
            Reprogramar
          </Button>
        </div>
      </div>
    </div>
  );
};
