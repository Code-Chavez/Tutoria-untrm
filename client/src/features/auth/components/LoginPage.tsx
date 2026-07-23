import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginPage.module.css';

interface LocationState {
  from?: { pathname: string };
}

const FEATURES = [
  'Seguimiento integral de tutorados',
  'Registro de sesiones y derivaciones',
  'Reportes e indicadores en tiempo real',
];

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className={styles.page}>
      <aside className={styles.brand}>
        <div className={styles.brandTop}>
          <div className={styles.emblem}>SIT</div>
          <div>
            <b>UNTRM</b>
            <small>Bienestar Universitario</small>
          </div>
        </div>

        <div className={styles.brandBody}>
          <span className={styles.eyebrow}>FISME · Tutoría Universitaria</span>
          <h1>
            Acompañamiento que <em>transforma</em> la vida universitaria
          </h1>
          <p className={styles.lead}>
            Plataforma institucional para sistematizar el proceso de tutoría y dar
            seguimiento al desarrollo académico y personal de cada estudiante.
          </p>

          <ul className={styles.features}>
            {FEATURES.map((feature) => (
              <li key={feature}>
                <span className={styles.tick} aria-hidden="true">
                  <CheckIcon />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.brandFoot}>
          Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas
          <br />
          Protocolo N° 01-2024-UNTRM/DBU · R.C.U. N° 283-2024-UNTRM/CU
        </div>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.form}>
          <div className={styles.mobileBrand}>
            <div className={styles.emblem}>SIT</div>
            <div>
              <b>Tutoría Universitaria</b>
              <small>UNTRM · FISME</small>
            </div>
          </div>

          <h2 className={styles.title}>Bienvenido de nuevo</h2>
          <p className={styles.subtitle}>
            Ingresa con tu cuenta institucional para continuar.
          </p>

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
                <span className={styles.leadIcon} aria-hidden="true">
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

            <div className={styles.field}>
              <label htmlFor="password">Contraseña</label>
              <div className={styles.control}>
                <span className={styles.leadIcon} aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`${styles.input} ${styles.hasToggle}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar la clave' : 'Mostrar la clave'}
                  aria-pressed={showPassword}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>

            <div className={styles.formFoot}>
              <a href="#" className={styles.forgot}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>

          <p className={styles.legal}>
            El uso de esta plataforma implica la aceptación del tratamiento de datos
            conforme a la Ley N° 29733 de Protección de Datos Personales.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─── Iconografía (SVG inline: sin dependencias externas) ──── */

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
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

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20 6-11 11-5-5" />
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
