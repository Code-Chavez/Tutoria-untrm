import { CheckIcon } from '@shared/components/icons';
import styles from './ImportStepper.module.css';

const STEPS = ['Plantilla', 'Archivo', 'Validación', 'Importación'];

interface ImportStepperProps {
  current: number; // índice 0-based del paso activo
}

export function ImportStepper({ current }: ImportStepperProps) {
  return (
    <ol className={styles.stepper} aria-label="Progreso de la carga">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={label} className={`${styles.step} ${styles[state]}`}>
            <span className={styles.bullet}>
              {state === 'done' ? <CheckIcon size={15} /> : i + 1}
            </span>
            <span className={styles.label}>{label}</span>
            {i < STEPS.length - 1 && <span className={styles.line} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
