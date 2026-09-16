import React, { useEffect, useState } from 'react';
import { Button, SelectField } from '@shared/components/ui';
import { SwitchIcon, CloseIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import { TutorWorkload } from '@features/asignacion/services/assignmentService';
import styles from './ReassignModal.module.css';

interface ReassignModalProps {
  student: Student;
  tutors: TutorWorkload[];
  currentTutorName: string | null;
  loading?: boolean;
  /** Error del servidor (p. ej. de red o de validación) a mostrar en el modal. */
  serverError?: string;
  onConfirm: (newTutorId: string, reason: string) => void;
  onCancel: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  student,
  tutors,
  currentTutorName,
  loading,
  serverError,
  onConfirm,
  onCancel,
}) => {
  // Solo tiene sentido elegir entre tutores distintos al actual.
  const options = tutors.filter((t) => t.tutorId !== student.tutorId);

  const [newTutorId, setNewTutorId] = useState(options[0]?.tutorId ?? '');
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
    if (!newTutorId) {
      setError('Selecciona el nuevo tutor.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Indica el motivo de la reasignación (mínimo 3 caracteres).');
      return;
    }
    onConfirm(newTutorId, reason.trim());
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Reasignar tutorado"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <SwitchIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Reasignar tutorado</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.currentTutor}>
            <span>Tutor actual</span>
            <b>{currentTutorName ?? 'Sin asignar'}</b>
          </div>

          <label htmlFor="newTutorId" className={styles.label}>
            Nuevo tutor
          </label>
          {options.length === 0 ? (
            <p className={styles.noOptions}>No hay otros Docentes Tutores disponibles.</p>
          ) : (
            <SelectField
              id="newTutorId"
              value={newTutorId}
              onChange={(e) => {
                setNewTutorId(e.target.value);
                setError('');
              }}
            >
              <option value="">Seleccione un tutor…</option>
              {options.map((t) => (
                <option key={t.tutorId} value={t.tutorId}>
                  {t.fullName} · {t.assignedCount} tutorado{t.assignedCount === 1 ? '' : 's'}
                </option>
              ))}
            </SelectField>
          )}

          <label htmlFor="reassignReason" className={styles.label}>
            Motivo de la reasignación
          </label>
          <textarea
            id="reassignReason"
            className={styles.textarea}
            rows={3}
            value={reason}
            maxLength={500}
            placeholder="Ej. Reorganización de carga entre tutores…"
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
          />
          {(error || serverError) && (
            <span className={styles.error}>{error || serverError}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            loading={loading}
            disabled={options.length === 0}
            onClick={submit}
          >
            Reasignar
          </Button>
        </div>
      </div>
    </div>
  );
};
