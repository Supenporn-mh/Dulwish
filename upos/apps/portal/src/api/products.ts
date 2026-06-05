import api from './axios'
import type {
  Product,
  ProductCategory,
  Kitchen,
  Unit,
  ProductImportRow,
  ImportResult,
} from './types'

// ── Normalizers ───────────────────────────────────────────────────────────────

function normProduct(p: any): Product {
  return { ...p, id: p.code ?? p.id }
}

function normCategory(c: any): ProductCategory {
  return { ...c, id: c.code ?? c.id }
}

function normKitchen(k: any): Kitchen {
  return { ...k, id: k.code ?? k.id }
}

function normUnit(u: any): Unit {
  return { ...u, id: String(u._id ?? u.id) }
}

// ── Products (/products) ──────────────────────────────────────────────────────

export async function listProducts(): Promise<Product[]> {
  const { data } = await api.get('/products')
  return (data.products ?? []).map(normProduct)
}

export async function createProduct(payload: Omit<Product, 'id'> & { id: string }): Promise<Product> {
  const { code: _unused, ...rest } = payload as any
  const { data } = await api.post('/products', { ...rest, code: payload.id })
  return normProduct(data.product)
}

export async function updateProduct(code: string, payload: Partial<Product>): Promise<Product> {
  const { data } = await api.patch(`/products/${code}`, payload)
  return normProduct(data.product)
}

export async function deleteProduct(code: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/products/${code}`)
  return data
}

export async function importProducts(rows: ProductImportRow[]): Promise<ImportResult> {
  const { data } = await api.post('/products/import', { rows })
  return data
}

// ── Product Categories (/products/categories) ─────────────────────────────────

export async function listCategories(): Promise<ProductCategory[]> {
  const { data } = await api.get('/products/categories')
  return (data.categories ?? []).map(normCategory)
}

export async function createCategory(payload: Omit<ProductCategory, 'id'> & { id: string }): Promise<ProductCategory> {
  const { data } = await api.post('/products/categories', { ...payload, code: payload.id })
  return normCategory(data.category)
}

export async function updateCategory(code: string, payload: Partial<ProductCategory>): Promise<ProductCategory> {
  const { data } = await api.patch(`/products/categories/${code}`, payload)
  return normCategory(data.category)
}

export async function deleteCategory(code: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/products/categories/${code}`)
  return data
}

// ── Kitchens (/products/kitchens) ─────────────────────────────────────────────

export async function listKitchens(): Promise<Kitchen[]> {
  const { data } = await api.get('/products/kitchens')
  return (data.kitchens ?? []).map(normKitchen)
}

export async function createKitchen(payload: Kitchen): Promise<Kitchen> {
  const { data } = await api.post('/products/kitchens', { ...payload, code: payload.id })
  return normKitchen(data.kitchen)
}

export async function updateKitchen(code: string, payload: Partial<Kitchen>): Promise<Kitchen> {
  const { data } = await api.patch(`/products/kitchens/${code}`, payload)
  return normKitchen(data.kitchen)
}

export async function deleteKitchen(code: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/products/kitchens/${code}`)
  return data
}

// ── Units (/products/units) ────────────────────────────────────────────────────

export async function listUnits(): Promise<Unit[]> {
  const { data } = await api.get('/products/units')
  return (data.units ?? []).map(normUnit)
}

export async function createUnit(payload: Omit<Unit, 'id'>): Promise<Unit> {
  const { data } = await api.post('/products/units', payload)
  return normUnit(data.unit)
}

export async function updateUnit(id: number | string, payload: Partial<Unit>): Promise<Unit> {
  const { data } = await api.patch(`/products/units/${id}`, payload)
  return normUnit(data.unit)
}

export async function deleteUnit(id: number | string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/products/units/${id}`)
  return data
}
