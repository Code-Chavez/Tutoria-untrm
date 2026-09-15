import React from 'react';
import styles from './Badge.module.css';

type Tone = 'success' | 'neutral' | 'danger' | 'warning' | 'info';

interface BadgeProps {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', icon, children }) => (
  <span className={`${styles.badge} ${styles[tone]}`}>
    {icon && <span className={styles.dot}>{icon}</span>}
    {children}
  </span>
);
