import React, { useEffect, useState } from 'react';
import { Button } from '@shared/components/ui';
import { AlertTriangleIcon, CloseIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import styles from './RiskModal.module.css';

interface RiskModalProps {
  student: Student;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const RiskModal: React.FC<RiskModalProps> = ({ student, loading, onConfirm, onCancel }) => {
  const [reason, setReason] = useState(student.riskReason ?? '');
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
      setError('Indica el motivo del riesgo (mínimo 3 caracteres).');
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
        aria-label="Marcar en riesgo académico"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <AlertTriangleIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Marcar en riesgo académico</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <label htmlFor="riskReason" className={styles.label}>
            Motivo del riesgo
          </label>
          <textarea
            id="riskReason"
            className={styles.textarea}
            rows={4}
            value={reason}
            maxLength={500}
            placeholder="Ej. Bajo rendimiento en dos cursos, inasistencias reiteradas…"
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            autoFocus
          />
          {error && <span className={styles.error}>{error}</span>}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} onClick={submit}>
            Marcar en riesgo
          </Button>
        </div>
      </div>
    </div>
  );
};
