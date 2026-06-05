import api from './axios'
import type { MemberGroup, GroupMember } from './types'

// ── Normalizer ────────────────────────────────────────────────────────────────

/** Groups controller already returns id=code. Keep id for safety. */
function normGroup(g: any): MemberGroup {
  return { ...g, id: g.id ?? g.code }
}

// ── Groups (/groups) ──────────────────────────────────────────────────────────

/** List groups. Pass kind to filter: 'member' | 'student' */
export async function listGroups(kind?: 'member' | 'student'): Promise<MemberGroup[]> {
  const { data } = await api.get('/groups', { params: kind ? { kind } : undefined })
  return (data.groups ?? []).map(normGroup)
}

export async function createGroup(payload: Omit<MemberGroup, 'memberCount'>): Promise<MemberGroup> {
  const { data } = await api.post('/groups', payload)
  return normGroup(data.group)
}

export async function updateGroup(code: string, payload: Partial<MemberGroup>): Promise<MemberGroup> {
  const { data } = await api.patch(`/groups/${code}`, payload)
  return normGroup(data.group)
}

export async function deleteGroup(code: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/groups/${code}`)
  return data
}

// ── Group Members (/groups/:code/members) ─────────────────────────────────────

export async function listGroupMembers(code: string): Promise<GroupMember[]> {
  const { data } = await api.get(`/groups/${code}/members`)
  return data.members
}

export async function addGroupMember(code: string, userId: string): Promise<GroupMember> {
  const { data } = await api.post(`/groups/${code}/members`, { userId })
  return data.member
}

export async function removeGroupMember(code: string, userId: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/groups/${code}/members/${userId}`)
  return data
}
