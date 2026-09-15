import React from 'react';
import styles from './StatCard.module.css';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  hint?: string;
  tone?: Tone;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  hint,
  tone = 'info',
  loading = false,
}) => (
  <article className={`${styles.card} ${styles[tone]}`}>
    <div className={styles.top}>
      <span className={styles.icon}>{icon}</span>
    </div>
    <div className={styles.value}>{loading ? <span className={styles.skeleton} /> : value}</div>
    <div className={styles.label}>{label}</div>
    {hint && <div className={styles.hint}>{hint}</div>}
  </article>
);
