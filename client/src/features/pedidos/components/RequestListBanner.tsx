import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, SelectField } from '@shared/components/ui';
import { CheckCircleIcon, SendIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useDataRequests, useRequestSchools, useSendDataRequest, useSetRequestEmail } from '../hooks/useDataRequests';
import type { DataRequestKind } from '../services/dataRequestService';
import styles from './RequestListBanner.module.css';

const ALL = 'all';
const COPY: Record<DataRequestKind, { noun: string; loadIn: string }> = {
  ESTUDIANTES: { noun: 'la lista de estudiantes', loadIn: 'cárgala aquí abajo' },
  DOCENTES: { noun: 'la lista de docentes tutores', loadIn: 'cárgala aquí abajo' },
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { dateStyle: 'medium' });

// «Primero pide la lista»: arriba de cada pantalla de carga. Pedir la lista a la escuela es un solo clic (el correo ya está
// configurado en la escuela); si falta el correo, se escribe ahí mismo y el mismo clic lo guarda y envía el pedido.
export function RequestListBanner({ kind }: { kind: DataRequestKind }) {
  const { user } = useAuth();
  const copy = COPY[kind];
  const schoolsQuery = useRequestSchools();
  const requestsQuery = useDataRequests();
  const send = useSendDataRequest();
  const setEmail = useSetRequestEmail();

  // La coordinación solo ve sus escuelas; la DBU, todas.
  const schools = (schoolsQuery.data ?? []).filter((s) => user?.role === 'Administrador DBU' || s.coordinatorId === user?.id);
  const [choice, setChoice] = useState(ALL);
  const [emailDraft, setEmailDraft] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (schoolsQuery.isLoading) return null;
  // Sin escuelas que pedir (o si no se pudieron cargar) el camino no desaparece: lleva a «Pedir listas», donde se ve el motivo.
  if (schools.length === 0) {
    return (
      <section className={styles.box} aria-label={`Pedir ${copy.noun}`}>
        <div className={styles.text}>
          <h3>¿Aún no tienes {copy.noun}? Pídela primero</h3>
          <p>La lista se pide por correo a la escuela desde «Pedir listas»; cuando llegue el Excel, {copy.loadIn}.</p>
        </div>
        <div className={styles.actions}>
          <Link to="/pedir-listas" className={styles.linkButton}>
            Ir a «Pedir listas»
          </Link>
        </div>
      </section>
    );
  }

  const targets = choice === ALL || schools.length === 1 ? schools : schools.filter((s) => s.id === choice);
  const single = targets.length === 1 ? targets[0] : null;
  const needsEmail = !!single && !single.requestEmail;
  const last = (requestsQuery.data ?? []).filter((r) => r.kind === kind && (!single || r.schoolId === single.id))[0];

  const ask = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      let sentTo = 0;
      const skipped: string[] = [];
      const failed: string[] = [];
      for (const school of targets) {
        let email = school.requestEmail;
        if (!email && single && emailDraft.trim()) email = await setEmail.mutateAsync({ schoolId: school.id, email: emailDraft.trim() });
        if (!email) {
          skipped.push(school.name);
          continue;
        }
        const { request, sent } = await send.mutateAsync({ schoolId: school.id, cycles: [], kind });
        if (sent) sentTo += 1;
        else failed.push(`${school.name} (${request.error ?? 'error de envío'})`);
      }
      const parts = [
        sentTo > 0 ? `Pedido enviado${sentTo > 1 ? ` a ${sentTo} escuelas` : single ? ` a ${single.requestEmail ?? emailDraft.trim()}` : ''}. Cuando llegue el Excel, ${copy.loadIn}.` : '',
        skipped.length > 0 ? `Sin correo configurado: ${skipped.join(', ')}.` : '',
        failed.length > 0 ? `El correo no salió: ${failed.join('; ')}.` : '',
      ].filter(Boolean);
      setFeedback({ ok: sentTo > 0 && failed.length === 0, text: parts.join(' ') });
      setEmailDraft('');
    } catch (error) {
      setFeedback({ ok: false, text: getApiErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.box} aria-label={`Pedir ${copy.noun}`}>
      <div className={styles.text}>
        <h3>¿Aún no tienes {copy.noun}? Pídela por correo</h3>
        <p>
          Se envía a la escuela con la plantilla de Excel adjunta, a tu nombre; las respuestas te llegan a ti. Es un solo clic.{' '}
          <Link to="/pedir-listas">Ver los pedidos y su estado</Link>
        </p>
        {last && (
          <p className={styles.last}>
            Último pedido: {fmt(last.createdAt)} a {last.toEmail} ·{' '}
            {last.status === 'FALLIDO' ? 'el correo no salió' : last.receivedAt ? 'ya llegó la lista' : 'aún no llega la lista'}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        {schools.length > 1 && (
          <SelectField aria-label="Escuela a la que se pide" value={choice} onChange={(e) => { setChoice(e.target.value); setFeedback(null); }}>
            <option value={ALL}>Todas las escuelas</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        )}
        {needsEmail && (
          <div className={styles.email}>
            <label htmlFor="banner-email">Esta escuela no tiene correo configurado: escríbelo y se guarda al pedir</label>
            <input id="banner-email" type="email" placeholder="correo@untrm.edu.pe" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} />
          </div>
        )}
        <Button icon={<SendIcon size={16} />} loading={busy} disabled={needsEmail && !emailDraft.trim()} onClick={ask}>
          {targets.length > 1 ? 'Pedir a todas las escuelas' : 'Pedir la lista por correo'}
        </Button>
      </div>

      {feedback && (
        <p role="status" className={feedback.ok ? styles.ok : styles.error}>
          {feedback.ok && <CheckCircleIcon size={15} />} {feedback.text}
        </p>
      )}
    </section>
  );
}
