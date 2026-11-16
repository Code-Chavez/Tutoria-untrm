import { useCallback, type FormEvent } from 'react';
import { Button, DraftNotice } from '@shared/components/ui';
import { CloseIcon } from '@shared/components/icons';
import { useDialog } from '@shared/hooks/useDialog';
import { useDraft } from '@shared/hooks/useDraft';
import styles from './CertificateDialogs.module.css';

interface Props {
  title: string;
  label: string;
  help?: string;
  submitLabel: string;
  /** Caracteres mínimos del texto (0 = opcional). */
  minLength: number;
  danger?: boolean;
  /** Persona dueña del borrador y clave del borrador de esta ventana para este trámite. */
  draftOwnerId: string | undefined;
  draftKey: string;
  busy: boolean;
  error: string;
  /** Devuelve true si se envió (el borrador se descarta); si falla, el texto escrito se conserva. */
  onSubmit: (text: string) => Promise<boolean>;
  onClose: () => void;
}

const isEmpty = (value: string) => value.trim() === '';

/**
 * Pide un texto (nota de la observación, motivo del rechazo o de la anulación) antes de hacer la acción. Lo escrito se conserva como
 * borrador de la pestaña, nunca en la URL; cerrar sin enviar lo deja, enviar con éxito lo descarta.
 */
export function ReasonDialog({ title, label, help, submitLabel, minLength, danger, draftOwnerId, draftKey, busy, error, onSubmit, onClose }: Props) {
  const dialogRef = useDialog(onClose);
  const { value, setValue, restored, discard } = useDraft<string>(draftOwnerId, draftKey, '', isEmpty);
  const tooShort = value.trim().length < minLength;
  const count = useCallback(() => `${value.trim().length}${minLength > 0 ? ` de al menos ${minLength}` : ''} caracteres`, [value, minLength]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (tooShort || busy) return;
    if (await onSubmit(value.trim())) discard();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="cert-reason-title" ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className={styles.header}>
            <h2 id="cert-reason-title">{title}</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
              <CloseIcon size={18} />
            </button>
          </div>
          {restored && <DraftNotice onDiscard={discard} />}
          {help && <p className={styles.muted}>{help}</p>}
          <label htmlFor="cert-reason-text">{label}</label>
          <textarea id="cert-reason-text" className={styles.input} rows={4} maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} aria-describedby="cert-reason-count" />
          <p id="cert-reason-count" className={styles.muted}>
            {count()}
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={busy} disabled={tooShort}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
