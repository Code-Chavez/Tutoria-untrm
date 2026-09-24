import React, { useEffect, useState } from 'react';
import { Button, SelectField } from '@shared/components/ui';
import { LinkIcon, CloseIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import styles from './LinkPortalAccountModal.module.css';

export interface PortalAccountOption {
  userId: string;
  fullName: string;
  email: string;
}

interface LinkPortalAccountModalProps {
  student: Student;
  options: PortalAccountOption[];
  loading?: boolean;
  serverError?: string;
  onSubmit: (userId: string | null) => void;
  onCancel: () => void;
}

// Vincula la cuenta de portal (rol Tutorado) de un estudiante, habilitando su
// autoservicio (p. ej. solicitar tutoría desde su propia cuenta).
export const LinkPortalAccountModal: React.FC<LinkPortalAccountModalProps> = ({
  student,
  options,
  loading,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const [userId, setUserId] = useState(student.userId ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Vincular cuenta de portal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <LinkIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Vincular cuenta de portal</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>
            Vincula la cuenta con la que este tutorado inicia sesión, para que pueda solicitar
            tutoría por sí mismo. Solo se listan cuentas con rol Tutorado que aún no están
            vinculadas a otro estudiante.
          </p>

          <div className={styles.field}>
            <label htmlFor="portalAccount">Cuenta de portal (Tutorado)</label>
            <SelectField
              id="portalAccount"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Sin vincular</option>
              {options.map((o) => (
                <option key={o.userId} value={o.userId}>
                  {o.fullName} · {o.email}
                </option>
              ))}
            </SelectField>
          </div>

          {serverError && <span className={styles.error}>{serverError}</span>}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} onClick={() => onSubmit(userId || null)}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
};
