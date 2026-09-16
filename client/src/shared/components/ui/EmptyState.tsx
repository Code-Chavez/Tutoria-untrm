import React from 'react';
import styles from './EmptyState.module.css';

type Variant = 'empty' | 'error';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: Variant;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'empty',
}) => (
  <div className={styles.wrap} role={variant === 'error' ? 'alert' : undefined}>
    <span className={`${styles.icon} ${styles[variant]}`}>{icon}</span>
    <h3 className={styles.title}>{title}</h3>
    {description && <p className={styles.desc}>{description}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);
