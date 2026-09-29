import { apiClient } from '@shared/services/apiClient';

// Bandeja de notificaciones (HU-33): derivaciones nuevas y cambios de estado.
export type NotificationType = 'REFERRAL_CREATED' | 'REFERRAL_STATUS_CHANGED';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  referralId?: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  getNotifications: async (): Promise<AppNotification[]> => {
    const response = await apiClient.get<AppNotification[]>('/notifications');
    return response.data;
  },

  markAsRead: async (id: string): Promise<AppNotification> => {
    const response = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
    return response.data;
  },
};
