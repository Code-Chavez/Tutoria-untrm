import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginPage.module.css';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si ya hay sesión, esta pantalla no aporta nada.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      const destination = (location.state as LocationState | null)?.from?.pathname ?? '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <h1>Sistema de Acompañamiento y Tutoría Universitaria</h1>
        <p>
          Facultad de Ingeniería de Sistemas y Mecánica Eléctrica ·
          Dirección de Bienestar Universitario
        </p>
        <div className={styles.footer}>
          Protocolo N° 01-2024-UNTRM/DBU · R.C.U. N° 283-2024-UNTRM/CU
        </div>
      </div>
      <div className={styles.right}>
        <h3>Iniciar sesión</h3>
        <div className={styles.sub}>Ingresa con tu cuenta institucional</div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className={styles.error} role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email">Correo institucional</label>
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

          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className={styles.btn} disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>

          <a href="#" className={styles.forgot}>
            ¿Olvidaste tu contraseña?
          </a>
        </form>
      </div>
    </div>
  );
}
