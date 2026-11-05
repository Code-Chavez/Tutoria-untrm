import React, { useEffect, useState } from 'react';
import { useDialogFocus } from '@shared/hooks/useDialog';
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

  const dialogRef = useDialogFocus();
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
        ref={dialogRef}
        tabIndex={-1}
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
            Vincula la cuenta con la que este estudiante inicia sesión, para que pueda solicitar
            tutoría por sí mismo. Solo se listan cuentas con rol Estudiante que aún no están
            vinculadas a otro estudiante.
          </p>

          <div className={styles.field}>
            <label htmlFor="portalAccount">Cuenta de portal (Estudiante)</label>
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

          {options.length === 0 && (
            <p className={styles.empty} role="status">
              No hay cuentas disponibles para vincular. Primero crea el usuario con rol Estudiante en
              «Usuarios y roles» (con el correo con el que iniciará sesión); si ya existe, puede
              estar vinculado a otro estudiante.
            </p>
          )}

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
