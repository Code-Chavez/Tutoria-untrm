import { usePeriodStatus } from '../hooks/usePeriods';
import styles from './PeriodStatusBanner.module.css';

/**
 * Avisa a todas las personas cuando no hay un periodo abierto: la tutoría queda en solo lectura (se puede consultar el
 * historial, no registrar nada nuevo). Mientras carga o si falla la consulta no muestra nada.
 */
export function PeriodStatusBanner() {
  const { data } = usePeriodStatus();
  if (!data) return null;

  if (data.open && data.enrolled === false) {
    return (
      <p role="status" className={styles.banner}>
        <strong>Solo lectura:</strong> no figuras en la carga del periodo {data.period?.name}. Puedes consultar tu historial, pero no solicitar
        tutoría ni evaluar hasta que tu escuela te incluya en la carga.
      </p>
    );
  }
  if (data.open) return null;

  return (
    <p role="status" className={styles.banner}>
      <strong>Tutoría en solo lectura:</strong> no hay un periodo académico abierto. Puedes consultar el historial, pero no registrar ni
      solicitar nada hasta que se abra el siguiente periodo.
    </p>
  );
}
