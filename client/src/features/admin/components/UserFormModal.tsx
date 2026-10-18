import React, { useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { roleDisplayName } from '@shared/utils/roleLabel';
import { useDialog } from '@shared/hooks/useDialog';
import styles from './UserFormModal.module.css';
import { User, CreateUserData, UpdateUserData } from '../services/userService';
import { Role } from '../services/roleService';
import { CloseIcon } from '@shared/components/icons';
import type { School } from '@features/tutorados/services/schoolService';
import { REFERRAL_SERVICE_LABEL, type ReferralService } from '@features/derivaciones/services/referralService';
import { accountEmailProblem, normalizeEmail } from '@shared/utils/email';
import { useEmailPolicy } from '../hooks/useUsers';

// Un Profesional de Servicio solo ve y recibe los casos derivados a su servicio: sin él no recibiría ninguno.
const SERVICE_ROLE_NAME = 'Profesional de Servicio';
// Un docente tutor pertenece a una escuela (de ahí salen su facultad y su sede) y solo tutorea estudiantes de ella.
const TUTOR_ROLE_NAME = 'Docente Tutor';
// El Decano pertenece a una facultad y solo amonesta a los docentes de ella.
const DEAN_ROLE_NAME = 'Decano';
const SERVICES = Object.keys(REFERRAL_SERVICE_LABEL) as ReferralService[];

interface UserFormModalProps {
  onClose: () => void;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  userToEdit: User | null;
  roles: Role[];
  schools: School[];
  faculties: { id: string; name: string }[];
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  onClose,
  onSubmit,
  userToEdit,
  roles,
  schools,
  faculties,
}) => {
  // El componente se remonta (vía `key`) cuando cambia el usuario a editar,
  // así que el estado inicial se deriva del prop sin necesidad de un efecto.
  const [formData, setFormData] = useState<CreateUserData>(() =>
    userToEdit
      ? {
          email: userToEdit.email,
          firstName: userToEdit.firstName,
          lastName: userToEdit.lastName,
          roleId: userToEdit.roleId,
          phone: userToEdit.phone || '',
          service: userToEdit.service ?? '',
          schoolId: userToEdit.schoolId ?? '',
          facultyId: userToEdit.facultyId ?? '',
        }
      : { email: '', firstName: '', lastName: '', roleId: '', phone: '', service: '', schoolId: '', facultyId: '' },
  );
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const allowedDomains = useEmailPolicy();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const dialogRef = useDialog(onClose);
  const selectedRole = roles.find((r) => r.id === formData.roleId)?.name;
  const isServiceRole = selectedRole === SERVICE_ROLE_NAME;
  const isTutorRole = selectedRole === TUTOR_ROLE_NAME;
  const isDeanRole = selectedRole === DEAN_ROLE_NAME;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    // Mismas reglas que el servidor: forma única, formato y dominio permitido. El dominio se exige al crear o al cambiar el
    // correo (una cuenta anterior a la regla puede editarse sin tocar el suyo).
    const email = normalizeEmail(formData.email);
    const emailChanged = !userToEdit || email !== userToEdit.email;
    const emailProblem = emailChanged ? accountEmailProblem(email, allowedDomains) : null;
    if (emailProblem) {
      setSubmitError(emailProblem);
      return;
    }
    try {
      setLoading(true);
      await onSubmit({ ...formData, email, service: isServiceRole ? formData.service || null : null, schoolId: isTutorRole ? formData.schoolId || null : null, facultyId: isDeanRole ? formData.facultyId || null : null });
      onClose();
    } catch (error) {
      // Se muestra el motivo real que envía la API (p. ej. «el correo ya está registrado»), no un aviso genérico.
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="user-form-title">{userToEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {submitError && (
            <p role="alert" className={styles.submitError}>
              {submitError}
            </p>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="firstName">Nombre</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              className={styles.input}
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="lastName">Apellido</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              className={styles.input}
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.input}
              value={formData.email}
              onChange={handleChange}
              aria-describedby="email-help"
              required
            />
            {allowedDomains && (
              <small id="email-help" className={styles.help}>
                Correo institucional ({allowedDomains.map((d) => `@${d}`).join(' o ')})
              </small>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone">Teléfono (Opcional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className={styles.input}
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="roleId">Rol</label>
            <select
              id="roleId"
              name="roleId"
              className={styles.select}
              value={formData.roleId}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione un rol...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleDisplayName(role.name)}
                </option>
              ))}
            </select>
          </div>

          {isServiceRole && (
            <div className={styles.formGroup}>
              <label htmlFor="service">Servicio al que pertenece</label>
              <select
                id="service"
                name="service"
                className={styles.select}
                value={formData.service ?? ''}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un servicio...</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {REFERRAL_SERVICE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isTutorRole && (
            <div className={styles.formGroup}>
              <label htmlFor="schoolId">Escuela profesional</label>
              <select
                id="schoolId"
                name="schoolId"
                className={styles.select}
                value={formData.schoolId ?? ''}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione una escuela...</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isDeanRole && (
            <div className={styles.formGroup}>
              <label htmlFor="facultyId">Facultad</label>
              <select id="facultyId" name="facultyId" className={styles.select} value={formData.facultyId ?? ''} onChange={handleChange} required>
                <option value="">Seleccione una facultad...</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
