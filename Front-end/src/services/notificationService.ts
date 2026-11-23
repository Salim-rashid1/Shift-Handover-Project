import { api } from './api'
import type { Notification } from '../types'

export interface NotificationService {
  listForCurrentUser: () => Promise<Notification[]>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

/**
 * API-ready notification service.
 *
 * Notification access through the configured PHP API.
 */
export const notificationService: NotificationService = {
  listForCurrentUser: () => api.notifications.getForCurrentUser(),
  markAsRead: async (id) => { await api.notifications.markAsRead(id) },
  markAllAsRead: async () => { await api.notifications.markAllAsRead() },
}
