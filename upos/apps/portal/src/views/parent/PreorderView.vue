<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useLocaleStore }       from '@/stores/locale'
import { useParentStore }       from '@/stores/parent'
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

// ── Menu sheet ───────────────────────────────────────────────────────────────
const menuSession  = ref<MealSession | null>(null)

const DEMO_MENU = [
  { id: 'm1', name: 'Ham Sandwich',    price: 85 },
  { id: 'm2', name: 'Chicken Wrap',    price: 95 },
  { id: 'm3', name: 'Veggie Salad',    price: 70 },
  { id: 'm4', name: 'Orange Juice',    price: 45 },
  { id: 'm5', name: 'Blueberry Muffin', price: 45 },
]

// ── Confirm booking ───────────────────────────────────────────────────────────
const confirmSession = ref<MealSession | null>(null)
const bookingSuccess = ref(false)
const lastBookedSession = ref<MealSession | null>(null)
const studentName    = computed(() => parentStore.selectedChild?.name ?? '')

// Track booked sessions: key = "YYYY-MM-DD-sessionKey"
const bookedSessions = ref<Set<string>>(new Set())

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

// ── Cancel booking ────────────────────────────────────────────────────────────
const cancelSession      = ref<MealSession | null>(null)
const cancelledKey       = ref<string | null>(null)  // key ของ session ที่เพิ่งยกเลิก
const cancelSuccess      = ref(false)

function canCancel(s: MealSession): boolean {
  return isBooked(s) && s.status === 'open'  // only before cutoff
}

function openCancel(s: MealSession) { cancelSession.value = s }

function confirmCancel() {
  if (!cancelSession.value) return
  const s = cancelSession.value
  // Remove from store (persistent)
  parentStore.removeTodayBooking(s.key, selectedISO.value)
  // Remove from local set
  bookedSessions.value.delete(bookingKey(s))
  cancelledKey.value  = s.key
  cancelSession.value = null
  cancelSuccess.value = true
  setTimeout(() => { cancelSuccess.value = false; cancelledKey.value = null }, 3000)
}

function openMenu(s: MealSession)    { menuSession.value = s }
function openConfirm(s: MealSession) {
  if (isBooked(s)) return  // already booked — don't reopen
  confirmSession.value = s
}

function submitBooking() {
  if (!confirmSession.value) return
  const s = confirmSession.value
  bookedSessions.value.add(bookingKey(s))
  lastBookedSession.value = s
  bookingSuccess.value    = true
  confirmSession.value    = null

  // Share booking to parentStore → DashboardView แสดง "การจองวันนี้" ทันที
  parentStore.addTodayBooking({
    id:          `local-${s.key}-${selectedISO.value}`,
    orderNo:     `BKG-${Date.now()}`,
    status:      'confirmed',
    sessionKey:  s.key,
    sessionTh:   s.th,
    sessionEn:   s.en,
    serveDate:   selectedISO.value,
    totalAmount: 0,
    items:       DEMO_MENU.slice(0, 2).map(m => ({ name: m.name, qty: 1, lineTotal: m.price })),
  })
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
          <div
            v-for="(item, i) in DEMO_MENU"
            :key="item.id"
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

          <!-- Buttons -->
          <div class="flex gap-3">
            <button class="sheet-action-ghost flex-1" @click="cancelSession = null">
              {{ locale.t('ไม่ยกเลิก', 'Keep') }}
            </button>
            <button class="sheet-action-danger flex-1" @click="confirmCancel">
              {{ locale.t('ยืนยันยกเลิก', 'Confirm Cancel') }}
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

          <div class="flex gap-3">
            <button class="btn btn-ghost flex-1" @click="confirmSession = null">
              {{ locale.t('ยกเลิก', 'Cancel') }}
            </button>
            <button class="btn btn-primary flex-1" @click="submitBooking">
              {{ locale.t('ยืนยัน', 'Confirm') }}
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
