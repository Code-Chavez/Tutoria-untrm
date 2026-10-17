import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { DAY_LABEL, tutorAcceptanceService, type AcceptanceInfo, type AvailabilitySlot } from '../services/tutorAcceptanceService';
import styles from '@features/auth/components/LoginPage.module.css';
import local from './TutorAcceptancePage.module.css';

const EMPTY_SLOT: AvailabilitySlot = { day: 1, start: '08:00', end: '09:30', place: '' };

type Step = { kind: 'loading' } | { kind: 'invalid'; message: string } | { kind: 'form'; info: AcceptanceInfo } | { kind: 'done'; accepted: boolean };

// Página pública a la que llega el docente desde el correo: no requiere sesión, el enlace personal de un solo uso es la autorización.
export function TutorAcceptancePage() {
  const { token = '' } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [decision, setDecision] = useState<'accept' | 'decline' | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([{ ...EMPTY_SLOT }]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    tutorAcceptanceService
      .info(token)
      .then((info) => active && setStep({ kind: 'form', info }))
      .catch((err) => active && setStep({ kind: 'invalid', message: getApiErrorMessage(err) }));
    return () => {
      active = false;
    };
  }, [token]);

  const updateSlot = (index: number, change: Partial<AvailabilitySlot>) => setSlots((current) => current.map((s, i) => (i === index ? { ...s, ...change } : s)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!decision) return;
    setSending(true);
    setError('');
    try {
      await tutorAcceptanceService.respond(token, decision === 'accept' ? { accept: true, availability: slots.map((s) => ({ ...s, place: s.place?.trim() || undefined })) } : { accept: false, reason });
      setStep({ kind: 'done', accepted: decision === 'accept' });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <div className={styles.brandRow}>
          <div className={styles.emblem}>SIT</div>
          <div>
            <b>UNTRM</b>
            <small>Bienestar Universitario</small>
          </div>
        </div>

        {step.kind === 'loading' && <p className={styles.subtitle}>Cargando…</p>}

        {step.kind === 'invalid' && (
          <>
            <h1 className={styles.title}>Enlace no válido</h1>
            <p role="alert" className={styles.subtitle}>
              {step.message}
            </p>
          </>
        )}

        {step.kind === 'done' && (
          <>
            <h1 className={styles.title}>{step.accepted ? '¡Gracias por aceptar!' : 'Respuesta registrada'}</h1>
            <p role="status" className={styles.subtitle}>
              {step.accepted ? 'Su disponibilidad quedó registrada y la coordinación ya puede verla.' : 'Se avisó a la coordinación para que asigne a otro docente.'} Puede cerrar esta página.
            </p>
          </>
        )}

        {step.kind === 'form' && (
          <form onSubmit={submit} noValidate>
            <h1 className={styles.title}>Tutoría — ciclo {step.info.cycle}</h1>
            <p className={styles.subtitle}>
              {step.info.tutorName}, {step.info.isException ? 'este ciclo no tiene docente tutor y se le consulta si puede asumirlo además de otro que ya atiende' : 'se le propone como docente tutor'} de <strong>{step.info.school}</strong>, ciclo {step.info.cycle}, periodo {step.info.period}.
            </p>

            <div className={local.choices} role="radiogroup" aria-label="Su respuesta">
              <label>
                <input type="radio" name="decision" checked={decision === 'accept'} onChange={() => setDecision('accept')} /> Acepto
              </label>
              <label>
                <input type="radio" name="decision" checked={decision === 'decline'} onChange={() => setDecision('decline')} /> No puedo asumirlo
              </label>
            </div>

            {decision === 'accept' && (
              <fieldset className={local.slots}>
                <legend>
                  ¿Cuándo, cuánto y dónde atenderá? (la sesión dura {step.info.sessionMinutes} minutos; máximo {step.info.maxWeeklyHours} horas por semana)
                </legend>
                {slots.map((slot, i) => (
                  <div key={i} className={local.slot}>
                    <select aria-label={`Día ${i + 1}`} value={slot.day} onChange={(e) => updateSlot(i, { day: Number(e.target.value) })}>
                      {Object.entries(DAY_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input type="time" aria-label={`Desde ${i + 1}`} value={slot.start} onChange={(e) => updateSlot(i, { start: e.target.value })} />
                    <input type="time" aria-label={`Hasta ${i + 1}`} value={slot.end} onChange={(e) => updateSlot(i, { end: e.target.value })} />
                    <input type="text" aria-label={`Lugar ${i + 1}`} placeholder="Lugar (aula, cubículo…)" maxLength={120} value={slot.place ?? ''} onChange={(e) => updateSlot(i, { place: e.target.value })} />
                    {slots.length > 1 && (
                      <button type="button" className={local.remove} aria-label={`Quitar horario ${i + 1}`} onClick={() => setSlots((current) => current.filter((_, j) => j !== i))}>
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
                {slots.length < 12 && (
                  <button type="button" className={local.add} onClick={() => setSlots((current) => [...current, { ...EMPTY_SLOT }])}>
                    + Agregar otro horario
                  </button>
                )}
              </fieldset>
            )}

            {decision === 'decline' && (
              <div className={styles.field}>
                <label htmlFor="decline-reason">Motivo</label>
                <textarea id="decline-reason" className={local.reason} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}

            {error && (
              <div className={styles.error} role="alert">
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className={styles.submit} disabled={!decision || sending}>
              {sending ? 'Enviando…' : 'Enviar respuesta'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
