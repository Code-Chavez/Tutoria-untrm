import { useState } from 'react';
import { Button } from '@shared/components/ui';
import { useDialog } from '@shared/hooks/useDialog';
import { CloseIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useCatalog } from '../hooks/useCatalog';
import { CatalogDefinition, CatalogEntry, CatalogInput } from '../services/catalogService';
import styles from './CatalogEntryModal.module.css';

interface CatalogEntryModalProps {
  definition: CatalogDefinition;
  /** Elemento a editar; sin él, el formulario crea uno nuevo. */
  entry: CatalogEntry | null;
  onClose: () => void;
  onSubmit: (input: CatalogInput) => Promise<void>;
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

// Alta y edición de un elemento de catálogo (HU-48). Se remonta con `key`
// al cambiar de elemento, así el estado inicial sale de las props.
export function CatalogEntryModal({ definition, entry, onClose, onSubmit }: CatalogEntryModalProps) {
  const editing = entry !== null;
  const { entries: faculties } = useCatalog('faculties');
  const [form, setForm] = useState({
    name: entry?.name ?? '',
    code: entry?.code ?? '',
    facultyId: entry?.facultyId ?? '',
    startDate: toDateInput(entry?.startDate ?? null),
    endDate: toDateInput(entry?.endDate ?? null),
    isActive: entry?.isActive ?? false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const input: CatalogInput = { name: form.name.trim() };
    if (definition.hasCode && !editing) input.code = form.code.trim();
    if (definition.kind === 'schools') input.facultyId = form.facultyId;
    if (definition.kind === 'periods') {
      input.startDate = form.startDate;
      input.endDate = form.endDate;
      input.isActive = form.isActive;
    }
    setSaving(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const dialogRef = useDialog(onClose);

  const title = editing ? `Editar ${definition.singular}` : definition.newLabel;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {definition.hasCode && (
            <div className={styles.field}>
              <label htmlFor="cat-code">{definition.codeLabel}</label>
              <input
                id="cat-code"
                value={form.code}
                onChange={(e) => set({ code: e.target.value })}
                disabled={editing}
                required
              />
              <small>
                {editing
                  ? 'El código no se puede cambiar: otros datos lo referencian.'
                  : definition.codeHint}
              </small>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="cat-name">Nombre</label>
            <input id="cat-name" value={form.name} onChange={(e) => set({ name: e.target.value })} required minLength={2} />
          </div>

          {definition.kind === 'schools' && (
            <div className={styles.field}>
              <label htmlFor="cat-faculty">Facultad</label>
              <select id="cat-faculty" value={form.facultyId} onChange={(e) => set({ facultyId: e.target.value })} required>
                <option value="">Selecciona una facultad</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {definition.kind === 'periods' && (
            <>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="cat-start">Inicio</label>
                  <input id="cat-start" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="cat-end">Fin</label>
                  <input id="cat-end" type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} required />
                </div>
              </div>
              <label className={styles.check}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
                Periodo activo (desactiva el que esté activo hoy)
              </label>
            </>
          )}

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
