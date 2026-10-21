import { Link } from 'react-router-dom';
import { SendIcon } from '@shared/components/icons';
import type { DataRequestKind } from '../services/dataRequestService';
import styles from './RequestListBanner.module.css';

const COPY: Record<DataRequestKind, { noun: string; param: string }> = {
  ESTUDIANTES: { noun: 'la lista de estudiantes', param: 'estudiantes' },
  DOCENTES: { noun: 'la lista de docentes tutores', param: 'docentes' },
};

// «Primero pide la lista»: arriba de cada pantalla de carga. No pide nada aquí: lleva a «Pedir listas» (con la lista ya elegida),
// que es donde se elige la escuela y se pide; ahí también se ve el correo al que se pide y el estado de cada pedido.
export function RequestListBanner({ kind }: { kind: DataRequestKind }) {
  const copy = COPY[kind];

  return (
    <section className={styles.box} aria-label={`Pedir ${copy.noun}`}>
      <div className={styles.text}>
        <h2>¿Aún no tienes {copy.noun}? Pídela primero</h2>
        <p>La lista se pide por correo a la escuela. Cuando llegue el Excel, cárgalo aquí abajo.</p>
      </div>
      <div className={styles.actions}>
        <Link to={`/pedir-listas?lista=${copy.param}`} className={styles.linkButton}>
          <SendIcon size={16} /> Ir a «Pedir listas»
        </Link>
      </div>
    </section>
  );
}
