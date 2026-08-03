import { useNavigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function TopBar({ title }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className={styles.top}>
      <div className={styles.crumb}>
        SIT · <b>{title}</b>
      </div>
      <div className={styles.right}>
        <div className={styles.bell}>
          <span role="img" aria-label="notificaciones">🔔</span>
        </div>
        {user && (
          <div className={styles.who}>
            <div className={styles.avatar}>
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div>
              <b>
                {user.firstName} {user.lastName}
              </b>
              <small>{user.role}</small>
            </div>
          </div>
        )}
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Salir
        </button>
      </div>
    </header>
  );
}
