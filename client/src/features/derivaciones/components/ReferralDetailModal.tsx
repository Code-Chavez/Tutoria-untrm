import React, { useEffect, useState } from 'react';
import { Button } from '@shared/components/ui';
import { SearchIcon, CloseIcon } from '@shared/components/icons';
import { StudentReferral, REFERRAL_SERVICE_LABEL, ReferralStatus, REFERRAL_STATUS_LABEL, referralService } from '../services/referralService';
import { getApiErrorMessage } from '@shared/services/apiClient';
import styles from './ReferralDetailModal.module.css';

interface ReferralDetailModalProps {
  referral: StudentReferral;
  onClose: () => void;
  onStatusUpdated?: (referral: StudentReferral) => void;
}

export const ReferralDetailModal: React.FC<ReferralDetailModalProps> = ({ referral, onClose, onStatusUpdated }) => {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<ReferralStatus>(referral.status);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleUpdateStatus = async () => {
    if (newStatus === referral.status && !notes.trim()) return;
    try {
      setUpdating(true);
      setError('');
      const updated = await referralService.updateStatus(referral.id, newStatus, notes);
      if (onStatusUpdated) onStatusUpdated(updated);
      setNotes('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de derivación"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <SearchIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Detalle de derivación</h2>
            <p>
              Tutorado ID: {referral.studentId.slice(0, 8).toUpperCase()}...
            </p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.rowGroup}>
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Estado</span>
              <span className={`${styles.badge} ${styles.badgeStatus} ${styles[`status_${referral.status}`] || ''}`}>
                {REFERRAL_STATUS_LABEL[referral.status]}
              </span>
            </div>
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Servicio Destino</span>
              <span className={`${styles.badge} ${styles.badgeBlue}`}>
                {REFERRAL_SERVICE_LABEL[referral.service]}
              </span>
            </div>
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Fecha de Derivación</span>
              <span className={styles.detailValue}>
                {new Date(referral.createdAt).toLocaleString('es-PE')}
              </span>
            </div>
          </div>

          <div className={styles.detailSection}>
            <span className={styles.detailLabel}>Motivo / Razón</span>
            <div className={styles.reasonBox}>
              {referral.reason}
            </div>
          </div>

          {referral.receivingInstance && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Instancia Receptora</span>
              <span className={styles.detailValue}>{referral.receivingInstance}</span>
            </div>
          )}

          <div className={styles.detailSection}>
            <span className={styles.detailLabel}>Aspectos Observados</span>
            {referral.checkedAspects.length === 0 ? (
              <span className={styles.detailValue}>Ningún aspecto marcado.</span>
            ) : (
              <div className={styles.aspectsList}>
                {referral.checkedAspects.map((aspect) => (
                  <span key={aspect} className={styles.aspectBadge}>
                    {aspect}
                  </span>
                ))}
              </div>
            )}
          </div>

          {referral.statusHistory && referral.statusHistory.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Historial de Estados</span>
              <div className={styles.historyList}>
                {referral.statusHistory.map((history, idx) => (
                  <div key={idx} className={styles.historyItem}>
                    <div className={styles.historyHeader}>
                      <span className={styles.historyStatus}>{REFERRAL_STATUS_LABEL[history.status]}</span>
                      <span className={styles.historyDate}>
                        {new Date(history.createdAt).toLocaleString('es-PE')}
                      </span>
                    </div>
                    {history.notes && <div className={styles.historyNotes}>{history.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {referral.status !== 'ATENDIDO' && referral.status !== 'RECHAZADO' && (
            <div className={styles.updateSection}>
              <h3 className={styles.updateTitle}>Actualizar Estado</h3>
              {error && <div className={styles.errorMessage}>{error}</div>}
              <div className={styles.updateForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="statusSelect">Nuevo Estado</label>
                  <select
                    id="statusSelect"
                    className={styles.select}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ReferralStatus)}
                    disabled={updating}
                  >
                    {Object.entries(REFERRAL_STATUS_LABEL).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="notesInput">Notas (opcional)</label>
                  <textarea
                    id="notesInput"
                    className={styles.textarea}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Escribe alguna observación..."
                    disabled={updating}
                  />
                </div>
                <div className={styles.updateActions}>
                  <Button
                    variant="primary"
                    onClick={handleUpdateStatus}
                    disabled={updating || (newStatus === referral.status && !notes.trim())}
                  >
                    {updating ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
