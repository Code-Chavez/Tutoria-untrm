import { useState, type FormEvent } from 'react';
import { PageHeader, Card, CardBody, Button, SelectField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { AlertTriangleIcon, PlusIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { admonitionService } from '../services/admonitionService';
import { useAdmonishableTutors, useAdmonitions, useIssueAdmonition } from '../hooks/useAdmonitions';
import styles from './AdmonitionsPage.module.css';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { dateStyle: 'medium', timeZone: 'UTC' });
const todayIso = () => new Date().toISOString().slice(0, 10);

// Amonestaciones a docentes tutores. Las emite el Decano de la facultad (o la DBU) con fecha, motivo y, si se tiene, el documento;
// la coordinación solo consulta las de sus escuelas. El sistema las registra: no aplica ninguna sanción.
export function AdmonitionsPage() {
  const { user } = useAuth();
  const canIssue = user?.role === 'Decano' || user?.role === 'Administrador DBU';
  const list = useAdmonitions();
  const tutors = useAdmonishableTutors(canIssue);
  const issue = useIssueAdmonition();

  const [open, setOpen] = useState(false);
  const [tutorId, setTutorId] = useState('');
  const [issuedOn, setIssuedOn] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const reset = () => {
    setOpen(false);
    setTutorId('');
    setReason('');
    setFile(null);
    setIssuedOn(todayIso());
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await issue.mutateAsync({ tutorId, issuedOn, reason, file });
      reset();
      setFeedback('Amonestación registrada.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Amonestaciones"
        subtitle="Registro de las amonestaciones a docentes tutores. El sistema las deja registradas con su fecha, motivo y documento; no aplica ninguna sanción."
        icon={<AlertTriangleIcon size={24} />}
        actions={
          canIssue ? (
            <Button icon={<PlusIcon size={17} />} onClick={() => setOpen(true)}>
              Nueva amonestación
            </Button>
          ) : undefined
        }
      />

      {feedback && (
        <p role="status" className={styles.ok}>
          {feedback}
        </p>
      )}

      {list.isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : list.isError ? (
        <EmptyState icon={<AlertTriangleIcon size={26} />} title="No se pudieron cargar" description={getApiErrorMessage(list.error)} />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState icon={<AlertTriangleIcon size={26} />} title="Sin amonestaciones" description="Aún no hay amonestaciones registradas en tu alcance." />
      ) : (
        <Card>
          <CardBody>
            <ul className={styles.list}>
              {(list.data ?? []).map((a) => (
                <li key={a.id} className={styles.row}>
                  <div>
                    <strong>{a.tutorName}</strong> · {a.schoolName}
                    <div className={styles.meta}>
                      {fmt(a.issuedOn)} · emitida por {a.issuedByName}
                    </div>
                    <p className={styles.reason}>{a.reason}</p>
                  </div>
                  {a.hasFile && a.fileName && (
                    <Button variant="secondary" size="sm" aria-label={`Descargar documento de ${a.tutorName}`} onClick={() => admonitionService.downloadFile(a.id, a.fileName as string)}>
                      Documento
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {open && (
        <div className={styles.overlay} onClick={reset}>
          <form role="dialog" aria-modal="true" aria-labelledby="admonition-title" className={styles.dialog} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2 id="admonition-title">Nueva amonestación</h2>

            <label htmlFor="adm-tutor">Docente tutor</label>
            <SelectField id="adm-tutor" value={tutorId} onChange={(e) => setTutorId(e.target.value)} required>
              <option value="">Seleccione un docente…</option>
              {(tutors.data ?? []).map((t) => (
                <option key={t.tutorId} value={t.tutorId}>
                  {t.fullName} — {t.schoolName}
                </option>
              ))}
            </SelectField>

            <label htmlFor="adm-date">Fecha</label>
            <input id="adm-date" type="date" className={styles.input} value={issuedOn} max={todayIso()} onChange={(e) => setIssuedOn(e.target.value)} required />

            <label htmlFor="adm-reason">Motivo</label>
            <textarea id="adm-reason" className={styles.input} value={reason} minLength={10} maxLength={1000} onChange={(e) => setReason(e.target.value)} required />

            <label htmlFor="adm-file">Documento (resolución o memorándum, opcional)</label>
            <input id="adm-file" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={reset}>
                Cancelar
              </Button>
              <Button type="submit" loading={issue.isPending} disabled={!tutorId || reason.trim().length < 10}>
                Registrar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
