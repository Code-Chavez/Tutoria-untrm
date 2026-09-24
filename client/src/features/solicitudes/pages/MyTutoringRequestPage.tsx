import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Button, SelectField } from '@shared/components/ui';
import { SendIcon } from '@shared/components/icons';
import {
  tutoringRequestService,
  CreateOwnTutoringRequestData,
} from '../services/tutoringRequestService';
import styles from './MyTutoringRequestPage.module.css';

interface Feedback {
  type: 'ok' | 'error';
  text: string;
}

// Art. 20 del Protocolo: tipos de casos a ser tutorados.
const CASE_TYPES: { value: CreateOwnTutoringRequestData['caseType']; label: string }[] = [
  { value: 'ACADEMIC', label: 'Académico' },
  { value: 'PSYCHOLOGICAL', label: 'Psicológico' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'HEALTH', label: 'Salud' },
];

// Autoservicio (Art. 19.b): el propio tutorado solicita tutoría desde su cuenta.
export function MyTutoringRequestPage() {
  const [caseType, setCaseType] = useState<CreateOwnTutoringRequestData['caseType']>('ACADEMIC');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (reason.trim().length < 3) {
      setFeedback({ type: 'error', text: 'Describe el motivo de la solicitud.' });
      return;
    }

    setSubmitting(true);
    try {
      const request = await tutoringRequestService.createOwnTutoringRequest({
        caseType,
        reason: reason.trim(),
      });
      setFeedback({
        type: 'ok',
        text: `Solicitud registrada y enrutada a ${request.routedToRole === 'tutor' ? 'tu tutor' : 'el coordinador de tu escuela'}.`,
      });
      setReason('');
    } catch (error) {
      setFeedback({ type: 'error', text: getApiErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Solicitar tutoría"
        subtitle="Cuéntanos qué necesitas y lo enrutaremos a tu tutor o coordinador."
        icon={<SendIcon size={22} />}
      />

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h3>Nueva solicitud</h3>
        </div>
        <div className={styles.panelBody}>
          <form onSubmit={handleSubmit}>
            {feedback && (
              <div className={feedback.type === 'ok' ? styles.ok : styles.error} role="alert">
                {feedback.text}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="caseType">Motivo (Art. 20)</label>
              <SelectField
                id="caseType"
                value={caseType}
                onChange={(e) =>
                  setCaseType(e.target.value as CreateOwnTutoringRequestData['caseType'])
                }
                disabled={submitting}
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
                rows={5}
                value={reason}
                maxLength={1000}
                placeholder="Detalle de la situación que motiva tu solicitud…"
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
              />
            </div>

            <Button type="submit" variant="primary" loading={submitting}>
              Registrar solicitud
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
