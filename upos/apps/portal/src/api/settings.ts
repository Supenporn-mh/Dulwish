import api from './axios'
import type {
  WalletPermission,
  AcademicYear,
  GradeLevel,
  Branch,
  StoreSettings,
} from './types'

// ── Normalizers ───────────────────────────────────────────────────────────────

function normWalletPermission(w: any): WalletPermission {
  return { ...w, code: w.code, id: w.code }
}

function normAcademicYear(a: any): AcademicYear {
  return { ...a, id: String(a._id ?? a.id) }
}

// ── Wallet Permissions (/settings/wallet-permissions) ─────────────────────────

export async function listWalletPermissions(): Promise<WalletPermission[]> {
  const { data } = await api.get('/settings/wallet-permissions')
  return (data.walletPermissions ?? []).map(normWalletPermission)
}

/** Upsert (create or update) a wallet permission, or toggle enabled state */
export async function upsertWalletPermission(
  id: string,
  payload: Partial<WalletPermission>,
): Promise<WalletPermission> {
  const { data } = await api.patch(`/settings/wallet-permissions/${id}`, payload)
  return normWalletPermission(data.walletPermission)
}

// ── Academic Years (/settings/academic-years) ─────────────────────────────────

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const { data } = await api.get('/settings/academic-years')
  return (data.academicYears ?? []).map(normAcademicYear)
}

export async function createAcademicYear(
  payload: Omit<AcademicYear, 'id'>,
): Promise<AcademicYear> {
  const { data } = await api.post('/settings/academic-years', payload)
  return normAcademicYear(data.academicYear)
}

export async function updateAcademicYear(
  id: string,
  payload: Partial<AcademicYear>,
): Promise<AcademicYear> {
  const { data } = await api.patch(`/settings/academic-years/${id}`, payload)
  return normAcademicYear(data.academicYear)
}

export async function deleteAcademicYear(id: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/settings/academic-years/${id}`)
  return data
}

// ── Grade Levels (/settings/grade-levels) ────────────────────────────────────

function normGradeLevel(g: any): GradeLevel {
  return { ...g, id: String(g._id ?? g.id) }
}

export async function listGradeLevels(): Promise<GradeLevel[]> {
  const { data } = await api.get('/settings/grade-levels')
  return (data.gradeLevels ?? []).map(normGradeLevel)
}

export async function createGradeLevel(payload: Omit<GradeLevel, 'id'>): Promise<GradeLevel> {
  const { data } = await api.post('/settings/grade-levels', payload)
  return normGradeLevel(data.gradeLevel)
}

export async function updateGradeLevel(id: string, payload: Partial<GradeLevel>): Promise<GradeLevel> {
  const { data } = await api.patch(`/settings/grade-levels/${id}`, payload)
  return normGradeLevel(data.gradeLevel)
}

export async function reorderGradeLevels(items: { id: string; sortOrder: number }[]): Promise<GradeLevel[]> {
  const { data } = await api.patch('/settings/grade-levels/reorder', { items })
  return (data.gradeLevels ?? []).map(normGradeLevel)
}

export async function deleteGradeLevel(id: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/settings/grade-levels/${id}`)
  return data
}

// ── Mid-year Enrollment (/settings/mid-year-enroll) ──────────────────────────

export async function midYearEnroll(payload: {
  studentId: string
  gradeLevel: string
  className?: string
}): Promise<any> {
  const { data } = await api.post('/settings/mid-year-enroll', payload)
  return data.student
}

// ── Store Settings (/settings/store) — singleton ─────────────────────────────

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data } = await api.get('/settings/store')
  return data.store
}

export async function updateStoreSettings(payload: Partial<StoreSettings>): Promise<StoreSettings> {
  const { data } = await api.patch('/settings/store', payload)
  return data.store
}

// ── Branches (/settings/branches) ─────────────────────────────────────────────

export async function listBranches(): Promise<Branch[]> {
  const { data } = await api.get('/settings/branches')
  return data.branches
}

export async function createBranch(payload: Branch): Promise<Branch> {
  const { data } = await api.post('/settings/branches', payload)
  return data.branch
}

export async function updateBranch(code: string, payload: Partial<Branch>): Promise<Branch> {
  const { data } = await api.patch(`/settings/branches/${code}`, payload)
  return data.branch
}

export async function deleteBranch(code: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/settings/branches/${code}`)
  return data
}
