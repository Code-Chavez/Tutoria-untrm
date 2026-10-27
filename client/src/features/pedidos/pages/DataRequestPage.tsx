import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, SelectField, EmptyState, NextSteps, ConfirmDialog } from '@shared/components/ui';
import { SendIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { isLostResponse, parseSendConflict, type DataRequestKind, type DataRequestStatus, type PreviousRequest } from '../services/dataRequestService';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useDataRequests, useMarkReceived, useRequestSchools, useSendDataRequest } from '../hooks/useDataRequests';
import styles from './DataRequestPage.module.css';


const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { dateStyle: 'medium' });
const fmtTime = (iso: string) => new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

// Estado del ENVÍO de cada pedido (no de si la lista ya llegó o se cargó).
const STATUS_VIEW: Record<DataRequestStatus, { label: string; tone: 'success' | 'warning' | 'info'; hint?: string }> = {
  PENDIENTE: { label: 'Enviándose', tone: 'info', hint: 'El envío está en curso.' },
  ENVIADO: { label: 'Enviado', tone: 'success' },
  FALLIDO: { label: 'Fallido', tone: 'warning', hint: 'El correo no fue aceptado: puedes volver a pedirlo.' },
  INCIERTO: { label: 'Envío incierto', tone: 'warning', hint: 'No se puede saber si el correo salió. Verifica con la escuela antes de volver a pedirlo.' },
};

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
  const availableCycles = Array.from({ length: school?.cycleCount ?? 0 }, (_, index) => index + 1);
  const [cycleSelection, setCycleSelection] = useState<{ schoolId: string; total: number; values: number[] } | null>(null);
  const cycles = cycleSelection?.schoolId === school?.id && cycleSelection?.total === availableCycles.length ? cycleSelection.values : availableCycles;
  const setCycles = (values: number[]) => setCycleSelection({ schoolId: school?.id ?? '', total: availableCycles.length, values });
  // La DBU también pide la lista de docentes tutores (la coordinación solo la de estudiantes).
  const isDbu = user?.role === 'Administrador DBU';
  // Las pantallas de carga llevan aquí con la lista ya elegida (?lista=docentes); la de docentes solo la pide la DBU.
  const [searchParams] = useSearchParams();
  const [kind, setKind] = useState<DataRequestKind>(isDbu && searchParams.get('lista') === 'docentes' ? 'DOCENTES' : 'ESTUDIANTES');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Equivalente reciente que el servidor mostró y que la persona debe confirmar expresamente para reenviar.
  const [duplicate, setDuplicate] = useState<PreviousRequest | null>(null);
  // Identidad de la operación: se conserva mientras se reintenta lo mismo (p. ej. se perdió la respuesta) y se renueva solo
  // cuando el servidor respondió algo definitivo o cambia lo que se envía. Así reintentar no duplica y un reenvío deliberado sí es otro.
  const operation = useRef<{ id: string; fingerprint: string } | null>(null);
  const submitting = useRef(false);

  const toggleCycle = (cycle: number) => setCycles(cycles.includes(cycle) ? cycles.filter((value) => value !== cycle) : [...cycles, cycle].sort((a, b) => a - b));
  const hasEmail = !!school?.requestEmail;
  const copy = COPY[kind];

  const attempt = async (confirmDuplicateOf?: string) => {
    if (!school || submitting.current) return;
    submitting.current = true;
    setFeedback(null);
    const sentCycles = kind === 'DOCENTES' ? [] : cycles;
    const fingerprint = JSON.stringify([school.id, kind, sentCycles, note.trim(), confirmDuplicateOf ?? null]);
    if (operation.current?.fingerprint !== fingerprint) operation.current = { id: crypto.randomUUID(), fingerprint };
    try {
      const { request, replayed } = await send.mutateAsync({ schoolId: school.id, cycles: sentCycles, note: note.trim() || undefined, kind, operationId: operation.current.id, confirmDuplicateOf });
      operation.current = null;
      setDuplicate(null);
      setNote('');
      if (request.status === 'ENVIADO') {
        setFeedback({ type: 'ok', text: replayed ? `Este pedido ya estaba registrado y enviado a ${request.toEmail}; no se envió otro correo.` : `Pedido enviado a ${request.toEmail}. Recibirás una copia y las respuestas llegarán a tu correo.` });
      } else if (request.status === 'FALLIDO') {
        setFeedback({ type: 'error', text: `El pedido quedó registrado pero el correo no salió (${request.error ?? 'error de envío'}). Revisa la configuración del correo o entrega la plantilla por otro medio.` });
      } else if (request.status === 'INCIERTO') {
        setFeedback({ type: 'error', text: 'El pedido quedó registrado, pero no se puede saber si el correo salió. Verifica con la escuela antes de volver a pedirlo.' });
      } else {
        setFeedback({ type: 'ok', text: 'El pedido se está enviando. Revisa su estado en «Pedidos hechos».' });
      }
    } catch (error) {
      const conflict = parseSendConflict(error);
      if (conflict?.code === 'DUPLICATE_DATA_REQUEST') {
        // El servidor no registró nada con esta intención: la confirmación abre una operación nueva.
        operation.current = null;
        setDuplicate(conflict.previous);
      } else if (conflict) {
        operation.current = null;
        setDuplicate(null);
        setFeedback({ type: 'error', text: getApiErrorMessage(error) });
      } else {
        // Sin respuesta o error del servidor: no se sabe si se registró; se conserva la identidad para reintentar lo mismo.
        if (!isLostResponse(error)) operation.current = null;
        setFeedback({ type: 'error', text: isLostResponse(error) ? `${getApiErrorMessage(error)} Si reintentas lo mismo, no se enviará dos veces.` : getApiErrorMessage(error) });
      }
    } finally {
      submitting.current = false;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!school) return;
    if (kind === 'ESTUDIANTES' && cycles.length === 0) {
      setFeedback({ type: 'error', text: 'Selecciona al menos un ciclo para enviar el pedido.' });
      return;
    }
    await attempt();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<SendIcon size={24} />}
      />

      <div className={styles.workspace}>
      {schoolsQuery.isLoading ? null : schoolsQuery.isError ? (
        <EmptyState variant="error" icon={<SendIcon size={26} />} title="No se pudieron cargar las escuelas" description={getApiErrorMessage(schoolsQuery.error)} action={<Button onClick={() => schoolsQuery.refetch()}>Reintentar escuelas</Button>} />
      ) : schools.length === 0 ? (
        <EmptyState icon={<SendIcon size={26} />} title="No tienes escuelas asignadas" description="Solo se piden listas de las escuelas que administras o coordinas." />
      ) : (
        <Card className={styles.requestCard}>
          <CardHeader title="Nuevo pedido" description="El pedido sale a nombre tuyo, con copia a tu correo; las respuestas te llegan a ti." />
          <CardBody>
            {feedback && (
              <p role="alert" className={feedback.type === 'ok' ? styles.ok : styles.error}>
                {feedback.text}
              </p>
            )}

            <form onSubmit={submit} className={styles.formGrid}>
              {isDbu && (
                <div className={styles.field}>
                  <label htmlFor="req-kind">Qué lista pedir</label>
                  <SelectField id="req-kind" value={kind} onChange={(e) => setKind(e.target.value as DataRequestKind)}>
                    <option value="ESTUDIANTES">Estudiantes</option>
                    <option value="DOCENTES">Docentes tutores</option>
                  </SelectField>
                </div>
              )}
              <div className={`${styles.field} ${!isDbu ? styles.fullWidth : ''}`}>
                <label htmlFor="req-school">Escuela profesional</label>
                <SelectField id="req-school" value={school?.id ?? ''} onChange={(e) => { setChosen(e.target.value); setFeedback(null); }}>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className={`${styles.field} ${styles.recipient}`}>
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
                <fieldset className={`${styles.field} ${styles.fullWidth}`}>
                <legend className={styles.label}>Ciclos a solicitar</legend>
                {availableCycles.length === 0 && <p className={styles.note}>Configura la cantidad de ciclos de esta escuela en Catálogos → Escuelas antes de pedir listas.</p>}
                <div className={styles.cycleActions}>
                  <span aria-live="polite">{cycles.length} de {availableCycles.length} seleccionados</span>
                  <Button type="button" variant="ghost" size="sm" disabled={cycles.length === availableCycles.length} onClick={() => setCycles([...availableCycles])}>Seleccionar todos</Button>
                  <Button type="button" variant="ghost" size="sm" disabled={cycles.length === 0} onClick={() => setCycles([])}>Quitar selección</Button>
                </div>
                <div className={styles.cycles}>
                  {availableCycles.map((c) => (
                    <label key={c} className={styles.cycle}>
                      <input type="checkbox" checked={cycles.includes(c)} onChange={() => toggleCycle(c)} /> {c}
                    </label>
                  ))}
                </div>
                {cycles.length === 0 && <p className={styles.note}>Selecciona al menos un ciclo para enviar el pedido.</p>}
              </fieldset>
              )}

              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label htmlFor="req-note">Observaciones (opcional)</label>
                <textarea id="req-note" className={styles.input} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <div className={styles.formFooter}>
              <Button type="submit" variant="primary" loading={send.isPending} disabled={!hasEmail || (kind === 'ESTUDIANTES' && cycles.length === 0)}>
                Enviar pedido
              </Button>
              <p className={styles.note}>
                Se adjunta la plantilla Excel con las columnas: {copy.columns}. Cuando recibas el archivo, cárgalo en{' '}
                <Link to={copy.loadTo}>{copy.loadLabel}</Link>.
              </p>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className={styles.historyCard}>
        <CardHeader title="Pedidos hechos" description="Para saber qué se pidió, a quién y si ya llegó." />
        <CardBody className={styles.historyBody}>
          {requestsQuery.isLoading ? null : requestsQuery.isError ? (
            <div role="alert"><p className={styles.error}>No se pudieron cargar los pedidos.</p><Button onClick={() => requestsQuery.refetch()}>Reintentar pedidos</Button></div>
          ) : (requestsQuery.data ?? []).length === 0 ? (
            <p className={styles.note}>Todavía no se hizo ningún pedido.</p>
          ) : (
            <ul className={styles.history}>
              {(requestsQuery.data ?? []).map((r) => (
                <li key={r.id} className={styles.historyItem}>
                  <div className={styles.historyHead}>
                    <strong>
                      {r.schoolName} · {r.periodName} · {r.kind === 'DOCENTES' ? 'Docentes tutores' : 'Estudiantes'}
                    </strong>
                    <Badge tone={STATUS_VIEW[r.status].tone}>{STATUS_VIEW[r.status].label}</Badge>
                    {r.receivedAt && <Badge tone="info">Recibido el {fmt(r.receivedAt)}</Badge>}
                  </div>
                  <span className={styles.note}>
                    {fmt(r.createdAt)} · a {r.toEmail} · {r.kind === 'DOCENTES' ? 'lista de docentes' : r.cycles.length > 0 ? `ciclos ${r.cycles.join(', ')}` : 'todos los ciclos'}
                  </span>
                  {STATUS_VIEW[r.status].hint && <span className={styles.note}>{STATUS_VIEW[r.status].hint}</span>}
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
      </div>
      <NextSteps
        title={copy.nextTitle}
        steps={copy.steps}
      />
      <ConfirmDialog
        open={duplicate !== null}
        tone="danger"
        title="Ya hay un pedido equivalente"
        message={
          duplicate
            ? `Hace poco (${fmtTime(duplicate.createdAt)}) ya se hizo un pedido equivalente: ${STATUS_VIEW[duplicate.status].label.toLowerCase()}. ¿Quieres pedirlo de nuevo? Se enviará otro correo a la escuela.`
            : ''
        }
        confirmLabel="Pedir de nuevo"
        loading={send.isPending}
        onConfirm={() => duplicate && void attempt(duplicate.id)}
        onCancel={() => setDuplicate(null)}
      />
    </div>
  );
}
