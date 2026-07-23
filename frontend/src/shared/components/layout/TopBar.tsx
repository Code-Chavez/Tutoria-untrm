import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className={styles.top}>
      <div className={styles.crumb}>
        SIT · <b>{title}</b>
      </div>
      <div className={styles.right}>
        <div className={styles.bell}>
          <span role="img" aria-label="notificaciones">🔔</span>
        </div>
        <div className={styles.who}>
          <div className={styles.avatar}>AD</div>
          <div>
            <b>Administrador</b>
            <small>Admin DBU</small>
          </div>
        </div>
      </div>
    </header>
  );
}
