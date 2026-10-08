import React from 'react';
import styles from './IconButton.module.css';

type Tone = 'default' | 'primary' | 'success' | 'danger';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // obligatorio: sirve como aria-label y tooltip
  tone?: Tone;
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  tone = 'default',
  children,
  className = '',
  ...rest
}) => (
  <span className={styles.wrap}>
    <button
      type="button"
      className={`${styles.btn} ${styles[tone]} ${className}`}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
    {/* El botón ya tiene aria-label; el tooltip es solo ayuda visual y no se anuncia dos veces. */}
    <span className={styles.tooltip} aria-hidden="true">
      {label}
    </span>
  </span>
);
