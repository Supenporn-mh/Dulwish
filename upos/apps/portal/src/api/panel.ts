import api from './axios'

export interface PanelItem {
  productId: string
  productName: string
  textColor: string
  bgColor: string
}

export interface Panel {
  id: string
  name: string
  branch: string
  isVisible: boolean
  imageBase64?: string
  items: PanelItem[]
}

function norm(p: any): Panel {
  return { ...p, id: String(p._id ?? p.id), items: p.items ?? [] }
}

export async function listPanels(branch?: string): Promise<Panel[]> {
  const { data } = await api.get('/panels', { params: branch ? { branch } : undefined })
  return (data.panels ?? []).map(norm)
}

export async function createPanel(payload: Omit<Panel, 'id'>): Promise<Panel> {
  const { data } = await api.post('/panels', payload)
  return norm(data.panel)
}

export async function updatePanel(id: string, payload: Partial<Omit<Panel, 'id'>>): Promise<Panel> {
  const { data } = await api.patch(`/panels/${id}`, payload)
  return norm(data.panel)
}

export async function deletePanel(id: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/panels/${id}`)
  return data
}
