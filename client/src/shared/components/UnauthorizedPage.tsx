import { Link } from 'react-router-dom';
import styles from './UnauthorizedPage.module.css';

export function UnauthorizedPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <ShieldIcon />
        </div>
        <div className={styles.code}>403</div>
        <h1 className={styles.title}>Acceso denegado</h1>
        <p className={styles.text}>
          No cuentas con los permisos necesarios para ver esta sección. Si crees
          que se trata de un error, contacta al administrador del sistema.
        </p>
        <Link to="/" className={styles.button}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9.5 12 1.8 1.8 3.5-3.6" />
    </svg>
  );
}
