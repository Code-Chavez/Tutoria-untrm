import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Button, EmptyState } from '@shared/components/ui';
import { StarIcon, CheckCircleIcon } from '@shared/components/icons';
import {
  evaluationService,
  EVALUATION_ITEMS,
  EVALUATION_SCALE_LABEL,
  EvaluationScaleCode,
} from '../services/evaluationService';
import { useEvaluationStatus, useInvalidateEvaluationStatus } from '../hooks/useEvaluationStatus';
import styles from './EvaluationPage.module.css';

interface Feedback {
  type: 'ok' | 'error';
  text: string;
}

const SCALE_CODES = Object.keys(EVALUATION_SCALE_LABEL) as EvaluationScaleCode[];

// Cuestionario de evaluación de la función tutorial (HU-36, Anexo N°7):
// autoservicio del tutorado, una sola respuesta por periodo académico.
export function EvaluationPage() {
  const { status, loading } = useEvaluationStatus();
  const invalidateStatus = useInvalidateEvaluationStatus();

  const [answers, setAnswers] = useState<Record<string, EvaluationScaleCode>>({});
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const complete = answeredCount === EVALUATION_ITEMS.length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!complete) {
      setFeedback({ type: 'error', text: 'Responde los 20 ítems antes de enviar.' });
      return;
    }

    setSubmitting(true);
    try {
      await evaluationService.submit({
        scores: EVALUATION_ITEMS.map((item) => answers[item.code]),
        likes: likes.trim() || undefined,
        dislikes: dislikes.trim() || undefined,
      });
      setSubmitted(true);
      invalidateStatus();
    } catch (error) {
      setFeedback({ type: 'error', text: getApiErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.page}>Cargando…</div>;
  }

  if (submitted || status?.alreadyResponded) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Evaluar tutoría"
          subtitle="Cuestionario de evaluación de la función tutorial (Anexo N°7)"
          icon={<StarIcon size={22} />}
        />
        <EmptyState
          icon={<CheckCircleIcon size={26} />}
          title="Ya respondiste el cuestionario de este periodo"
          description={
            status?.periodName
              ? `Gracias por tu evaluación del periodo ${status.periodName}. Tu respuesta es confidencial.`
              : 'Gracias por tu evaluación. Tu respuesta es confidencial.'
          }
        />
      </div>
    );
  }

  if (!status?.canRespond) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Evaluar tutoría"
          subtitle="Cuestionario de evaluación de la función tutorial (Anexo N°7)"
          icon={<StarIcon size={22} />}
        />
        <EmptyState
          icon={<StarIcon size={26} />}
          title="La evaluación no está disponible por ahora"
          description="Aún no hay un periodo de evaluación habilitado, o no tienes un tutor asignado."
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Evaluar tutoría"
        subtitle={`Cuestionario de evaluación de la función tutorial (Anexo N°7) · Periodo ${status.periodName}`}
        icon={<StarIcon size={22} />}
      />

      <form onSubmit={handleSubmit}>
        {feedback && (
          <div className={feedback.type === 'ok' ? styles.ok : styles.error} role="alert">
            {feedback.text}
          </div>
        )}

        <p className={styles.intro}>
          Responde con la mayor sinceridad posible. Esta información es confidencial y solo se
          usará para mejorar el sistema de tutoría.
        </p>

        <div className={styles.panel}>
          <div className={styles.progress}>
            {answeredCount} de {EVALUATION_ITEMS.length} respondidas
          </div>

          <ol className={styles.items}>
            {EVALUATION_ITEMS.map((item, index) => (
              <li key={item.code} className={styles.item}>
                <div className={styles.itemLabel}>
                  <b>{index + 1}.</b> {item.label}
                </div>
                <div className={styles.scale} role="radiogroup" aria-label={item.label}>
                  {SCALE_CODES.map((code) => (
                    <label key={code} className={styles.scaleOption}>
                      <input
                        type="radio"
                        name={`item-${item.code}`}
                        value={code}
                        checked={answers[item.code] === code}
                        onChange={() => setAnswers((prev) => ({ ...prev, [item.code]: code }))}
                        disabled={submitting}
                      />
                      <span>{code}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.scaleLegend}>
            {SCALE_CODES.map((code) => (
              <span key={code}>
                <b>{code}</b> = {EVALUATION_SCALE_LABEL[code]}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.field}>
            <label htmlFor="likes">Me gustaría</label>
            <textarea
              id="likes"
              className={styles.textarea}
              rows={3}
              maxLength={1000}
              value={likes}
              placeholder="Características que te gustaría que se incorporaran en el programa de tutoría…"
              onChange={(e) => setLikes(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="dislikes">No me gusta</label>
            <textarea
              id="dislikes"
              className={styles.textarea}
              rows={3}
              maxLength={1000}
              value={dislikes}
              placeholder="Características que preferirías que se omitieran…"
              onChange={(e) => setDislikes(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <Button type="submit" variant="primary" loading={submitting} disabled={!complete}>
          Enviar evaluación
        </Button>
      </form>
    </div>
  );
}
