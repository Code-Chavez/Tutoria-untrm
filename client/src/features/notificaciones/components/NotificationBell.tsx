import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '@shared/components/icons';
import { notificationService, AppNotification } from '../services/notificationService';
import styles from './NotificationBell.module.css';

const POLL_INTERVAL_MS = 60000;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = () => {
    // Silencioso: la bandeja de notificaciones no debe interrumpir el resto de la app.
    notificationService.getNotifications().then(setNotifications).catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSelect = async (notification: AppNotification) => {
    setOpen(false);
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      try {
        await notificationService.markAsRead(notification.id);
      } catch {
        loadNotifications();
      }
    }
    if (notification.referralId) {
      navigate('/derivaciones');
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.bell}
        type="button"
        aria-label="Notificaciones"
        onClick={() => setOpen((prev) => !prev)}
      >
        <BellIcon size={19} />
        {unreadCount > 0 && (
          <span className={styles.bellDot} aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHeader}>
            <span>Notificaciones</span>
            {unreadCount > 0 && <span className={styles.unreadLabel}>{unreadCount} sin leer</span>}
          </div>
          <div className={styles.panelList}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>No tienes notificaciones</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`${styles.item} ${notification.read ? '' : styles.itemUnread}`}
                  onClick={() => handleSelect(notification)}
                >
                  <span className={styles.itemDot} aria-hidden="true" />
                  <span className={styles.itemBody}>
                    <span className={styles.itemMessage}>{notification.message}</span>
                    <span className={styles.itemTime}>{formatRelativeTime(notification.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
