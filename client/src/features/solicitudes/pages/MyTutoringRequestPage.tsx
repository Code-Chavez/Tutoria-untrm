import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Button, DraftNotice, SelectField } from '@shared/components/ui';
import { useDraft } from '@shared/hooks/useDraft';
import { SendIcon } from '@shared/components/icons';
import {
  tutoringRequestService,
  CreateOwnTutoringRequestData,
} from '../services/tutoringRequestService';
import { Badge } from '@shared/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { OWN_REQUESTS_KEY, useOwnRequestRecipient, useOwnTutoringRequests } from '../hooks/useTutoringRequests';
import { recipientAfter, recipientBefore } from '../utils/requestRecipient';
import { appointmentSummary } from '../utils/requestAppointment';
import { usePeriodStatus } from '@features/periodo/hooks/usePeriods';
import { CASE_TYPE_LABEL, REQUEST_STATUS_LABEL, type TutoringRequestStatus, type TutoringRequestView } from '../services/tutoringRequestService';
import styles from './MyTutoringRequestPage.module.css';

const EMPTY_FORM: { caseType: CreateOwnTutoringRequestData['caseType']; reason: string } = { caseType: 'ACADEMIC', reason: '' };
const isEmptyForm = (value: typeof EMPTY_FORM) => value.reason.trim() === '';

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

// Comienzos de frase para quien no sabe cómo empezar: se insertan en el cuadro y se pueden editar o borrar. No suponen
// ningún hecho sobre la persona; solo ayudan a redactar.
const EXAMPLES: Record<CreateOwnTutoringRequestData['caseType'], string[]> = {
  ACADEMIC: [
    'Necesito orientación para organizar mi estudio de ',
    'Tengo dificultades con el curso de ',
    'Quisiera apoyo para mejorar mi rendimiento en ',
  ],
  PSYCHOLOGICAL: [
    'Me gustaría conversar con un profesional sobre cómo me he sentido últimamente.',
    'Estoy pasando por una situación que me preocupa y quisiera orientación.',
  ],
  SOCIAL: [
    'Tengo una dificultad personal o familiar que afecta mis estudios y quisiera apoyo.',
    'Necesito orientación sobre una situación económica o social que me preocupa.',
  ],
  HEALTH: [
    'Necesito orientación sobre una situación de salud que afecta mis estudios.',
    'Quisiera saber a quién acudir por un problema de salud.',
  ],
};

// Autoservicio (Art. 19.b): el propio tutorado solicita tutoría desde su cuenta.
const STATUS_TONE: Record<TutoringRequestStatus, 'warning' | 'info' | 'success'> = {
  PENDIENTE: 'warning',
  EN_ATENCION: 'info',
  ATENDIDA: 'success',
};

function AppointmentNote({ appointment }: { appointment: NonNullable<TutoringRequestView['appointment']> }) {
  const summary = appointmentSummary(appointment);
  return (
    <p className={styles.historyResponse}>
      <Badge tone={summary.tone}>{summary.label}</Badge> {summary.text} {summary.next}{' '}
      {appointment.state === 'VIGENTE' && <Link to="/mis-sesiones">Ir a Mis sesiones</Link>}
    </p>
  );
}

export function MyTutoringRequestPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Sin periodo abierto la tutoría está en solo lectura: se ve el historial, no se puede solicitar.
  const { data: periodStatus } = usePeriodStatus();
  const closed = periodStatus ? !periodStatus.open : false;
  const notEnrolled = periodStatus?.open === true && periodStatus.enrolled === false;
  const readOnly = closed || notEnrolled;
  const history = useOwnTutoringRequests();
  // A quién llegará la solicitud: se dice antes de enviarla y después (con la misma regla con la que se enruta).
  const recipient = useOwnRequestRecipient();
  // Lo escrito se conserva si cambia de pantalla, recarga o lo interrumpen (borrador solo de esta pestaña; ver shared/utils/drafts).
  const {
    value: form,
    setValue: setForm,
    restored: draftRestored,
    discard: discardDraft,
  } = useDraft(user?.id, 'solicitud', EMPTY_FORM, isEmptyForm);
  const { caseType, reason } = form;
  const setCaseType = (value: CreateOwnTutoringRequestData['caseType']) => setForm((current) => ({ ...current, caseType: value }));
  const setReason = (value: string | ((current: string) => string)) =>
    setForm((current) => ({ ...current, reason: typeof value === 'function' ? value(current.reason) : value }));
  // Sin nadie que pueda recibirla hoy, no se deja enviar (el servidor tampoco la registraría): no se promete atención.
  const noRecipient = recipient?.kind === 'none';
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Un ejemplo ocupa el cuadro si está vacío; si ya hay texto, se agrega en otra línea para no perder lo escrito.
  const insertExample = (text: string) => setReason((current) => (current.trim() ? `${current.trimEnd()}\n${text}` : text));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (readOnly || noRecipient) return;

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
        text: recipientAfter(recipient, request.routedToRole),
      });
      discardDraft(); // ya se envió: no queda borrador
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
        subtitle="Cuéntanos qué necesitas y se la haremos llegar a tu tutor o a la coordinación de tu escuela."
        icon={<SendIcon size={22} />}
      />

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Nueva solicitud</h2>
        </div>
        <div className={styles.panelBody}>
          {closed && (
            <p role="status" className={styles.closedNote}>
              No hay un periodo académico abierto, así que por ahora no puedes registrar solicitudes. Tu historial sigue disponible abajo. Podrás
              solicitar tutoría cuando se abra el siguiente periodo y estés cargado en él.
            </p>
          )}
          {notEnrolled && (
            <p role="status" className={styles.closedNote}>
              No figuras en la carga del periodo {periodStatus?.period?.name}, así que por ahora no puedes registrar solicitudes. Tu historial sigue
              disponible abajo. Consulta con tu escuela para que te incluya en la carga.
            </p>
          )}
          <form onSubmit={handleSubmit}>
            {user && (
              <p className={styles.requester}>
                Solicitas como <b>{user.firstName} {user.lastName}</b> ({user.email}). Tu solicitud la verá solo quien debe atenderla.
              </p>
            )}
            {recipient && <p className={styles.recipient} role={noRecipient ? 'status' : undefined}>{recipientBefore(recipient)}</p>}
            {draftRestored && <DraftNotice onDiscard={discardDraft} />}
            {feedback && (
              <div className={feedback.type === 'ok' ? styles.ok : styles.error} role="alert">
                {feedback.text}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="caseType">Motivo</label>
              <SelectField
                id="caseType"
                value={caseType}
                onChange={(e) =>
                  setCaseType(e.target.value as CreateOwnTutoringRequestData['caseType'])
                }
                disabled={submitting || readOnly}
              >
                {CASE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className={styles.field}>
              <span className={styles.examplesLabel} id="examples-label">¿No sabes cómo empezar? Toca una frase y complétala:</span>
              <div className={styles.examples} role="group" aria-labelledby="examples-label">
                {EXAMPLES[caseType].map((example) => (
                  <button key={example} type="button" className={styles.example} onClick={() => insertExample(example)} disabled={submitting || readOnly}>
                    {example.trim()}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="reason">Descripción del motivo</label>
              <textarea
                id="reason"
                className={styles.textarea}
                rows={5}
                value={reason}
                maxLength={1000}
                placeholder="Cuéntanos con tus palabras qué necesitas y desde cuándo. Escribe solo lo que quieras compartir."
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting || readOnly}
              />
            </div>

            <Button type="submit" variant="primary" loading={submitting} disabled={readOnly || noRecipient}>
              Registrar solicitud
            </Button>
          </form>
        </div>
      </div>

      <div className={styles.panel} style={{ marginTop: 18 }}>
        <div className={styles.panelHead}>
          <h2>Mis solicitudes</h2>
        </div>
        <div className={styles.panelBody}>
          {history.loading ? (
            <p className={styles.historyEmpty} role="status">
              Cargando tus solicitudes…
            </p>
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
                  {r.appointment && <AppointmentNote appointment={r.appointment} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
