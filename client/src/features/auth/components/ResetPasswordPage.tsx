import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { authService } from '../services/authService';
import styles from './LoginPage.module.css';

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!token) {
      setError('Token de recuperación no válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess('Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tu nueva contraseña.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
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

        <h1 className={styles.title}>Nueva contraseña</h1>
        <p className={styles.subtitle}>
          Ingresa y confirma tu nueva contraseña institucional.
        </p>

        {success ? (
          <div className={styles.success} style={{ padding: '12px', background: '#e6f4ea', color: '#137333', borderRadius: '4px', marginBottom: '16px', fontSize: '14px' }}>
            {success}
            <br/><br/>
            Redirigiendo al inicio de sesión...
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
              <label htmlFor="password">Nueva contraseña</label>
              <div className={styles.control}>
                <span className={styles.icon} aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar la clave' : 'Mostrar la clave'}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <div className={styles.control}>
                <span className={styles.icon} aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={styles.input}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Guardando…
                </>
              ) : (
                'Restablecer contraseña'
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

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 3M6.6 6.6A13.2 13.2 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" />
      <path d="m2 2 20 20" />
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
