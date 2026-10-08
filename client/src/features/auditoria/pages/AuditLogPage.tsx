import { useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, SearchField, SelectField, TableSkeleton } from '@shared/components/ui';
import { RefreshIcon, ShieldCheckIcon, XCircleIcon } from '@shared/components/icons';
import table from '@shared/components/ui/DataTable.module.css';
import { useAuditLog, useAuditOptions } from '../hooks/useAuditLog';
import { actionLabel, entityLabel, type AuditFilters } from '../services/auditService';
import styles from './AuditLogPage.module.css';

const PAGE_SIZE = 25;
const WHEN = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium' });

const EMPTY: Required<Pick<AuditFilters, 'from' | 'to' | 'actor' | 'entity' | 'action'>> = {
  from: '',
  to: '',
  actor: '',
  entity: '',
  action: '',
};

const TONE: Record<string, 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'neutral',
  REFRESH_TOKEN_REUSE: 'warning',
};

// Bitácora de auditoría (UI-09): quién hizo qué y cuándo, con filtros por fecha, autor, entidad y acción.
export function AuditLogPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const options = useAuditOptions();
  const { data, loading, error, refresh } = useAuditLog({ ...filters, page, pageSize: PAGE_SIZE });

  const set = (patch: Partial<typeof EMPTY>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div>
      <PageHeader
        title="Bitácora de auditoría"
        subtitle="Registro de las operaciones críticas: usuarios, catálogos maestros e inicios de sesión"
        icon={<ShieldCheckIcon size={24} />}
        actions={
          <Button variant="secondary" icon={<RefreshIcon size={16} />} onClick={() => refresh()}>
            Actualizar
          </Button>
        }
      />

      <Card>
        <div className={styles.bar}>
          <label className={styles.date}>
            <span>Desde</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className={styles.date}>
            <span>Hasta</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
          </label>
          <SearchField
            placeholder="Buscar por nombre o correo del autor…"
            value={filters.actor}
            onChange={(e) => set({ actor: e.target.value })}
            aria-label="Buscar por autor"
            wrapClassName={styles.search}
          />
          <SelectField
            value={filters.entity}
            onChange={(e) => set({ entity: e.target.value })}
            aria-label="Filtrar por entidad"
            wrapClassName={styles.select}
          >
            <option value="">Todas las entidades</option>
            {options.entities.map((e) => (
              <option key={e} value={e}>
                {entityLabel(e)}
              </option>
            ))}
          </SelectField>
          <SelectField
            value={filters.action}
            onChange={(e) => set({ action: e.target.value })}
            aria-label="Filtrar por acción"
            wrapClassName={styles.select}
          >
            <option value="">Todas las acciones</option>
            {options.actions.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </SelectField>
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setFilters(EMPTY);
                setPage(1);
              }}
            >
              Limpiar
            </Button>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<XCircleIcon size={26} />}
            title="No se pudo cargar la bitácora"
            description="Ocurrió un error al consultar los registros. Vuelve a intentarlo."
            action={
              <Button variant="secondary" onClick={() => refresh()}>
                Reintentar
              </Button>
            }
          />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={<ShieldCheckIcon size={26} />}
            title={hasFilters ? 'Sin resultados' : 'Aún no hay registros'}
            description={
              hasFilters
                ? 'Ningún registro coincide con los filtros aplicados.'
                : 'Las operaciones críticas se registrarán aquí con su autor y fecha.'
            }
          />
        ) : (
          <>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Autor</th>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th>Detalle</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => (
                    <tr key={entry.id}>
                      <td>{WHEN.format(new Date(entry.createdAt))}</td>
                      <td>
                        <div className={table.stack}>
                          <span className={table.name}>{entry.actorName}</span>
                          <span className={table.sub}>{entry.actorEmail}</span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={TONE[entry.action] ?? 'neutral'}>{actionLabel(entry.action)}</Badge>
                      </td>
                      <td>
                        <div className={table.stack}>
                          <span>{entityLabel(entry.entity)}</span>
                          <span className={table.sub} title={entry.entityId}>
                            {entry.entityId.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className={styles.details}>{entry.details ? `Campos: ${entry.details}` : '—'}</td>
                      <td>{entry.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
