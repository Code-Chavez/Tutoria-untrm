import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService, AppNotification } from '../services/notificationService';

const POLL_INTERVAL_MS = 60000;
export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

/** Bandeja de notificaciones del usuario autenticado (HU-33), con poll cada minuto. */
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  });
}

/** Marca una notificación como leída en el caché de forma optimista. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return async (notification: AppNotification) => {
    queryClient.setQueryData<AppNotification[]>(NOTIFICATIONS_QUERY_KEY, (prev) =>
      prev?.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
    try {
      await notificationService.markAsRead(notification.id);
    } catch {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }
  };
}

/** Marca todos los avisos como leídos (en el caché de inmediato y luego en el servidor). */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return async () => {
    queryClient.setQueryData<AppNotification[]>(NOTIFICATIONS_QUERY_KEY, (prev) => prev?.map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAllAsRead();
    } catch {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }
  };
}
