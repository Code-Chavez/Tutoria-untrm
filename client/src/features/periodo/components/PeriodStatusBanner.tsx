import { usePeriodStatus } from '../hooks/usePeriods';
import styles from './PeriodStatusBanner.module.css';

/**
 * Avisa a todas las personas cuando no hay un periodo abierto: la tutoría queda en solo lectura (se puede consultar el
 * historial, no registrar nada nuevo). Mientras carga o si falla la consulta no muestra nada.
 */
export function PeriodStatusBanner() {
  const { data } = usePeriodStatus();
  if (!data || data.open) return null;

  return (
    <p role="status" className={styles.banner}>
      <strong>Tutoría en solo lectura:</strong> no hay un periodo académico abierto. Puedes consultar el historial, pero no registrar ni
      solicitar nada hasta que se abra el siguiente periodo.
    </p>
  );
}
