<template>
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="open" class="bcm-backdrop" @click="onBackdropClick" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="open" class="bcm-modal" role="dialog" aria-modal="true" aria-labelledby="bcm-title">

        <!-- Header -->
        <div class="bcm-modal-header">
          <div class="bcm-header-left">
            <div class="bcm-icon-circle">
              <PhCalendarX :size="20" weight="bold" />
            </div>
            <div>
              <h3 id="bcm-title" class="bcm-modal-title">ยกเลิกการจอง</h3>
              <p class="bcm-modal-sub">{{ titleSub }}</p>
            </div>
          </div>
          <button class="bcm-close" :disabled="submitting" @click="onBackdropClick">
            <PhX :size="18" weight="bold" />
          </button>
        </div>
        <div class="bcm-divider" />

        <div class="bcm-body">

          <!-- Bulk partial-failure result view -->
          <template v-if="bulkResult">
            <div class="bcm-result-box">
              <p style="font-weight:500;color:var(--color-text-primary)">
                ยกเลิกสำเร็จ {{ bulkResult.cancelled.length }} รายการ, ไม่สำเร็จ {{ bulkResult.failed.length }} รายการ
              </p>
              <ul class="bcm-fail-list">
                <li v-for="f in bulkResult.failed" :key="f.id">{{ f.id }} — {{ f.reason }}</li>
              </ul>
            </div>
          </template>

          <!-- Form -->
          <template v-else>
            <!-- Info strip -->
            <div v-if="mode === 'bulk'" class="bcm-info-box">
              <span style="font-weight:500">ยกเลิก {{ ids.length }} รายการ</span>
            </div>
            <div v-else-if="context" class="bcm-info-box">
              <div style="font-weight:500;color:var(--color-text-primary)">{{ context.studentLabel }}</div>
              <div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px">
                {{ context.mealLabel }} · {{ context.dateLabel }}
              </div>
            </div>

            <!-- เหตุผลการยกเลิก -->
            <div class="bcm-field">
              <label class="bcm-label">เหตุผลการยกเลิก <span style="color:var(--color-danger)">*</span></label>
              <div class="bcm-reason-chips">
                <button
                  v-for="opt in cancelReasons" :key="opt.id"
                  type="button"
                  class="bcm-reason-chip"
                  :class="{ 'bcm-reason-chip-active': reasonCategory === opt.label }"
                  :disabled="submitting"
                  @click="selectReason(opt)"
                >{{ opt.label }}</button>
              </div>
            </div>

            <!-- รายละเอียดเพิ่มเติม -->
            <div class="bcm-field">
              <label class="bcm-label">
                รายละเอียดเพิ่มเติม <span v-if="selectedReasonIsDefault" style="color:var(--color-danger)">*</span>
              </label>
              <textarea v-model="reasonDetail" class="bcm-input bcm-textarea" :disabled="submitting"
                placeholder="รายละเอียดเพิ่มเติม..." />
            </div>

            <!-- PIN -->
            <div class="bcm-field">
              <label class="bcm-label">รหัสยืนยัน (PIN) <span style="color:var(--color-danger)">*</span></label>
              <input
                v-model="pin"
                class="bcm-input"
                type="password"
                inputmode="numeric"
                maxlength="4"
                pattern="[0-9]*"
                :disabled="submitting"
                placeholder="••••"
                @input="onPinInput"
              />
              <p class="bcm-hint">กรอก PIN 4 หลักของคุณเพื่อยืนยันการยกเลิก</p>
              <p v-if="apiError" class="bcm-error">{{ apiError }}</p>
            </div>

            <!-- Notify checkbox -->
            <label class="bcm-checkbox-row">
              <input type="checkbox" v-model="notify" :disabled="submitting" />
              <span>ส่งการแจ้งเตือนให้นักเรียน / ผู้ปกครอง</span>
            </label>

            <!-- Warning box -->
            <div class="bcm-warn-box">
              <PhWarning :size="16" weight="fill" style="color:var(--color-danger);flex-shrink:0" />
              <span>การยกเลิกนี้ไม่สามารถย้อนกลับได้ และจะถูกบันทึกลงใน activity log ของระบบ</span>
            </div>
          </template>

        </div>

        <!-- Footer -->
        <div class="bcm-divider" />
        <div class="bcm-footer">
          <template v-if="bulkResult">
            <button class="adm-hdr-btn adm-hdr-btn-danger-btn" @click="acknowledgeBulkResult">ปิด</button>
          </template>
          <template v-else>
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="submitting" @click="onBackdropClick">ย้อนกลับ</button>
            <button
              class="adm-hdr-btn adm-hdr-btn-danger-btn"
              :disabled="!canSubmit || submitting"
              @click="submit"
            >
              <PhCalendarX v-if="!submitting" :size="14" weight="bold" />
              {{ submitting ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก' }}
            </button>
          </template>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhCalendarX, PhWarning, PhX } from '@phosphor-icons/vue'
import api from '../../../../api/axios'

// ── Props / Emits ─────────────────────────────────────────────────────────────

interface BookingContext {
  studentLabel: string
  mealLabel: string
  dateLabel: string
}

interface FailedItem {
  id: string
  reason: string
}

interface CancelledPayload {
  cancelled: string[]
  failed: FailedItem[]
}

const props = defineProps<{
  open: boolean
  mode: 'single' | 'bulk'
  ids: string[]
  context?: BookingContext
}>()

const emit = defineEmits<{
  close: []
  cancelled: [payload: CancelledPayload]
}>()

// ── Cancel reasons (fetched from admin-managed list) ───────────────────────────

interface CancelReasonOption {
  id: string
  label: string
  isDefault: boolean
}

const cancelReasons = ref<CancelReasonOption[]>([])

async function fetchCancelReasons() {
  try {
    const { data } = await api.get('/booking/cancel-reasons', { params: { activeOnly: true } })
    cancelReasons.value = data.reasons ?? []
  } catch {
    cancelReasons.value = []
  }
}

// ── Local form state ──────────────────────────────────────────────────────────

const reasonCategory = ref('')
const reasonDetail    = ref('')
const pin             = ref('')
const notify          = ref(true)
const submitting      = ref(false)
const apiError        = ref<string | null>(null)
const bulkResult      = ref<CancelledPayload | null>(null)

function resetForm() {
  reasonCategory.value = ''
  reasonDetail.value = ''
  pin.value = ''
  notify.value = true
  submitting.value = false
  apiError.value = null
  bulkResult.value = null
}

function selectReason(opt: CancelReasonOption) {
  reasonCategory.value = opt.label
  reasonDetail.value = opt.label
}

watch(() => props.open, (val) => {
  if (val) {
    resetForm()
    fetchCancelReasons()
  }
})

function onPinInput(e: Event) {
  const target = e.target as HTMLInputElement
  pin.value = target.value.replace(/\D/g, '').slice(0, 4)
}

// ── Derived ───────────────────────────────────────────────────────────────────

const titleSub = computed(() => props.mode === 'single' ? (props.ids[0] ?? '') : `${props.ids.length} รายการ`)

const selectedReason = computed(() => cancelReasons.value.find(r => r.label === reasonCategory.value))
const selectedReasonIsDefault = computed(() => selectedReason.value?.isDefault ?? false)

const canSubmit = computed(() => {
  if (pin.value.length !== 4) return false
  if (!reasonCategory.value) return false
  if (selectedReasonIsDefault.value && !reasonDetail.value.trim()) return false
  return true
})

// ── Submit ────────────────────────────────────────────────────────────────────

function buildBody() {
  return {
    reasonCategory: reasonCategory.value,
    reasonId: selectedReason.value?.id,
    reasonDetail: reasonDetail.value.trim() || undefined,
    pin: pin.value,
    notify: notify.value,
  }
}

function handleApiError(errObj?: { code?: string; message?: string }) {
  if (!errObj) {
    apiError.value = 'ยกเลิกไม่สำเร็จ'
    return
  }
  switch (errObj.code) {
    case 'PIN_INVALID':
      apiError.value = 'รหัส PIN ไม่ถูกต้อง'
      break
    case 'PIN_NOT_SET':
      apiError.value = 'ยังไม่ได้ตั้งรหัส PIN — กรุณาตั้งค่าก่อนใช้งาน'
      break
    case 'BOOKING_STATUS_001':
      apiError.value = 'ไม่สามารถยกเลิกได้ เนื่องจากสถานะการจองไม่ถูกต้องสำหรับการยกเลิก'
      break
    case 'BOOKING_404':
      apiError.value = 'ไม่พบข้อมูลการจองนี้ในระบบ'
      break
    default:
      apiError.value = errObj.message || 'ยกเลิกไม่สำเร็จ'
  }
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  apiError.value = null
  try {
    if (props.mode === 'single') {
      const { data } = await api.patch(`/admin/bookings/${props.ids[0]}/cancel`, buildBody())
      if (data?.success) {
        emit('cancelled', { cancelled: [...props.ids], failed: [] })
        emit('close')
      } else {
        handleApiError(data?.error)
      }
    } else {
      const { data } = await api.patch('/admin/bookings/bulk-cancel', {
        ids: props.ids,
        ...buildBody(),
      })
      if (data?.success) {
        const failed: FailedItem[] = data.failed ?? []
        if (failed.length > 0) {
          bulkResult.value = { cancelled: data.cancelled ?? [], failed }
        } else {
          emit('cancelled', { cancelled: data.cancelled ?? [...props.ids], failed: [] })
          emit('close')
        }
      } else {
        handleApiError(data?.error)
      }
    }
  } catch (e: unknown) {
    const errObj = (e as any)?.response?.data?.error
    if (errObj) {
      handleApiError(errObj)
    } else {
      apiError.value = e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ'
    }
  } finally {
    submitting.value = false
  }
}

function acknowledgeBulkResult() {
  if (!bulkResult.value) return
  emit('cancelled', bulkResult.value)
  emit('close')
}

function onBackdropClick() {
  if (submitting.value) return
  emit('close')
}
</script>

<style scoped>
.bcm-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.bcm-modal {
  position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:460px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16); overflow:hidden;
  display:flex; flex-direction:column; max-height:calc(100vh - 48px);
}
.bcm-modal-header {
  display:flex; justify-content:space-between; align-items:flex-start;
  padding:20px 24px 16px;
}
.bcm-header-left { display:flex; align-items:flex-start; gap:12px; }
.bcm-icon-circle {
  width:38px; height:38px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  background:var(--color-danger-bg); color:var(--color-danger);
}
.bcm-modal-title { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.bcm-modal-sub { font-size:12px; color:var(--color-text-tertiary); margin-top:2px; }
.bcm-close { background:none; border:none; cursor:pointer; color:var(--color-text-tertiary); padding:4px; border-radius:6px; display:flex; align-items:center; }
.bcm-close:hover:not(:disabled) { background:#F2F2F7; }
.bcm-close:disabled { opacity:0.4; cursor:not-allowed; }
.bcm-divider { height:1px; background:var(--color-border-tertiary); flex-shrink:0; }
.bcm-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; }

.bcm-info-box { background:var(--color-danger-bg); border-radius:8px; padding:12px 14px; font-size:13px; color:var(--color-text-primary); }

.bcm-field { display:flex; flex-direction:column; gap:5px; }
.bcm-label { font-size:12px; color:var(--color-text-secondary); }
.bcm-input {
  height:42px; padding:0 12px; border-radius:8px;
  border:1.5px solid #D0D0D0; font-size:14px; color:var(--color-text-primary);
  outline:none; font-family:inherit; background:#fff; width:100%; box-sizing:border-box;
  transition:border-color 0.15s;
}
.bcm-input:focus { border-color:var(--color-primary); }
.bcm-input:disabled { background:#F5F5F5; cursor:not-allowed; }
.bcm-select { cursor:pointer; }
.bcm-textarea { height:80px; padding:10px 12px; resize:vertical; line-height:1.5; }

.bcm-reason-chips { display:flex; flex-wrap:wrap; gap:8px; }
.bcm-reason-chip {
  padding:8px 14px; border-radius:100px;
  border:1px solid var(--color-border-tertiary); background:#fff;
  color:var(--color-text-secondary); font-size:13px; font-family:inherit; cursor:pointer;
  transition:background 0.15s, border-color 0.15s, color 0.15s;
}
.bcm-reason-chip:hover:not(:disabled) { background:var(--color-bg-secondary); }
.bcm-reason-chip:disabled { opacity:0.5; cursor:not-allowed; }
.bcm-reason-chip-active {
  border-color:var(--color-danger); background:var(--color-danger-bg); color:var(--color-danger);
}
.bcm-hint { font-size:11px; color:var(--color-text-tertiary); }
.bcm-error { font-size:12px; color:var(--color-danger); }

.bcm-checkbox-row { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text-primary); cursor:pointer; }

.bcm-warn-box {
  display:flex; align-items:flex-start; gap:8px;
  background:var(--color-danger-bg); border-radius:10px; padding:12px 14px;
  font-size:12px; color:var(--color-text-primary); line-height:1.5;
}

.bcm-result-box { background:var(--color-danger-bg); border-radius:10px; padding:14px 16px; font-size:13px; }
.bcm-fail-list { margin-top:8px; padding-left:18px; font-size:12px; color:var(--color-text-secondary); display:flex; flex-direction:column; gap:2px; }

.bcm-footer { display:flex; gap:10px; padding:16px 24px; justify-content:flex-end; flex-shrink:0; }

.adm-hdr-btn-danger-btn {
  display:inline-flex; align-items:center; gap:6px;
  background:var(--color-danger); color:#fff;
}
.adm-hdr-btn-danger-btn:hover:not(:disabled) { opacity:0.9; }
.adm-hdr-btn-danger-btn:disabled { opacity:0.4; cursor:not-allowed; }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
