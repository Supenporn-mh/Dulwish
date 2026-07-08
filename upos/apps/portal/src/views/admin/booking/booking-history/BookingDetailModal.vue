<template>
  <Teleport to="body">
    <Transition name="bdm-fade">
      <div v-if="open" class="bdm-backdrop" @click="close" />
    </Transition>
    <Transition name="bdm-pop">
      <div v-if="open" class="bdm-modal" role="dialog" aria-modal="true" aria-label="รายละเอียดการจอง">
        <!-- Header -->
        <div class="bdm-header">
          <div class="bdm-header-left">
            <div class="bdm-icon-circle">
              <PhCalendar :size="20" style="color:var(--color-accent)" />
            </div>
            <div>
              <h3 class="bdm-title">รายละเอียดการจอง</h3>
              <p class="bdm-subtitle">{{ studentName || refNo }}</p>
            </div>
          </div>
          <button class="bdm-close" aria-label="ปิด" @click="close">
            <PhX :size="18" weight="bold" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="bdm-tabs" role="tablist">
          <button
            class="bdm-tab" :class="{ active: activeTab === 'detail' }"
            role="tab" :aria-selected="activeTab === 'detail'"
            @click="activeTab = 'detail'"
          >
            รายละเอียด
          </button>
          <button
            class="bdm-tab" :class="{ active: activeTab === 'log' }"
            role="tab" :aria-selected="activeTab === 'log'"
            @click="activeTab = 'log'"
          >
            Activity Log
          </button>
        </div>

        <div class="bdm-body">
          <!-- Tab 1: รายละเอียด -->
          <div v-if="activeTab === 'detail'">
            <div v-if="loading" class="bdm-empty">กำลังโหลด...</div>
            <div v-else-if="loadError" class="bdm-empty bdm-error">{{ loadError }}</div>
            <template v-else-if="order">
              <div class="bdm-rows">
                <div class="bdm-row">
                  <span class="bdm-key">มื้อ</span>
                  <span class="bdm-val">{{ mealLabel }}</span>
                </div>
                <div class="bdm-row">
                  <span class="bdm-key">วันที่รับอาหาร</span>
                  <span class="bdm-val">{{ fmtDate(order.serveDate) }}</span>
                </div>
                <div class="bdm-row">
                  <span class="bdm-key">วันที่จอง</span>
                  <span class="bdm-val">{{ fmtDateTime(order.createdAt) }}</span>
                </div>
                <div v-if="bucket === 'collected' && order.redeemedAt" class="bdm-row">
                  <span class="bdm-key">รับอาหารเมื่อ</span>
                  <span class="bdm-val">{{ fmtDateTime(order.redeemedAt) }}</span>
                </div>
                <div v-if="bucket === 'cancelled' && order.cancelledAt" class="bdm-row">
                  <span class="bdm-key">ยกเลิกเมื่อ</span>
                  <span class="bdm-val">{{ fmtDateTime(order.cancelledAt) }}</span>
                </div>
                <div class="bdm-row">
                  <span class="bdm-key">เลขอ้างอิง</span>
                  <span class="bdm-val bdm-mono">{{ refNo }}</span>
                </div>
                <div class="bdm-row bdm-row-status">
                  <span class="bdm-key">สถานะ</span>
                  <span class="bdm-badge" :style="`color:${statusCfg.text};background:${statusCfg.bg}`">
                    <component :is="statusCfg.icon" :size="13" :weight="statusCfg.weight" />
                    {{ statusCfg.label }}
                  </span>
                </div>
              </div>

              <div
                v-if="bucket === 'cancelled' && (order.cancelReasonCategory || order.cancelReason)"
                class="bdm-reason-box"
              >
                <p class="bdm-section-tag">เหตุผลการยกเลิก</p>
                <p v-if="order.cancelReasonCategory" class="bdm-reason-cat">{{ order.cancelReasonCategory }}</p>
                <p v-if="order.cancelReason" class="bdm-reason-detail">{{ order.cancelReason }}</p>
              </div>

              <div v-if="bucket === 'collected'" class="bdm-action">
                <button class="bdm-rate-btn" disabled title="เร็วๆ นี้">
                  <PhStar :size="14" weight="fill" />
                  ให้คะแนนการจอง
                </button>
              </div>
            </template>
          </div>

          <!-- Tab 2: Activity Log -->
          <div v-else>
            <div v-if="logsLoading" class="bdm-empty">กำลังโหลด...</div>
            <div v-else-if="logsError" class="bdm-empty bdm-error">{{ logsError }}</div>
            <div v-else-if="logs.length === 0" class="bdm-empty">ยังไม่มีกิจกรรม</div>
            <div v-else class="bdm-timeline">
              <div v-for="entry in logs" :key="entry._id" class="bdm-tl-item">
                <div class="bdm-tl-dot" />
                <div class="bdm-tl-content">
                  <div class="bdm-tl-head">
                    <span class="bdm-tl-action">{{ actionLabel(entry.action) }}</span>
                    <span class="bdm-tl-time">{{ fmtDateTime(entry.createdAt) }}</span>
                  </div>
                  <div class="bdm-tl-actor">โดย {{ actorLabel(entry) }}</div>
                  <div v-if="entry.reason" class="bdm-tl-reason">เหตุผล: {{ entry.reason }}</div>
                  <div v-if="hasDiff(entry)" class="bdm-tl-diff">
                    <div class="bdm-tl-diff-col">
                      <div class="bdm-tl-diff-label bdm-tl-diff-before">ก่อน</div>
                      <pre class="bdm-tl-diff-pre">{{ JSON.stringify(entry.beforeData, null, 2) }}</pre>
                    </div>
                    <div class="bdm-tl-diff-col">
                      <div class="bdm-tl-diff-label bdm-tl-diff-after">หลัง</div>
                      <pre class="bdm-tl-diff-pre">{{ JSON.stringify(entry.afterData, null, 2) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { PhCalendar, PhCheckCircle, PhClock, PhXCircle, PhX, PhStar } from '@phosphor-icons/vue'
import api from '@/api/axios'

// ── Props / emits — frozen contract ──────────────────────────────────────────
const props = defineProps<{
  open: boolean
  orderId: string | null
}>()
const emit = defineEmits<{ close: [] }>()

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderDoc {
  _id: string
  orderNo?: string
  studentUserId?: string
  mealPeriodId?: string
  serveDate: string
  status: string
  createdAt: string
  redeemedAt?: string
  cancelledAt?: string
  cancelReason?: string
  cancelReasonCategory?: string
  mealPeriodName?: string
  mealPeriodCode?: string
  [key: string]: any
}
interface MealPeriodDoc {
  _id: string
  code?: string
  name?: string
  startTime?: string
  endTime?: string
}
interface AuditLogEntry {
  _id: string
  actorUserId?: string
  actorRole?: string
  action: string
  entityType?: string
  entityId?: string
  reason?: string
  beforeData?: Record<string, unknown>
  afterData?: Record<string, unknown>
  createdAt: string
}

type StatusBucket = 'booked' | 'ready' | 'collected' | 'missed' | 'cancelled'

// ── Tab state ─────────────────────────────────────────────────────────────────
const activeTab = ref<'detail' | 'log'>('detail')

// ── Detail tab state ──────────────────────────────────────────────────────────
const order       = ref<OrderDoc | null>(null)
const mealPeriod  = ref<MealPeriodDoc | null>(null)
const studentName = ref<string>('')
const loading     = ref(false)
const loadError   = ref<string | null>(null)

// ── Activity log state ────────────────────────────────────────────────────────
const logs        = ref<AuditLogEntry[]>([])
const logsLoading = ref(false)
const logsError   = ref<string | null>(null)

// ── "now" tick — avoid a stale `new Date()` baked into a computed forever ────
// (the ready-window check below depends on wall-clock time; without a tick,
// the badge would freeze at whatever moment the order first loaded)
const now = ref(new Date())
let tickHandle: ReturnType<typeof setInterval> | null = null
function startTick() {
  stopTick()
  tickHandle = setInterval(() => { now.value = new Date() }, 30_000)
}
function stopTick() {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null }
}

// ── Date/time helpers — LOCAL time, not toISOString (UTC skews Bangkok dates) ─
function pad2(n: number): string { return String(n).padStart(2, '0') }
function localDateISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function fmtDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
function fmtDate(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (isNaN(d.getTime())) return '-'
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ── Status bucket — must match the mapping used elsewhere in this feature ────
const bucket = computed<StatusBucket>(() => {
  const o = order.value
  if (!o) return 'booked'
  const s = o.status
  if (s === 'redeemed' || s === 'complete') return 'collected'
  if (s === 'expired') return 'missed'
  if (s === 'cancelled' || s === 'void') return 'cancelled'
  if (['confirmed', 'pending_payment', 'select_payment', 'wait_payment'].includes(s)) {
    const mp = mealPeriod.value
    if (mp?.startTime && mp?.endTime && o.serveDate === localDateISO(now.value)) {
      const hm = `${pad2(now.value.getHours())}:${pad2(now.value.getMinutes())}`
      if (hm >= mp.startTime && hm <= mp.endTime) return 'ready'
    }
    return 'booked'
  }
  return 'booked'
})

const STATUS_CONFIG: Record<StatusBucket, { label: string; bg: string; text: string; icon: any; weight?: 'fill' }> = {
  booked:    { label: 'จองแล้ว',  bg: 'var(--color-success-bg)', text: 'var(--color-success)', icon: PhCheckCircle },
  ready:     { label: 'พร้อมรับ', bg: 'var(--color-accent-bg)',  text: 'var(--color-accent)',  icon: PhClock },
  collected: { label: 'รับแล้ว',  bg: 'var(--color-muted-bg)',   text: 'var(--color-muted)',   icon: PhCheckCircle, weight: 'fill' },
  missed:    { label: 'ไม่มารับ', bg: 'var(--color-danger-bg)',  text: 'var(--color-danger)',  icon: PhXCircle },
  cancelled: { label: 'ยกเลิก',   bg: 'var(--color-danger-bg)',  text: 'var(--color-danger)',  icon: PhX },
}
const statusCfg = computed(() => STATUS_CONFIG[bucket.value])

const mealLabel = computed(() =>
  mealPeriod.value?.name || order.value?.mealPeriodName || order.value?.mealPeriodCode || '-',
)
const refNo = computed(() => order.value?.orderNo ?? '-')

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchOrder(id: string) {
  loading.value = true
  loadError.value = null
  order.value = null
  mealPeriod.value = null
  studentName.value = ''
  try {
    const { data } = await api.get(`/orders/${id}`)
    order.value = data.order ?? null
    if (order.value) {
      // GET /orders/:id returns the raw order doc, no enrichment — fetch
      // meal-period + student display name separately (best-effort; a
      // failure here still leaves the core detail view usable).
      const tasks: Promise<void>[] = []
      if (order.value.mealPeriodId) {
        tasks.push(
          api.get('/menu/meal-periods', { params: { scope: 'all' } })
            .then(({ data: d }) => {
              const list: MealPeriodDoc[] = d.mealPeriods ?? d.periods ?? []
              mealPeriod.value = list.find(p => String(p._id) === String(order.value!.mealPeriodId)) ?? null
            })
            .catch(() => { /* enrichment best-effort */ }),
        )
      }
      if (order.value.studentUserId) {
        tasks.push(
          api.get(`/users/${order.value.studentUserId}`)
            .then(({ data: d }) => {
              const u = d.user
              studentName.value = u ? (u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()) : ''
            })
            .catch(() => { /* enrichment best-effort */ }),
        )
      }
      await Promise.all(tasks)
    }
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

async function fetchLogs(id: string) {
  logsLoading.value = true
  logsError.value = null
  try {
    const { data } = await api.get('/admin/audit', {
      params: { entityType: 'Order', entityId: id, limit: 100 },
    })
    const list: AuditLogEntry[] = data.logs ?? []
    // Chronological ascending — reads more naturally as a booking's history.
    logs.value = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } catch (e: unknown) {
    logsError.value = e instanceof Error ? e.message : 'โหลด Activity Log ไม่สำเร็จ'
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

function loadAll(id: string) {
  activeTab.value = 'detail'
  fetchOrder(id)
  fetchLogs(id)
}

watch(
  () => [props.open, props.orderId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      loadAll(id)
      startTick()
    } else {
      stopTick()
    }
  },
  { immediate: true },
)

onUnmounted(stopTick)

// ── Activity Log label maps ───────────────────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  booking_edited:    'แก้ไขการจอง',
  booking_cancelled: 'ยกเลิกการจอง',
}
function actionLabel(a: string): string { return ACTION_LABEL[a] ?? a }

const ACTOR_ROLE_LABEL: Record<string, string> = {
  student:    'นักเรียน',
  admin:      'ผู้ดูแลระบบ',
  system:     'ระบบ',
  parent:     'ผู้ปกครอง',
  cashier:    'แคชเชียร์',
  supervisor: 'หัวหน้างาน',
}
function actorLabel(entry: AuditLogEntry): string {
  return ACTOR_ROLE_LABEL[entry.actorRole ?? ''] ?? entry.actorRole ?? '-'
}

function hasDiff(entry: AuditLogEntry): boolean {
  return !!(entry.beforeData && entry.afterData)
}

function close() { emit('close') }
</script>

<style scoped>
.bdm-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.4);
}
.bdm-modal {
  position: fixed; top: 50%; left: 50%; z-index: 201; transform: translate(-50%, -50%);
  background: #fff; border-radius: 14px;
  width: calc(100vw - 32px); max-width: 520px;
  max-height: calc(100vh - 64px);
  display: flex; flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

/* Header */
.bdm-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px; flex-shrink: 0;
}
.bdm-header-left { display: flex; align-items: center; gap: 12px; }
.bdm-icon-circle {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--color-accent-bg);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bdm-title { font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
.bdm-subtitle { font-size: 12px; color: var(--color-text-tertiary); margin-top: 2px; }
.bdm-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-tertiary); padding: 4px; border-radius: 6px;
  display: flex; align-items: center; flex-shrink: 0;
}
.bdm-close:hover { background: var(--color-bg-secondary); }

/* Tabs */
.bdm-tabs {
  display: flex; gap: 4px; padding: 0 24px;
  border-bottom: 1px solid var(--color-border-tertiary);
  flex-shrink: 0;
}
.bdm-tab {
  background: none; border: none; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 500;
  color: var(--color-text-tertiary);
  padding: 10px 6px; margin-bottom: -1px;
  border-bottom: 2px solid transparent;
}
.bdm-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

/* Body */
.bdm-body { padding: 16px 24px 20px; overflow-y: auto; flex: 1; }
.bdm-empty { padding: 32px 0; text-align: center; font-size: 13px; color: var(--color-text-tertiary); }
.bdm-error { color: var(--color-danger); }

/* Info rows */
.bdm-rows { display: flex; flex-direction: column; }
.bdm-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 8px 0;
}
.bdm-row-status { padding-top: 12px; margin-top: 4px; border-top: 1px solid var(--color-border-tertiary); }
.bdm-key { font-size: 13px; color: var(--color-text-secondary); flex-shrink: 0; }
.bdm-val { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-align: right; }
.bdm-mono { font-family: monospace; font-size: 12px; color: var(--color-text-secondary); font-weight: 400; }

.bdm-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
}

/* Cancel reason box */
.bdm-reason-box {
  margin-top: 14px; padding: 12px 14px; border-radius: 10px;
  background: var(--color-danger-bg);
}
.bdm-section-tag {
  font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--color-text-tertiary); margin-bottom: 6px;
}
.bdm-reason-cat { font-size: 13px; font-weight: 500; color: var(--color-danger); }
.bdm-reason-detail { font-size: 13px; color: var(--color-text-primary); margin-top: 4px; line-height: 1.5; white-space: pre-wrap; }

/* Rate booking action — inert until rating feature exists */
.bdm-action { margin-top: 14px; }
.bdm-rate-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 20px;
  font-size: 13px; font-weight: 500; font-family: inherit;
  background: var(--color-bg-secondary); color: var(--color-text-tertiary);
  border: none; cursor: not-allowed;
}

/* Activity log timeline */
.bdm-timeline { display: flex; flex-direction: column; }
.bdm-tl-item { display: flex; gap: 12px; }
.bdm-tl-item:not(:last-child) .bdm-tl-content { padding-bottom: 18px; border-left: none; }
.bdm-tl-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--color-primary); margin-top: 5px; flex-shrink: 0;
  position: relative;
}
.bdm-tl-item:not(:last-child) .bdm-tl-dot::after {
  content: ''; position: absolute; top: 12px; left: 3px;
  width: 1px; height: calc(100% + 10px);
  background: var(--color-border-tertiary);
}
.bdm-tl-content { flex: 1; min-width: 0; }
.bdm-tl-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.bdm-tl-action { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.bdm-tl-time { font-size: 12px; color: var(--color-text-tertiary); white-space: nowrap; }
.bdm-tl-actor { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.bdm-tl-reason { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }

.bdm-tl-diff { display: flex; gap: 8px; margin-top: 8px; }
.bdm-tl-diff-col { flex: 1; min-width: 0; }
.bdm-tl-diff-label {
  font-size: 10px; font-weight: 500; border-radius: 4px;
  padding: 2px 6px; display: inline-block; margin-bottom: 4px;
}
.bdm-tl-diff-before { background: var(--color-danger-bg); color: var(--color-danger); }
.bdm-tl-diff-after  { background: var(--color-success-bg); color: var(--color-success); }
.bdm-tl-diff-pre {
  font-size: 11px; background: var(--color-bg-secondary); border-radius: 6px;
  padding: 8px; overflow: auto; max-height: 160px;
  white-space: pre-wrap; word-break: break-all; margin: 0;
  color: var(--color-text-secondary);
}

/* Transitions */
.bdm-fade-enter-active, .bdm-fade-leave-active { transition: opacity 0.2s; }
.bdm-fade-enter-from, .bdm-fade-leave-to { opacity: 0; }
.bdm-pop-enter-active, .bdm-pop-leave-active { transition: opacity 0.25s, transform 0.25s; }
.bdm-pop-enter-from, .bdm-pop-leave-to { opacity: 0; transform: translate(-50%, -48%); }
</style>
