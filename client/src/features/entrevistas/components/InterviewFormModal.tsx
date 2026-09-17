import React, { useEffect, useState } from 'react';
import { Button, Stepper } from '@shared/components/ui';
import { ClipboardIcon, CloseIcon, CheckCircleIcon } from '@shared/components/icons';
import { useAuth } from '@features/auth/hooks/useAuth';
import { Student } from '@features/tutorados/services/studentService';
import { CreateInterviewData } from '../services/interviewService';
import styles from './InterviewFormModal.module.css';

const STEPS = ['Filiación', 'Motivo', 'Aspectos', 'Acuerdos'];

interface InterviewFormModalProps {
  student: Student;
  schoolName: string;
  loading?: boolean;
  serverError?: string;
  onSubmit: (data: CreateInterviewData) => void;
  onCancel: () => void;
}

interface FormState {
  birthDate: string;
  originPlace: string;
  age: string;
  religion: string;
  maritalStatus: string;
  siblingsOrder: string;
  address: string;
  admissionYear: string;
  motiveAcademic: boolean;
  motivePersonalEmotional: boolean;
  motiveVocational: boolean;
  motiveDetail: string;
  aspectsDiscussed: string;
  agreements: string;
}

const EMPTY_FORM: FormState = {
  birthDate: '',
  originPlace: '',
  age: '',
  religion: '',
  maritalStatus: '',
  siblingsOrder: '',
  address: '',
  admissionYear: '',
  motiveAcademic: false,
  motivePersonalEmotional: false,
  motiveVocational: false,
  motiveDetail: '',
  aspectsDiscussed: '',
  agreements: '',
};

export const InterviewFormModal: React.FC<InterviewFormModalProps> = ({
  student,
  schoolName,
  loading,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = (): boolean => {
    if (step === 1 && !form.motiveAcademic && !form.motivePersonalEmotional && !form.motiveVocational) {
      setError('Marca al menos un motivo de la entrevista.');
      return false;
    }
    if (step === 2 && form.aspectsDiscussed.trim().length < 3) {
      setError('Describe los aspectos tratados o dificultades manifestadas.');
      return false;
    }
    if (step === 3 && form.agreements.trim().length < 3) {
      setError('Describe los acuerdos tomados.');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    if (!validateStep()) return;
    const data: CreateInterviewData = {
      birthDate: form.birthDate || undefined,
      originPlace: form.originPlace.trim() || undefined,
      age: form.age ? Number(form.age) : undefined,
      religion: form.religion.trim() || undefined,
      maritalStatus: form.maritalStatus.trim() || undefined,
      siblingsOrder: form.siblingsOrder.trim() || undefined,
      address: form.address.trim() || undefined,
      admissionYear: form.admissionYear ? Number(form.admissionYear) : undefined,
      motiveAcademic: form.motiveAcademic,
      motivePersonalEmotional: form.motivePersonalEmotional,
      motiveVocational: form.motiveVocational,
      motiveDetail: form.motiveDetail.trim() || undefined,
      aspectsDiscussed: form.aspectsDiscussed.trim(),
      agreements: form.agreements.trim(),
    };
    onSubmit(data);
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Entrevista inicial tutorial"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <ClipboardIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Entrevista inicial tutorial</h2>
            <p>
              {student.firstName} {student.lastName} · {student.studentCode} · {schoolName} · Ciclo{' '}
              {student.cycle}
            </p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <Stepper steps={STEPS} current={step} label="Progreso de la entrevista" />

          {step === 0 && (
            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="birthDate">Fecha de nacimiento</label>
                <input
                  id="birthDate"
                  type="date"
                  className={styles.input}
                  value={form.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="originPlace">Procedencia</label>
                <input
                  id="originPlace"
                  type="text"
                  className={styles.input}
                  value={form.originPlace}
                  onChange={(e) => set('originPlace', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="age">Edad</label>
                <input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  className={styles.input}
                  value={form.age}
                  onChange={(e) => set('age', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="religion">Religión</label>
                <input
                  id="religion"
                  type="text"
                  className={styles.input}
                  value={form.religion}
                  onChange={(e) => set('religion', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="maritalStatus">Estado civil</label>
                <input
                  id="maritalStatus"
                  type="text"
                  className={styles.input}
                  value={form.maritalStatus}
                  onChange={(e) => set('maritalStatus', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="siblingsOrder">Orden / N° de hermanos</label>
                <input
                  id="siblingsOrder"
                  type="text"
                  className={styles.input}
                  placeholder="Ej. 2do de 4"
                  value={form.siblingsOrder}
                  onChange={(e) => set('siblingsOrder', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="admissionYear">Año de ingreso</label>
                <input
                  id="admissionYear"
                  type="number"
                  min={1980}
                  max={2100}
                  className={styles.input}
                  value={form.admissionYear}
                  onChange={(e) => set('admissionYear', e.target.value)}
                />
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="address">Dirección</label>
                <input
                  id="address"
                  type="text"
                  className={styles.input}
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className={styles.sectionHint}>
                Marca al menos un motivo de la entrevista (Anexo N° 3, sección III).
              </p>
              <div className={styles.checks}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.motiveAcademic}
                    onChange={(e) => set('motiveAcademic', e.target.checked)}
                  />
                  Académica
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.motivePersonalEmotional}
                    onChange={(e) => set('motivePersonalEmotional', e.target.checked)}
                  />
                  Personal-emocional
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.motiveVocational}
                    onChange={(e) => set('motiveVocational', e.target.checked)}
                  />
                  Vocacional-profesional
                </label>
              </div>
              <div className={styles.field}>
                <label htmlFor="motiveDetail">Detalle (opcional)</label>
                <textarea
                  id="motiveDetail"
                  className={styles.textarea}
                  rows={3}
                  value={form.motiveDetail}
                  onChange={(e) => set('motiveDetail', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.field}>
              <label htmlFor="aspectsDiscussed">
                Aspectos tratados o dificultades manifestadas (académicas y/o personales)
              </label>
              <textarea
                id="aspectsDiscussed"
                className={styles.textarea}
                rows={6}
                value={form.aspectsDiscussed}
                onChange={(e) => set('aspectsDiscussed', e.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <>
              <div className={styles.field}>
                <label htmlFor="agreements">Acuerdos tomados</label>
                <textarea
                  id="agreements"
                  className={styles.textarea}
                  rows={6}
                  value={form.agreements}
                  onChange={(e) => set('agreements', e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.confirmBox}>
                <CheckCircleIcon size={16} />
                Se registrará como confirmado por{' '}
                <b>
                  {user?.firstName} {user?.lastName}
                </b>{' '}
                ({user?.role}), en reemplazo de la firma física del Anexo N° 3.
              </div>
            </>
          )}

          {(error || serverError) && (
            <span className={styles.error}>{error || serverError}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={step === 0 ? onCancel : goBack}>
            {step === 0 ? 'Cancelar' : 'Atrás'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={goNext}>
              Siguiente
            </Button>
          ) : (
            <Button variant="primary" loading={loading} onClick={handleSubmit}>
              Registrar entrevista
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
