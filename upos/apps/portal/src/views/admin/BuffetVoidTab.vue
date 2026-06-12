<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Date picker -->
    <div class="flex items-center gap-3">
      <div class="bv-date-wrap">
        <PhCalendarBlank :size="15" style="color:#8E8E93;flex-shrink:0" />
        <input type="date" v-model="selectedDate" class="bv-date-input" @change="load" />
      </div>
      <button class="bv-btn-today" @click="goToday">วันนี้</button>
    </div>

    <div v-if="pageError" class="bv-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="pageError=''">ปิด</button>
    </div>

    <div v-if="successMsg" class="bv-success-bar">
      <PhCheckCircle :size="16" weight="fill" style="flex-shrink:0" />
      {{ successMsg }}
    </div>

    <div v-if="loading" style="padding:48px;text-align:center;font-size:13px;color:#8E8E93">กำลังโหลด...</div>

    <template v-if="!loading && usage">
      <template v-for="p in usage.breakdown" :key="p.roundId">
        <div v-if="p.sessions.length > 0" class="bv-card">
          <div class="bv-period-header">
            <span style="font-size:14px;font-weight:500;color:#1C1C1E">{{ p.roundName }}</span>
            <span style="font-size:12px;color:#8E8E93">{{ p.count }} รายการ</span>
          </div>
          <div
            v-for="(s, si) in p.sessions"
            :key="s.id"
            class="bv-session-row"
            :style="si > 0 ? 'border-top:1px solid #F5F5F7' : ''"
          >
            <div class="bv-avatar">{{ s.studentName?.[0] ?? '?' }}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:500;color:#1C1C1E">{{ s.studentName || '—' }}</div>
              <div style="font-size:12px;color:#8E8E93">{{ s.uid }} · {{ fmtTime(s.enteredAt) }} · ฿{{ s.price }}</div>
            </div>
            <button class="bv-btn-void" @click="openVoid(s, p.roundName)">ยกเลิก</button>
          </div>
        </div>
      </template>

      <div v-if="usage.totalCount === 0" style="padding:48px;text-align:center">
        <p style="font-size:14px;color:#AEAEB2">ไม่มีรายการ Buffet วันนี้</p>
      </div>
    </template>

    <!-- Void confirm modal -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="voidTarget" class="bv-backdrop" /></Transition>
      <Transition name="modal-up">
        <div v-if="voidTarget" class="bv-modal">
          <div style="display:flex;justify-content:center;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:var(--color-warning-bg);display:flex;align-items:center;justify-content:center">
              <PhWarning :size="26" weight="fill" style="color:var(--color-warning)" />
            </div>
          </div>
          <h3 class="bv-modal-title" style="text-align:center">ยืนยันการยกเลิก?</h3>
          <p style="font-size:13px;color:#8E8E93;text-align:center;margin-bottom:16px;line-height:1.6">
            ยกเลิก Buffet ของ <strong style="color:#1C1C1E">{{ voidTarget.studentName }}</strong><br>
            รอบ <strong style="color:#1C1C1E">{{ voidPeriodName }}</strong> · ฿{{ voidTarget.price }}<br>
            เงินจะถูกคืนกลับเข้า wallet
          </p>
          <div class="bv-field">
            <label class="bv-label">เหตุผล <span style="color:var(--color-danger)">*</span></label>
            <input v-model="voidReason" class="bv-input" placeholder="ระบุเหตุผลการยกเลิก" ref="voidReasonInput" />
          </div>
          <p v-if="voidError" style="font-size:12px;color:var(--color-danger);margin-top:4px">{{ voidError }}</p>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="bv-btn-cancel" @click="voidTarget=null">ยกเลิก</button>
            <button class="bv-btn-danger" :disabled="!voidReason.trim() || voiding" @click="doVoid">
              {{ voiding ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { PhCalendarBlank, PhWarning, PhCheckCircle } from '@phosphor-icons/vue'
import type { BuffetUsage, BuffetSessionSummary } from '@/api/types'
import { getBuffetUsage, voidBuffetSession } from '@/api/buffet'

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const usage     = ref<BuffetUsage | null>(null)
const loading   = ref(false)
const pageError = ref('')
const successMsg = ref('')

const voidTarget    = ref<BuffetSessionSummary | null>(null)
const voidPeriodName = ref('')
const voidReason    = ref('')
const voidError     = ref('')
const voiding       = ref(false)
const voidReasonInput = ref<HTMLInputElement | null>(null)

function goToday() { selectedDate.value = today; load() }

function fmtTime(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })
}

function openVoid(s: BuffetSessionSummary, roundName: string) {
  voidTarget.value    = s
  voidPeriodName.value = roundName
  voidReason.value    = ''
  voidError.value     = ''
  nextTick(() => voidReasonInput.value?.focus())
}

async function doVoid() {
  if (!voidTarget.value || !voidReason.value.trim()) return
  voiding.value   = true
  voidError.value = ''
  try {
    await voidBuffetSession(voidTarget.value.id, voidReason.value.trim())
    successMsg.value = `ยกเลิก Buffet ของ ${voidTarget.value.studentName} สำเร็จ — คืนเงิน ฿${voidTarget.value.price}`
    voidTarget.value = null
    setTimeout(() => { successMsg.value = '' }, 5000)
    await load()
  } catch (e: any) {
    voidError.value = e?.response?.data?.error?.message ?? 'ยกเลิกไม่สำเร็จ'
  } finally { voiding.value = false }
}

async function load() {
  loading.value   = true
  pageError.value = ''
  try {
    usage.value = await getBuffetUsage(selectedDate.value)
  } catch { pageError.value = 'โหลดข้อมูลไม่สำเร็จ' }
  finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.bv-date-wrap { display:flex;align-items:center;gap:6px;height:40px;padding:0 12px;border:1px solid #E8E8E8;border-radius:var(--radius-md);background:#fff;cursor:pointer;transition:border-color 0.15s; }
.bv-date-wrap:focus-within { border-color:var(--color-primary); }
.bv-date-input { border:none;outline:none;font-size:14px;color:#1C1C1E;font-family:inherit;background:transparent;cursor:pointer; }
.bv-btn-today { height:40px;padding:0 16px;border-radius:var(--radius-md);border:1px solid #E8E8E8;background:#fff;font-size:13px;font-weight:500;color:var(--color-text-secondary);cursor:pointer;transition:background 0.15s; }
.bv-btn-today:hover { background:#F5F5F7; }
.bv-error-bar { background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#C62828; }
.bv-success-bar { background:var(--color-success-bg);border:1px solid #B7E7D3;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#028A60;font-weight:500; }
.bv-card { background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden; }
.bv-period-header { display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#FAFAFA;border-bottom:1px solid #F5F5F7; }
.bv-session-row { display:flex;align-items:center;gap:12px;padding:12px 16px; }
.bv-avatar { width:36px;height:36px;border-radius:50%;background:var(--color-primary-tint);color:var(--color-primary);font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.bv-btn-void { height:32px;padding:0 12px;border-radius:var(--radius-md);border:1px solid #FFCDD2;background:#FFF2F2;color:var(--color-danger);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:all 0.15s;white-space:nowrap; }
.bv-btn-void:hover { background:var(--color-danger);color:#fff; }
.bv-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.bv-modal { position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);background:#fff;border-radius:16px;width:400px;max-width:calc(100vw - 48px);padding:28px 24px;box-shadow:0 16px 48px rgba(0,0,0,0.16);box-sizing:border-box; }
.bv-modal-title { font-size:18px;font-weight:500;color:#1C1C1E;margin:0 0 4px; }
.bv-field { display:flex;flex-direction:column;gap:6px; }
.bv-label { font-size:13px;font-weight:500;color:#3C3C43; }
.bv-input { height:44px;padding:0 12px;border-radius:var(--radius-md);border:1px solid #E8E8E8;background:#fff;font-size:14px;color:#1C1C1E;font-family:inherit;outline:none;transition:border-color 0.15s; }
.bv-input:focus { border-color:var(--color-primary); }
.bv-btn-cancel { flex:1;height:44px;border-radius:10px;border:1px solid #E8E8E8;background:#fff;font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer; }
.bv-btn-danger { flex:1;height:44px;border-radius:10px;border:none;background:var(--color-danger);color:#fff;font-size:14px;font-weight:500;cursor:pointer; }
.bv-btn-danger:disabled { background:#E5E5EA;color:#AEAEB2;cursor:not-allowed; }
.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
