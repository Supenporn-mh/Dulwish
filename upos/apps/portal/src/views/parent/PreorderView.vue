<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLocaleStore }       from '@/stores/locale'
import { useParentStore }       from '@/stores/parent'
import api                      from '@/api/axios'
import {
  PhInfo, PhClock, PhUsers, PhForkKnife, PhCalendarBlank,
  PhCheckCircle, PhX,
} from '@phosphor-icons/vue'

const locale      = useLocaleStore()
const parentStore = useParentStore()

// ── Session definitions ──────────────────────────────────────────────────────
interface SessionDef {
  key:         string
  en:          string
  th:          string
  timeRange:   string
  cutoffHour:  number  // booking closes at HH:00 (session end)
  cutoffMin:   number
  quota:       number
  booked:      number
}
interface MealSession extends SessionDef { status: 'open' | 'closed' }

// ── Reactive clock — tick ทุก 60 วิ เพื่อให้ computed sessions re-evaluate ──
const now = ref(new Date())
const clockTick = setInterval(() => { now.value = new Date() }, 60_000)
onUnmounted(() => clearInterval(clockTick))

// ── Session definitions — ตรงกับ meal_periods ใน spec §2.5 ──────────────────
// cutoffMinutes = 180 นาที ก่อน startTime (ตาม §7.1: now < start − cutoff_minutes)
const SESSION_DEFS: SessionDef[] = [
  { key: 'breakfast', en: 'Breakfast', th: 'เช้า',    timeRange: '07:30 – 09:00', cutoffHour: 7,  cutoffMin: 30, quota: 80,  booked: 0  },
  { key: 'lunch',     en: 'Lunch',     th: 'กลางวัน', timeRange: '11:30 – 13:30', cutoffHour: 11, cutoffMin: 30, quota: 100, booked: 0  },
  { key: 'dinner',    en: 'Dinner',    th: 'เย็น',    timeRange: '17:00 – 18:30', cutoffHour: 17, cutoffMin: 0,  quota: 60,  booked: 12 },
]

const CUTOFF_MINUTES = 180  // §7.1: cutoff = 3 ชม. ก่อน start_time

// Sessions status ตาม spec §7.1:
//   past date  → ปิดทั้งหมด (ผ่านมาแล้ว)
//   future date → เปิดทั้งหมด
//   today       → เปิดเฉพาะ session ที่ now < startTime − cutoff_minutes
const sessions = computed((): MealSession[] => {
  const sel = selectedISO.value
  const t   = now.value   // reactive ref — re-evaluates ทุก 60 วิ

  // past date: all closed
  if (sel < todayISO) {
    return SESSION_DEFS.map(s => ({ ...s, time: s.timeRange, status: 'closed' as const }))
  }
  // future date: all open
  if (sel > todayISO) {
    return SESSION_DEFS.map(s => ({ ...s, time: s.timeRange, status: 'open' as const }))
  }
  // today: check current time vs cutoff
  const nowMins = t.getHours() * 60 + t.getMinutes()
  return SESSION_DEFS.map(s => {
    const startMins  = s.cutoffHour * 60 + s.cutoffMin
    const cutoffMins = startMins - CUTOFF_MINUTES   // must book before this
    const status: 'open' | 'closed' = nowMins < cutoffMins ? 'open' : 'closed'
    return { ...s, time: s.timeRange, status }
  })
})

// ── Date picker ──────────────────────────────────────────────────────────────
// ใช้ LOCAL date (ไม่ใช้ toISOString ที่คืนค่า UTC — ผิดในผู้ใช้ timezone +7)
function localDateISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const today    = new Date()
const todayISO = localDateISO(today)           // LOCAL date YYYY-MM-DD

// max = today + 7 days (preorder_max_days §7.1)
const maxISO = (() => {
  const d = new Date(today)
  d.setDate(d.getDate() + 7)
  return localDateISO(d)
})()

const selectedISO  = ref(todayISO)
const dateInputRef = ref<HTMLInputElement | null>(null)

const selectedDate = computed(() => new Date(selectedISO.value + 'T00:00:00'))

const displayDate = computed(() => {
  const d = selectedDate.value
  if (locale.lang === 'en') {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const day = d.getDate()
  const mon = d.getMonth() + 1
  const yr  = d.getFullYear() + 543
  return `${day}/${mon}/${yr}`
})

function openDatePicker() {
  dateInputRef.value?.showPicker?.()
  dateInputRef.value?.click()
}

// ── Backend data ─────────────────────────────────────────────────────────────
interface MealPeriod { _id: string; code: string; name: string; startTime: string; endTime: string }
interface Shop       { _id: string; code: string; name: string; type: string }
interface MenuItem   { _id: string; name: string; price: number; isPreorderable: boolean; shopId: string }

const mealPeriods  = ref<MealPeriod[]>([])
const cafeShopId   = ref<string>('')
const menuItems    = ref<MenuItem[]>([])  // only isPreorderable:true items

// period _id keyed by session key (breakfast/lunch/dinner)
const periodIdByKey = ref<Record<string, string>>({})

// map backend mealPeriodCode → session key
const CODE_TO_KEY: Record<string, string> = {
  BREAKFAST: 'breakfast',
  LUNCH:     'lunch',
  DINNER:    'dinner',
}

const loadError   = ref<string>('')
const loadingInit = ref(false)

async function loadInitialData() {
  loadingInit.value = true
  loadError.value   = ''
  try {
    const [periodsRes, shopsRes, menuRes] = await Promise.all([
      api.get('/menu/meal-periods'),
      api.get('/menu/shops'),
      api.get('/menu'),
    ])

    mealPeriods.value = periodsRes.data.mealPeriods ?? []

    const shops: Shop[] = shopsRes.data.shops ?? []
    const cafe = shops.find(s => s.code === 'CAFE')
    cafeShopId.value = cafe?._id ?? ''

    const allItems: MenuItem[] = menuRes.data.items ?? []
    menuItems.value = allItems.filter(i => i.isPreorderable)

    // map session key → period _id
    const map: Record<string, string> = {}
    for (const p of mealPeriods.value) {
      const key = CODE_TO_KEY[p.code]
      if (key) map[key] = p._id
    }
    periodIdByKey.value = map
  } catch (e: any) {
    loadError.value = e?.response?.data?.message ?? e?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loadingInit.value = false
  }
}

// ── Menu sheet ───────────────────────────────────────────────────────────────
const menuSession = ref<MealSession | null>(null)

// ── Confirm booking ───────────────────────────────────────────────────────────
const confirmSession    = ref<MealSession | null>(null)
const bookingSuccess    = ref(false)
const lastBookedSession = ref<MealSession | null>(null)
const bookingLoading    = ref(false)
const bookingError      = ref<string>('')
const studentName       = computed(() => parentStore.selectedChild?.name ?? '')

// Track booked sessions: key = "YYYY-MM-DD-sessionKey"
const bookedSessions = ref<Set<string>>(new Set())

// map session-key (e.g. "2025-06-05-breakfast") → backend order _id for cancel
const orderIdMap = ref<Map<string, string>>(new Map())

function bookingKey(s: MealSession): string {
  return `${selectedISO.value}-${s.key}`
}

// ตรวจ local ref (session ปัจจุบัน) AND parentStore (persistent ข้าม navigate)
function isBooked(s: MealSession): boolean {
  if (bookedSessions.value.has(bookingKey(s))) return true
  return parentStore.todayBookings.some(
    b => b.sessionKey === s.key && b.serveDate === selectedISO.value
  )
}

// ── Load existing orders to restore booked state ──────────────────────────────
async function loadExistingOrders() {
  try {
    const res = await api.get('/orders', {
      params: { from: todayISO, to: maxISO },
    })
    const orders: any[] = res.data.orders ?? []
    const newSet = new Set(bookedSessions.value)
    const newMap = new Map(orderIdMap.value)

    for (const order of orders) {
      if (order.status === 'cancelled') continue
      const sessionKey = CODE_TO_KEY[order.mealPeriodCode ?? '']
      if (!sessionKey || !order.serveDate) continue
      const key = `${order.serveDate}-${sessionKey}`
      newSet.add(key)
      newMap.set(key, order._id)

      // populate store for dashboard
      parentStore.addTodayBooking({
        id:          order._id,
        orderNo:     order.orderNo ?? '',
        status:      order.status ?? 'confirmed',
        sessionKey,
        sessionTh:   SESSION_DEFS.find(d => d.key === sessionKey)?.th ?? '',
        sessionEn:   SESSION_DEFS.find(d => d.key === sessionKey)?.en ?? '',
        serveDate:   order.serveDate,
        totalAmount: order.totalAmount ?? 0,
        items:       (order.items ?? []).map((i: any) => ({
          name:      i.name ?? i.menuItemName ?? '',
          qty:       i.qty ?? i.quantity ?? 1,
          lineTotal: i.lineTotal ?? i.price ?? 0,
        })),
      })
    }

    bookedSessions.value = newSet
    orderIdMap.value     = newMap
  } catch {
    // non-fatal — booked state just won't be pre-filled
  }
}

onMounted(async () => {
  await loadInitialData()
  await loadExistingOrders()
})

// ── Cancel booking ────────────────────────────────────────────────────────────
const cancelSession  = ref<MealSession | null>(null)
const cancelledKey   = ref<string | null>(null)
const cancelSuccess  = ref(false)
const cancelLoading  = ref(false)
const cancelError    = ref<string>('')

function canCancel(s: MealSession): boolean {
  return isBooked(s) && s.status === 'open'  // only before cutoff
}

function openCancel(s: MealSession) {
  cancelError.value  = ''
  cancelSession.value = s
}

async function confirmCancel() {
  if (!cancelSession.value) return
  const s   = cancelSession.value
  const key = bookingKey(s)
  const orderId = orderIdMap.value.get(key)

  cancelLoading.value = true
  cancelError.value   = ''
  try {
    if (orderId) {
      await api.patch(`/orders/${orderId}/cancel`, { reason: 'Parent cancelled via portal' })
    }
    // Remove from store (persistent)
    parentStore.removeTodayBooking(s.key, selectedISO.value)
    // Remove from local set and map
    const newSet = new Set(bookedSessions.value)
    newSet.delete(key)
    bookedSessions.value = newSet
    const newMap = new Map(orderIdMap.value)
    newMap.delete(key)
    orderIdMap.value    = newMap

    cancelledKey.value  = s.key
    cancelSession.value = null
    cancelSuccess.value = true
    setTimeout(() => { cancelSuccess.value = false; cancelledKey.value = null }, 3000)
  } catch (e: any) {
    cancelError.value = e?.response?.data?.message ?? e?.message ?? 'ยกเลิกไม่สำเร็จ'
  } finally {
    cancelLoading.value = false
  }
}

function openMenu(s: MealSession)    { menuSession.value = s }
function openConfirm(s: MealSession) {
  if (isBooked(s)) return  // already booked — don't reopen
  bookingError.value   = ''
  confirmSession.value = s
}

async function submitBooking() {
  if (!confirmSession.value) return
  const s           = confirmSession.value
  const child       = parentStore.selectedChild
  const periodId    = periodIdByKey.value[s.key]
  const shopId      = cafeShopId.value
  const firstItem   = menuItems.value[0]

  if (!child || !periodId || !shopId || !firstItem) {
    bookingError.value = 'ข้อมูลไม่ครบ — กรุณาลองใหม่'
    return
  }

  bookingLoading.value = true
  bookingError.value   = ''
  try {
    const res = await api.post('/orders', {
      student_user_id: child.id,
      shop_id:         shopId,
      meal_period_id:  periodId,
      serve_date:      selectedISO.value,
      items: [{ menu_item_id: firstItem._id, qty: 1 }],
    })
    const order = res.data.order

    // Mark as booked
    const key = bookingKey(s)
    const newSet = new Set(bookedSessions.value)
    newSet.add(key)
    bookedSessions.value = newSet

    if (order?._id) {
      const newMap = new Map(orderIdMap.value)
      newMap.set(key, order._id)
      orderIdMap.value = newMap
    }

    lastBookedSession.value = s
    bookingSuccess.value    = true
    confirmSession.value    = null

    // Share to parentStore → DashboardView แสดง "การจองวันนี้" ทันที
    parentStore.addTodayBooking({
      id:          order?._id ?? `order-${Date.now()}`,
      orderNo:     order?.orderNo ?? '',
      status:      order?.status ?? 'confirmed',
      sessionKey:  s.key,
      sessionTh:   s.th,
      sessionEn:   s.en,
      serveDate:   selectedISO.value,
      totalAmount: order?.totalAmount ?? 0,
      items:       (order?.items ?? [{ name: firstItem.name, qty: 1, lineTotal: firstItem.price }])
        .map((i: any) => ({
          name:      i.name ?? i.menuItemName ?? '',
          qty:       i.qty ?? i.quantity ?? 1,
          lineTotal: i.lineTotal ?? i.price ?? 0,
        })),
    })
  } catch (e: any) {
    bookingError.value = e?.response?.data?.message ?? e?.message ?? 'จองไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    bookingLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sessionTitle(s: MealSession)  { return locale.lang === 'th' ? s.en : s.en }
function sessionSub(s: MealSession)    { return locale.lang === 'th' ? s.th : s.th }
function remaining(s: MealSession)     { return s.quota - s.booked }

function statusLabel(s: MealSession) {
  return s.status === 'open'
    ? locale.t('เปิดรับจอง', 'Open')
    : locale.t('ปิดรับจอง', 'Closed')
}
</script>

<template>
  <div class="page-content">

    <!-- Load error banner -->
    <div v-if="loadError" class="info-banner mx-4 mt-4" style="background: var(--color-danger-bg)">
      <PhInfo :size="18" weight="fill" class="flex-shrink-0 mt-0.5" style="color: var(--color-danger)" />
      <p class="text-[13px] leading-[1.5]" style="color: var(--color-danger)">{{ loadError }}</p>
    </div>

    <!-- Info banner -->
    <div class="info-banner mx-4 mt-4">
      <PhInfo :size="18" weight="fill" class="flex-shrink-0 mt-0.5" style="color: var(--color-primary)" />
      <p class="text-[13px] leading-[1.5]" style="color: var(--color-primary)">
        {{ locale.t(
          'กรุณาจองล่วงหน้าก่อนถึงเวลาปิดรับจอง มื้ออาหารที่เลยเวลาจองแล้วจะไม่สามารถจองได้',
          'Please book in advance before the deadline. Meals past their booking time cannot be reserved.'
        ) }}
      </p>
    </div>

    <!-- Date row (tappable) -->
    <div class="mx-4 mt-4 card px-4 py-3 flex items-center gap-3 date-row" @click="openDatePicker">
      <PhCalendarBlank :size="20" style="color: var(--color-primary)" />
      <span class="text-[15px]" style="color: var(--color-text-primary)">{{ displayDate }}</span>
      <!-- Hidden native date input -->
      <input
        ref="dateInputRef"
        type="date"
        v-model="selectedISO"
        :min="todayISO"
        :max="maxISO"
        class="date-hidden-input"
        aria-label="Select date"
      />
    </div>

    <!-- Meal session cards -->
    <div class="mx-4 mt-4 flex flex-col gap-3 pb-8">
      <div
        v-for="s in sessions"
        :key="s.key"
        class="card px-4 py-4"
      >
        <!-- Header row -->
        <div class="flex items-start justify-between mb-1">
          <div>
            <p class="text-[18px] font-medium" style="color: var(--color-text-primary); line-height:1.3">
              {{ sessionTitle(s) }}
            </p>
            <p class="text-[13px]" style="color: var(--color-text-secondary)">{{ sessionSub(s) }}</p>
          </div>
          <span
            class="status-badge"
            :class="s.status === 'open' ? 'status-open' : 'status-closed'"
          >
            {{ statusLabel(s) }}
          </span>
        </div>

        <!-- Time + Quota -->
        <div class="flex flex-col gap-1 mt-3">
          <div class="flex items-center gap-2">
            <PhClock :size="14" style="color: var(--color-text-tertiary)" />
            <span class="text-[13px]" style="color: var(--color-text-secondary)">{{ s.time }}</span>
          </div>
          <div class="flex items-center gap-2">
            <PhUsers :size="14" style="color: var(--color-text-tertiary)" />
            <span class="text-[13px]" style="color: var(--color-text-secondary)">
              {{ s.booked }} / {{ s.quota }}
              ({{ locale.t('เหลือ', 'Left') }}: {{ remaining(s) }})
            </span>
          </div>
        </div>

        <!-- Quota bar -->
        <div class="quota-track mt-2">
          <div
            class="quota-fill"
            :style="{
              width: `${Math.min(100, (s.booked / s.quota) * 100)}%`,
              background: s.booked / s.quota >= 1 ? 'var(--color-danger)'
                        : s.booked / s.quota >= 0.8 ? 'var(--color-warning)'
                        : 'var(--color-success)',
            }"
          />
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2 mt-4">
          <button
            @click="openMenu(s)"
            class="btn-menu flex items-center gap-1.5"
          >
            <PhForkKnife :size="15" weight="fill" />
            <span>{{ locale.t('เมนู', 'Menu') }}</span>
          </button>

          <!-- จองแล้ว — ยังยกเลิกได้ (before cutoff) -->
          <template v-if="isBooked(s) && canCancel(s)">
            <button disabled class="btn-confirm btn-confirm-booked flex items-center justify-center gap-1.5" style="flex:1.5">
              <PhCheckCircle :size="15" weight="fill" />
              {{ locale.t('จองแล้ว', 'Booked') }}
            </button>
            <button @click="openCancel(s)" class="btn-cancel flex-shrink-0">
              {{ locale.t('ยกเลิก', 'Cancel') }}
            </button>
          </template>

          <!-- จองแล้ว — เลย cutoff แล้ว ยกเลิกไม่ได้ -->
          <button
            v-else-if="isBooked(s)"
            disabled
            class="btn-confirm btn-confirm-booked flex-1 flex items-center justify-center gap-1.5"
          >
            <PhCheckCircle :size="15" weight="fill" />
            {{ locale.t('จองแล้ว', 'Booked') }}
          </button>

          <!-- ปิดรับจอง -->
          <button
            v-else-if="s.status === 'closed'"
            disabled
            class="btn-confirm btn-confirm-disabled flex-1"
          >
            {{ locale.t('ปิดรับจอง', 'Closed') }}
          </button>

          <!-- เปิดรับจอง -->
          <button
            v-else
            @click="openConfirm(s)"
            class="btn-confirm flex-1"
          >
            {{ locale.t('ยืนยันการจอง', 'Book Now') }}
          </button>
        </div>

        <!-- Cancel success toast inline -->
        <Transition name="fade-in">
          <div v-if="cancelSuccess && cancelledKey === s.key"
            class="cancel-success-row mt-2 flex items-center gap-2">
            <PhCheckCircle :size="14" weight="fill" style="color:var(--color-success)" />
            <span class="text-[12px]" style="color:var(--color-success)">
              {{ locale.t('ยกเลิกการจองเรียบร้อย', 'Booking cancelled') }}
            </span>
          </div>
        </Transition>
      </div>
    </div>

  </div>

  <!-- ── Menu sheet ─────────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="menuSession" class="sheet-backdrop" @click="menuSession = null" />
    </Transition>
    <Transition name="sheet">
      <div v-if="menuSession" class="bottom-sheet">
        <div class="sheet-handle" />
        <button class="sheet-close-btn" @click="menuSession = null">
          <PhX :size="16" weight="bold" />
        </button>
        <p class="text-[18px] font-medium px-5 pb-3 pt-1" style="color: var(--color-text-primary)">
          {{ menuSession.en }} — {{ locale.t('เมนู', 'Menu') }}
        </p>
        <div class="px-5 pb-8 flex flex-col gap-0 overflow-hidden rounded-[12px]" style="background: var(--color-bg-surface)">
          <p v-if="menuItems.length === 0" class="text-[14px] py-3" style="color: var(--color-text-secondary)">
            {{ locale.t('ไม่มีเมนู', 'No menu items') }}
          </p>
          <div
            v-for="(item, i) in menuItems"
            :key="item._id"
            class="flex items-center justify-between py-3"
            :style="i > 0 ? 'border-top: 0.5px solid var(--color-border-tertiary)' : ''"
          >
            <span class="text-[15px]" style="color: var(--color-text-primary)">{{ item.name }}</span>
            <span class="text-[14px] font-medium" style="color: var(--color-primary)">฿{{ item.price }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Cancel booking sheet ──────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="cancelSession" class="sheet-backdrop" @click="cancelSession = null" />
    </Transition>
    <Transition name="sheet">
      <div v-if="cancelSession" class="bottom-sheet">
        <div class="sheet-handle" />
        <button class="sheet-close-btn" @click="cancelSession = null">
          <PhX :size="16" weight="bold" />
        </button>
        <div class="px-5 pb-10 flex flex-col gap-5">
          <!-- Title -->
          <div>
            <p class="text-[18px] font-medium" style="color:var(--color-text-primary)">
              {{ locale.t('ยกเลิกการจอง', 'Cancel Booking') }}
            </p>
            <p class="text-[13px] mt-1" style="color:var(--color-text-secondary)">
              {{ locale.t('คุณต้องการยกเลิกการจองนี้ใช่ไหม?', 'Are you sure you want to cancel this booking?') }}
            </p>
          </div>

          <!-- Booking info card -->
          <div class="card px-4 py-3 flex flex-col gap-2">
            <div class="flex justify-between">
              <span class="text-[13px]" style="color:var(--color-text-secondary)">
                {{ locale.t('มื้ออาหาร','Meal') }}
              </span>
              <span class="text-[14px] font-medium" style="color:var(--color-text-primary)">
                {{ cancelSession.en }} · {{ cancelSession.th }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-[13px]" style="color:var(--color-text-secondary)">
                {{ locale.t('วันที่','Date') }}
              </span>
              <span class="text-[14px] font-medium" style="color:var(--color-text-primary)">
                {{ displayDate }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-[13px]" style="color:var(--color-text-secondary)">
                {{ locale.t('เวลา','Time') }}
              </span>
              <span class="text-[14px] font-medium" style="color:var(--color-text-primary)">
                {{ cancelSession.time }}
              </span>
            </div>
          </div>

          <!-- Warning -->
          <div class="flex items-start gap-2 px-1">
            <PhInfo :size="15" weight="fill" style="color:var(--color-warning);flex-shrink:0;margin-top:1px" />
            <p class="text-[12px]" style="color:var(--color-text-secondary)">
              {{ locale.t(
                'สามารถยกเลิกได้ก่อนเวลาปิดรับจองเท่านั้น',
                'Cancellation is only allowed before the booking cutoff time.'
              ) }}
            </p>
          </div>

          <!-- Cancel error -->
          <p v-if="cancelError" class="text-[13px] text-center" style="color: var(--color-danger)">
            {{ cancelError }}
          </p>

          <!-- Buttons -->
          <div class="flex gap-3">
            <button class="sheet-action-ghost flex-1" :disabled="cancelLoading" @click="cancelSession = null">
              {{ locale.t('ไม่ยกเลิก', 'Keep') }}
            </button>
            <button class="sheet-action-danger flex-1" :disabled="cancelLoading" @click="confirmCancel">
              {{ cancelLoading ? locale.t('กำลังยกเลิก…', 'Cancelling…') : locale.t('ยืนยันยกเลิก', 'Confirm Cancel') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Confirm booking sheet ─────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="confirmSession" class="sheet-backdrop" @click="confirmSession = null" />
    </Transition>
    <Transition name="sheet">
      <div v-if="confirmSession" class="bottom-sheet">
        <div class="sheet-handle" />
        <button class="sheet-close-btn" @click="confirmSession = null">
          <PhX :size="16" weight="bold" />
        </button>

        <div class="px-5 pb-8 flex flex-col gap-4">
          <p class="text-[18px] font-medium" style="color: var(--color-text-primary)">
            {{ locale.t('ยืนยันการจอง', 'Confirm Booking') }}
          </p>

          <div class="card px-4 py-3 flex flex-col gap-2">
            <div class="flex justify-between">
              <span class="text-[13px]" style="color: var(--color-text-secondary)">
                {{ locale.t('นักเรียน', 'Student') }}
              </span>
              <span class="text-[14px] font-medium" style="color: var(--color-text-primary)">
                {{ studentName }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-[13px]" style="color: var(--color-text-secondary)">
                {{ locale.t('มื้ออาหาร', 'Meal') }}
              </span>
              <span class="text-[14px] font-medium" style="color: var(--color-text-primary)">
                {{ confirmSession.en }} · {{ confirmSession.th }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-[13px]" style="color: var(--color-text-secondary)">
                {{ locale.t('วันที่', 'Date') }}
              </span>
              <span class="text-[14px] font-medium" style="color: var(--color-text-primary)">
                {{ displayDate }}
              </span>
            </div>
          </div>

          <!-- Booking error -->
          <p v-if="bookingError" class="text-[13px] text-center" style="color: var(--color-danger)">
            {{ bookingError }}
          </p>

          <div class="flex gap-3">
            <button class="btn btn-ghost flex-1" :disabled="bookingLoading" @click="confirmSession = null">
              {{ locale.t('ยกเลิก', 'Cancel') }}
            </button>
            <button class="btn btn-primary flex-1" :disabled="bookingLoading" @click="submitBooking">
              {{ bookingLoading ? locale.t('กำลังจอง…', 'Booking…') : locale.t('ยืนยัน', 'Confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Success overlay ────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="bookingSuccess" class="sheet-backdrop" @click="bookingSuccess = false" />
    </Transition>
    <Transition name="scale-up">
      <div v-if="bookingSuccess" class="success-card">
        <PhCheckCircle :size="52" weight="fill" style="color: var(--color-success)" />
        <p class="text-[18px] font-medium mt-3" style="color: var(--color-text-primary)">
          {{ locale.t('จองสำเร็จ!', 'Booking Confirmed!') }}
        </p>
        <p class="text-[13px] mt-1" style="color: var(--color-text-secondary)">
          {{ locale.t('บันทึกการจองเรียบร้อยแล้ว', 'Your booking has been saved.') }}
        </p>
        <button class="btn btn-primary w-full mt-5" @click="bookingSuccess = false">
          {{ locale.t('ปิด', 'Close') }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.page-content { min-height: 100%; }

/* Date row */
.date-row {
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.date-row:active { background: var(--color-bg-secondary); }

/* Hide the native date input visually but keep it functional */
.date-hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border: none;
  background: transparent;
  /* prevent text from showing */
  color: transparent;
  font-size: 0;
}

/* Info banner */
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-tint);
}

/* Status badge */
.status-badge {
  font-size: 12px;     /* label */
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-open   { background: var(--color-success-bg); color: #028A60; }
.status-closed { background: var(--color-warning-bg); color: #C67100; }

/* Quota bar */
.quota-track {
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-tertiary);
  overflow: hidden;
}
.quota-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

/* Buttons */
.btn-menu {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-menu:active { background: var(--color-primary-tint); }

.btn-confirm {
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-primary);
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-confirm:active { opacity: 0.8; }
.btn-confirm-disabled {
  background: var(--color-border-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}
.btn-confirm-booked {
  background: var(--color-success);
  cursor: default;
}

/* ยกเลิกการจอง button */
.btn-cancel {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-danger);
  color: var(--color-danger);
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-cancel:active { background: var(--color-danger-bg); }

/* Sheet action buttons (standalone — ไม่ depend global .btn) */
.sheet-action-ghost,
.sheet-action-danger {
  height: 44px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.sheet-action-ghost {
  background: transparent;
  border: 1.5px solid var(--color-border-secondary);
  color: var(--color-text-secondary);
}
.sheet-action-danger {
  background: var(--color-danger);
  border: none;
  color: #ffffff;
}
.sheet-action-ghost:active  { opacity: 0.7; }
.sheet-action-danger:active { opacity: 0.8; }

/* cancel success inline */
.cancel-success-row { padding: 4px 0; }

/* fade-in transition */
.fade-in-enter-active { transition: opacity 0.25s, transform 0.2s; }
.fade-in-leave-active { transition: opacity 0.2s; }
.fade-in-enter-from   { opacity: 0; transform: translateY(-4px); }
.fade-in-leave-to     { opacity: 0; }

/* Bottom sheet */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0,0,0,0.4);
}
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background: var(--color-bg-surface);
  border-radius: 20px 20px 0 0;
  z-index: 50;
  padding-top: 12px;
  box-shadow: 0 -4px 30px rgba(0,0,0,0.12);
}
.sheet-handle {
  width: 40px; height: 4px;
  border-radius: 2px;
  background: var(--color-border-secondary);
  margin: 0 auto 12px;
}
.sheet-close-btn {
  position: absolute;
  top: 14px; right: 16px;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--color-bg-page);
  border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
}

/* Success card */
.success-card {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: 32px 28px;
  width: calc(100% - 48px);
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: var(--shadow-modal);
}

/* Transitions */
.sheet-enter-active, .sheet-leave-active   { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.sheet-enter-from, .sheet-leave-to         { transform: translateX(-50%) translateY(100%); }
.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.25s; }
.backdrop-enter-from, .backdrop-leave-to   { opacity: 0; }
.scale-up-enter-active, .scale-up-leave-active { transition: opacity 0.2s, transform 0.2s; }
.scale-up-enter-from, .scale-up-leave-to  { opacity: 0; transform: translate(-50%,-50%) scale(0.9); }
</style>
