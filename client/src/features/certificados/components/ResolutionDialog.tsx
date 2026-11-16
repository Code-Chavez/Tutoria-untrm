import type { FormEvent } from 'react';
import { Button, DraftNotice, SelectField } from '@shared/components/ui';
import { CloseIcon } from '@shared/components/icons';
import { useDialog } from '@shared/hooks/useDialog';
import { useDraftForm } from '@shared/hooks/useDraftForm';
import styles from './CertificateDialogs.module.css';

interface Props {
  periodName: string;
  schools: { id: string; name: string }[];
  /** Escuela con la que se abre (la del filtro) y el número vigente, si ya hay uno. */
  defaultSchoolId: string;
  currentNumber: (schoolId: string) => string;
  draftOwnerId: string | undefined;
  /** Un borrador por periodo, para no mezclar la resolución de un periodo con la de otro. */
  draftKey: string;
  busy: boolean;
  error: string;
  onSubmit: (input: { schoolId: string; number: string; issuedOn: string }) => Promise<boolean>;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Registra la «Resolución de Decanato N.° …» de una escuela en el periodo; el certificado la imprime. Una sola por escuela y periodo. */
export function ResolutionDialog({ periodName, schools, defaultSchoolId, currentNumber, draftOwnerId, draftKey, busy, error, onSubmit, onClose }: Props) {
  const dialogRef = useDialog(onClose);
  const { form, set, restored, discard } = useDraftForm(draftOwnerId, draftKey, {
    schoolId: defaultSchoolId || schools[0]?.id || '',
    number: '',
    issuedOn: today(),
  });
  const invalid = !form.schoolId || form.number.trim().length < 3 || !form.issuedOn;
  const replacing = form.schoolId ? currentNumber(form.schoolId) : '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (invalid || busy) return;
    if (
      await onSubmit({
        schoolId: form.schoolId,
        number: form.number.trim(),
        issuedOn: form.issuedOn,
      })
    )
      discard();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="cert-resolution-title" ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className={styles.header}>
            <h2 id="cert-resolution-title">Resolución de decanato</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
              <CloseIcon size={18} />
            </button>
          </div>
          {restored && <DraftNotice onDiscard={discard} />}
          <p className={styles.muted}>La resolución que aprueba la comisión de tutoría de la escuela en el periodo {periodName}. El certificado la imprime; sin ella no se genera.</p>
          <label htmlFor="cert-res-school">Escuela profesional</label>
          <SelectField id="cert-res-school" value={form.schoolId} onChange={(e) => set({ schoolId: e.target.value })}>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </SelectField>
          {replacing && <p className={styles.muted}>Ya hay una registrada: «{replacing}». Guardar la reemplaza.</p>}
          <label htmlFor="cert-res-number">Número de la resolución</label>
          <input id="cert-res-number" className={styles.input} value={form.number} maxLength={60} placeholder="Ej.: 030-2026-UNTRM-FISME" onChange={(e) => set({ number: e.target.value })} />
          <label htmlFor="cert-res-date">Fecha de la resolución</label>
          <input id="cert-res-date" type="date" className={styles.input} value={form.issuedOn} max={today()} onChange={(e) => set({ issuedOn: e.target.value })} />
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy} disabled={invalid}>
              Guardar resolución
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
