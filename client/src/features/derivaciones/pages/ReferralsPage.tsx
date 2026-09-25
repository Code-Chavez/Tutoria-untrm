import React, { useState, useEffect } from 'react';
import { PageHeader, EmptyState, TableSkeleton, Button } from '@shared/components/ui';
import { SendIcon, InboxIcon, SearchIcon } from '@shared/components/icons';
import { referralService, StudentReferral, REFERRAL_SERVICE_LABEL } from '../services/referralService';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { ReferralDetailModal } from '../components/ReferralDetailModal';
import styles from './ReferralsPage.module.css';

export function ReferralsPage() {
  const [referrals, setReferrals] = useState<StudentReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<StudentReferral | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await referralService.getReferrals();
      setReferrals(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchReferrals = async () => {
      try {
        if (mounted) setLoading(true);
        if (mounted) setError('');
        const data = await referralService.getReferrals();
        if (mounted) setReferrals(data);
      } catch (err) {
        if (mounted) setError(getApiErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchReferrals();
    return () => {
      mounted = false;
    };
  }, []);

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
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Bandeja de Derivaciones"
        subtitle="Visualización y seguimiento de casos derivados"
        icon={<InboxIcon size={24} />}
      />

      <div className={styles.tableCard}>
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<InboxIcon size={26} />}
            title="No se pudieron cargar las derivaciones"
            description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
            action={<Button variant="secondary" onClick={loadReferrals}>Reintentar</Button>}
          />
        ) : referrals.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title="No hay derivaciones para mostrar"
            description="Tu bandeja se encuentra vacía por el momento."
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>ID Tutorado</th>
                <th>Servicio Destino</th>
                <th>Instancia Receptora</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref) => (
                <tr key={ref.id}>
                  <td>
                    {new Date(ref.createdAt).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td>{ref.studentId.slice(0, 8).toUpperCase()}...</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeBlue}`}>
                      {REFERRAL_SERVICE_LABEL[ref.service]}
                    </span>
                  </td>
                  <td>{ref.receivingInstance || '-'}</td>
                  <td>
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

      {selectedReferral && (
        <ReferralDetailModal
          referral={selectedReferral}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}
