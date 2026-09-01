import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { authService } from '../services/authService';
import styles from './LoginPage.module.css'; // Reutilizamos estilos

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email);
      setSuccess('Si el correo está registrado en nuestro sistema, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o la consola del servidor de desarrollo.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <div className={styles.brandRow}>
          <div className={styles.emblem}>SIT</div>
          <div>
            <b>UNTRM</b>
            <small>Bienestar Universitario</small>
          </div>
        </div>

        <h1 className={styles.title}>Recuperar contraseña</h1>
        <p className={styles.subtitle}>
          Ingresa tu correo institucional y te enviaremos un enlace.
        </p>

        {success ? (
          <div className={styles.success} style={{ padding: '12px', background: '#e6f4ea', color: '#137333', borderRadius: '4px', marginBottom: '16px', fontSize: '14px' }}>
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className={styles.error} role="alert">
                <AlertIcon />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Correo institucional</label>
              <div className={styles.control}>
                <span className={styles.icon} aria-hidden="true">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={styles.input}
                  placeholder="usuario@untrm.edu.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                'Enviar enlace'
              )}
            </button>
          </form>
        )}

        <div className={styles.divider} />

        <div style={{ textAlign: 'center' }}>
          <Link to="/login" className={styles.forgot}>
            Volver al inicio de sesión
          </Link>
        </div>
      </main>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}
