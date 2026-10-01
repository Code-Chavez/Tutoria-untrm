import React, { useEffect, useMemo, useState } from 'react';
import { Button, SelectField } from '@shared/components/ui';
import { SendIcon, CloseIcon, InfoIcon } from '@shared/components/icons';
import { Student } from '@features/tutorados/services/studentService';
import {
  CreateReferralData,
  ReferralAspectCode,
  ReferralService,
  REFERRAL_ASPECTS,
  REFERRAL_SERVICE_LABEL,
  suggestReferralService,
} from '../services/referralService';
import styles from './ReferralFormModal.module.css';

interface ReferralFormModalProps {
  student: Student;
  loading?: boolean;
  serverError?: string;
  onSubmit: (data: CreateReferralData) => void;
  onCancel: () => void;
}

const CATEGORIES = ['Académicos', 'Sociales', 'Apariencia', 'Salud mental'] as const;
const SERVICES: ReferralService[] = [
  'ESCUELA',
  'PSICOPEDAGOGIA',
  'PSICOLOGIA',
  'ASISTENCIA_SOCIAL',
  'SALUD',
];

// Ficha de derivación (HU-28, Anexo N° 6): checklist de aspectos observados,
// motivo y servicio destino. El enrutamiento automático por aspecto (Art.
// 21) queda para HU-29; aquí el servicio se elige libremente entre los 5
// válidos.
export const ReferralFormModal: React.FC<ReferralFormModalProps> = ({
  student,
  loading,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const [checked, setChecked] = useState<Set<ReferralAspectCode>>(new Set());
  const [reason, setReason] = useState('');
  // El tutor puede elegir cualquiera de los 5 servicios sin restricción
  // (HU-29): mientras no lo toque, el select sigue la sugerencia calculada
  // en vivo a partir de los aspectos marcados; en cuanto elige uno, esa
  // elección manual prevalece aunque cambien los aspectos.
  const [manualService, setManualService] = useState<ReferralService | ''>('');
  const [receivingInstance, setReceivingInstance] = useState('');
  const [error, setError] = useState('');

  const suggestedService = useMemo(() => suggestReferralService([...checked]), [checked]);
  const effectiveService = manualService || suggestedService || '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const toggleAspect = (code: ReferralAspectCode) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setError('');
  };

  const submit = () => {
    if (checked.size === 0) {
      setError('Marca al menos un aspecto observado.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Describe el motivo de la derivación.');
      return;
    }
    if (!effectiveService) {
      setError('Selecciona el servicio al que se deriva.');
      return;
    }
    onSubmit({
      checkedAspects: [...checked],
      reason: reason.trim(),
      service: effectiveService,
      receivingInstance: receivingInstance.trim() || undefined,
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Ficha de derivación"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <SendIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Ficha de derivación</h2>
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
            <label>Aspectos observados</label>
            {CATEGORIES.map((category) => (
              <div key={category} className={styles.category}>
                <span className={styles.categoryTitle}>{category}</span>
                {REFERRAL_ASPECTS.filter((a) => a.category === category).map((aspect) => (
                  <label key={aspect.code} className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={checked.has(aspect.code)}
                      onChange={() => toggleAspect(aspect.code)}
                    />
                    {aspect.label}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.field}>
            <label htmlFor="referralReason">Motivo de la derivación</label>
            <textarea
              id="referralReason"
              className={styles.textarea}
              rows={3}
              value={reason}
              maxLength={1000}
              placeholder="Describe brevemente la situación observada…"
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="referralService">Servicio al que se deriva</label>
            <SelectField
              id="referralService"
              value={effectiveService}
              onChange={(e) => {
                setManualService(e.target.value as ReferralService);
                setError('');
              }}
            >
              <option value="">Selecciona un servicio…</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {REFERRAL_SERVICE_LABEL[s]}
                </option>
              ))}
            </SelectField>
            {suggestedService && (
              <span className={styles.suggestion}>
                Sugerido según los aspectos marcados: {REFERRAL_SERVICE_LABEL[suggestedService]}.
                Puedes elegir otro servicio si corresponde.
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="referralReceivingInstance">
              Instancia o profesional que recibe (opcional)
            </label>
            <input
              id="referralReceivingInstance"
              type="text"
              className={styles.input}
              value={receivingInstance}
              maxLength={200}
              placeholder="Ej. Psicólogo Juan Pérez - Consultorio 3"
              onChange={(e) => setReceivingInstance(e.target.value)}
            />
          </div>

          <div className={styles.hint}>
            <InfoIcon size={16} />
            La ficha es confidencial desde su creación (Anexo N° 6). Al registrarla se genera una
            constancia descargable.
          </div>

          {(error || serverError) && <span className={styles.error}>{error || serverError}</span>}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} onClick={submit}>
            Derivar caso
          </Button>
        </div>
      </div>
    </div>
  );
};
