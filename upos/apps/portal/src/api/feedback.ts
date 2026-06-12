import api from './axios'
import type { FeedbackAdminResult } from './types'

export interface FeedbackAdminParams {
  channel?: string
  rating?: number | ''
  date?: string
  page?: number
  limit?: number
}

export async function getAdminFeedback(params: FeedbackAdminParams = {}): Promise<FeedbackAdminResult> {
  const q: Record<string, string> = {}
  if (params.channel) q.channel = params.channel
  if (params.rating)  q.rating  = String(params.rating)
  if (params.date)    q.date    = params.date
  if (params.page)    q.page    = String(params.page)
  if (params.limit)   q.limit   = String(params.limit)
  const qs = new URLSearchParams(q).toString()
  const res = await api.get<FeedbackAdminResult>(`/feedback${qs ? '?' + qs : ''}`)
  return res.data
}
