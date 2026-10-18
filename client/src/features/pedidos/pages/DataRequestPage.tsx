import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, SelectField, EmptyState, NextSteps } from '@shared/components/ui';
import { SendIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import type { DataRequestKind } from '../services/dataRequestService';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useDataRequests, useMarkReceived, useRequestSchools, useSendDataRequest } from '../hooks/useDataRequests';
import styles from './DataRequestPage.module.css';

const CYCLES = Array.from({ length: 10 }, (_, i) => i + 1);
const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { dateStyle: 'medium' });

// Todo lo que cambia según la lista que se pide: título, explicación, columnas de la plantilla y a dónde seguir al recibirla.
const COPY: Record<DataRequestKind, {
  title: string;
  subtitle: string;
  columns: string;
  loadTo: string;
  loadLabel: string;
  nextTitle: string;
  steps: { to: string; label: string; description: string }[];
}> = {
  ESTUDIANTES: {
    title: 'Pedir listas de estudiantes',
    subtitle: 'Al iniciar el periodo, pide por correo a la escuela la lista de estudiantes con el formato de la plantilla; cuando llegue, cárgala en «Carga de estudiantes».',
    columns: 'código, nombres, apellidos, correo, teléfono, ciclo y escuela',
    loadTo: '/carga-masiva',
    loadLabel: 'Carga de estudiantes',
    nextTitle: 'Cuando llegue la lista de estudiantes',
    steps: [
      { to: '/carga-masiva', label: 'Cargar el Excel', description: 'Los estudiantes quedan matriculados en el periodo' },
      { to: '/asignacion', label: 'Asignar el tutor de cada ciclo', description: 'El docente recibe un correo para aceptar' },
    ],
  },
  DOCENTES: {
    title: 'Pedir la lista de docentes tutores',
    subtitle: 'Pide por correo a la escuela la lista de docentes que podrían ejercer la tutoría; cuando llegue, cárgala en «Carga de docentes».',
    columns: 'nombres, apellidos, correo institucional, teléfono (opcional) y escuela',
    loadTo: '/carga-docentes',
    loadLabel: 'Carga de docentes',
    nextTitle: 'Cuando llegue la lista de docentes',
    steps: [
      { to: '/carga-docentes', label: 'Cargar el Excel', description: 'Se crean las cuentas de los docentes y reciben su invitación de acceso' },
      { to: '/asignacion', label: 'Asignar el tutor de cada ciclo', description: 'Los docentes aparecen al elegir el tutor de los ciclos de su escuela' },
    ],
  },
};

interface Feedback {
  type: 'ok' | 'error';
  text: string;
}

// Pedido de la lista de estudiantes de una escuela por correo (inicio de cada periodo). El correo al que se pide lo configura quien
// administra o coordina la escuela: no se fija una sola persona, y si no responde se cambia y se vuelve a pedir.
export function DataRequestPage() {
  const { user } = useAuth();
  const schoolsQuery = useRequestSchools();
  const requestsQuery = useDataRequests();
  const send = useSendDataRequest();
  const markReceived = useMarkReceived();

  // La coordinación solo ve sus escuelas; la DBU, todas.
  const schools = (schoolsQuery.data ?? []).filter((s) => user?.role === 'Administrador DBU' || s.coordinatorId === user?.id);
  const [chosen, setChosen] = useState('');
  const school = schools.find((s) => s.id === chosen) ?? schools[0];
  const [cycles, setCycles] = useState<number[]>([]);
  // La DBU también pide la lista de docentes tutores (la coordinación solo la de estudiantes).
  const isDbu = user?.role === 'Administrador DBU';
  // Las pantallas de carga llevan aquí con la lista ya elegida (?lista=docentes); la de docentes solo la pide la DBU.
  const [searchParams] = useSearchParams();
  const [kind, setKind] = useState<DataRequestKind>(isDbu && searchParams.get('lista') === 'docentes' ? 'DOCENTES' : 'ESTUDIANTES');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const toggleCycle = (cycle: number) => setCycles((current) => (current.includes(cycle) ? current.filter((c) => c !== cycle) : [...current, cycle]));
  const hasEmail = !!school?.requestEmail;
  const copy = COPY[kind];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!school) return;
    setFeedback(null);
    try {
      const { request, sent } = await send.mutateAsync({ schoolId: school.id, cycles: kind === 'DOCENTES' ? [] : cycles, note: note.trim() || undefined, kind });
      setNote('');
      setFeedback(
        sent
          ? { type: 'ok', text: `Pedido enviado a ${request.toEmail}. Recibirás una copia y las respuestas llegarán a tu correo.` }
          : { type: 'error', text: `El pedido quedó registrado pero el correo no salió (${request.error ?? 'error de envío'}). Revisa la configuración del correo o entrega la plantilla por otro medio.` },
      );
    } catch (error) {
      setFeedback({ type: 'error', text: getApiErrorMessage(error) });
    }
  };

  return (
    <div>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<SendIcon size={24} />}
      />

      {schoolsQuery.isLoading ? null : schools.length === 0 ? (
        <EmptyState icon={<SendIcon size={26} />} title="No tienes escuelas asignadas" description="Solo se piden listas de las escuelas que administras o coordinas." />
      ) : (
        <Card>
          <CardHeader title="Nuevo pedido" description="El pedido sale a nombre tuyo, con copia a tu correo; las respuestas te llegan a ti." />
          <CardBody>
            {feedback && (
              <p role="alert" className={feedback.type === 'ok' ? styles.ok : styles.error}>
                {feedback.text}
              </p>
            )}

            <form onSubmit={submit}>
              {isDbu && (
                <div className={styles.field}>
                  <label htmlFor="req-kind">Qué lista pedir</label>
                  <SelectField id="req-kind" value={kind} onChange={(e) => setKind(e.target.value as DataRequestKind)}>
                    <option value="ESTUDIANTES">Estudiantes</option>
                    <option value="DOCENTES">Docentes tutores</option>
                  </SelectField>
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="req-school">Escuela profesional</label>
                <SelectField id="req-school" value={school?.id ?? ''} onChange={(e) => { setChosen(e.target.value); setFeedback(null); }}>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Se pedirá a</span>
                {hasEmail ? (
                  <div className={styles.row}>
                    <strong>{school?.requestEmail}</strong>
                    <Link to={`/correos-escuelas?escuela=${school?.id ?? ''}`} className={styles.editLink}>
                      Editar correo
                    </Link>
                  </div>
                ) : (
                  <div className={styles.emailForm}>
                    <p className={styles.note}>Esta escuela aún no tiene un correo configurado para pedir las listas.</p>
                    <Link to={`/correos-escuelas?escuela=${school?.id ?? ''}`} className={styles.linkButton}>
                      Configurar correo
                    </Link>
                  </div>
                )}
              </div>

              {kind === 'ESTUDIANTES' && (
                <fieldset className={styles.field}>
                <legend className={styles.label}>Ciclos (sin marcar = todos)</legend>
                <div className={styles.cycles}>
                  {CYCLES.map((c) => (
                    <label key={c} className={styles.cycle}>
                      <input type="checkbox" checked={cycles.includes(c)} onChange={() => toggleCycle(c)} /> {c}
                    </label>
                  ))}
                </div>
              </fieldset>
              )}

              <div className={styles.field}>
                <label htmlFor="req-note">Observaciones (opcional)</label>
                <textarea id="req-note" className={styles.input} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <Button type="submit" variant="primary" loading={send.isPending} disabled={!hasEmail}>
                Enviar pedido
              </Button>
              <p className={styles.note}>
                Se adjunta la plantilla Excel con las columnas: {copy.columns}. Cuando recibas el archivo, cárgalo en{' '}
                <Link to={copy.loadTo}>{copy.loadLabel}</Link>.
              </p>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Pedidos hechos" description="Para saber qué se pidió, a quién y si ya llegó." />
        <CardBody>
          {requestsQuery.isLoading ? null : (requestsQuery.data ?? []).length === 0 ? (
            <p className={styles.note}>Todavía no se hizo ningún pedido.</p>
          ) : (
            <ul className={styles.history}>
              {(requestsQuery.data ?? []).map((r) => (
                <li key={r.id} className={styles.historyItem}>
                  <div className={styles.historyHead}>
                    <strong>
                      {r.schoolName} · {r.periodName} · {r.kind === 'DOCENTES' ? 'Docentes tutores' : 'Estudiantes'}
                    </strong>
                    <Badge tone={r.status === 'ENVIADO' ? 'success' : 'warning'}>{r.status === 'ENVIADO' ? 'Enviado' : 'Fallido'}</Badge>
                    {r.receivedAt && <Badge tone="info">Recibido el {fmt(r.receivedAt)}</Badge>}
                  </div>
                  <span className={styles.note}>
                    {fmt(r.createdAt)} · a {r.toEmail} · {r.kind === 'DOCENTES' ? 'lista de docentes' : r.cycles.length > 0 ? `ciclos ${r.cycles.join(', ')}` : 'todos los ciclos'}
                  </span>
                  {r.status === 'ENVIADO' && !r.receivedAt && (
                    <div>
                      <Button type="button" variant="secondary" loading={markReceived.isPending} onClick={() => markReceived.mutate(r.id)}>
                        Marcar como recibido
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      <NextSteps
        title={copy.nextTitle}
        steps={copy.steps}
      />
    </div>
  );
}
