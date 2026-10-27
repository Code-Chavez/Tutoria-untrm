import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, SelectField, TableSkeleton } from '@shared/components/ui';
import { InboxIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { isLostResponse, parseResendConflict, pendingService, type DeclineNotice, type PendingItem, type PendingKind, type PreviousAttempt } from '../services/pendingService';
import styles from './PendingPage.module.css';

const KIND_LABEL: Record<PendingKind, { label: string; tone: 'danger' | 'warning' | 'info'; action: string }> = {
  DESIGNATION_REJECTED: { label: 'Docente rechazó', tone: 'danger', action: 'Ir a «Asignación por ciclo»' },
  ACCEPTANCE_EMAIL_FAILED: { label: 'Correo no enviado', tone: 'danger', action: 'Ir a «Asignación por ciclo»' },
  DESIGNATION_NO_RESPONSE: { label: 'Sin respuesta', tone: 'warning', action: 'Ir a «Asignación por ciclo»' },
  TUTOR_INACTIVE: { label: 'Cuenta desactivada', tone: 'warning', action: 'Ir a «Asignación por ciclo»' },
  CYCLE_WITHOUT_TUTOR: { label: 'Ciclo sin tutor', tone: 'warning', action: 'Ir a «Asignación por ciclo»' },
  CANCELLED_SESSION_NO_FOLLOWUP: { label: 'Cita cancelada', tone: 'info', action: 'Abrir la solicitud' },
};

// Qué se muestra de cada estado del aviso por correo a la coordinación. Dice solo lo que se sabe del ENVÍO: nunca «se avisó» ni «lo recibió».
const noticeText = (notice: DeclineNotice): { text: string; tone: 'ok' | 'warn' | 'info' } => {
  const to = notice.recipientName ? ` a ${notice.recipientName}` : '';
  switch (notice.status) {
    case 'ENVIADO':
      return { text: `El servidor de correo aceptó el aviso${to}. Eso no garantiza que haya llegado a su bandeja ni que lo haya leído.`, tone: 'ok' };
    case 'EN_COLA':
      return notice.deliveryEnabled
        ? { text: 'El aviso por correo está en la cola de envío y aún no se ha intentado. Si pasa mucho tiempo, avise a la administración: el proceso de envío podría no estar activo.', tone: 'info' }
        : {
            text: 'El aviso por correo no se envió porque el envío de correos no está configurado en el sistema. Queda en espera y saldrá solo cuando se configure el correo (SMTP). Siguiente paso: pida a la administración que lo configure.',
            tone: 'warn',
          };
    case 'ENVIANDO':
      return { text: 'El aviso por correo se está enviando.', tone: 'info' };
    case 'FALLIDO':
      return { text: `El servidor de correo no aceptó el aviso${to}. Puede reenviarlo.`, tone: 'warn' };
    case 'INCIERTO':
      return { text: `No se puede saber si el aviso${to} salió. Puede haber llegado. Si lo reenvía, es posible que se reciba dos veces.`, tone: 'warn' };
    case 'SIN_REGISTRO':
      return { text: 'Este rechazo es anterior al registro de avisos: no se sabe si se envió el aviso por correo.', tone: 'warn' };
    case 'SIN_DESTINATARIO':
      return { text: 'No se realizó el envío porque no hay un destinatario habilitado.', tone: 'warn' };
    case 'DATOS_INCOMPLETOS':
      return { text: 'No se realizó el envío porque faltan o son inconsistentes datos necesarios (escuela, periodo o docente).', tone: 'warn' };
    default:
      return { text: 'El aviso ya no corresponde: la designación cambió después del rechazo.', tone: 'info' };
  }
};

const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const itemKey = (item: PendingItem) => `${item.schoolId}|${item.cycle}`;

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const waiting = (iso: string) => {
  const days = daysSince(iso);
  return days === 0 ? 'desde hoy' : days === 1 ? 'desde hace 1 día' : `desde hace ${days} días`;
};

// Lo que la coordinación y la DBU deben mirar aunque nadie se lo avise: la pantalla solo muestra y lleva a donde se resuelve.
export function PendingPage() {
  const query = useQuery({ queryKey: ['institutional-pending'], queryFn: () => pendingService.list(), retry: false });
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  // Reenvío de un aviso incierto: el diálogo identifica el intento mostrado; solo ESE intento se confirma.
  const [confirming, setConfirming] = useState<{ item: PendingItem; previous: PreviousAttempt } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Cierre síncrono: dos clics seguidos llegan antes de que el estado se vuelva a dibujar.
  const sending = useRef(false);
  // Identidad de cada operación de reenvío: se conserva al perder la respuesta y se renueva ante una respuesta definitiva o un cambio.
  const operations = useRef(new Map<string, { id: string; fingerprint: string }>());
  const [kind, setKind] = useState<'ALL' | PendingKind>('ALL');
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState('ALL');
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const schools = [...new Map((query.data ?? []).map((item) => [item.schoolId, item.schoolName])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const items: PendingItem[] = (query.data ?? []).filter((item) =>
    (kind === 'ALL' || item.kind === kind) && (school === 'ALL' || item.schoolId === school) &&
    normalize([item.title, item.detail, item.schoolName, KIND_LABEL[item.kind].label, item.cycle ? 'ciclo ' + item.cycle : ''].join(' ')).includes(normalize(search.trim())));


  const resend = async (item: PendingItem, confirmAttemptId?: string | null) => {
    const key = itemKey(item);
    if (sending.current || item.cycle === null) return;
    sending.current = true;
    setBusy(key);
    setFeedback(null);
    const confirm = confirmAttemptId === undefined ? undefined : { attemptId: confirmAttemptId };
    const fingerprint = JSON.stringify([key, item.notice?.attemptId ?? null, confirm ?? null]);
    const known = operations.current.get(key);
    const operation = known && known.fingerprint === fingerprint ? known : { id: crypto.randomUUID(), fingerprint };
    operations.current.set(key, operation);
    try {
      const { attempt, replayed } = await pendingService.resendDeclineNotice(item.schoolId, item.cycle, { operationId: operation.id, confirmPrevious: confirm });
      operations.current.delete(key);
      setConfirming(null);
      const who = attempt.recipientName ? ` a ${attempt.recipientName}` : '';
      const text =
        attempt.status === 'ENVIADO'
          ? `${replayed ? 'Esta operación ya estaba registrada. ' : ''}El servidor de correo aceptó el aviso${who}. Eso no garantiza que haya llegado a su bandeja.`
          : attempt.status === 'FALLIDO'
            ? 'El servidor de correo no aceptó el aviso. Puede volver a intentarlo.'
            : attempt.status === 'INCIERTO'
              ? 'No se puede saber si el aviso salió: puede haber llegado. Revise antes de reenviarlo otra vez.'
              : attempt.status === 'EN_COLA' || attempt.status === 'ENVIANDO'
                ? 'El aviso se está enviando. Revise su estado en unos instantes.'
                : 'No se realizó el envío. Revise el estado del aviso.';
      setFeedback({ type: attempt.status === 'ENVIADO' ? 'ok' : 'error', text });
    } catch (error) {
      const conflict = parseResendConflict(error);
      if (conflict?.code === 'CONFIRMATION_REQUIRED' && conflict.previous) {
        // El servidor no registró nada con esta intención: la confirmación abre una operación nueva sobre el intento que muestra.
        operations.current.delete(key);
        setConfirming({ item, previous: conflict.previous });
      } else if (conflict) {
        operations.current.delete(key);
        setConfirming(null);
        setFeedback({ type: 'error', text: getApiErrorMessage(error) });
      } else {
        if (!isLostResponse(error)) operations.current.delete(key);
        setFeedback({ type: 'error', text: isLostResponse(error) ? `${getApiErrorMessage(error)} Si lo reintenta, el aviso no se enviará dos veces.` : getApiErrorMessage(error) });
      }
    } finally {
      sending.current = false;
      setBusy(null);
      void queryClient.invalidateQueries({ queryKey: ['institutional-pending'] });
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Pendientes"
        subtitle="Revisa docentes, ciclos y citas que necesitan atención. Los más antiguos aparecen primero."
        icon={<InboxIcon size={24} />}
        actions={query.isSuccess && (query.data ?? []).length > 0 ? (<div className={styles.filter}>
            <label htmlFor="pending-kind">Tipo de pendiente</label>
            <SelectField id="pending-kind" value={kind} onChange={(e) => setKind(e.target.value as 'ALL' | PendingKind)}>
              <option value="ALL">Todos ({(query.data ?? []).length})</option>
              {(Object.keys(KIND_LABEL) as PendingKind[])
                .filter((k) => (query.data ?? []).some((i) => i.kind === k))
                .map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k].label} ({(query.data ?? []).filter((i) => i.kind === k).length})
                  </option>
                ))}
            </SelectField>
          </div>) : undefined}
      />

      {query.isLoading ? (
        <TableSkeleton rows={4} />
      ) : query.isError ? (
        <EmptyState variant="error" icon={<InboxIcon size={26} />} title="No se pudieron cargar los pendientes" description={getApiErrorMessage(query.error)} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon={<InboxIcon size={26} />} title="No hay pendientes" description="Todos los ciclos tienen docente que aceptó, y ninguna cita de una solicitud está cancelada sin continuación." />
      ) : (
        <>
          <div className={styles.searchBar}>
            <div className={styles.searchField}><label htmlFor="pending-search">Buscar pendiente</label><input id="pending-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, escuela, ciclo o detalle…" /></div>
            <div className={styles.schoolField}><label htmlFor="pending-school">Escuela profesional</label><SelectField id="pending-school" value={school} onChange={(e) => setSchool(e.target.value)}><option value="ALL">Todas las escuelas</option>{schools.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</SelectField></div>
            <button type="button" className={styles.clear} disabled={!search && school === 'ALL' && kind === 'ALL'} onClick={() => { setSearch(''); setSchool('ALL'); setKind('ALL'); }}>Limpiar filtros</button>
          </div>
          <p role="status" className={styles.results}>{items.length} de {(query.data ?? []).length} pendientes · Más antiguos primero</p>
          {items.length === 0 ? <EmptyState icon={<InboxIcon size={26} />} title="No hay coincidencias" description="Prueba otra búsqueda o limpia los filtros." /> : <div className={styles.scrollArea} role="region" aria-label="Resultados de pendientes" tabIndex={0}><ul className={styles.list} aria-label="Pendientes">
            {items.map((item, index) => {
              const copy = KIND_LABEL[item.kind];
              return (
                <li key={`${item.kind}-${item.schoolId}-${item.cycle ?? 'x'}-${index}`} className={styles.item}>
                  <div className={styles.text}>
                    <div className={styles.itemHeading}><Badge tone={copy.tone}>{copy.label}</Badge>
                    <p className={styles.title}>{item.title}</p></div>
                    <p className={styles.detail}>{item.detail}</p>
                    {item.notice && (
                      <div className={styles.notice} data-tone={noticeText(item.notice).tone}>
                        <p>{noticeText(item.notice).text}</p>
                        {item.notice.canResend && (
                          <Button type="button" variant="secondary" loading={busy === itemKey(item)} onClick={() => (item.notice?.needsConfirmation ? setConfirming({ item, previous: { attemptId: item.notice.attemptId, status: item.notice.status === 'SIN_REGISTRO' ? null : item.notice.status, at: item.notice.at } }) : void resend(item))}>
                            Reenviar aviso
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                    <p className={styles.meta}>
                      {item.schoolName}
                      {item.cycle ? ` · ciclo ${item.cycle}` : ''} · {waiting(item.since)}
                    </p>
                  <Link to={item.link} className={styles.action}>
                    {copy.action}
                  </Link>
                </li>
              );
            })}
          </ul></div>}
        </>
      )}
      {feedback && (
        <p role={feedback.type === 'ok' ? 'status' : 'alert'} className={feedback.type === 'ok' ? styles.feedbackOk : styles.feedbackError}>
          {feedback.text}
        </p>
      )}
      <ConfirmDialog
        open={confirming !== null}
        tone="danger"
        title="Reenviar el aviso"
        message={
          confirming
            ? `No se puede saber si el aviso anterior${confirming.previous.at ? ` (${fmtDateTime(confirming.previous.at)})` : ''} salió. Puede haber llegado. Si lo reenvía, la coordinación podría recibirlo dos veces. Solo se reenvía el aviso: el rechazo del docente no cambia.`
            : ''
        }
        confirmLabel="Reenviar aviso"
        loading={busy !== null}
        onConfirm={() => confirming && void resend(confirming.item, confirming.previous.attemptId)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
