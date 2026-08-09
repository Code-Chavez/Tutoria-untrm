import React, { useState, useEffect } from 'react';
import styles from './UserFormModal.module.css';
import { User, CreateUserData, UpdateUserData } from '../services/userService';
import { Role } from '../services/roleService';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  userToEdit: User | null;
  roles: Role[];
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userToEdit,
  roles,
}) => {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        email: userToEdit.email,
        firstName: userToEdit.firstName,
        lastName: userToEdit.lastName,
        roleId: userToEdit.roleId,
        phone: userToEdit.phone || '',
      });
    } else {
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        roleId: '',
        phone: '',
      });
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form', error);
      // Aqui podrías mostrar una notificación de error usando react-toastify si está configurado
      alert('Ocurrió un error al guardar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{userToEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
              required
            />
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
                  {role.name}
                </option>
              ))}
            </select>
          </div>

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
