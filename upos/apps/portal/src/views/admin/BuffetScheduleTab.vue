<template>
  <div style="display:flex;flex-direction:column;gap:16px;max-width:600px">

    <p style="font-size:13px;color:#8E8E93">กำหนดรอบ Buffet วันที่เปิดบริการ และวันหยุดพิเศษ</p>

    <div v-if="pageError" class="bs-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="pageError=''">ปิด</button>
    </div>

    <!-- Buffet rounds -->
    <div class="bs-card">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #F5F5F7">
        <span class="bs-card-title" style="border:none;padding:0">รอบ Buffet</span>
        <button class="bs-btn-add" @click="showAddRound=true">
          <PhPlus :size="14" weight="bold" /> เพิ่มรอบ
        </button>
      </div>
      <div v-if="rounds.length === 0" style="padding:32px;text-align:center;font-size:14px;color:#AEAEB2">ยังไม่มีรอบ Buffet</div>
      <div
        v-for="(r, i) in rounds"
        :key="r.id"
        class="bs-round-row"
        :style="i > 0 ? 'border-top:1px solid #F5F5F7' : ''"
      >
        <PhClock :size="16" style="color:#8E8E93;flex-shrink:0" />
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500;color:#1C1C1E">{{ r.name }}</div>
          <div style="font-size:12px;color:#8E8E93">{{ r.startTime }} – {{ r.endTime }}</div>
        </div>
        <button
          :class="['bs-toggle', r.active ? 'bs-toggle-on' : '']"
          @click="toggleRoundActive(r)"
        >{{ r.active ? 'เปิด' : 'ปิด' }}</button>
        <button class="bs-btn-del" @click="removeRound(r.id)"><PhTrash :size="14" /></button>
      </div>
    </div>

    <!-- Weekly schedule -->
    <div class="bs-card">
      <div class="bs-card-title">วันที่เปิดให้บริการ (ประจำสัปดาห์)</div>
      <div style="padding:16px;display:flex;gap:8px;flex-wrap:wrap">
        <button
          v-for="d in dayOptions"
          :key="d.value"
          :class="['bs-day-btn', openDays.includes(d.value) ? 'bs-day-btn-on' : '']"
          @click="toggleDay(d.value)"
        >{{ d.label }}</button>
      </div>
      <div style="padding:0 16px 16px;display:flex;justify-content:flex-end">
        <button class="bs-btn-save" :disabled="savingConfig" @click="saveConfig">
          {{ savingConfig ? 'กำลังบันทึก...' : 'บันทึกตาราง' }}
        </button>
      </div>
    </div>

    <!-- Blackout dates -->
    <div class="bs-card">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #F5F5F7">
        <span class="bs-card-title" style="border:none;padding:0">วันหยุดพิเศษ (Blackout)</span>
        <button class="bs-btn-add" @click="showAddBlackout=true">
          <PhPlus :size="14" weight="bold" /> เพิ่มวันหยุด
        </button>
      </div>

      <div v-if="blackouts.length === 0" style="padding:32px;text-align:center;font-size:14px;color:#AEAEB2">ยังไม่มีวันหยุดพิเศษ</div>

      <div
        v-for="(b, i) in blackouts"
        :key="b.id"
        class="bs-blackout-row"
        :style="i > 0 ? 'border-top:1px solid #F5F5F7' : ''"
      >
        <PhCalendarX :size="16" style="color:#8E8E93;flex-shrink:0" />
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500;color:#1C1C1E">{{ fmtDate(b.date) }}</div>
          <div v-if="b.reason" style="font-size:12px;color:#8E8E93">{{ b.reason }}</div>
        </div>
        <button class="bs-btn-del" @click="removeBlackout(b.id)" title="ลบ">
          <PhTrash :size="14" />
        </button>
      </div>
    </div>

    <!-- Add round modal -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="showAddRound" class="bs-backdrop" @click="showAddRound=false" /></Transition>
      <Transition name="modal-up">
        <div v-if="showAddRound" class="bs-modal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h3 class="bs-modal-title">เพิ่มรอบ Buffet</h3>
            <button class="bs-btn-del" @click="showAddRound=false"><PhX :size="17" weight="bold" /></button>
          </div>
          <div class="bs-field">
            <label class="bs-label">ชื่อรอบ <span style="color:var(--color-danger)">*</span></label>
            <input v-model="newRound.name" class="bs-input" placeholder="เช่น มื้อเช้า, มื้อกลางวัน" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="bs-field">
              <label class="bs-label">เวลาเริ่ม <span style="color:var(--color-danger)">*</span></label>
              <input v-model="newRound.startTime" type="time" class="bs-input" />
            </div>
            <div class="bs-field">
              <label class="bs-label">เวลาสิ้นสุด <span style="color:var(--color-danger)">*</span></label>
              <input v-model="newRound.endTime" type="time" class="bs-input" />
            </div>
          </div>
          <p v-if="roundError" style="font-size:12px;color:var(--color-danger);margin-top:4px">{{ roundError }}</p>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="bs-btn-cancel" @click="showAddRound=false">ยกเลิก</button>
            <button class="bs-btn-confirm" :disabled="!newRound.name || !newRound.startTime || !newRound.endTime || savingRound" @click="addRound">
              {{ savingRound ? 'กำลังบันทึก...' : 'เพิ่มรอบ' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add blackout modal -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="showAddBlackout" class="bs-backdrop" @click="showAddBlackout=false" /></Transition>
      <Transition name="modal-up">
        <div v-if="showAddBlackout" class="bs-modal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h3 class="bs-modal-title">เพิ่มวันหยุดพิเศษ</h3>
            <button class="bs-btn-del" @click="showAddBlackout=false"><PhX :size="17" weight="bold" /></button>
          </div>
          <div class="bs-field">
            <label class="bs-label">วันที่ <span style="color:var(--color-danger)">*</span></label>
            <input v-model="newBlackoutDate" type="date" class="bs-input" />
          </div>
          <div class="bs-field">
            <label class="bs-label">เหตุผล (ไม่บังคับ)</label>
            <input v-model="newBlackoutReason" class="bs-input" placeholder="เช่น วันหยุดราชการ, โรงเรียนปิด" />
          </div>
          <p v-if="blackoutError" style="font-size:12px;color:var(--color-danger);margin-top:4px">{{ blackoutError }}</p>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="bs-btn-cancel" @click="showAddBlackout=false">ยกเลิก</button>
            <button class="bs-btn-confirm" :disabled="!newBlackoutDate || savingBlackout" @click="addBlackout">
              {{ savingBlackout ? 'กำลังบันทึก...' : 'เพิ่มวันหยุด' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PhPlus, PhTrash, PhX, PhCalendarX, PhClock } from '@phosphor-icons/vue'
import type { BuffetBlackout, BuffetRound } from '@/api/types'
import {
  getBuffetConfig, updateBuffetConfig,
  listBuffetBlackouts, createBuffetBlackout, deleteBuffetBlackout,
  listBuffetRounds, createBuffetRound, updateBuffetRound, deleteBuffetRound,
} from '@/api/buffet'

// ── Rounds ─────────────────────────────────────────────────────────────────────
const rounds      = ref<BuffetRound[]>([])
const showAddRound = ref(false)
const savingRound  = ref(false)
const roundError   = ref('')
const newRound     = ref({ name: '', startTime: '', endTime: '' })

async function addRound() {
  if (!newRound.value.name || !newRound.value.startTime || !newRound.value.endTime) return
  savingRound.value = true
  roundError.value  = ''
  try {
    const r = await createBuffetRound({ ...newRound.value, active: true, sortOrder: rounds.value.length })
    rounds.value.push(r)
    showAddRound.value = false
    newRound.value = { name: '', startTime: '', endTime: '' }
  } catch (e: any) {
    roundError.value = e?.response?.data?.error?.message ?? 'เพิ่มไม่สำเร็จ'
  } finally { savingRound.value = false }
}

async function toggleRoundActive(r: BuffetRound) {
  try {
    const updated = await updateBuffetRound(r.id, { active: !r.active })
    const idx = rounds.value.findIndex(x => x.id === r.id)
    if (idx !== -1) rounds.value[idx] = updated
  } catch { pageError.value = 'บันทึกไม่สำเร็จ' }
}

async function removeRound(id: string) {
  try {
    await deleteBuffetRound(id)
    rounds.value = rounds.value.filter(r => r.id !== id)
  } catch { pageError.value = 'ลบไม่สำเร็จ' }
}

const dayOptions = [
  { value: 0, label: 'อา' },
  { value: 1, label: 'จ' },
  { value: 2, label: 'อ' },
  { value: 3, label: 'พ' },
  { value: 4, label: 'พฤ' },
  { value: 5, label: 'ศ' },
  { value: 6, label: 'ส' },
]

const openDays       = ref<number[]>([1,2,3,4,5])
const blackouts      = ref<BuffetBlackout[]>([])
const pageError      = ref('')
const savingConfig   = ref(false)
const showAddBlackout = ref(false)
const newBlackoutDate   = ref('')
const newBlackoutReason = ref('')
const blackoutError  = ref('')
const savingBlackout = ref(false)

function toggleDay(d: number) {
  const idx = openDays.value.indexOf(d)
  if (idx >= 0) openDays.value.splice(idx, 1)
  else openDays.value.push(d)
}

async function saveConfig() {
  savingConfig.value = true
  try {
    const cfg = await updateBuffetConfig([...openDays.value])
    openDays.value = cfg.openDays
  } catch { pageError.value = 'บันทึกตารางไม่สำเร็จ' }
  finally { savingConfig.value = false }
}

async function addBlackout() {
  if (!newBlackoutDate.value) return
  savingBlackout.value = true
  blackoutError.value  = ''
  try {
    const b = await createBuffetBlackout(newBlackoutDate.value, newBlackoutReason.value || undefined)
    blackouts.value.push(b)
    blackouts.value.sort((a,b) => a.date.localeCompare(b.date))
    showAddBlackout.value = false
    newBlackoutDate.value = ''
    newBlackoutReason.value = ''
  } catch (e: any) {
    blackoutError.value = e?.response?.data?.error?.message ?? 'เพิ่มไม่สำเร็จ'
  } finally { savingBlackout.value = false }
}

async function removeBlackout(id: string) {
  try {
    await deleteBuffetBlackout(id)
    blackouts.value = blackouts.value.filter(b => b.id !== id)
  } catch { pageError.value = 'ลบไม่สำเร็จ' }
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
}

onMounted(async () => {
  try {
    const [cfg, bl, rs] = await Promise.all([getBuffetConfig(), listBuffetBlackouts(), listBuffetRounds()])
    openDays.value  = cfg.openDays
    blackouts.value = bl
    rounds.value    = rs
  } catch { pageError.value = 'โหลดข้อมูลไม่สำเร็จ' }
})
</script>

<style scoped>
.bs-error-bar { background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#C62828; }
.bs-card { background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden; }
.bs-card-title { font-size:14px;font-weight:500;color:#1C1C1E;padding:14px 16px;border-bottom:1px solid #F5F5F7; }
.bs-day-btn { width:44px;height:44px;border-radius:10px;border:1px solid #E8E8E8;background:#F5F5F7;font-size:13px;font-weight:500;color:#8E8E93;cursor:pointer;transition:all 0.15s; }
.bs-day-btn-on { background:var(--color-primary);border-color:var(--color-primary);color:#fff; }
.bs-btn-save { height:36px;padding:0 16px;border-radius:var(--radius-md);background:var(--color-primary);color:#fff;border:none;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer; }
.bs-btn-save:disabled { background:#E5E5EA;color:#AEAEB2;cursor:not-allowed; }
.bs-btn-add { display:inline-flex;align-items:center;gap:4px;height:32px;padding:0 12px;border-radius:var(--radius-md);background:var(--color-primary);color:#fff;border:none;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer; }
.bs-round-row { display:flex;align-items:center;gap:12px;padding:12px 16px; }
.bs-toggle { height:28px;padding:0 10px;border-radius:6px;border:1px solid #E8E8E8;background:#F5F5F7;font-size:12px;font-weight:500;font-family:inherit;color:#8E8E93;cursor:pointer;transition:all 0.15s; }
.bs-toggle-on { background:var(--color-success-bg);border-color:#B7E7D3;color:#028A60; }
.bs-blackout-row { display:flex;align-items:center;gap:12px;padding:12px 16px; }
.bs-btn-del { background:none;border:none;cursor:pointer;color:#AEAEB2;display:flex;align-items:center;padding:4px;border-radius:6px;transition:color 0.15s; }
.bs-btn-del:hover { color:var(--color-danger); }
.bs-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.bs-modal { position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);background:#fff;border-radius:16px;width:400px;max-width:calc(100vw - 48px);padding:28px 24px;box-shadow:0 16px 48px rgba(0,0,0,0.16);box-sizing:border-box; }
.bs-modal-title { font-size:18px;font-weight:500;color:#1C1C1E;margin:0; }
.bs-field { display:flex;flex-direction:column;gap:6px;margin-bottom:14px; }
.bs-label { font-size:13px;font-weight:500;color:#3C3C43; }
.bs-input { height:44px;padding:0 12px;border-radius:var(--radius-md);border:1px solid #E8E8E8;background:#fff;font-size:14px;color:#1C1C1E;font-family:inherit;outline:none;transition:border-color 0.15s; }
.bs-input:focus { border-color:var(--color-primary); }
.bs-btn-cancel { flex:1;height:44px;border-radius:10px;border:1px solid #E8E8E8;background:#fff;font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer; }
.bs-btn-confirm { flex:1;height:44px;border-radius:10px;border:none;background:var(--color-primary);color:#fff;font-size:14px;font-weight:500;cursor:pointer; }
.bs-btn-confirm:disabled { background:#E5E5EA;color:#AEAEB2;cursor:not-allowed; }
.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
