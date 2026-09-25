import React, { useEffect, useState } from 'react';
import { Button } from '@shared/components/ui';
import { ActivityIcon, CloseIcon, InfoIcon } from '@shared/components/icons';
import { Student } from '@features/tutorados/services/studentService';
import { CreateFollowUpData } from '../services/followUpService';
import styles from './FollowUpFormModal.module.css';

interface FollowUpFormModalProps {
  student: Student;
  loading?: boolean;
  serverError?: string;
  onSubmit: (data: CreateFollowUpData) => void;
  onCancel: () => void;
}

// Ficha de seguimiento (HU-24, Anexo N° 5): motivo y acuerdos, con los datos
// del docente de asignatura cuando el acuerdo se tomó con él en vez de con
// el propio tutorado.
export const FollowUpFormModal: React.FC<FollowUpFormModalProps> = ({
  student,
  loading,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [agreements, setAgreements] = useState('');
  const [withInstructor, setWithInstructor] = useState(false);
  const [instructorName, setInstructorName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCycle, setCourseCycle] = useState('');
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
      setError('Describe el motivo del seguimiento.');
      return;
    }
    if (agreements.trim().length < 3) {
      setError('Describe los acuerdos tomados.');
      return;
    }
    if (withInstructor && (!instructorName.trim() || !courseName.trim() || !courseCycle)) {
      setError('Indica el nombre del docente, el curso y el ciclo.');
      return;
    }
    onSubmit({
      reason: reason.trim(),
      agreements: agreements.trim(),
      withInstructor,
      instructorName: withInstructor ? instructorName.trim() : undefined,
      courseName: withInstructor ? courseName.trim() : undefined,
      courseCycle: withInstructor ? Number(courseCycle) : undefined,
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Ficha de seguimiento"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <ActivityIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Ficha de seguimiento</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label htmlFor="followUpReason">Motivo de seguimiento</label>
            <textarea
              id="followUpReason"
              className={styles.textarea}
              rows={3}
              value={reason}
              maxLength={1000}
              placeholder="Ej. Seguimiento al acuerdo de reforzamiento en Cálculo…"
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
            />
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={withInstructor}
              onChange={(e) => {
                setWithInstructor(e.target.checked);
                setError('');
              }}
            />
            El acuerdo es con un docente de asignatura
          </label>

          {withInstructor && (
            <div className={styles.field}>
              <div className={styles.instructorGrid}>
                <div>
                  <label htmlFor="instructorName">Nombre del docente</label>
                  <input
                    id="instructorName"
                    type="text"
                    className={styles.input}
                    value={instructorName}
                    onChange={(e) => {
                      setInstructorName(e.target.value);
                      setError('');
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="courseName">Curso</label>
                  <input
                    id="courseName"
                    type="text"
                    className={styles.input}
                    value={courseName}
                    onChange={(e) => {
                      setCourseName(e.target.value);
                      setError('');
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="courseCycle">Ciclo</label>
                  <input
                    id="courseCycle"
                    type="number"
                    min={1}
                    max={14}
                    className={styles.input}
                    value={courseCycle}
                    onChange={(e) => {
                      setCourseCycle(e.target.value);
                      setError('');
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="followUpAgreements">Acuerdos tomados</label>
            <textarea
              id="followUpAgreements"
              className={styles.textarea}
              rows={4}
              value={agreements}
              maxLength={1000}
              placeholder="Ej. El estudiante se compromete a asistir a asesorías los martes…"
              onChange={(e) => {
                setAgreements(e.target.value);
                setError('');
              }}
            />
          </div>

          <div className={styles.hint}>
            <InfoIcon size={16} />
            La ficha se agrega al expediente del tutorado (Anexo N° 5) para dar continuidad al
            acompañamiento.
          </div>

          {(error || serverError) && <span className={styles.error}>{error || serverError}</span>}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} onClick={submit}>
            Registrar seguimiento
          </Button>
        </div>
      </div>
    </div>
  );
};
