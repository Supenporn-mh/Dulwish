import api from '@/api/axios'

// ── Local types (do not import from api/types.ts) ─────────────────────────────
export type ServerNotifType = 'info' | 'success' | 'warning' | 'danger'

export interface ServerNotification {
  _id:       string
  type:      ServerNotifType
  title:     string
  titleEn:   string
  body:      string
  bodyEn:    string
  action?:   string
  read:      boolean
  createdAt: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** List notifications for the current user. Pass unreadOnly=true for unread only. */
export async function listNotifications(unreadOnly = false): Promise<ServerNotification[]> {
  const params = unreadOnly ? { unread: 'true' } : {}
  const res = await api.get('/notifications', { params })
  return res.data?.notifications ?? res.data ?? []
}

/** Mark a single notification as read. */
export async function markRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

/** Mark all notifications as read. */
export async function markAllRead(): Promise<void> {
  await api.patch('/notifications/read-all')
}
