import React from 'react';
import { CheckIcon } from '@shared/components/icons';
import styles from './Stepper.module.css';

interface StepperProps {
  steps: string[];
  current: number; // índice 0-based del paso activo
  label?: string;
}

export const Stepper: React.FC<StepperProps> = ({ steps, current, label = 'Progreso' }) => (
  <ol className={styles.stepper} aria-label={label}>
    {steps.map((stepLabel, i) => {
      const state = i < current ? 'done' : i === current ? 'active' : 'todo';
      return (
        <li key={stepLabel} className={`${styles.step} ${styles[state]}`}>
          <span className={styles.bullet}>
            {state === 'done' ? <CheckIcon size={15} /> : i + 1}
          </span>
          <span className={styles.label}>{stepLabel}</span>
          {i < steps.length - 1 && <span className={styles.line} aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);
