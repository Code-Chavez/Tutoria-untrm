import { useState } from 'react';
import { Badge, Button, DraftNotice } from '@shared/components/ui';
import { CloseIcon } from '@shared/components/icons';
import { useDialog } from '@shared/hooks/useDialog';
import { useDraft } from '@shared/hooks/useDraft';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useApproveCertificate, useCertificate, useGenerateCertificate, useReviewEvidence, useSubmitCertificate } from '../hooks/useCertificates';
import { RESULT_LABEL, RESULT_TONE, STATUS_LABEL, STATUS_TONE, actionsFor, approvalBlockers, evidenceLabel, factFor, hasObservedEvidence } from '../certificateLabels';
import { certificateService, type CertificateDetail, type CertificateEvidence, type EvidenceResult } from '../services/certificateService';
import styles from './CertificateDialogs.module.css';

export type SubDialog = 'observar' | 'rechazar' | 'anular' | 'resolucion';

interface Props {
  id: string;
  can: (permission: string) => boolean;
  userId: string | undefined;
  onClose: () => void;
  onOpenSub: (dialog: SubDialog) => void;
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-PE', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      })
    : '';
const isEmpty = (value: string) => value.trim() === '';

/** La observación de una evidencia: el comentario se conserva como borrador de la pestaña hasta guardarlo o descartarlo. */
function ObservedForm({
  certificateId,
  evidence,
  userId,
  busy,
  onSave,
  onCancel,
}: {
  certificateId: string;
  evidence: CertificateEvidence;
  userId: string | undefined;
  busy: boolean;
  onSave: (comment: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const { value, setValue, restored, discard } = useDraft<string>(userId, `certificado.evidencia.${evidence.id}`, evidence.result === 'OBSERVADA' ? (evidence.comment ?? '') : '', isEmpty);
  void certificateId;
  const save = async () => {
    if (await onSave(value.trim())) discard();
  };
  return (
    <div>
      {restored && <DraftNotice onDiscard={discard} />}
      <label htmlFor={`obs-${evidence.id}`}>Qué se observa de «{evidenceLabel(evidence.kind)}»</label>
      <textarea id={`obs-${evidence.id}`} className={styles.input} rows={3} maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className={styles.evidenceActions}>
        <Button size="sm" type="button" loading={busy} disabled={value.trim().length < 3} onClick={save}>
          Guardar observación
        </Button>
        <Button size="sm" type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function CertificateDialog({ id, can, userId, onClose, onOpenSub }: Props) {
  const dialogRef = useDialog(onClose);
  const query = useCertificate(id);
  const certificate = query.data;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.panel} ${styles.wide}`} role="dialog" aria-modal="true" aria-labelledby="cert-detail-title" ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="cert-detail-title">{certificate ? `Certificado de ${certificate.tutorName}` : 'Trámite de certificado'}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        {query.isLoading && <p className={styles.muted}>Cargando…</p>}
        {query.isError && (
          <>
            <p role="alert" className={styles.error}>
              No se encontró este trámite. Puede que ya no exista o que esté fuera de tu alcance.
            </p>
            <div className={styles.actions}>
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}

        {certificate && <CertificateBody certificate={certificate} can={can} userId={userId} onClose={onClose} onOpenSub={onOpenSub} />}
      </div>
    </div>
  );
}

function CertificateBody({ certificate, can, userId, onClose, onOpenSub }: { certificate: CertificateDetail } & Omit<Props, 'id'>) {
  const id = certificate.id;
  const submit = useSubmitCertificate();
  const review = useReviewEvidence();
  const approve = useApproveCertificate();
  const generate = useGenerateCertificate();
  const [observing, setObserving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const run = async (action: () => Promise<unknown>, done: string): Promise<boolean> => {
    setError('');
    setFeedback('');
    try {
      await action();
      setFeedback(done);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err));
      return false;
    }
  };

  const download = async () => {
    setError('');
    setDownloading(true);
    try {
      await certificateService.downloadPdf(certificate.id, certificate.number);
      setFeedback('El PDF de demostración se descargó.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const markEvidence = (evidenceId: string, result: EvidenceResult, comment?: string) => run(() => review.mutateAsync({ id, evidenceId, result, comment }), 'Evidencia actualizada.');

  const actions = actionsFor(certificate, can);
  const canReview = certificate.status === 'EN_REVISION' && can('certificados:aprobar');
  const blockers = certificate.status === 'EN_REVISION' ? approvalBlockers(certificate.evidences) : [];
  const mentionsResolution = /resolución de decanato/i.test(error);

  return (
    <>
      <p className={styles.notice}>
        <strong>Demostración sin valor.</strong> Este certificado es una prueba del proceso: lleva una marca de agua, un número de demostración y no se puede firmar ni entregar.
      </p>
      <dl className={styles.summary}>
        <div>
          <dt>Escuela</dt>
          <dd>{certificate.schoolName}</dd>
        </div>
        <div>
          <dt>Periodo</dt>
          <dd>{certificate.periodName}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <Badge tone={STATUS_TONE[certificate.status]}>{STATUS_LABEL[certificate.status]}</Badge>
          </dd>
        </div>
        {certificate.number && (
          <div>
            <dt>Número de registro</dt>
            <dd>{certificate.number}</dd>
          </div>
        )}
        {certificate.approvedAt && (
          <div>
            <dt>Aprobado el</dt>
            <dd>{fmt(certificate.approvedAt)}</dd>
          </div>
        )}
        {certificate.voidedAt && (
          <div>
            <dt>Anulado el</dt>
            <dd>{fmt(certificate.voidedAt)}</dd>
          </div>
        )}
      </dl>
      {certificate.reviewNote && (
        <p className={styles.notice}>
          <strong>{certificate.status === 'RECHAZADO' ? 'Motivo del rechazo:' : 'Observación:'}</strong> {certificate.reviewNote}
        </p>
      )}
      {certificate.voidReason && (
        <p className={styles.notice}>
          <strong>Motivo de la anulación:</strong> {certificate.voidReason}
        </p>
      )}

      <h3>Evidencias</h3>
      <p className={styles.muted}>Lo que el sistema sabe aparece solo como información: marcar cada evidencia como conforme es una decisión de quien revisa.</p>
      <ul className={styles.evidences}>
        {certificate.evidences.map((evidence) => (
          <li key={evidence.id} className={styles.evidence}>
            <div className={styles.evidenceHead}>
              <strong>{evidenceLabel(evidence.kind)}</strong>
              <Badge tone={RESULT_TONE[evidence.result]}>{RESULT_LABEL[evidence.result]}</Badge>
            </div>
            <p className={styles.fact}>{factFor(evidence.kind, certificate.facts)}</p>
            {evidence.comment && <p className={styles.fact}>Comentario: {evidence.comment}</p>}
            {evidence.reviewedByName && evidence.result !== 'PENDIENTE' && (
              <p className={styles.muted}>
                Revisó {evidence.reviewedByName}
                {evidence.reviewedAt ? ` el ${fmt(evidence.reviewedAt)}` : ''}.
              </p>
            )}
            {canReview &&
              (observing === evidence.id ? (
                <ObservedForm
                  certificateId={certificate.id}
                  evidence={evidence}
                  userId={userId}
                  busy={review.isPending}
                  onSave={async (comment) => {
                    const ok = await markEvidence(evidence.id, 'OBSERVADA', comment);
                    if (ok) setObserving(null);
                    return ok;
                  }}
                  onCancel={() => setObserving(null)}
                />
              ) : (
                <div className={styles.evidenceActions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={review.isPending || evidence.result === 'CONFORME'}
                    onClick={() => void markEvidence(evidence.id, 'CONFORME')}
                    aria-label={`Marcar conforme: ${evidenceLabel(evidence.kind)}`}
                  >
                    Conforme
                  </Button>
                  <Button size="sm" variant="secondary" disabled={review.isPending} onClick={() => setObserving(evidence.id)} aria-label={`Marcar observada: ${evidenceLabel(evidence.kind)}`}>
                    Observada
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={review.isPending || evidence.result === 'PENDIENTE'}
                    onClick={() => void markEvidence(evidence.id, 'PENDIENTE')}
                    aria-label={`Dejar pendiente: ${evidenceLabel(evidence.kind)}`}
                  >
                    Pendiente
                  </Button>
                </div>
              ))}
          </li>
        ))}
      </ul>

      {actions.includes('APPROVE') && blockers.length > 0 && (
        <div className={styles.notice}>
          <strong>Para aprobar:</strong>
          <ul className={styles.blockers}>
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback && (
        <p role="status" className={styles.muted}>
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.actions}>
        {(actions.includes('SUBMIT') || actions.includes('RESUBMIT')) && (
          <Button loading={submit.isPending} onClick={() => void run(() => submit.mutateAsync(id), 'El trámite pasó a revisión.')}>
            {actions.includes('RESUBMIT') ? 'Reenviar a revisión' : 'Enviar a revisión'}
          </Button>
        )}
        {actions.includes('OBSERVE') && (
          <Button
            variant="secondary"
            disabled={!hasObservedEvidence(certificate.evidences)}
            title={hasObservedEvidence(certificate.evidences) ? undefined : 'Marca antes al menos una evidencia como observada'}
            onClick={() => onOpenSub('observar')}
          >
            Devolver con observaciones
          </Button>
        )}
        {actions.includes('REJECT') && (
          <Button variant="danger" onClick={() => onOpenSub('rechazar')}>
            Rechazar
          </Button>
        )}
        {actions.includes('APPROVE') && (
          <Button loading={approve.isPending} disabled={blockers.length > 0} onClick={() => void run(() => approve.mutateAsync(id), 'El trámite quedó aprobado.')}>
            Aprobar
          </Button>
        )}
        {actions.includes('GENERATE') && (
          <Button loading={generate.isPending} onClick={() => void run(() => generate.mutateAsync(id), 'Se generó el PDF de demostración.')}>
            Generar PDF de demostración
          </Button>
        )}
        {mentionsResolution && can('certificados:administrar') && (
          <Button variant="secondary" onClick={() => onOpenSub('resolucion')}>
            Registrar la resolución de decanato
          </Button>
        )}
        {certificate.hasUnsignedPdf && can('certificados:descargar') && (
          <Button variant="secondary" loading={downloading} onClick={() => void download()}>
            Descargar PDF
          </Button>
        )}
        {actions.includes('VOID') && (
          <Button variant="danger" onClick={() => onOpenSub('anular')}>
            Anular
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </>
  );
}
