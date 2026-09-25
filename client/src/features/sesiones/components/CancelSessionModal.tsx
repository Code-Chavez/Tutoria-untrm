import React, { useEffect, useState } from 'react';
import { Button } from '@shared/components/ui';
import { AlertTriangleIcon, CloseIcon } from '@shared/components/icons';
import { TutoringSession } from '../services/sessionService';
import styles from './CancelSessionModal.module.css';

interface CancelSessionModalProps {
  session: TutoringSession;
  loading?: boolean;
  serverError?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

// Cancelación de sesión (HU-23): exige motivo y conserva la trazabilidad del
// cambio; no se puede cancelar una sesión ya realizada.
export const CancelSessionModal: React.FC<CancelSessionModalProps> = ({
  session,
  loading,
  serverError,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = () => {
    if (reason.trim().length < 3) {
      setError('Indica el motivo de la cancelación (mínimo 3 caracteres).');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Cancelar sesión"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <AlertTriangleIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Cancelar sesión</h2>
            <p>{session.topic}</p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <label htmlFor="cancelReason" className={styles.label}>
            Motivo de la cancelación
          </label>
          <textarea
            id="cancelReason"
            className={styles.textarea}
            rows={4}
            value={reason}
            maxLength={500}
            placeholder="Ej. El tutor tuvo una emergencia, el tutorado avisó que no podía asistir…"
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            autoFocus
          />
          {(error || serverError) && <span className={styles.error}>{error || serverError}</span>}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Volver
          </Button>
          <Button variant="danger" loading={loading} onClick={submit}>
            Cancelar sesión
          </Button>
        </div>
      </div>
    </div>
  );
};
