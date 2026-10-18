import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, EmptyState, TableSkeleton, Button, InboxToolbar } from '@shared/components/ui';
import { SendIcon, InboxIcon, SearchIcon } from '@shared/components/icons';
import { parseFilterParam, waitingText } from '@shared/utils/inbox';
import { referralService, StudentReferral, REFERRAL_SERVICE_LABEL, REFERRAL_STATUS_LABEL } from '../services/referralService';
import {
  countReferrals,
  DEFAULT_REFERRAL_FILTER,
  isPendingReferral,
  REFERRAL_FILTER_LABEL,
  REFERRAL_FILTERS,
  viewReferrals,
  type ReferralFilter,
} from '../utils/referralInbox';
import { useReferrals, useUpdateReferralInCache } from '../hooks/useReferrals';
import { ReferralDetailModal } from '../components/ReferralDetailModal';
import styles from './ReferralsPage.module.css';

export function ReferralsPage() {
  // Se trae todo y se filtra aquí: la vista inicial son los casos pendientes y cada contador del inicio abre la bandeja ya filtrada (?estado=…).
  const { referrals: all, loading, error, refresh } = useReferrals();
  const updateReferralInCache = useUpdateReferralInCache();
  const [selectedReferral, setSelectedReferral] = useState<StudentReferral | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  // Un aviso llega con ?caso=<id>: se abre ese caso, o se explica que ya no está disponible para esta cuenta (R03).
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const filter = parseFilterParam(searchParams.get('estado'), REFERRAL_FILTERS, DEFAULT_REFERRAL_FILTER);
  const changeFilter = (next: ReferralFilter) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('estado', next);
        return params;
      },
      { replace: true },
    );
  const counts = countReferrals(all);
  const referrals = viewReferrals(all, filter, search);
  const requestedId = searchParams.get('caso');
  const requested = requestedId ? all.find((r) => r.id === requestedId) ?? null : null;
  const unavailable = !!requestedId && !loading && !error && !requested;
  const clearRequested = () =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete('caso');
        return params;
      },
      { replace: true },
    );

  const handleDownload = async (id: string) => {
    try {
      setDownloading(id);
      await referralService.downloadConstancia(id);
    } catch {
      alert('Error: No se pudo descargar la constancia.');
    } finally {
      setDownloading(null);
    }
  };

  const openDetails = (referral: StudentReferral) => {
    setSelectedReferral(referral);
  };

  const closeDetails = () => {
    setSelectedReferral(null);
    if (requestedId) clearRequested();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Bandeja de Derivaciones"
        subtitle="Visualización y seguimiento de casos derivados"
        icon={<InboxIcon size={24} />}
      />

      {unavailable && (
        <div className={styles.notice} role="status">
          <span>Ese caso ya no está disponible para tu cuenta: fue eliminado o dejó de estar a tu cargo.</span>
          <button type="button" className={styles.noticeClose} onClick={clearRequested}>
            Cerrar
          </button>
        </div>
      )}

      <div className={styles.tableCard}>
        <InboxToolbar
          label="Filtrar por estado"
          options={REFERRAL_FILTERS.map((key) => ({ key, label: REFERRAL_FILTER_LABEL[key], count: counts[key] }))}
          active={filter}
          onChange={changeFilter}
          search={search}
          onSearch={setSearch}
          searchLabel="Buscar derivación"
          searchPlaceholder="Buscar estudiante o servicio"
        />
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<InboxIcon size={26} />}
            title="No se pudieron cargar las derivaciones"
            description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
            action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
          />
        ) : all.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title="No hay derivaciones para mostrar"
            description="Tu bandeja se encuentra vacía por el momento."
          />
        ) : referrals.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title={search ? 'Ninguna derivación coincide con la búsqueda' : filter === 'pendientes' ? 'No hay derivaciones pendientes' : 'No hay derivaciones en esta vista'}
            description={filter === 'pendientes' && !search ? 'Todo lo recibido ya se atendió o se cerró. Puedes ver todas.' : 'Prueba con otra búsqueda o cambia de vista.'}
            action={
              filter !== 'todos' ? (
                <Button variant="secondary" onClick={() => changeFilter('todos')}>
                  Ver todos
                </Button>
              ) : undefined
            }
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Tutorado</th>
                <th>Servicio Destino</th>
                <th>Instancia Receptora</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref) => (
                <tr key={ref.id}>
                  <td data-label="Fecha">
                    {new Date(ref.createdAt).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {isPendingReferral(ref) && <small>Espera desde {waitingText(ref.createdAt)}</small>}
                  </td>
                  <td data-label="Estado">
                    <span className={`${styles.badge} ${styles[`status_${ref.status}`] || ''}`}>
                      {REFERRAL_STATUS_LABEL[ref.status]}
                    </span>
                  </td>
                  <td data-label="Tutorado">
                    {ref.studentName ? (
                      <>
                        <div>{ref.studentName}</div>
                        {ref.studentCode && <small>{ref.studentCode}</small>}
                      </>
                    ) : (
                      <>{ref.studentId.slice(0, 8).toUpperCase()}...</>
                    )}
                  </td>
                  <td data-label="Servicio destino">
                    <span className={`${styles.badge} ${styles.badgeBlue}`}>
                      {REFERRAL_SERVICE_LABEL[ref.service]}
                    </span>
                  </td>
                  <td data-label="Instancia receptora">{ref.receivingInstance || '-'}</td>
                  <td className={styles.cardAction}>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => openDetails(ref)}
                        title="Ver Detalles"
                      >
                        <SearchIcon size={18} />
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleDownload(ref.id)}
                        disabled={downloading === ref.id}
                        title="Descargar Constancia"
                      >
                        <SendIcon size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(selectedReferral ?? requested) && (
        <ReferralDetailModal
          referral={(selectedReferral ?? requested) as StudentReferral}
          onClose={closeDetails}
          onStatusUpdated={(updatedRef) => {
            updateReferralInCache(updatedRef);
            setSelectedReferral(updatedRef);
          }}
        />
      )}
    </div>
  );
}
