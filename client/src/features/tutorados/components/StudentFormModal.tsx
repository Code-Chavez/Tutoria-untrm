import React, { useState } from 'react';
import styles from './StudentFormModal.module.css';
import { Student, CreateStudentData, UpdateStudentData } from '../services/studentService';
import { School } from '../services/schoolService';
import { CloseIcon } from '@shared/components/icons';

interface StudentFormModalProps {
  onClose: () => void;
  onSubmit: (data: CreateStudentData | UpdateStudentData) => Promise<void>;
  studentToEdit: Student | null;
  schools: School[];
}

interface FormState {
  studentCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cycle: string;
  schoolId: string;
}

const CODE_PATTERN = /^\d{8,12}$/;

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  onClose,
  onSubmit,
  studentToEdit,
  schools,
}) => {
  // El componente se remonta (vía `key`) al cambiar el estudiante a editar,
  // así que el estado inicial se deriva del prop sin un efecto.
  const [form, setForm] = useState<FormState>(() =>
    studentToEdit
      ? {
          studentCode: studentToEdit.studentCode,
          firstName: studentToEdit.firstName,
          lastName: studentToEdit.lastName,
          email: studentToEdit.email ?? '',
          phone: studentToEdit.phone ?? '',
          cycle: String(studentToEdit.cycle),
          schoolId: studentToEdit.schoolId,
        }
      : {
          studentCode: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          cycle: '',
          schoolId: '',
        },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!CODE_PATTERN.test(form.studentCode.trim())) {
      next.studentCode = 'El código debe tener entre 8 y 12 dígitos numéricos.';
    }
    if (form.firstName.trim().length < 2) {
      next.firstName = 'Ingrese el nombre.';
    }
    if (form.lastName.trim().length < 2) {
      next.lastName = 'Ingrese el apellido.';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Correo inválido.';
    }
    const cycleNum = Number(form.cycle);
    if (!form.cycle || Number.isNaN(cycleNum) || cycleNum < 1 || cycleNum > 14) {
      next.cycle = 'El ciclo debe estar entre 1 y 14.';
    }
    if (!form.schoolId) {
      next.schoolId = 'Seleccione una escuela profesional.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: CreateStudentData = {
      studentCode: form.studentCode.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      cycle: Number(form.cycle),
      schoolId: form.schoolId,
    };

    try {
      setLoading(true);
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error submitting student form', error);
      alert('Ocurrió un error al guardar el tutorado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{studentToEdit ? 'Editar tutorado' : 'Nuevo tutorado'}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>
        <p className={styles.modalHint}>Datos de filiación del estudiante (Anexo 3).</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label htmlFor="studentCode">Código universitario</label>
              <input
                type="text"
                id="studentCode"
                name="studentCode"
                inputMode="numeric"
                className={styles.input}
                value={form.studentCode}
                onChange={handleChange}
                placeholder="Ej. 20191234"
              />
              {errors.studentCode && <span className={styles.error}>{errors.studentCode}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="cycle">Ciclo</label>
              <input
                type="number"
                id="cycle"
                name="cycle"
                min={1}
                max={14}
                className={styles.input}
                value={form.cycle}
                onChange={handleChange}
                placeholder="1 - 14"
              />
              {errors.cycle && <span className={styles.error}>{errors.cycle}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="firstName">Nombres</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                className={styles.input}
                value={form.firstName}
                onChange={handleChange}
              />
              {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName">Apellidos</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className={styles.input}
                value={form.lastName}
                onChange={handleChange}
              />
              {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Correo electrónico (opcional)</label>
              <input
                type="email"
                id="email"
                name="email"
                className={styles.input}
                value={form.email}
                onChange={handleChange}
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone">Teléfono (opcional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className={styles.input}
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="schoolId">Escuela profesional</label>
            <select
              id="schoolId"
              name="schoolId"
              className={styles.select}
              value={form.schoolId}
              onChange={handleChange}
            >
              <option value="">Seleccione una escuela…</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            {errors.schoolId && <span className={styles.error}>{errors.schoolId}</span>}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
