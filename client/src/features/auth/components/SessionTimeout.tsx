import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdleTimer } from '@shared/hooks/useIdleTimer';
import { useAuth } from '../hooks/useAuth';
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '../sessionConfig';
import styles from './SessionTimeout.module.css';

/**
 * Vigila la inactividad del usuario dentro del área autenticada. Al acercarse
 * el límite muestra un aviso con cuenta regresiva; si se agota, cierra la
 * sesión y devuelve al login.
 */
export function SessionTimeout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const expire = useCallback(() => {
    logout();
    navigate('/login', { replace: true, state: { reason: 'timeout' } });
  }, [logout, navigate]);

  const { isWarning, remainingMs, stayActive } = useIdleTimer({
    idleMs: IDLE_TIMEOUT_MS,
    warningMs: IDLE_WARNING_MS,
    onExpire: expire,
  });

  if (!isWarning) return null;

  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="idle-title">
      <div className={styles.modal}>
        <div className={styles.icon} aria-hidden="true">
          <ClockIcon />
        </div>
        <h3 id="idle-title" className={styles.title}>
          ¿Sigues ahí?
        </h3>
        <p className={styles.text}>
          Por seguridad, tu sesión se cerrará por inactividad en{' '}
          <strong className={styles.count}>{seconds}s</strong>.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={expire}>
            Cerrar sesión
          </button>
          <button type="button" className={styles.primary} onClick={stayActive}>
            Seguir conectado
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
