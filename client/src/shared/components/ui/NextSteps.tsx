import { Link, useInRouterContext } from 'react-router-dom';
import { ChevronRightIcon } from '@shared/components/icons';
import styles from './NextSteps.module.css';

export interface NextStep {
  to: string;
  label: string;
  description: string;
}

interface NextStepsProps {
  title?: string;
  steps: NextStep[];
}

// «Qué sigue»: una pantalla no termina en sí misma. Lleva a donde se carga lo que falta o a la tarea siguiente del flujo.
export function NextSteps({ title = 'Qué sigue', steps }: NextStepsProps) {
  const inRouter = useInRouterContext();
  if (steps.length === 0 || !inRouter) return null;
  return (
    <nav className={styles.box} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {steps.map((step) => (
          <li key={step.to + step.label}>
            <Link to={step.to} className={styles.link}>
              <span className={styles.text}>
                <b>{step.label}</b>
                <small>{step.description}</small>
              </span>
              <ChevronRightIcon size={16} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
