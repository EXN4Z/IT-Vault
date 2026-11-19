import { api } from '../lib/api';

export interface AppNotification {
  id: string;
  type: string | null;
  message: string;
  url: string | null;
  silent: boolean;
  read_at: string | null;
  created_at: string;
}

export const notificationService = {
  async list() {
    const { data } = await api.get<{ data: AppNotification[]; unread_count: number }>('/notifications');
    return data;
  },
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};