import styles from './DraftNotice.module.css';

/** Aviso de que se recuperó lo que la persona había escrito, con la opción de descartarlo. */
export function DraftNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <p className={styles.notice} role="status">
      <span>Recuperamos lo que habías escrito (se guarda solo en esta pestaña y se borra al cerrar sesión).</span>
      <button type="button" className={styles.discard} onClick={onDiscard}>
        Descartar borrador
      </button>
    </p>
  );
}
