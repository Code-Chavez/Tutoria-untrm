import React, { useEffect, useState } from 'react';
import { Button, SelectField } from '@shared/components/ui';
import { SendIcon, CloseIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import { CreateTutoringRequestData } from '@features/solicitudes/services/tutoringRequestService';
import styles from './TutoringRequestModal.module.css';

interface TutoringRequestModalProps {
  student: Student;
  loading?: boolean;
  serverError?: string;
  onSubmit: (data: CreateTutoringRequestData) => void;
  onCancel: () => void;
}

// Art. 20 del Protocolo: tipos de casos a ser tutorados.
const CASE_TYPES: { value: CreateTutoringRequestData['caseType']; label: string }[] = [
  { value: 'ACADEMIC', label: 'Académico' },
  { value: 'PSYCHOLOGICAL', label: 'Psicológico' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'HEALTH', label: 'Salud' },
];

export const TutoringRequestModal: React.FC<TutoringRequestModalProps> = ({
  student,
  loading,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const [source, setSource] = useState<'STUDENT' | 'INSTRUCTOR'>('STUDENT');
  const [instructorName, setInstructorName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [caseType, setCaseType] = useState<CreateTutoringRequestData['caseType']>('ACADEMIC');
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
    if (source === 'INSTRUCTOR' && (!instructorName.trim() || !courseName.trim())) {
      setError('Indica el nombre del docente y el curso.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Describe el motivo de la solicitud.');
      return;
    }
    onSubmit({
      source,
      instructorName: source === 'INSTRUCTOR' ? instructorName.trim() : undefined,
      courseName: source === 'INSTRUCTOR' ? courseName.trim() : undefined,
      caseType,
      reason: reason.trim(),
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Solicitud de tutoría"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <SendIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Solicitud de tutoría</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>Origen de la solicitud</label>
          <div className={styles.sourceOptions}>
            <label className={styles.radio}>
              <input
                type="radio"
                name="source"
                checked={source === 'STUDENT'}
                onChange={() => {
                  setSource('STUDENT');
                  setError('');
                }}
              />
              El propio estudiante
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="source"
                checked={source === 'INSTRUCTOR'}
                onChange={() => {
                  setSource('INSTRUCTOR');
                  setError('');
                }}
              />
              Docente de asignatura
            </label>
          </div>

          {source === 'INSTRUCTOR' && (
            <div className={styles.grid}>
              <div className={styles.field}>
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
              <div className={styles.field}>
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
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="caseType">Motivo (Art. 20)</label>
            <SelectField
              id="caseType"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CreateTutoringRequestData['caseType'])}
            >
              {CASE_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className={styles.field}>
            <label htmlFor="reason">Descripción del motivo</label>
            <textarea
              id="reason"
              className={styles.textarea}
              rows={4}
              value={reason}
              maxLength={1000}
              placeholder="Detalle de la situación que motiva la solicitud…"
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
            />
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
            Registrar solicitud
          </Button>
        </div>
      </div>
    </div>
  );
};
