import { api } from '@/lib/api'
import { bearer } from './collab-api.projects'
import type { ChatMentionNotification, DataResponse } from './collab.types'

export async function listUnreadMentionNotificationsRequest(
  accessToken: string
): Promise<DataResponse<ChatMentionNotification[]>> {
  return api
    .get('notifications/chat-mentions/unread', { headers: bearer(accessToken) })
    .json<DataResponse<ChatMentionNotification[]>>()
}

export async function countUnreadMentionNotificationsRequest(
  accessToken: string
): Promise<DataResponse<{ unread_count: number }>> {
  return api
    .get('notifications/chat-mentions/unread/count', { headers: bearer(accessToken) })
    .json<DataResponse<{ unread_count: number }>>()
}

export async function markMentionNotificationSeenRequest(
  accessToken: string,
  notificationId: string
): Promise<DataResponse<{ id: string; is_seen: boolean; seen_at: string | null }>> {
  return api
    .patch(`notifications/chat-mentions/${notificationId}/read`, { headers: bearer(accessToken) })
    .json<DataResponse<{ id: string; is_seen: boolean; seen_at: string | null }>>()
}

