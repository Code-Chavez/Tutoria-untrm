import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { ChevronRightIcon } from '@shared/components/icons';
import { quickActionGroupsFor } from './homeAccess';
import styles from './QuickActions.module.css';

// Accesos del panel de inicio agrupados como el menú. Cuando un bloque es un flujo (el periodo académico) cada acceso
// lleva su número de paso, para que se vea qué sigue después de qué.
export function QuickActions() {
  const { user } = useAuth();
  const id = useId();
  const personal = user?.role === 'Tutorado' || user?.role === 'Docente Tutor';
  const groups = quickActionGroupsFor(user?.role, user?.permissions);

  if (groups.length === 0) return null;

  return (
    <div className={styles.groups}>
      {groups.map((group, groupIndex) => (
        <section key={group.title} aria-labelledby={`${id}-${groupIndex}`} className={styles.group}>
          <h3 id={`${id}-${groupIndex}`} className={styles.groupTitle}>
            {group.title}
          </h3>
          <div className={styles.grid}>
            {group.actions.map((action, index) => (
              <Link key={`${action.group}-${action.label}-${action.to}`} to={action.to} className={styles.action} data-featured={personal && groupIndex === 0 && index === 0}>
                <span className={styles.icon}>
                  <action.Icon size={20} />
                </span>
                <span className={styles.text}>
                  {action.step && <small className={styles.step}>Paso {action.step}</small>}
                  <b>{action.label}</b>
                  <small>{action.description}</small>
                </span>
                <span className={styles.arrow}>
                  <ChevronRightIcon size={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
