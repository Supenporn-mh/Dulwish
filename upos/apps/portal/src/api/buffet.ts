import api from './axios'
import type { BuffetPricing, BuffetConfig, BuffetBlackout, BuffetRound, BuffetUsage, BuffetHistoryResult, BuffetCategory } from './types'

function normPricing(p: any): BuffetPricing {
  const glId = p.gradeLevelId
    ? String(p.gradeLevelId)
    : p.gradeLevel?._id
      ? String(p.gradeLevel._id)
      : null
  return {
    ...p,
    id:           String(p._id ?? p.id),
    gradeLevelId: glId,
    gradeLevel:   p.gradeLevel ?? null,
    categoryIds:  (p.categoryIds ?? []).map(String),
  }
}
function normBlackout(b: any): BuffetBlackout {
  return { ...b, id: String(b._id ?? b.id) }
}
function normRound(r: any): BuffetRound {
  return { ...r, id: String(r._id ?? r.id) }
}

// ── BuffetRound ───────────────────────────────────────────────────────────────

export async function listBuffetRounds(): Promise<BuffetRound[]> {
  const { data } = await api.get('/buffet/rounds')
  return (data.rounds ?? []).map(normRound)
}

export async function createBuffetRound(payload: Omit<BuffetRound, 'id'>): Promise<BuffetRound> {
  const { data } = await api.post('/buffet/rounds', payload)
  return normRound(data.round)
}

export async function updateBuffetRound(id: string, payload: Partial<BuffetRound>): Promise<BuffetRound> {
  const { data } = await api.patch(`/buffet/rounds/${id}`, payload)
  return normRound(data.round)
}

export async function deleteBuffetRound(id: string): Promise<void> {
  await api.delete(`/buffet/rounds/${id}`)
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export async function listBuffetPricing(): Promise<BuffetPricing[]> {
  const { data } = await api.get('/buffet/pricing')
  return (data.pricing ?? []).map(normPricing)
}

export async function createBuffetPricing(payload: Omit<BuffetPricing, 'id' | 'gradeLevel' | 'buffetRound'>): Promise<BuffetPricing> {
  const { data } = await api.post('/buffet/pricing', payload)
  return normPricing(data.pricing)
}

export async function updateBuffetPricing(id: string, payload: Partial<BuffetPricing>): Promise<BuffetPricing> {
  const { data } = await api.patch(`/buffet/pricing/${id}`, payload)
  return normPricing(data.pricing)
}

export async function deleteBuffetPricing(id: string): Promise<void> {
  await api.delete(`/buffet/pricing/${id}`)
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getBuffetConfig(): Promise<BuffetConfig> {
  const { data } = await api.get('/buffet/config')
  return data.config
}

export async function updateBuffetConfig(openDays: number[]): Promise<BuffetConfig> {
  const { data } = await api.patch('/buffet/config', { openDays })
  return data.config
}

// ── Blackouts ─────────────────────────────────────────────────────────────────

export async function listBuffetBlackouts(): Promise<BuffetBlackout[]> {
  const { data } = await api.get('/buffet/blackouts')
  return (data.blackouts ?? []).map(normBlackout)
}

export async function createBuffetBlackout(date: string, endDate?: string, reason?: string): Promise<BuffetBlackout> {
  const { data } = await api.post('/buffet/blackouts', { date, endDate, reason })
  return normBlackout(data.blackout)
}

export async function deleteBuffetBlackout(id: string): Promise<void> {
  await api.delete(`/buffet/blackouts/${id}`)
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export async function getBuffetUsage(date?: string): Promise<BuffetUsage> {
  const { data } = await api.get('/buffet/usage', { params: date ? { date } : {} })
  return data
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getBuffetHistory(params: {
  date?: string
  startDate?: string
  endDate?: string
  roundId?: string
  search?: string
  page?: number
  limit?: number
}): Promise<BuffetHistoryResult> {
  const { data } = await api.get('/buffet/history', { params })
  return data
}

// ── BuffetCategory ────────────────────────────────────────────────────────────

function normCategory(c: any): BuffetCategory {
  return { ...c, id: String(c._id ?? c.id) }
}

export async function listBuffetCategories(): Promise<BuffetCategory[]> {
  const { data } = await api.get('/buffet/categories')
  return (data.categories ?? []).map(normCategory)
}

export async function createBuffetCategory(
  payload: Omit<BuffetCategory, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<BuffetCategory> {
  const { data } = await api.post('/buffet/categories', payload)
  return normCategory(data.category)
}

export async function updateBuffetCategory(
  id: string,
  payload: Partial<Omit<BuffetCategory, 'id'>>,
): Promise<BuffetCategory> {
  const { data } = await api.patch(`/buffet/categories/${id}`, payload)
  return normCategory(data.category)
}

export async function deleteBuffetCategory(id: string): Promise<void> {
  await api.delete(`/buffet/categories/${id}`)
}

// ── Manual tap ────────────────────────────────────────────────────────────────

export async function manualTapBuffet(payload: {
  uid: string
  buffetRoundId: string
  buffetCategoryId?: string
  entryDate: string
  supervisorCode: string
  note?: string
}): Promise<{ ok: boolean; sessionId: string; price: number }> {
  const { data } = await api.post('/buffet/sessions/manual', payload)
  return data
}

// ── Void ──────────────────────────────────────────────────────────────────────

export async function voidBuffetSession(
  sessionId: string,
  reason: string,
  supervisorCode: string,
): Promise<{ refundAmount: number }> {
  const { data } = await api.post(`/buffet/sessions/${sessionId}/void`, { reason, supervisorCode })
  return data
}
