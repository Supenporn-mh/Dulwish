import api from './axios'

export interface Banner {
  id: string
  name: string
  imageBase64?: string
  isVisible: boolean
  sortOrder: number
}

function norm(b: any): Banner {
  return { ...b, id: String(b._id ?? b.id) }
}

export async function listBanners(): Promise<Banner[]> {
  const { data } = await api.get('/banners')
  return (data.banners ?? []).map(norm)
}

export async function createBanner(payload: { name: string; imageBase64?: string; isVisible: boolean }): Promise<Banner> {
  const { data } = await api.post('/banners', payload)
  return norm(data.banner)
}

export async function updateBanner(id: string, payload: Partial<{ name: string; imageBase64: string; isVisible: boolean }>): Promise<Banner> {
  const { data } = await api.patch(`/banners/${id}`, payload)
  return norm(data.banner)
}

export async function deleteBanner(id: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/banners/${id}`)
  return data
}
