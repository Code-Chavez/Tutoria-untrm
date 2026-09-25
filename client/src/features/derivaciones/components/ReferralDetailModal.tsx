import React, { useEffect } from 'react';
import { Button } from '@shared/components/ui';
import { SearchIcon, CloseIcon } from '@shared/components/icons';
import { StudentReferral, REFERRAL_SERVICE_LABEL } from '../services/referralService';
import styles from './ReferralDetailModal.module.css';

interface ReferralDetailModalProps {
  referral: StudentReferral;
  onClose: () => void;
}

export const ReferralDetailModal: React.FC<ReferralDetailModalProps> = ({ referral, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
