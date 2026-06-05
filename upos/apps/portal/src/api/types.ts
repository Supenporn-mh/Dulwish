// ─────────────────────────────────────────────────────────────────────────────
// Domain types — field names match what the .vue views actually use.
// Identifiers are business codes (string) or numeric IDs where the UI uses id:number.
// UI-only fields (expanded, isDirty, saving, savedAt, icon) are excluded.
// ─────────────────────────────────────────────────────────────────────────────

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductAttrOption {
  name: string
  price: number
}

export interface ProductAttribute {
  name: string
  type: 'single' | 'number' | 'multiple'
  options: ProductAttrOption[]
}

export interface Product {
  id: string
  name: string
  price: number
  cost?: number
  categoryCode: string
  unit: string
  barcode?: string
  group?: string
  branch?: string
  imageUrl?: string
  attributes?: ProductAttribute[]
}

export interface ProductCategory {
  id: string
  name: string
  imageUrl?: string
}

export interface Kitchen {
  id: string
  name: string
}

export interface Unit {
  id: string
  name: string
}

// ── Booking ───────────────────────────────────────────────────────────────────

export interface Booking {
  id: string
  code: string
  name: string
  type: string
  bookingDate: string
  slot: string
  slotTime: string
  status: 'จองแล้ว' | 'เสร็จสิ้น' | 'ยกเลิก' | 'ไม่มา'
  bookedAt: string
  cancelledAt?: string
}

export interface BookingMenu {
  id: string
  name: string
  ingredient: string
  timeSlot: string
  enabled: boolean
  startDate: string
  endDate: string
}

export interface BookingTimeSlot {
  id: string
  name: string
  meal: 'breakfast' | 'lunch' | 'dinner'
  startTime: string
  endTime: string
  capacity: number
  cutoffHours: number
  description: string
  enabled: boolean
}

// ── Groups / Permissions ──────────────────────────────────────────────────────

export interface MemberGroup {
  id: string
  name: string
  memberCount: number
  permissions?: string[]
}

export interface GroupMember {
  userId: string
  name?: string
  email?: string
}

export interface WalletPermission {
  id: string
  code: string
  name: string
  desc: string
  amount: number
  enabled: boolean
  startDate: string
  endDate: string
}

// ── Academic Year / Settings ──────────────────────────────────────────────────

export interface Semester {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface AcademicYear {
  id: string
  year: string
  semesters: Semester[]
}

export interface Branch {
  code: string
  name: string
}

export interface StoreSettings {
  name: string
  address: string
  taxId: string
}

// ── Import row types ──────────────────────────────────────────────────────────

/** One row from the Excel import template for products */
export interface ProductImportRow {
  /** Product Code* */
  productCode: string
  /** Product Name* */
  productName: string
  price?: number
  cost?: number
  categoryCode?: string
  unit?: string
  branchCode?: string
  barcode?: string
  remark?: string
  attributeType?: string
  attributeName?: string
  attributeValue?: string
  attributePrice?: number
}

/** One row from the Excel import template for booking menus */
export interface BookingMenuImportRow {
  /** ชื่อเมนู* */
  name: string
  /** ช่วงเวลาการจอง* (comma-separated, e.g. "Breakfast,Lunch") */
  timeSlot: string
  /** เปิดใช้งาน / ปิดใช้งาน */
  status?: string
  /** DD/MM/YYYY */
  startDate?: string
  /** DD/MM/YYYY */
  endDate?: string
}

/** Generic import result returned by all /import endpoints */
export interface ImportResult {
  inserted: number
  updated: number
  errors: string[]
}
