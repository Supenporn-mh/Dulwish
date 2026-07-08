<template>
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="open" class="bh-backdrop" @click="handleClose" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="open && order" class="bh-modal">

        <!-- Header -->
        <div class="bh-modal-header">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div class="edm-icon-circle">
              <PhPencilSimple :size="18" weight="bold" />
            </div>
            <div>
              <h3 class="bh-modal-title">แก้ไขการจอง</h3>
              <p style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">{{ order.orderNo ?? '-' }}</p>
            </div>
          </div>
          <button class="bh-close" @click="handleClose"><PhX :size="18" weight="bold" /></button>
        </div>
        <div style="height:1px;background:var(--color-border-tertiary)" />

        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;max-height:65vh;overflow-y:auto">

          <!-- ข้อมูลนักเรียน + สถานะปัจจุบัน -->
          <div class="edm-info-box">
            <div style="font-weight:500;color:var(--color-primary)">{{ studentLabel }}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
              <span style="font-size:12px;color:var(--color-text-secondary)">สถานะปัจจุบัน:</span>
              <span class="edm-status-badge">{{ statusLabel }}</span>
            </div>
          </div>

          <!-- วันที่รับอาหาร -->
          <div class="bh-field">
            <label class="bh-label">วันที่รับอาหาร <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.serveDate" type="date" class="bh-input" />
          </div>

          <!-- มื้อ -->
          <div class="bh-field">
            <label class="bh-label">มื้อ <span style="color:var(--color-danger)">*</span></label>
            <select v-model="form.mealPeriodId" class="bh-input bh-select">
              <option value="" disabled>เลือกมื้ออาหาร</option>
              <option v-for="mp in mealPeriods" :key="mp.id" :value="mp.id">{{ mp.name }}</option>
            </select>
          </div>

          <!-- เมนูอาหาร -->
          <div class="bh-field">
            <label class="bh-label">เมนูอาหาร</label>
            <div class="edm-menu-list">
              <p v-if="menuItemsLoading" style="font-size:12px;color:var(--color-text-tertiary);padding:10px 4px">กำลังโหลดเมนู...</p>
              <p v-else-if="menuItems.length === 0" style="font-size:12px;color:var(--color-text-tertiary);padding:10px 4px">ไม่พบเมนูอาหาร</p>
              <label v-for="mi in menuItems" :key="mi.id" class="edm-menu-item">
                <input type="checkbox" :value="mi.id" v-model="form.selectedItemIds" />
                <span>{{ mi.name }}</span>
              </label>
            </div>
            <p style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px">ไม่เลือกหมายถึงให้นักเรียนเลือกเองวันนั้น</p>
          </div>

          <!-- หมายเหตุ -->
          <div class="bh-field">
            <label class="bh-label">หมายเหตุ</label>
            <textarea v-model="form.note" class="bh-input bh-textarea" placeholder="หมายเหตุเพิ่มเติม..." />
          </div>

          <!-- แจ้งเตือน -->
          <label class="edm-notify-row">
            <input type="checkbox" v-model="form.notify" />
            <span>ส่งการแจ้งเตือนให้นักเรียน / ผู้ปกครอง</span>
          </label>

        </div>

        <!-- Footer -->
        <div style="height:1px;background:var(--color-border-tertiary)" />
        <div style="padding:12px 24px 0" v-if="saveError">
          <p style="font-size:12px;color:var(--color-danger)">{{ saveError }}</p>
        </div>
        <div style="display:flex;gap:10px;padding:16px 24px;justify-content:flex-end">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="handleClose">ยกเลิก</button>
          <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!canSave || saving" @click="handleSave">
            <PhFloppyDisk v-if="!saving" :size="14" />
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhPencilSimple, PhX, PhFloppyDisk } from '@phosphor-icons/vue'
import api from '@/api/axios'

// ── Props / Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  open: boolean
  order: Record<string, any> | null
}>()

const emit = defineEmits<{
  close: []
  saved: [order: Record<string, any>]
}>()

// ── Status label (Thai bucket, mirrors BookingHistoryView mapping) ───────────

const STATUS_TO_THAI: Record<string, string> = {
  confirmed:       'จองแล้ว',
  pending_payment: 'รอชำระ',
  redeemed:        'เสร็จสิ้น',
  cancelled:       'ยกเลิก',
  expired:         'ไม่มา',
}
const KNOWN_THAI = new Set(['จองแล้ว', 'รอชำระ', 'เสร็จสิ้น', 'ยกเลิก', 'ไม่มา'])

const statusLabel = computed(() => {
  const s = props.order?.status
  if (!s) return '-'
  return KNOWN_THAI.has(s) ? s : (STATUS_TO_THAI[s] ?? s)
})

const studentLabel = computed(() => {
  const o = props.order
  if (!o) return '-'
  if (o.studentName) return o.studentCode ? `${o.studentName} (${o.studentCode})` : o.studentName
  return o.studentUserId ?? '-'
})

// ── Meal periods (real endpoint, same as TimeSettingsView.vue) ───────────────

interface MealPeriodOpt { id: string; name: string }
const mealPeriods = ref<MealPeriodOpt[]>([])
const mealPeriodsLoading = ref(false)

async function fetchMealPeriods() {
  mealPeriodsLoading.value = true
  try {
    const { data } = await api.get('/menu/meal-periods')
    const list: any[] = data.mealPeriods ?? data.periods ?? []
    mealPeriods.value = list
      .filter(mp => mp.active !== false)
      .map(mp => ({ id: String(mp._id ?? mp.id), name: mp.name ?? mp.code ?? '-' }))
  } catch {
    // fallback: two literal options if the real endpoint is unavailable
    mealPeriods.value = [
      { id: 'LUNCH',  name: 'มื้อกลางวัน' },
      { id: 'DINNER', name: 'มื้อเย็น' },
    ]
  } finally {
    mealPeriodsLoading.value = false
  }
}

// ── Menu items (canteen MenuItem — matches Order.items[].menuItemId, NOT the
// booking-config BookingMenu collection used by "เมนูการจอง") ─────────────────

interface MenuItemOpt { id: string; name: string }
const menuItems = ref<MenuItemOpt[]>([])
const menuItemsLoading = ref(false)

async function fetchMenuItems() {
  menuItemsLoading.value = true
  try {
    const { data } = await api.get('/menu')
    const items: any[] = data.items ?? []
    menuItems.value = items.map(m => ({ id: String(m._id), name: m.name }))
  } catch {
    menuItems.value = []
  } finally {
    menuItemsLoading.value = false
  }
}

let optionsLoaded = false
async function ensureOptionsLoaded() {
  if (optionsLoaded) return
  optionsLoaded = true
  await Promise.all([fetchMealPeriods(), fetchMenuItems()])
}

// ── Form state ────────────────────────────────────────────────────────────────

const form = ref({
  serveDate: '',
  mealPeriodId: '',
  selectedItemIds: [] as string[],
  note: '',
  notify: true,
})

const initial = ref({
  serveDate: '',
  mealPeriodId: '',
  selectedItemIds: [] as string[],
  note: '',
})

function idsOf(items: any[] | undefined): string[] {
  // GET /orders populates items.menuItemId to { _id, name } — unwrap it before
  // falling back to a plain id, or every checkbox pre-check silently fails.
  return (items ?? []).map(it => String(it.menuItemId?._id ?? it.menuItemId ?? it.id ?? it._id)).filter(Boolean)
}

function resetFormFromOrder(o: Record<string, any> | null) {
  if (!o) return
  const serveDate = o.serveDate ? String(o.serveDate).slice(0, 10) : ''
  const mealPeriodId = o.mealPeriodId ? String(o.mealPeriodId) : ''
  const selectedItemIds = idsOf(o.items)
  const note = o.note ?? ''

  form.value = { serveDate, mealPeriodId, selectedItemIds: [...selectedItemIds], note, notify: true }
  initial.value = { serveDate, mealPeriodId, selectedItemIds, note }
  saveError.value = null
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    resetFormFromOrder(props.order)
    await ensureOptionsLoaded()
  }
})

watch(() => props.order, (o) => {
  if (props.open) resetFormFromOrder(o)
})

// ── Save ──────────────────────────────────────────────────────────────────────

const saving = ref(false)
const saveError = ref<string | null>(null)

const canSave = computed(() => !!form.value.serveDate && !!form.value.mealPeriodId)

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

async function handleSave() {
  if (!props.order || !canSave.value || saving.value) return

  const id = props.order._id ?? props.order.id
  const payload: Record<string, any> = { notify: form.value.notify }

  if (form.value.serveDate !== initial.value.serveDate) payload.serveDate = form.value.serveDate
  if (form.value.mealPeriodId !== initial.value.mealPeriodId) payload.mealPeriodId = form.value.mealPeriodId
  if (!sameIds(form.value.selectedItemIds, initial.value.selectedItemIds)) {
    payload.items = form.value.selectedItemIds.map(menuItemId => ({ menuItemId, qty: 1 }))
  }
  if (form.value.note !== initial.value.note) payload.note = form.value.note

  saving.value = true
  saveError.value = null
  try {
    const { data } = await api.patch(`/admin/bookings/${id}`, payload)
    if (data?.error) {
      saveError.value = data.error.message ?? 'บันทึกไม่สำเร็จ'
      return
    }
    emit('saved', data.order ?? data)
    emit('close')
  } catch (e: any) {
    saveError.value = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

function handleClose() {
  if (saving.value) return
  emit('close')
}
</script>

<style scoped>
.bh-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.bh-modal {
  position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:480px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16); overflow:hidden;
}
.bh-modal-header {
  display:flex; justify-content:space-between; align-items:flex-start;
  padding:20px 24px 16px;
}
.bh-modal-title { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.bh-close { background:none; border:none; cursor:pointer; color:var(--color-text-tertiary); padding:4px; border-radius:6px; display:flex; align-items:center; }
.bh-close:hover { background:#F2F2F7; }

.edm-icon-circle {
  width:36px; height:36px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  background:var(--color-accent-bg); color:var(--color-accent);
}

.edm-info-box { background:var(--color-accent-bg); border-radius:8px; padding:12px 14px; }
.edm-status-badge {
  display:inline-block; font-size:12px; font-weight:500;
  padding:2px 10px; border-radius:100px;
  background:#fff; color:var(--color-accent);
}

.bh-field { display:flex; flex-direction:column; gap:5px; }
.bh-label { font-size:12px; color:var(--color-text-secondary); }
.bh-input {
  height:42px; padding:0 12px; border-radius:8px;
  border:1.5px solid #D0D0D0; font-size:14px; color:var(--color-text-primary);
  outline:none; font-family:inherit; background:#fff; width:100%; box-sizing:border-box;
  transition:border-color 0.15s;
}
.bh-input:focus { border-color:var(--color-primary); }
.bh-select   { cursor:pointer; }
.bh-textarea { height:70px; padding:10px 12px; resize:vertical; line-height:1.5; }

.edm-menu-list {
  border:1.5px solid #D0D0D0; border-radius:8px; max-height:160px; overflow-y:auto;
  display:flex; flex-direction:column; padding:4px;
}
.edm-menu-item {
  display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:6px;
  font-size:13px; color:var(--color-text-primary); cursor:pointer;
}
.edm-menu-item:hover { background:var(--color-bg-secondary); }
.edm-menu-item input { flex-shrink:0; cursor:pointer; }

.edm-notify-row {
  display:flex; align-items:center; gap:8px; font-size:13px;
  color:var(--color-text-primary); cursor:pointer;
}
.edm-notify-row input { flex-shrink:0; cursor:pointer; }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
