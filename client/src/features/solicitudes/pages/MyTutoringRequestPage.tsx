import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Button, SelectField } from '@shared/components/ui';
import { SendIcon } from '@shared/components/icons';
import {
  tutoringRequestService,
  CreateOwnTutoringRequestData,
} from '../services/tutoringRequestService';
import { Badge } from '@shared/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { OWN_REQUESTS_KEY, useOwnTutoringRequests } from '../hooks/useTutoringRequests';
import { CASE_TYPE_LABEL, REQUEST_STATUS_LABEL, type TutoringRequestStatus } from '../services/tutoringRequestService';
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
const STATUS_TONE: Record<TutoringRequestStatus, 'warning' | 'info' | 'success'> = {
  PENDIENTE: 'warning',
  EN_ATENCION: 'info',
  ATENDIDA: 'success',
};

export function MyTutoringRequestPage() {
  const queryClient = useQueryClient();
  const history = useOwnTutoringRequests();
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
      await queryClient.invalidateQueries({ queryKey: OWN_REQUESTS_KEY });
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

      <div className={styles.panel} style={{ marginTop: 18 }}>
        <div className={styles.panelHead}>
          <h3>Mis solicitudes</h3>
        </div>
        <div className={styles.panelBody}>
          {history.loading ? (
            <p className={styles.historyEmpty}>Cargando…</p>
          ) : history.error ? (
            <p className={styles.error} role="alert">
              No se pudo cargar tu historial. Recarga la página.
            </p>
          ) : history.requests.length === 0 ? (
            <p className={styles.historyEmpty}>Aún no has registrado solicitudes.</p>
          ) : (
            <ul className={styles.history}>
              {history.requests.map((r) => (
                <li key={r.id} className={styles.historyItem}>
                  <div className={styles.historyHead}>
                    <b>{CASE_TYPE_LABEL[r.caseType]}</b>
                    <Badge tone={STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <p className={styles.historyReason}>{r.reason}</p>
                  <span className={styles.historyMeta}>
                    Enviada el {new Date(r.createdAt).toLocaleDateString('es-PE')} a {r.routedToName}
                  </span>
                  {r.responseNote && (
                    <p className={styles.historyResponse}>
                      <b>Respuesta{r.handledByName ? ` de ${r.handledByName}` : ''}:</b> {r.responseNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
