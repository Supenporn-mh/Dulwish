<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Date picker + Manual Tap -->
    <div class="flex items-center gap-3">
      <div class="bu-date-wrap">
        <PhCalendarBlank :size="15" style="color:#8E8E93;flex-shrink:0" />
        <input type="date" v-model="selectedDate" class="bu-date-input" @change="load" />
      </div>
      <button class="bu-btn-today" @click="goToday">วันนี้</button>
      <button class="bu-btn-tap" @click="openTapModal">
        <PhUserPlus :size="15" weight="bold" /> Manual Tap
      </button>
    </div>

    <div v-if="pageError" class="bu-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="pageError=''">ปิด</button>
    </div>

    <div v-if="loading" style="padding:48px;text-align:center;font-size:13px;color:#8E8E93">กำลังโหลด...</div>

    <template v-if="!loading && usage">
      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="bu-stat-card">
          <div class="bu-stat-label">จำนวนคนที่กิน</div>
          <div class="bu-stat-value">{{ usage.totalCount }} <span class="bu-stat-unit">คน</span></div>
        </div>
        <div class="bu-stat-card">
          <div class="bu-stat-label">รายได้รวม</div>
          <div class="bu-stat-value">฿{{ usage.totalRevenue.toLocaleString() }}</div>
        </div>
      </div>

      <!-- Per-period breakdown -->
      <div
        v-for="p in usage.breakdown"
        :key="p.roundId"
        class="bu-period-card"
      >
        <div class="bu-period-header">
          <div>
            <div style="font-size:15px;font-weight:500;color:#1C1C1E">{{ p.roundName }}</div>
            <div style="font-size:12px;color:#8E8E93;margin-top:2px">{{ p.count }} คน · ฿{{ p.revenue.toLocaleString() }}</div>
          </div>
          <button
            class="bu-toggle"
            @click="togglePeriod(p.roundId)"
          >
            <PhCaretDown v-if="!expanded.has(p.roundId)" :size="16" weight="bold" />
            <PhCaretUp v-else :size="16" weight="bold" />
          </button>
        </div>

        <Transition name="expand">
          <div v-if="expanded.has(p.roundId) && p.sessions.length > 0" class="bu-session-list">
            <div class="bu-session-head">
              <span>ชื่อนักเรียน</span>
              <span>UID</span>
              <span>ราคา</span>
              <span>เวลา</span>
            </div>
            <div
              v-for="s in p.sessions"
              :key="s.id"
              class="bu-session-row"
            >
              <span style="font-size:13px;color:#1C1C1E">{{ s.studentName || '—' }}</span>
              <span style="font-size:12px;color:#8E8E93">{{ s.uid }}</span>
              <span style="font-size:13px;color:#1C1C1E">฿{{ s.price }}</span>
              <span style="font-size:12px;color:#8E8E93">{{ fmtTime(s.enteredAt) }}</span>
            </div>
          </div>
        </Transition>

        <div v-if="p.sessions.length === 0" style="padding:12px 16px;font-size:13px;color:#AEAEB2">ไม่มีรายการ</div>
      </div>
    </template>

  </div>

  <!-- Manual Tap Modal -->
  <Teleport to="body">
    <div v-if="showTapModal" class="bu-overlay" @click.self="closeTapModal">
      <div class="bu-modal">
        <div class="bu-modal-header">
          <span>Manual Tap</span>
          <button class="bu-close-btn" @click="closeTapModal"><PhX :size="16" weight="bold" /></button>
        </div>

        <div v-if="tapSuccess" class="bu-success-bar" style="margin:0 0 0">
          <PhCheckCircle :size="16" weight="fill" style="flex-shrink:0" />
          บันทึกสำเร็จ — ฿{{ tapSuccess.price }}
        </div>
        <div v-if="tapError" class="bu-error-bar" style="margin:0 0 0">{{ tapError }}</div>

        <div class="bu-modal-body">
          <div class="bu-field">
            <label class="bu-label">UID นักเรียน / สมาชิก *</label>
            <input v-model="tap.uid" class="bu-input" placeholder="STU0001" />
          </div>
          <div class="bu-field">
            <label class="bu-label">รอบ Buffet *</label>
            <select v-model="tap.buffetRoundId" class="bu-input bu-select" @change="tap.buffetCategoryId=''">
              <option value="">-- เลือกรอบ --</option>
              <option v-for="r in tapRounds" :key="r.id" :value="r.id">{{ r.name }} ({{ r.startTime }}–{{ r.endTime }})</option>
            </select>
          </div>
          <div class="bu-field">
            <label class="bu-label">ประเภทอาหาร (ถ้ามี)</label>
            <select v-model="tap.buffetCategoryId" class="bu-input bu-select">
              <option value="">-- ใช้ราคา Buffet ปกติ --</option>
              <option
                v-for="c in filteredCategories"
                :key="c.id"
                :value="c.id"
              >{{ c.name }}</option>
            </select>
          </div>
          <div class="bu-field">
            <label class="bu-label">วันที่ *</label>
            <input v-model="tap.entryDate" type="date" class="bu-input" />
          </div>
          <div class="bu-field">
            <label class="bu-label">รหัสซุปเปอร์ไวเซอร์ *</label>
            <input v-model="tap.supervisorCode" class="bu-input" placeholder="UID ของซุปเปอร์ไวเซอร์" />
          </div>
          <div class="bu-field">
            <label class="bu-label">หมายเหตุ</label>
            <input v-model="tap.note" class="bu-input" placeholder="ไม่บังคับ" />
          </div>
        </div>

        <div class="bu-modal-footer">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="closeTapModal">ปิด</button>
          <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="tapping" @click="doTap">
            {{ tapping ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhCalendarBlank, PhCaretDown, PhCaretUp, PhUserPlus, PhX, PhCheckCircle } from '@phosphor-icons/vue'
import type { BuffetUsage, BuffetRoundBreakdown, BuffetRound, BuffetCategory } from '@/api/types'
import { getBuffetUsage, listBuffetRounds, listBuffetCategories, manualTapBuffet } from '@/api/buffet'

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const usage     = ref<BuffetUsage | null>(null)
const loading   = ref(false)
const pageError = ref('')
const expanded  = ref<Set<string>>(new Set())

// Manual tap
const showTapModal = ref(false)
const tapRounds    = ref<BuffetRound[]>([])
const tapCategories = ref<BuffetCategory[]>([])
const tapping      = ref(false)
const tapError     = ref('')
const tapSuccess   = ref<{ price: number } | null>(null)

const tap = ref({
  uid: '', buffetRoundId: '', buffetCategoryId: '',
  entryDate: today, supervisorCode: '', note: '',
})

const filteredCategories = computed(() => tapCategories.value.filter(c => c.active))

async function openTapModal() {
  tapError.value   = ''
  tapSuccess.value = null
  tap.value = { uid: '', buffetRoundId: '', buffetCategoryId: '', entryDate: today, supervisorCode: '', note: '' }
  showTapModal.value = true
  if (tapRounds.value.length === 0) {
    const [rds, cats] = await Promise.all([listBuffetRounds(), listBuffetCategories()])
    tapRounds.value    = rds.filter(r => r.active)
    tapCategories.value = cats
  }
}

function closeTapModal() { showTapModal.value = false }

async function doTap() {
  tapError.value   = ''
  tapSuccess.value = null
  if (!tap.value.uid || !tap.value.buffetRoundId || !tap.value.entryDate || !tap.value.supervisorCode) {
    tapError.value = 'กรุณากรอกข้อมูลให้ครบ'
    return
  }
  tapping.value = true
  try {
    const result = await manualTapBuffet({
      uid:              tap.value.uid,
      buffetRoundId:    tap.value.buffetRoundId,
      buffetCategoryId: tap.value.buffetCategoryId || undefined,
      entryDate:        tap.value.entryDate,
      supervisorCode:   tap.value.supervisorCode,
      note:             tap.value.note || undefined,
    })
    tapSuccess.value = { price: result.price }
    tap.value = { uid: '', buffetRoundId: '', buffetCategoryId: '', entryDate: today, supervisorCode: '', note: '' }
    if (tap.value.entryDate === selectedDate.value) load()
  } catch (e: any) {
    tapError.value = e?.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    tapping.value = false
  }
}

function goToday() { selectedDate.value = today; load() }

function togglePeriod(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

// Auto-expand rounds that have sessions


function fmtTime(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })
}

async function load() {
  loading.value   = true
  pageError.value = ''
  try {
    usage.value = await getBuffetUsage(selectedDate.value)
    expanded.value = new Set(usage.value.breakdown.filter(p => p.count > 0).map(p => p.roundId))
  } catch { pageError.value = 'โหลดข้อมูลไม่สำเร็จ' }
  finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.bu-date-wrap { display:flex;align-items:center;gap:6px;height:40px;padding:0 12px;border:1px solid #E8E8E8;border-radius:var(--radius-md);background:#fff;cursor:pointer;transition:border-color 0.15s; }
.bu-date-wrap:focus-within { border-color:var(--color-primary); }
.bu-date-input { border:none;outline:none;font-size:14px;color:#1C1C1E;font-family:inherit;background:transparent;cursor:pointer; }
.bu-btn-today { height:40px;padding:0 16px;border-radius:var(--radius-md);border:1px solid #E8E8E8;background:#fff;font-size:13px;font-weight:500;color:var(--color-text-secondary);cursor:pointer;transition:background 0.15s; }
.bu-btn-today:hover { background:#F5F5F7; }
.bu-btn-tap { display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 16px;border-radius:var(--radius-md);background:var(--color-primary);color:#fff;border:none;font-size:13px;font-weight:500;cursor:pointer;transition:opacity 0.15s;font-family:inherit; }
.bu-btn-tap:hover { opacity:0.9; }

/* Modal */
.bu-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px; }
.bu-modal { background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden; }
.bu-modal-header { display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #F5F5F7;font-size:16px;font-weight:600;color:#1C1C1E; }
.bu-close-btn { width:30px;height:30px;border-radius:50%;background:#F2F2F7;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#3C3C43; }
.bu-modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:14px; }
.bu-modal-footer { display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid #F5F5F7; }
.bu-field { display:flex;flex-direction:column;gap:5px; }
.bu-label { font-size:13px;font-weight:500;color:#3C3C43; }
.bu-input { height:42px;padding:0 12px;border-radius:8px;border:1.5px solid #D0D0D0;font-size:14px;color:#1C1C1E;outline:none;font-family:inherit;background:#fff;transition:border-color 0.15s;box-sizing:border-box;width:100%; }
.bu-input:focus { border-color:var(--color-primary);box-shadow:0 0 0 2px rgba(18,100,227,0.08); }
.bu-select { cursor:pointer; }
.bu-error-bar { background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;padding:10px 14px;font-size:13px;color:#C62828;margin:0 20px; }
.bu-success-bar { display:flex;align-items:center;gap:8px;background:#F0FFF4;border:1px solid #BBF7D0;border-radius:10px;padding:10px 14px;font-size:13px;color:#166534;margin:0 20px; }
.bu-error-bar { background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#C62828; }
.bu-stat-card { background:#fff;border-radius:12px;border:1px solid #EBEBEB;padding:16px 20px; }
.bu-stat-label { font-size:12px;color:#8E8E93;margin-bottom:6px; }
.bu-stat-value { font-size:28px;font-weight:600;color:#1C1C1E; }
.bu-stat-unit { font-size:14px;font-weight:400;color:#8E8E93; }
.bu-period-card { background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden; }
.bu-period-header { display:flex;align-items:center;justify-content:space-between;padding:14px 16px; }
.bu-toggle { width:30px;height:30px;border-radius:6px;background:var(--color-bg-secondary);border:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary); }
.bu-session-list { border-top:1px solid #F5F5F7; }
.bu-session-head { display:grid;grid-template-columns:1fr 100px 80px 80px;padding:6px 16px;background:#FAFAFA; }
.bu-session-head span { font-size:12px;color:#AEAEB2; }
.bu-session-row { display:grid;grid-template-columns:1fr 100px 80px 80px;padding:9px 16px;border-top:1px solid #F5F5F7;align-items:center; }
.expand-enter-active,.expand-leave-active { transition:opacity 0.2s,max-height 0.25s ease;overflow:hidden;max-height:600px; }
.expand-enter-from,.expand-leave-to { opacity:0;max-height:0; }
</style>
