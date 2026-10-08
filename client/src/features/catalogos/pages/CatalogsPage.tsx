import { useState } from 'react';
import { PageHeader, Card, Button, Badge, ConfirmDialog, EmptyState, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon, PlusIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { CatalogEntryModal } from '../components/CatalogEntryModal';
import { useCatalog, useCatalogMutations } from '../hooks/useCatalog';
import { CATALOGS, CatalogEntry, CatalogKind } from '../services/catalogService';
import styles from './CatalogsPage.module.css';

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—');

// Gestión de catálogos maestros (HU-48): facultades, escuelas, periodos,
// ciclos, servicios y motivos. Lo que está en uso solo se desactiva; la baja
// definitiva se permite únicamente si nada lo referencia.
export function CatalogsPage() {
  const [kind, setKind] = useState<CatalogKind>('faculties');
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<CatalogEntry | null>(null);
  const [actionError, setActionError] = useState('');

  const definition = CATALOGS.find((c) => c.kind === kind)!;
  const { entries, loading, error, refresh } = useCatalog(kind);
  const { create, update, remove } = useCatalogMutations(kind);
  const { entries: faculties } = useCatalog('faculties');

  const detail = (entry: CatalogEntry) => {
    if (entry.kind === 'schools') return faculties.find((f) => f.id === entry.facultyId)?.name ?? '—';
    if (entry.kind === 'periods') return `${date(entry.startDate)} – ${date(entry.endDate)}`;
    return entry.code ?? '—';
  };
  const detailHeader = kind === 'schools' ? 'Facultad' : kind === 'periods' ? 'Vigencia' : definition.hasCode ? 'Código' : '';

  const toggleActive = async (entry: CatalogEntry) => {
    setActionError('');
    try {
      await update.mutateAsync({ id: entry.id, input: { isActive: !entry.isActive } });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setActionError('');
    try {
      await remove.mutateAsync(toDelete.id);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setToDelete(null);
    }
  };

  const switchTab = (next: CatalogKind) => {
    setKind(next);
    setActionError('');
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Catálogos maestros"
        subtitle="Facultades, escuelas, periodos, ciclos, servicios y motivos. Los cambios quedan en la bitácora de auditoría."
        icon={<SettingsIcon size={22} />}
        actions={
          <Button icon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
            {definition.newLabel}
          </Button>
        }
      />

      <div role="tablist" className={styles.tabs}>
        {CATALOGS.map((c) => (
          <button
            key={c.kind}
            role="tab"
            type="button"
            aria-selected={kind === c.kind}
            className={kind === c.kind ? styles.tabActive : styles.tab}
            onClick={() => switchTab(c.kind)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {actionError && (
        <p role="alert" className={styles.error}>
          {actionError}
        </p>
      )}

      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : error ? (
        <EmptyState
          variant="error"
          icon={<SettingsIcon size={26} />}
          title="No se pudo cargar el catálogo"
          description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<SettingsIcon size={26} />}
          title={`Sin ${definition.label.toLowerCase()}`}
          description={`Aún no hay elementos en este catálogo. Crea el primero con «${definition.newLabel}».`}
        />
      ) : (
        <Card>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  {detailHeader && <th>{detailHeader}</th>}
                  <th>Estado</th>
                  <th className={styles.num}>En uso</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    {detailHeader && <td>{detail(entry)}</td>}
                    <td>
                      <Badge tone={entry.isActive ? 'success' : 'neutral'}>{entry.isActive ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className={styles.num}>{entry.usage}</td>
                    <td className={styles.actions}>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(entry)} aria-label={`Editar ${entry.name}`}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(entry)} aria-label={`${entry.isActive ? 'Desactivar' : 'Activar'} ${entry.name}`}>
                        {entry.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={entry.usage > 0}
                        title={entry.usage > 0 ? `En uso en ${entry.usage} registro(s): solo se puede desactivar` : undefined}
                        onClick={() => setToDelete(entry)}
                        aria-label={`Eliminar ${entry.name}`}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(creating || editing) && (
        <CatalogEntryModal
          key={editing?.id ?? 'new'}
          definition={definition}
          entry={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (input) => {
            if (editing) await update.mutateAsync({ id: editing.id, input });
            else await create.mutateAsync(input);
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar elemento"
        message={`¿Eliminar «${toDelete?.name ?? ''}»? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        tone="danger"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
