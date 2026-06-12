import api from './axios'

// ── Local types (not in api/types.ts) ────────────────────────────────────────

export interface Device {
  _id: string
  deviceId: string
  name: string
  type?: string
  branchCode?: string
  status?: string
  note?: string
}

export interface Branch {
  _id: string
  code: string
  name: string
}

export interface CreateDevicePayload {
  deviceId: string
  name: string
  type?: string
  branchCode?: string
  status?: string
  note?: string
}

export type UpdateDevicePayload = Partial<CreateDevicePayload>

// ── Devices (/devices) ────────────────────────────────────────────────────────

export async function listDevices(branchCode?: string): Promise<Device[]> {
  const params: Record<string, string> = {}
  if (branchCode) params.branchCode = branchCode
  const { data } = await api.get('/devices', { params })
  return data.devices ?? data ?? []
}

export async function createDevice(payload: CreateDevicePayload): Promise<Device> {
  const { data } = await api.post('/devices', payload)
  return data.device ?? data
}

export async function updateDevice(id: string, payload: UpdateDevicePayload): Promise<Device> {
  const { data } = await api.patch(`/devices/${id}`, payload)
  return data.device ?? data
}

export async function deleteDevice(id: string): Promise<void> {
  await api.delete(`/devices/${id}`)
}

// ── Branches (/settings/branches) ────────────────────────────────────────────

export async function listBranches(): Promise<Branch[]> {
  const { data } = await api.get('/settings/branches')
  return data.branches ?? data ?? []
}
