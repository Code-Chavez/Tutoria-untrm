import React, { useEffect, useState } from 'react';
import { useDialogFocus } from '@shared/hooks/useDialog';
import { useDraftForm } from '@shared/hooks/useDraftForm';
import { DraftNotice } from '@shared/components/ui';
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
  /** Quien escribe y la clave del borrador: con ellos, lo escrito se guarda en la pestaña y se recupera al recargar. */
  draftOwnerId?: string;
  draftKey?: string;
  onConfirm: (newTutorId: string, reason: string) => void;
  onCancel: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  student,
  tutors,
  currentTutorName,
  loading,
  serverError,
  draftOwnerId,
  draftKey,
  onConfirm,
  onCancel,
}) => {
  // Solo tiene sentido elegir entre tutores distintos al actual y de la misma escuela del tutorado.
  const options = tutors.filter((t) => t.tutorId !== student.tutorId && (!t.schoolId || t.schoolId === student.schoolId));

  const { form, set, restored, discard } = useDraftForm(draftOwnerId, draftKey ?? `reasignar.${student.id}`, { newTutorId: options[0]?.tutorId ?? '', reason: '' });
  const { newTutorId, reason } = form;
  const setNewTutorId = (v: typeof form.newTutorId) => set({ newTutorId: v });
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
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-label="Reasignar estudiante"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <SwitchIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Reasignar estudiante</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {restored && <DraftNotice onDiscard={discard} />}
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
                  {t.fullName} · {t.assignedCount} estudiante{t.assignedCount === 1 ? '' : 's'}
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
