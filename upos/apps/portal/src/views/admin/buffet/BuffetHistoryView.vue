<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ประวัติการใช้งาน Buffet</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">รายการบันทึกการเข้าใช้บริการ Buffet ทั้งหมด สามารถยกเลิกได้</p>
      </div>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openManualTap">
        <PhPlus :size="14" /> เพิ่มแตะบัตร
      </button>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3 items-end">
        <!-- Search -->
        <div style="flex:2;min-width:200px;display:flex;align-items:center;gap:8px;border:1px solid var(--color-border-tertiary);border-radius:8px;padding:0 12px;height:38px;background:#fff">
          <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
          <input v-model="search" @input="currentPage=1" style="border:none;outline:none;flex:1;font-size:13px;font-family:inherit;background:transparent" placeholder="ค้นหาชื่อหรือ UID..." />
        </div>
        <!-- ผู้ใช้งาน -->
        <div style="min-width:180px;display:flex;align-items:center;gap:8px;border:1px solid var(--color-border-tertiary);border-radius:8px;padding:0 12px;height:38px;background:#fff">
          <PhUser :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
          <input v-model="filterUser" @input="currentPage=1" style="border:none;outline:none;flex:1;font-size:13px;font-family:inherit;background:transparent" placeholder="ผู้ใช้งาน..." />
        </div>
        <!-- รอบ -->
        <select v-model="filterRound" @change="currentPage=1" class="adm-filter-select">
          <option value="">รอบทั้งหมด</option>
          <option v-for="r in rounds" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
        <!-- สถานะ -->
        <select v-model="filterStatus" @change="currentPage=1" class="adm-filter-select">
          <option value="">สถานะทั้งหมด</option>
          <option value="active">ปกติ</option>
          <option value="voided">ยกเลิกแล้ว</option>
        </select>
        <!-- วันที่ -->
        <input v-model="filterDate" @change="currentPage=1;fetchHistory()" type="date" class="adm-filter-input" style="height:38px" />
        <button class="bfh-btn-today" @click="goToday">วันนี้</button>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="bfh-error-banner">
      <PhWarning :size="15" style="flex-shrink:0" />
      <span>{{ error }}</span>
      <button class="bfh-error-dismiss" @click="error=null">✕</button>
    </div>

    <!-- Summary cards -->
    <div v-if="!loading && result" class="bfh-summary-row">
      <div class="bfh-summary-card">
        <div class="bfh-summary-label">รายการทั้งหมด</div>
        <div class="bfh-summary-value">{{ result.total }}</div>
        <div class="bfh-summary-sub">รายการ</div>
      </div>
      <div class="bfh-summary-card bfh-summary-card-green">
        <div class="bfh-summary-label">รายได้รวม</div>
        <div class="bfh-summary-value">฿{{ result.totalRevenue.toLocaleString() }}</div>
        <div class="bfh-summary-sub">บาท</div>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:60px">ลำดับ</th>
            <th style="min-width:160px">ชื่อ / UID</th>
            <th style="min-width:160px">รอบ</th>
            <th class="center" style="width:110px">วันที่</th>
            <th class="center" style="width:100px">เวลาเข้า</th>
            <th class="center" style="width:100px">ราคา</th>
            <th class="center" style="width:110px">สถานะ</th>
            <th class="center" style="width:100px">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(s, i) in paginated" v-else :key="s.id" :style="s.status==='voided' ? 'opacity:0.6' : ''">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td>
              <div style="font-weight:500;color:var(--color-primary);font-size:14px">{{ s.studentName || '—' }}</div>
              <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px;font-family:monospace">{{ s.uid }}</div>
            </td>
            <td>
              <div style="font-size:13px;color:var(--color-text-primary)">{{ s.roundName }}</div>
            </td>
            <td class="center" style="font-size:13px">{{ s.entryDate }}</td>
            <td class="center" style="font-size:13px">{{ fmtTime(s.enteredAt) }}</td>
            <td class="center" style="font-size:13px;font-weight:500">฿{{ s.price }}</td>
            <td class="center">
              <span :class="['bfh-status-badge', s.status === 'active' ? 'bfh-status-active' : 'bfh-status-voided']">
                {{ s.status === 'active' ? 'ปกติ' : 'ยกเลิกแล้ว' }}
              </span>
            </td>
            <td class="center">
              <button v-if="s.status === 'active'" class="bfh-btn-void" @click="openVoid(s)">ยกเลิก</button>
              <span v-else style="font-size:12px;color:var(--color-text-tertiary)">—</span>
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
          <select v-model="pageSize" class="adm-page-size">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage===p?'active':'']" @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

  </div>

  <!-- Void modal -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="voidTarget" class="bfh-backdrop" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="voidTarget" class="bfh-modal">
        <div class="bfh-modal-header">
          <div>
            <h3 class="bfh-modal-title">ยกเลิกการใช้ Buffet</h3>
            <p style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">{{ voidTarget.studentName }}</p>
          </div>
          <button class="bfh-close" @click="voidTarget=null"><PhX :size="18" weight="bold" /></button>
        </div>
        <div style="height:1px;background:var(--color-border-tertiary)" />
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px">
          <div class="bfh-info-box">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <PhWarning :size="16" weight="fill" style="color:var(--color-warning);flex-shrink:0" />
              <span style="font-size:13px;color:var(--color-warning);font-weight:500">เงินจะถูกคืนกลับเข้า Wallet ของผู้ใช้</span>
            </div>
            <div style="font-weight:500;color:var(--color-text-primary)">{{ voidTarget.studentName }}</div>
            <div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px">
              {{ voidTarget.roundName }} · {{ voidTarget.entryDate }} · <strong style="color:var(--color-danger)">฿{{ voidTarget.price }}</strong>
            </div>
          </div>
          <div class="bfh-field">
            <label class="bfh-label">เหตุผลการยกเลิก <span style="color:var(--color-danger)">*</span></label>
            <div class="bfh-reason-chips">
              <button
                v-for="opt in cancelReasons" :key="opt.id"
                type="button"
                class="bfh-reason-chip"
                :class="{ 'bfh-reason-chip-active': voidReason === opt.label }"
                @click="voidReason = opt.label"
              >{{ opt.label }}</button>
            </div>
            <textarea v-model="voidReason" class="bfh-input bfh-textarea" placeholder="ระบุเหตุผลการยกเลิก..." />
          </div>
          <div class="bfh-field">
            <label class="bfh-label">รหัสซุปเปอร์ไวเซอร์ <span style="color:var(--color-danger)">*</span></label>
            <input v-model="voidSupervisorCode" class="bfh-input" placeholder="กรอกรหัสซุปเปอร์ไวเซอร์เพื่อยืนยัน" style="font-family:monospace" autocomplete="off" />
            <p style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px">รหัสซุปเปอร์ไวเซอร์จะถูกบันทึกเป็นหลักฐาน</p>
          </div>
        </div>
        <div style="height:1px;background:var(--color-border-tertiary)" />
        <div v-if="voidError" style="padding:10px 24px 0">
          <p style="font-size:12px;color:var(--color-danger)">{{ voidError }}</p>
        </div>
        <div style="display:flex;gap:10px;padding:16px 24px;justify-content:flex-end">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="voiding" @click="voidTarget=null">ยกเลิก</button>
          <button class="adm-hdr-btn adm-hdr-btn-danger-btn" :disabled="!canVoid || voiding" @click="doVoid">
            {{ voiding ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Manual tap modal -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="showManualTap" class="bfh-backdrop" @click="showManualTap=false" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="showManualTap" class="bfh-modal">
        <div class="bfh-modal-header">
          <div>
            <h3 class="bfh-modal-title">เพิ่มแตะบัตร (Manual)</h3>
            <p style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">สำหรับกรณีแตะบัตรที่ POS ไม่ผ่าน</p>
          </div>
          <button class="bfh-close" @click="showManualTap=false"><PhX :size="18" weight="bold" /></button>
        </div>
        <div style="height:1px;background:var(--color-border-tertiary)" />
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
          <div class="bfh-field">
            <label class="bfh-label">UID นักเรียน / สมาชิก <span style="color:var(--color-danger)">*</span></label>
            <input v-model="mtForm.uid" class="bfh-input" placeholder="กรอก UID เช่น STD-0001" style="font-family:monospace" />
          </div>
          <div class="bfh-field">
            <label class="bfh-label">รอบ Buffet <span style="color:var(--color-danger)">*</span></label>
            <select v-model="mtForm.buffetRoundId" class="bfh-input" style="height:42px">
              <option value="">-- เลือกรอบ --</option>
              <option v-for="r in rounds" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div class="bfh-field">
            <label class="bfh-label">วันที่ <span style="color:var(--color-danger)">*</span></label>
            <input v-model="mtForm.entryDate" type="date" class="bfh-input" />
          </div>
          <div class="bfh-field">
            <label class="bfh-label">รหัสซุปเปอร์ไวเซอร์ <span style="color:var(--color-danger)">*</span></label>
            <input v-model="mtForm.supervisorCode" class="bfh-input" placeholder="กรอกรหัสเพื่อยืนยัน" style="font-family:monospace" autocomplete="off" />
          </div>
          <div class="bfh-field">
            <label class="bfh-label">หมายเหตุ</label>
            <input v-model="mtForm.note" class="bfh-input" placeholder="ระบุเหตุผล เช่น บัตรอ่านไม่ผ่าน" />
          </div>
        </div>
        <div style="height:1px;background:var(--color-border-tertiary)" />
        <div v-if="mtError" style="padding:10px 24px 0">
          <p style="font-size:12px;color:var(--color-danger)">{{ mtError }}</p>
        </div>
        <div style="display:flex;gap:10px;padding:16px 24px;justify-content:flex-end">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="mtSaving" @click="showManualTap=false">ยกเลิก</button>
          <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!canManualTap || mtSaving" @click="doManualTap">
            {{ mtSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhMagnifyingGlass, PhWarning, PhX, PhPlus, PhUser } from '@phosphor-icons/vue'
import type { BuffetHistorySession, BuffetHistoryResult, BuffetRound } from '@/api/types'
import { getBuffetHistory, voidBuffetSession, listBuffetRounds, manualTapBuffet } from '@/api/buffet'
import api from '../../../api/axios'

const today = new Date().toISOString().split('T')[0]

// ── Cancel reasons (shared shortcut list from "เหตุผลการยกเลิก") ───────────────

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

const result    = ref<BuffetHistoryResult | null>(null)
const rounds    = ref<BuffetRound[]>([])
const loading   = ref(false)
const error     = ref<string | null>(null)

const search       = ref('')
const filterUser   = ref('')
const filterRound  = ref('')
const filterStatus = ref('')
const filterDate   = ref(today)
const pageSize     = ref(10)
const currentPage  = ref(1)

function goToday() { filterDate.value = today; fetchHistory() }

const filtered = computed(() => {
  const sessions = result.value?.sessions ?? []
  const q  = search.value.toLowerCase()
  const fu = filterUser.value.toLowerCase()
  return sessions.filter(s => {
    const matchQ  = !q  || s.studentName.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q)
    const matchU  = !fu || s.studentName.toLowerCase().includes(fu) || s.uid.toLowerCase().includes(fu)
    const matchR  = !filterRound.value  || s.roundId === filterRound.value
    const matchSt = !filterStatus.value || s.status  === filterStatus.value
    return matchQ && matchU && matchR && matchSt
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

async function fetchHistory() {
  loading.value = true
  error.value   = null
  try {
    result.value = await getBuffetHistory({
      date:  filterDate.value || undefined,
      limit: 500,
    })
  } catch {
    error.value = 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  rounds.value = await listBuffetRounds()
  fetchCancelReasons()
  await fetchHistory()
})

function fmtTime(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// ── Void ──────────────────────────────────────────────────────────────────────

const voidTarget         = ref<BuffetHistorySession | null>(null)
const voidReason         = ref('')
const voidSupervisorCode = ref('')
const voidError          = ref('')
const voiding            = ref(false)

const canVoid = computed(() => !!voidReason.value.trim() && !!voidSupervisorCode.value.trim())

function openVoid(s: BuffetHistorySession) {
  voidTarget.value         = s
  voidReason.value         = ''
  voidSupervisorCode.value = ''
  voidError.value          = ''
}

async function doVoid() {
  if (!voidTarget.value || !canVoid.value) return
  voiding.value   = true
  voidError.value = ''
  try {
    await voidBuffetSession(voidTarget.value.id, voidReason.value.trim(), voidSupervisorCode.value.trim())
    voidTarget.value = null
    await fetchHistory()
  } catch (e: any) {
    voidError.value = e?.response?.data?.error?.message ?? 'ยกเลิกไม่สำเร็จ'
  } finally {
    voiding.value = false
  }
}

// ── Manual tap ────────────────────────────────────────────────────────────────

const showManualTap = ref(false)
const mtForm = ref({ uid: '', buffetRoundId: '', entryDate: today, supervisorCode: '', note: '' })
const mtError  = ref('')
const mtSaving = ref(false)

const canManualTap = computed(() =>
  !!mtForm.value.uid.trim() &&
  !!mtForm.value.buffetRoundId &&
  !!mtForm.value.entryDate &&
  !!mtForm.value.supervisorCode.trim()
)

function openManualTap() {
  mtForm.value  = { uid: '', buffetRoundId: '', entryDate: today, supervisorCode: '', note: '' }
  mtError.value = ''
  showManualTap.value = true
}

async function doManualTap() {
  if (!canManualTap.value) return
  mtSaving.value = true
  mtError.value  = ''
  try {
    await manualTapBuffet({
      uid:            mtForm.value.uid.trim(),
      buffetRoundId:  mtForm.value.buffetRoundId,
      entryDate:      mtForm.value.entryDate,
      supervisorCode: mtForm.value.supervisorCode.trim(),
      note:           mtForm.value.note.trim() || undefined,
    })
    showManualTap.value = false
    await fetchHistory()
  } catch (e: any) {
    mtError.value = e?.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    mtSaving.value = false
  }
}
</script>

<style scoped>
.bfh-btn-today { height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--color-border-tertiary);background:#fff;font-size:13px;font-weight:500;color:var(--color-text-secondary);cursor:pointer;transition:background 0.15s;font-family:inherit; }
.bfh-btn-today:hover { background:#F2F2F7; }
.bfh-error-banner { display:flex;align-items:center;gap:8px;background:#fff1f0;border:1px solid #ffa39e;border-radius:8px;padding:10px 14px;font-size:13px;color:#cf1322; }
.bfh-error-dismiss { margin-left:auto;border:none;background:none;cursor:pointer;color:#cf1322;font-size:14px;padding:0 4px; }

.bfh-summary-row { display:grid;grid-template-columns:repeat(2,1fr);gap:12px; }
.bfh-summary-card { background:#fff;border-radius:12px;border:1px solid #EBEBEB;padding:16px 20px; }
.bfh-summary-card-green { border-color:#B7E7D3;background:#F0FBF7; }
.bfh-summary-label { font-size:12px;color:var(--color-text-secondary);margin-bottom:6px; }
.bfh-summary-value { font-size:24px;font-weight:700;color:var(--color-text-primary); }
.bfh-summary-sub   { font-size:12px;color:var(--color-text-tertiary);margin-top:2px; }

.bfh-status-badge { display:inline-flex;align-items:center;font-size:12px;font-weight:500;padding:3px 10px;border-radius:100px; }
.bfh-status-active { background:var(--color-success-bg,#E0FAF3);color:#028A60; }
.bfh-status-voided { background:var(--color-danger-bg,#FFEBEB);color:#CC3333; }

.bfh-btn-void { height:30px;padding:0 12px;border-radius:var(--radius-md);border:1px solid #FFCDD2;background:#FFF2F2;color:var(--color-danger);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;transition:all 0.15s;white-space:nowrap; }
.bfh-btn-void:hover { background:var(--color-danger);color:#fff; }

.bfh-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.bfh-modal { position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);background:#fff;border-radius:14px;width:calc(100vw - 48px);max-width:460px;box-shadow:0 16px 48px rgba(0,0,0,0.16);overflow:hidden; }
.bfh-modal-header { display:flex;justify-content:space-between;align-items:flex-start;padding:20px 24px 16px; }
.bfh-modal-title { font-size:17px;font-weight:500;color:var(--color-text-primary); }
.bfh-close { background:none;border:none;cursor:pointer;color:var(--color-text-tertiary);padding:4px;border-radius:6px;display:flex;align-items:center; }
.bfh-close:hover { background:#F2F2F7; }
.bfh-info-box { background:var(--color-bg-secondary);border-radius:8px;padding:12px 14px; }
.bfh-field { display:flex;flex-direction:column;gap:5px; }
.bfh-label { font-size:12px;color:var(--color-text-secondary); }
.bfh-input { height:42px;padding:0 12px;border-radius:8px;border:1.5px solid #D0D0D0;font-size:14px;color:var(--color-text-primary);outline:none;font-family:inherit;background:#fff;width:100%;box-sizing:border-box;transition:border-color 0.15s; }
.bfh-input:focus { border-color:var(--color-primary); }
.bfh-textarea { height:80px;padding:10px 12px;resize:vertical;line-height:1.5; }

.bfh-reason-chips { display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px; }
.bfh-reason-chip {
  padding:8px 14px;border-radius:100px;
  border:1px solid var(--color-border-tertiary);background:#fff;
  color:var(--color-text-secondary);font-size:13px;font-family:inherit;cursor:pointer;
  transition:background 0.15s, border-color 0.15s, color 0.15s;
}
.bfh-reason-chip:hover { background:var(--color-bg-secondary); }
.bfh-reason-chip-active { border-color:var(--color-danger);background:var(--color-danger-bg);color:var(--color-danger); }
.adm-hdr-btn-danger-btn { background:var(--color-danger);color:#fff; }
.adm-hdr-btn-danger-btn:hover:not(:disabled) { opacity:0.9; }
.adm-hdr-btn-danger-btn:disabled { opacity:0.4;cursor:not-allowed; }
.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
