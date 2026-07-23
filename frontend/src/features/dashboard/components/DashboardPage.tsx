import styles from './DashboardPage.module.css';

export function DashboardPage() {
  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2>Panel de inicio</h2>
          <p>Resumen del periodo académico 2026-II · FISME</p>
        </div>
      </div>
      <div className={styles.cards}>
        <div className={`${styles.kpi} ${styles.info}`}>
          <div className={styles.number}>0</div>
          <div className={styles.label}>Tutorados activos</div>
        </div>
        <div className={`${styles.kpi} ${styles.success}`}>
          <div className={styles.number}>0</div>
          <div className={styles.label}>Sesiones registradas</div>
        </div>
        <div className={`${styles.kpi} ${styles.warning}`}>
          <div className={styles.number}>0</div>
          <div className={styles.label}>En riesgo académico</div>
        </div>
        <div className={`${styles.kpi} ${styles.danger}`}>
          <div className={styles.number}>0</div>
          <div className={styles.label}>Derivaciones pendientes</div>
        </div>
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>Sistema inicializado</h3>
        </div>
        <div className={styles.panelBody}>
          <p>
            El sistema SIT se encuentra operativo. Configure los usuarios,
            catálogos maestros y cargue la relación de estudiantes para comenzar.
          </p>
        </div>
      </div>
    </div>
  );
}
