<template>
  <div style="display:flex;flex-direction:column;gap:16px" @click="exportOpen = false">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ประวัติการจอง</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">จัดการและยกเลิกตารางการจองอาหารทั้งหมดในระบบ</p>
      </div>
      <div style="position:relative" @click.stop>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="exportOpen = !exportOpen">
          <PhDownloadSimple :size="14" /> Export <PhCaretDown :size="12" />
        </button>
        <Transition name="bh-dd">
          <div v-if="exportOpen" class="bh-export-dropdown">
            <button class="bh-export-item" @click="exportCsv(); exportOpen = false">
              <PhFileText :size="14" /> Export CSV
            </button>
            <button class="bh-export-item" @click="exportXlsx(); exportOpen = false">
              <PhFileXls :size="14" /> Export Excel (.xlsx)
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Summary chips -->
    <div class="bh-chip-row">
      <button
        v-for="chip in CHIPS" :key="chip.key"
        :class="['bh-chip', filterStatus === chip.key ? 'bh-chip-active' : '']"
        @click="selectChip(chip.key)"
      >
        <span>{{ chip.label }}</span>
        <span class="bh-chip-count">{{ chipCount(chip.key) }}</span>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3 items-end">
        <!-- Search -->
        <div class="bh-search-wrap">
          <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
          <input v-model="search" class="bh-search-input" placeholder="ค้นหาชื่อ / รหัสนักเรียน / รหัสการจอง..." />
        </div>

        <!-- สถานะ -->
        <select v-model="filterStatus" class="adm-filter-select" @change="currentPage = 1">
          <option value="">สถานะทั้งหมด</option>
          <option v-for="b in BUCKETS" :key="b" :value="b">{{ b }}</option>
        </select>

        <!-- มื้อ -->
        <select v-model="filterMealType" class="adm-filter-select" @change="currentPage = 1">
          <option value="">มื้อทั้งหมด</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </select>

        <!-- ช่วงเวลา -->
        <select v-model="filterMealPeriodId" class="adm-filter-select" @change="currentPage = 1">
          <option value="">ช่วงเวลาทั้งหมด</option>
          <option v-for="mp in mealPeriods" :key="mp._id" :value="mp._id">
            {{ mp.name }} ({{ mp.startTime }}-{{ mp.endTime }})
          </option>
        </select>

        <!-- วันที่ + mode toggle -->
        <div style="display:flex;flex-direction:column;gap:4px">
          <div class="bh-mode-toggle">
            <button
              :class="['bh-mode-btn', dateMode === 'serve' ? 'bh-mode-btn-active' : '']"
              @click="dateMode = 'serve'"
            >วันที่รับอาหาร</button>
            <button
              :class="['bh-mode-btn', dateMode === 'created' ? 'bh-mode-btn-active' : '']"
              @click="dateMode = 'created'"
            >วันที่จอง</button>
          </div>
          <input v-model="filterDate" type="date" class="adm-filter-input" style="height:36px" @change="currentPage = 1" />
        </div>

        <button
          v-if="search || filterStatus || filterMealType || filterMealPeriodId || filterDate"
          class="adm-hdr-btn adm-hdr-btn-ghost"
          style="height:36px"
          @click="clearFilters"
        >ล้างตัวกรอง</button>
      </div>
    </div>

    <!-- Bulk action bar -->
    <div v-if="selectedIds.size > 0" class="bh-bulk-bar">
      <span>เลือก {{ selectedIds.size }} รายการ</span>
      <button class="adm-hdr-btn adm-hdr-btn-ghost" style="height:30px;padding:0 12px;background:#fff;color:var(--color-danger);border-color:var(--color-danger)" @click="openCancelBulk">
        ยกเลิกที่เลือก
      </button>
      <button class="adm-hdr-btn adm-hdr-btn-ghost" style="height:30px;padding:0 12px" @click="selectedIds = new Set()">
        ยกเลือก
      </button>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th style="width:40px">
              <input type="checkbox" class="bh-checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
            </th>
            <th class="center" style="width:50px">#</th>
            <th style="width:160px">รหัสการจอง</th>
            <th>รายละเอียด</th>
            <th style="width:150px">วันที่รับอาหาร</th>
            <th class="center" style="width:90px">มื้อ</th>
            <th class="center" style="width:110px">สถานะ</th>
            <th style="width:150px">อัปเดตเมื่อ</th>
            <th class="center" style="width:100px">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="9" class="center" style="padding:40px;color:var(--color-danger)">{{ error }}</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="9" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr
            v-for="(row, i) in paginated" v-else :key="row.order._id"
            :style="row.bucket === 'ยกเลิก' ? 'opacity:0.75' : ''"
          >
            <td>
              <input
                type="checkbox" class="bh-checkbox"
                :checked="selectedIds.has(row.order._id)"
                @change="toggleRow(row.order._id)"
              />
            </td>
            <td class="num center">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ row.order.orderNo }}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span
                  class="adm-name-link"
                  :style="row.bucket === 'ยกเลิก' ? 'text-decoration:line-through' : ''"
                  @click="openDetail(row.order)"
                >{{ studentLabel(row.order) }}</span>
                <span v-if="row.order.studentDeletedAt" style="font-size:11px;color:var(--color-text-tertiary)">[ถูกลบแล้ว]</span>
              </div>
              <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px">
                วันที่จอง: {{ formatDDMMYYYY(row.order.createdAt) }}
              </div>
            </td>
            <td>
              <template v-if="isToday(row.order.serveDate)">
                <div style="font-size:13px;font-weight:500;color:var(--color-accent)">วันนี้ {{ formatDayMonth(row.order.serveDate) }}</div>
              </template>
              <template v-else>
                <div
                  style="font-size:13px;font-weight:500;color:var(--color-text-primary)"
                  :style="row.bucket === 'ยกเลิก' ? 'text-decoration:line-through' : ''"
                >{{ formatServeDate(row.order.serveDate) }}</div>
              </template>
              <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px">{{ mealTimeRange(row.order) }}</div>
            </td>
            <td class="center">
              <span class="adm-badge" style="background:var(--color-accent-bg);color:var(--color-accent)">
                {{ mealTypeLabel(row.order) }}
              </span>
            </td>
            <td class="center">
              <span
                class="adm-badge"
                :style="{ background: statusBadgeMap[row.bucket].bg, color: statusBadgeMap[row.bucket].color, display: 'inline-flex', alignItems: 'center', gap: '4px' }"
              >
                <component :is="statusBadgeMap[row.bucket].icon" :size="12" :weight="statusBadgeMap[row.bucket].weight" />
                {{ row.bucket }}
              </span>
            </td>
            <td style="color:var(--color-text-secondary);font-size:12px">
              {{ formatDateTime(updatedTimestamp(row.order)) }}
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" :disabled="isActionDisabled(row.bucket)" @click="openEdit(row.order)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ยกเลิกการจอง" :disabled="isActionDisabled(row.bucket)" @click="openCancelSingle(row.order)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} รายการ</span>
          <span class="adm-pagination-sep">|</span>
          <span>แสดงผล</span>
          <select v-model="pageSize" class="adm-page-size" @change="currentPage = 1">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage === p ? 'active' : '']" @click="currentPage = p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

  </div>

  <!-- Child modals -->
  <BookingEditModal :open="showEdit" :order="editOrder" @close="showEdit = false" @saved="onSaved" />
  <BookingCancelModal :open="showCancel" :mode="cancelMode" :ids="cancelIds" @close="showCancel = false" @cancelled="onCancelled" />
  <BookingDetailModal :open="showDetail" :order-id="detailOrderId" @close="showDetail = false" />

</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  PhMagnifyingGlass, PhPencilSimple, PhTrash,
  PhCheckCircle, PhClock, PhXCircle, PhX,
  PhDownloadSimple, PhCaretDown, PhFileText, PhFileXls,
} from '@phosphor-icons/vue'
import * as XLSX from 'xlsx'
import api from '../../../api/axios'
import BookingEditModal from './booking-history/BookingEditModal.vue'
import BookingCancelModal from './booking-history/BookingCancelModal.vue'
import BookingDetailModal from './booking-history/BookingDetailModal.vue'

// ── Types ─────────────────────────────────────────────────────────────────────
// NOTE: this EnrichedOrder shape is also relied on (by field name only, not by
// importing this interface) by BookingEditModal / BookingCancelModal / BookingDetailModal.

export interface EnrichedOrder {
  _id: string
  orderNo: string
  studentUserId?: string
  studentName?: string
  studentCode?: string
  studentNameSnap?: string
  studentCodeSnap?: string
  studentDeletedAt?: string | null
  mealPeriodId: string
  mealPeriodName?: string
  mealPeriodCode?: string
  mealPeriodTime?: string
  items?: Array<{ menuItemId?: string; qty: number; unitPrice?: number; lineTotal?: number; name?: string; note?: string }>
  note?: string
  serveDate: string
  status: string
  totalAmount: number
  createdAt: string
  updatedAt: string
  cancelledAt?: string
  cancelReason?: string
  cancelReasonCategory?: string
}

interface MealPeriod {
  _id: string
  code: string
  name: string
  startTime: string
  endTime: string
  active?: boolean
}

type Bucket = 'จองแล้ว' | 'พร้อมรับ' | 'รับแล้ว' | 'ไม่มารับ' | 'ยกเลิก'
const BUCKETS: Bucket[] = ['จองแล้ว', 'พร้อมรับ', 'รับแล้ว', 'ไม่มารับ', 'ยกเลิก']

const CHIPS: { key: '' | Bucket; label: string }[] = [
  { key: '',        label: 'ทั้งหมด' },
  { key: 'จองแล้ว',  label: 'จองแล้ว' },
  { key: 'พร้อมรับ', label: 'พร้อมรับ' },
  { key: 'รับแล้ว',  label: 'รับแล้ว' },
  { key: 'ไม่มารับ', label: 'ไม่มารับ' },
  { key: 'ยกเลิก',   label: 'ยกเลิก' },
]

const statusBadgeMap: Record<Bucket, { bg: string; color: string; icon: unknown; weight: 'regular' | 'fill' }> = {
  'จองแล้ว':  { bg: 'var(--color-success-bg)', color: 'var(--color-success)', icon: PhCheckCircle, weight: 'regular' },
  'พร้อมรับ': { bg: 'var(--color-accent-bg)',  color: 'var(--color-accent)',  icon: PhClock,       weight: 'regular' },
  'รับแล้ว':  { bg: 'var(--color-muted-bg)',   color: 'var(--color-muted)',   icon: PhCheckCircle, weight: 'fill' },
  'ไม่มารับ': { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  icon: PhXCircle,     weight: 'regular' },
  'ยกเลิก':   { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  icon: PhX,           weight: 'regular' },
}

const ACTIVE_STATUSES = ['confirmed', 'pending_payment', 'select_payment', 'wait_payment']

// ── Data ──────────────────────────────────────────────────────────────────────

const orders       = ref<EnrichedOrder[]>([])
const mealPeriods   = ref<MealPeriod[]>([])
const loading       = ref(false)
const error         = ref<string | null>(null)

const mealPeriodMap = computed(() => {
  const m = new Map<string, MealPeriod>()
  for (const mp of mealPeriods.value) m.set(mp._id, mp)
  return m
})

async function fetchOrders() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/orders')
    orders.value = data.orders ?? []
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

async function fetchMealPeriods() {
  try {
    const { data } = await api.get('/menu/meal-periods', { params: { scope: 'all' } })
    mealPeriods.value = data.mealPeriods ?? data.periods ?? []
  } catch {
    mealPeriods.value = []
  }
}

// ── Summary counts (server-side, reflects full filtered set — NOT current page) ─

const summaryCounts = ref<Record<Bucket, number>>({
  'จองแล้ว': 0, 'พร้อมรับ': 0, 'รับแล้ว': 0, 'ไม่มารับ': 0, 'ยกเลิก': 0,
})

async function fetchSummary() {
  try {
    const params: Record<string, string> = {}
    // Summary endpoint only supports from/to/mealPeriodId/search — it has no
    // concept of "มื้อ" (coarse Lunch/Dinner) or a createdAt-mode date filter,
    // so those two toolbar filters are NOT reflected in chip counts (documented
    // limitation — see final report).
    if (filterDate.value && dateMode.value === 'serve') {
      params.from = filterDate.value
      params.to   = filterDate.value
    }
    if (filterMealPeriodId.value) params.mealPeriodId = filterMealPeriodId.value
    if (search.value.trim())      params.search = search.value.trim()
    const { data } = await api.get('/admin/bookings/summary', { params })
    summaryCounts.value = { ...summaryCounts.value, ...(data.counts ?? {}) }
  } catch {
    // leave previous counts on failure
  }
}

let summaryDebounce: ReturnType<typeof setTimeout> | undefined

function chipCount(key: '' | Bucket): number {
  if (key === '') return BUCKETS.reduce((sum, b) => sum + (summaryCounts.value[b] ?? 0), 0)
  return summaryCounts.value[key] ?? 0
}

function selectChip(key: '' | Bucket) {
  filterStatus.value = key
  currentPage.value = 1
}

// ── Bucket derivation (must mirror server's bookingBucket helper) ──────────────

const nowTick = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | undefined

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function getBucket(o: EnrichedOrder): Bucket {
  if (o.status === 'redeemed' || o.status === 'complete') return 'รับแล้ว'
  if (o.status === 'expired') return 'ไม่มารับ'
  if (o.status === 'cancelled' || o.status === 'void') return 'ยกเลิก'
  if (ACTIVE_STATUSES.includes(o.status)) {
    const mp  = mealPeriodMap.value.get(o.mealPeriodId)
    const now = new Date(nowTick.value)
    const serve = o.serveDate ? new Date(o.serveDate) : null
    if (mp && serve && sameDay(serve, now)) {
      const nowMin = now.getHours() * 60 + now.getMinutes()
      if (nowMin >= timeToMinutes(mp.startTime) && nowMin <= timeToMinutes(mp.endTime)) return 'พร้อมรับ'
    }
    return 'จองแล้ว'
  }
  return 'จองแล้ว'
}

// ── Filters / pagination ──────────────────────────────────────────────────────

const search             = ref('')
const filterStatus        = ref<'' | Bucket>('')
const filterMealType      = ref<'' | 'lunch' | 'dinner'>('')
const filterMealPeriodId  = ref('')
const dateMode            = ref<'serve' | 'created'>('serve')
const filterDate          = ref('')
const pageSize            = ref(10)
const currentPage         = ref(1)

watch([filterMealPeriodId, filterDate, dateMode], () => fetchSummary())
watch(search, () => {
  clearTimeout(summaryDebounce)
  summaryDebounce = setTimeout(fetchSummary, 300)
})

const enrichedRows = computed(() => orders.value.map(order => ({ order, bucket: getBucket(order) })))

function matchesSearch(order: EnrichedOrder, q: string): boolean {
  if (!q) return true
  const name = (order.studentName ?? order.studentNameSnap ?? '').toLowerCase()
  const code = (order.studentCode ?? order.studentCodeSnap ?? '').toLowerCase()
  const no   = (order.orderNo ?? '').toLowerCase()
  return name.includes(q) || code.includes(q) || no.includes(q)
}

function matchesMealType(order: EnrichedOrder): boolean {
  if (!filterMealType.value) return true
  const hay = `${order.mealPeriodCode ?? ''} ${order.mealPeriodName ?? ''}`.toLowerCase()
  return hay.includes(filterMealType.value)
}

function matchesDate(order: EnrichedOrder): boolean {
  if (!filterDate.value) return true
  const src = dateMode.value === 'serve' ? order.serveDate : order.createdAt
  return !!src && src.slice(0, 10) === filterDate.value
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return enrichedRows.value.filter(r =>
    matchesSearch(r.order, q) &&
    (!filterStatus.value || r.bucket === filterStatus.value) &&
    matchesMealType(r.order) &&
    (!filterMealPeriodId.value || r.order.mealPeriodId === filterMealPeriodId.value) &&
    matchesDate(r.order),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

function clearFilters() {
  search.value = ''
  filterStatus.value = ''
  filterMealType.value = ''
  filterMealPeriodId.value = ''
  filterDate.value = ''
  currentPage.value = 1
}

// ── Selection ─────────────────────────────────────────────────────────────────

const selectedIds = ref<Set<string>>(new Set())

const isAllSelected = computed(() => filtered.value.length > 0 && filtered.value.every(r => selectedIds.value.has(r.order._id)))

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedIds.value = checked ? new Set(filtered.value.map(r => r.order._id)) : new Set()
}

function toggleRow(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function isActionDisabled(bucket: Bucket): boolean {
  return bucket === 'รับแล้ว' || bucket === 'ไม่มารับ' || bucket === 'ยกเลิก'
}

// ── Display helpers ───────────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const pad2 = (n: number) => String(n).padStart(2, '0')

function studentLabel(order: EnrichedOrder): string {
  const name = order.studentName ?? order.studentNameSnap ?? '-'
  const code = order.studentCode ?? order.studentCodeSnap
  return code ? `${name} (${code})` : name
}

function mealTypeLabel(order: EnrichedOrder): string {
  const hay = `${order.mealPeriodCode ?? ''} ${order.mealPeriodName ?? ''}`.toLowerCase()
  if (hay.includes('lunch'))  return 'LUNCH'
  if (hay.includes('dinner')) return 'DINNER'
  return (order.mealPeriodCode ?? order.mealPeriodName ?? '-').toUpperCase()
}

function mealTimeRange(order: EnrichedOrder): string {
  const mp = mealPeriodMap.value.get(order.mealPeriodId)
  if (mp) return `${mp.startTime}–${mp.endTime}`
  return order.mealPeriodTime ?? '-'
}

function isToday(iso?: string): boolean {
  if (!iso) return false
  return sameDay(new Date(iso), new Date(nowTick.value))
}

function formatServeDate(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${pad2(d.getDate())} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function formatDayMonth(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${pad2(d.getDate())} ${THAI_MONTHS_SHORT[d.getMonth()]}`
}

function formatDDMMYYYY(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function updatedTimestamp(order: EnrichedOrder): string {
  if (order.updatedAt && order.createdAt) {
    const diff = Math.abs(new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime())
    if (diff > 1000) return order.updatedAt
  }
  return order.createdAt
}

// ── Modals ────────────────────────────────────────────────────────────────────

const showEdit    = ref(false)
const editOrder   = ref<EnrichedOrder | null>(null)

const showCancel  = ref(false)
const cancelMode  = ref<'single' | 'bulk'>('single')
const cancelIds   = ref<string[]>([])

const showDetail    = ref(false)
const detailOrderId = ref<string | null>(null)

function openEdit(order: EnrichedOrder) {
  editOrder.value = order
  showEdit.value = true
}

function openCancelSingle(order: EnrichedOrder) {
  cancelMode.value = 'single'
  cancelIds.value = [order._id]
  showCancel.value = true
}

function openCancelBulk() {
  cancelMode.value = 'bulk'
  cancelIds.value = [...selectedIds.value]
  showCancel.value = true
}

function openDetail(order: EnrichedOrder) {
  detailOrderId.value = order._id
  showDetail.value = true
}

function onSaved() {
  showEdit.value = false
  fetchOrders()
  fetchSummary()
}

function onCancelled(payload: { cancelled: string[]; failed: { id: string; reason: string }[] }) {
  showCancel.value = false
  const next = new Set(selectedIds.value)
  for (const id of payload.cancelled ?? []) next.delete(id)
  selectedIds.value = next
  fetchOrders()
  fetchSummary()
}

// ── Export ────────────────────────────────────────────────────────────────────

const exportOpen = ref(false)

function exportHeaderAndRows(): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['ลำดับ', 'รหัสการจอง', 'ชื่อนักเรียน', 'รหัสนักเรียน', 'วันที่รับอาหาร', 'มื้อ', 'สถานะ', 'วันที่จอง', 'อัปเดตเมื่อ']
  const rows = filtered.value.map((r, i) => [
    i + 1,
    r.order.orderNo,
    r.order.studentNameSnap ?? r.order.studentName ?? '-',
    r.order.studentCodeSnap ?? r.order.studentCode ?? '-',
    formatServeDate(r.order.serveDate),
    mealTypeLabel(r.order),
    r.bucket,
    formatDDMMYYYY(r.order.createdAt),
    formatDateTime(updatedTimestamp(r.order)),
  ])
  return { headers, rows }
}

function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
}

function toCsvValue(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv() {
  const { headers, rows } = exportHeaderAndRows()
  const csv = [headers, ...rows].map(r => r.map(toCsvValue).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Booking_History_${todayStamp()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportXlsx() {
  const { headers, rows } = exportHeaderAndRows()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการจอง')
  XLSX.writeFile(wb, `Booking_History_${todayStamp()}.xlsx`)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  fetchOrders()
  fetchMealPeriods()
  fetchSummary()
  tickInterval = setInterval(() => { nowTick.value = Date.now() }, 60000)
})

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
  clearTimeout(summaryDebounce)
})
</script>

<style scoped>
/* Summary chips */
.bh-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.bh-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 100px;
  border: 1px solid var(--color-border-tertiary);
  background: #fff; color: var(--color-text-secondary);
  font-size: 13px; font-family: inherit; cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.bh-chip:hover { background: var(--color-bg-secondary); }
.bh-chip-active {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
  color: var(--color-primary);
}
.bh-chip-count {
  font-size: 11px; font-weight: 600;
  padding: 1px 7px; border-radius: 100px;
  background: rgba(0,0,0,0.06);
}
.bh-chip-active .bh-chip-count { background: var(--color-primary); color: #fff; }

/* Search box */
.bh-search-wrap {
  flex: 2; min-width: 220px; display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--color-border-tertiary); border-radius: 8px;
  padding: 0 12px; height: 36px; background: #fff;
}
.bh-search-input { border: none; outline: none; flex: 1; font-size: 13px; font-family: inherit; background: transparent; }

/* Date-mode toggle */
.bh-mode-toggle { display: flex; gap: 4px; }
.bh-mode-btn {
  font-size: 11px; padding: 3px 8px; border-radius: 100px;
  border: 1px solid var(--color-border-tertiary); background: #fff;
  color: var(--color-text-tertiary); cursor: pointer; font-family: inherit;
  white-space: nowrap;
}
.bh-mode-btn-active { border-color: var(--color-primary); background: var(--color-primary-tint); color: var(--color-primary); }

/* Bulk action bar */
.bh-bulk-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-radius: 10px;
  background: var(--color-primary-tint); color: var(--color-primary);
  font-size: 13px; font-weight: 500;
}

/* Checkbox */
.bh-checkbox { width: 15px; height: 15px; cursor: pointer; accent-color: var(--color-primary); }

/* Export dropdown */
.bh-export-dropdown {
  position: absolute; right: 0; top: calc(100% + 4px); z-index: 100;
  background: #fff; border: 1px solid #E5E7EB; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 190px; padding: 4px;
}
.bh-export-item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px;
  border: none; background: transparent; border-radius: 6px;
  font-size: 13px; color: var(--color-text-primary); cursor: pointer;
  text-align: left; font-family: inherit; transition: background 0.12s;
}
.bh-export-item:hover { background: #F5F5F7; }

.bh-dd-enter-active, .bh-dd-leave-active { transition: opacity 0.15s, transform 0.15s; }
.bh-dd-enter-from, .bh-dd-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
