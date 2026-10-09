import { Link } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { ChevronRightIcon } from '@shared/components/icons';
import { quickActionsFor } from './homeAccess';
import styles from './QuickActions.module.css';

export function QuickActions() {
  const { user } = useAuth();
  const actions = quickActionsFor(user?.role);

  if (actions.length === 0) return null;

  return (
    <div className={styles.grid}>
      {actions.map((action) => (
        <Link key={action.label} to={action.to} className={styles.action}>
          <span className={styles.icon}>
            <action.Icon size={20} />
          </span>
          <span className={styles.text}>
            <b>{action.label}</b>
            <small>{action.description}</small>
          </span>
          <span className={styles.arrow}>
            <ChevronRightIcon size={16} />
          </span>
        </Link>
      ))}
    </div>
  );
}
