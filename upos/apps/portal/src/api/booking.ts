import api from './axios'
import type {
  Booking,
  BookingMenu,
  BookingTimeSlot,
  BookingMenuImportRow,
  ImportResult,
} from './types'

// ── Normalizers ───────────────────────────────────────────────────────────────

function normBooking(b: any): Booking {
  return { ...b, id: b.code ?? b.id }
}

function normMenu(m: any): BookingMenu {
  return { ...m, id: String(m._id ?? m.id) }
}

function normTimeSlot(s: any): BookingTimeSlot {
  return { ...s, id: String(s._id ?? s.id) }
}

// ── Bookings (/booking/bookings) ──────────────────────────────────────────────

export async function listBookings(): Promise<Booking[]> {
  const { data } = await api.get('/booking/bookings')
  return (data.bookings ?? []).map(normBooking)
}

export async function createBooking(payload: Omit<Booking, 'id'>): Promise<Booking> {
  const { data } = await api.post('/booking/bookings', payload)
  return normBooking(data.booking)
}

export async function updateBooking(code: string, payload: Partial<Booking>): Promise<Booking> {
  const { data } = await api.patch(`/booking/bookings/${code}`, payload)
  return normBooking(data.booking)
}

export async function deleteBooking(code: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/booking/bookings/${code}`)
  return data
}

// ── Booking Menus (/booking/menus) ────────────────────────────────────────────

export async function listBookingMenus(): Promise<BookingMenu[]> {
  const { data } = await api.get('/booking/menus')
  return (data.menus ?? []).map(normMenu)
}

export async function createBookingMenu(payload: Omit<BookingMenu, 'id'>): Promise<BookingMenu> {
  const { data } = await api.post('/booking/menus', payload)
  return normMenu(data.menu)
}

export async function updateBookingMenu(id: string, payload: Partial<BookingMenu>): Promise<BookingMenu> {
  const { data } = await api.patch(`/booking/menus/${id}`, payload)
  return normMenu(data.menu)
}

export async function deleteBookingMenu(id: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/booking/menus/${id}`)
  return data
}

export async function importBookingMenus(rows: BookingMenuImportRow[]): Promise<ImportResult> {
  const { data } = await api.post('/booking/menus/import', { rows })
  return data
}

// ── Booking Time Slots (/booking/time-slots) ──────────────────────────────────

export async function listTimeSlots(): Promise<BookingTimeSlot[]> {
  const { data } = await api.get('/booking/time-slots')
  return (data.timeSlots ?? []).map(normTimeSlot)
}

export async function createTimeSlot(payload: Omit<BookingTimeSlot, 'id'>): Promise<BookingTimeSlot> {
  const { data } = await api.post('/booking/time-slots', payload)
  return normTimeSlot(data.timeSlot)
}

export async function updateTimeSlot(id: string, payload: Partial<BookingTimeSlot>): Promise<BookingTimeSlot> {
  const { data } = await api.patch(`/booking/time-slots/${id}`, payload)
  return normTimeSlot(data.timeSlot)
}

export async function deleteTimeSlot(id: string): Promise<{ ok: true }> {
  const { data } = await api.delete(`/booking/time-slots/${id}`)
  return data
}
