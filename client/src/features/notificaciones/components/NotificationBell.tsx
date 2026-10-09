import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { BellIcon } from '@shared/components/icons';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications';
import type { AppNotification } from '../services/notificationService';
import styles from './NotificationBell.module.css';

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
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const markAllAsRead = useMarkAllNotificationsRead();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSelect = async (notification: AppNotification) => {
    setOpen(false);
    if (!notification.read) {
      await markAsRead(notification);
    }
    // Cada aviso abre el caso concreto; si ya no está disponible para esta cuenta, la pantalla lo explica.
    if (notification.referralId) {
      navigate(`/derivaciones?caso=${notification.referralId}`);
    } else if (notification.tutoringRequestId) {
      // El estudiante revisa su historial; el personal abre la solicitud en la bandeja.
      navigate(user?.role === 'Tutorado' ? '/solicitar-tutoria' : `/solicitudes?solicitud=${notification.tutoringRequestId}`);
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
            {unreadCount > 0 && (
              <>
                <span className={styles.unreadLabel}>{unreadCount} sin leer</span>
                <button type="button" className={styles.markAll} onClick={() => markAllAsRead()}>
                  Marcar todas como leídas
                </button>
              </>
            )}
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
