import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.main}>
        <TopBar title="Panel de inicio" />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
