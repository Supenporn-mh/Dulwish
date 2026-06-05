<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการสมาชิก</h2>
      <div class="flex gap-2 flex-wrap">
        <button class="adm-hdr-btn adm-hdr-btn-soft" :disabled="exportingCodes" @click="downloadCodes">
          <PhDownloadSimple :size="14" />
          {{ exportingCodes ? 'กำลังสร้าง...' : 'ดาวน์โหลด Enrollment Code' }}
        </button>
        <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showImportModal = true">
          <PhUploadSimple :size="14" /> นำเข้าไฟล์ Excel
        </button>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAddModal">
          <PhPlus :size="14" /> เพิ่มสมาชิก
        </button>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stat-row">
      <div class="stat-card stat-card-primary">
        <PhUsers :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">สมาชิกทั้งหมด</span>
          <span class="stat-value">{{ members.length }}</span>
        </div>
      </div>
      <div class="stat-card stat-card-success">
        <PhSmiley :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ติดตาม</span>
          <span class="stat-value">{{ activeCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-card-danger">
        <PhSmileySad :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ยังไม่ติดตาม</span>
          <span class="stat-value">{{ inactiveCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-card-ghost">
        <PhShieldCheck :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">มีบัตร RFID</span>
          <span class="stat-value">{{ withCardCount }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหาชื่อ / รหัสสมาชิก..." style="min-width:220px" />
        <select v-model="filterRole" class="adm-filter-select">
          <option value="">บทบาททั้งหมด</option>
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="cashier">Cashier</option>
        </select>
        <select v-model="filterStatus" class="adm-filter-select">
          <option value="">สถานะทั้งหมด</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
        <button class="adm-search-btn" @click="currentPage = 1">ค้นหา</button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:52px">ลำดับ</th>
            <th>รหัสสมาชิก</th>
            <th>ชื่อ-นามสกุล</th>
            <th>บัตร RFID</th>
            <th class="right">ยอดเงิน (฿)</th>
            <th class="center">สิทธิ์</th>
            <th class="center">สถานะ</th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="center" style="padding:32px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="8" class="center" style="padding:32px;color:var(--color-text-tertiary)">ไม่พบสมาชิก</td>
          </tr>
          <tr v-for="(m, i) in paginated" :key="m.uid">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ m.uid }}</span></td>
            <td>
              <div style="font-weight:500;color:var(--color-primary)">{{ m.firstName }} {{ m.lastName }}</div>
              <div v-if="m.email" style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px">{{ m.email }}</div>
            </td>
            <td>
              <div v-if="m.cardUid" class="flex items-center gap-1.5">
                <span class="adm-code" style="font-size:11px">{{ m.cardUid }}</span>
                <span :class="['adm-badge', m.cardStatus === 'active' ? 'adm-badge-success' : m.cardStatus === 'lost' ? 'adm-badge-void' : 'adm-badge-voided']"
                  style="font-size:10px;padding:2px 7px">
                  {{ m.cardStatus === 'active' ? 'ใช้งาน' : m.cardStatus === 'lost' ? 'หาย' : 'ปิด' }}
                </span>
              </div>
              <span v-else style="color:var(--color-text-tertiary);font-size:12px">ยังไม่มีบัตร</span>
            </td>
            <td class="right">
              <span :style="{ fontWeight:'500', color: m.balance < 200 ? 'var(--color-danger)' : 'var(--color-success)' }">
                ฿{{ m.balance.toLocaleString('th-TH', {minimumFractionDigits:2}) }}
              </span>
              <div v-if="m.balance < 200" style="font-size:10px;color:var(--color-warning);margin-top:1px">⚠ ต่ำกว่า ฿200</div>
            </td>
            <td class="center">
              <div class="flex flex-col items-center gap-1">
                <span
                  v-for="w in enabledWallets"
                  :key="w.id"
                  class="adm-badge adm-badge-topup"
                  style="font-size:10px;padding:2px 8px;white-space:nowrap"
                >{{ w.name }}</span>
                <span v-if="enabledWallets.length === 0" style="font-size:11px;color:var(--color-text-tertiary)">—</span>
              </div>
            </td>
            <td class="center">
              <span class="adm-status">
                <span :class="['adm-dot', m.status === 'active' ? 'adm-dot-success' : 'adm-dot-gray']" />
                <span :style="{color: m.status==='active' ? '#028A60' : '#8E8E93'}">
                  {{ m.status === 'active' ? 'เปิดใช้' : 'ปิดใช้' }}
                </span>
              </span>
            </td>
            <td>
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(m)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn" title="Enrollment Code" @click="openCodeModal(m)">
                  <PhKey :size="14" />
                </button>
                <button
                  :class="['adm-action-btn', m.status === 'active' ? 'danger' : 'success']"
                  :title="m.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
                  @click="toggleStatus(m)"
                >
                  <PhProhibit v-if="m.status === 'active'" :size="14" />
                  <PhCheckCircle v-else :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} คน</span>
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

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showEditModal" class="modal-backdrop" @click="showEditModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showEditModal && editTarget" class="imp-modal" style="max-width:460px">
          <div class="imp-header">
            <h3 class="imp-title">{{ editTarget.uid ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิก' }}</h3>
            <button class="imp-close" @click="showEditModal=false"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="imp-divider" />
          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
            <div class="edit-field-row">
              <div class="edit-field">
                <label class="promo-label">ชื่อ</label>
                <input v-model="editTarget.firstName" class="edit-input" />
              </div>
              <div class="edit-field">
                <label class="promo-label">นามสกุล</label>
                <input v-model="editTarget.lastName" class="edit-input" />
              </div>
            </div>
            <div class="edit-field">
              <label class="promo-label">อีเมล</label>
              <input v-model="editTarget.email" class="edit-input" placeholder="email@example.com" />
            </div>
            <div class="edit-field-row" style="align-items:flex-end">
              <div class="edit-field" style="flex:2">
                <label class="promo-label">รหัสบัตร RFID <span style="color:var(--color-text-tertiary);font-weight:400">(ถ้ามี)</span></label>
                <input v-model="editTarget.cardUid" class="edit-input" style="font-family:monospace" />
              </div>
              <div class="edit-field">
                <label class="promo-label">สถานะบัตร</label>
                <select v-model="editTarget.cardStatus" class="promo-select" :disabled="!editTarget.cardUid">
                  <option value="active">ใช้งาน</option>
                  <option value="inactive">ปิด</option>
                  <option value="lost">หาย</option>
                </select>
              </div>
            </div>
          </div>
          <div class="imp-footer">
            <button class="imp-btn-cancel" @click="showEditModal=false">ยกเลิก</button>
            <button class="imp-btn-confirm imp-btn-confirm-active" @click="saveEdit">บันทึก</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Enrollment Code Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showCodeModal" class="modal-backdrop" @click="showCodeModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showCodeModal" class="code-modal">
          <div class="code-header">
            <h3 class="code-title">Enrollment Code</h3>
            <button class="promo-close" @click="showCodeModal=false"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="promo-divider" />
          <div class="code-body">
            <div v-if="codeData" class="code-student-name">
              {{ codeData.firstName }} {{ codeData.lastName }}
            </div>
            <div class="code-box-wrap">
              <div v-if="codeData?.code" class="code-box">
                <span class="code-text">{{ codeData.code }}</span>
                <button class="code-copy-btn" @click="copyCode">
                  <PhCheckCircle v-if="copied" :size="16" weight="fill" style="color:#059669" />
                  <PhCopy v-else :size="16" />
                </button>
              </div>
              <div v-else class="code-box code-box-empty">
                <span style="color:var(--color-text-tertiary);font-size:13px">ยังไม่มี Code</span>
              </div>
            </div>
            <div v-if="codeData?.code" class="code-expiry-row">
              <span :class="['code-status', codeData.used ? 'code-status-used' : codeData.expired ? 'code-status-expired' : 'code-status-active']">
                {{ codeData.used ? 'ใช้งานแล้ว' : codeData.expired ? 'หมดอายุ' : 'ใช้งานได้' }}
              </span>
              <span class="code-expiry-text">หมดอายุ {{ formatExpiry(codeData.expiresAt) }}</span>
            </div>
          </div>
          <div class="promo-divider" />
          <div class="code-footer">
            <button class="code-generate-btn" :disabled="generatingCode" @click="generateCode">
              <PhArrowClockwise :size="15" :class="{ 'spin': generatingCode }" />
              {{ generatingCode ? 'กำลังสร้าง...' : 'สร้าง Code ใหม่' }}
            </button>
            <p class="code-footer-note">Code มีอายุ 14 วัน</p>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>

  <!-- Import Modal -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="showImportModal" class="modal-backdrop" @click="closeImport" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="showImportModal" class="imp-modal-mem">
        <div class="imp-header">
          <h3 class="imp-title">นำเข้าข้อมูล</h3>
          <button class="imp-close" @click="closeImport"><PhX :size="18" weight="bold" /></button>
        </div>
        <div class="imp-divider" />
        <div class="imp-step">
          <div class="imp-step-num">1</div>
          <div class="flex-1">
            <p class="imp-step-title">แก้ไขข้อมูลจากไฟล์ต้นฉบับ</p>
            <p class="imp-step-sub">เพื่อให้แน่ใจว่าข้อมูลของคุณถูกจัดรูปแบบอย่างถูกต้อง</p>
            <button class="imp-dl-btn" @click="downloadTemplate">
              <PhDownloadSimple :size="14" weight="bold" /> ดาวน์โหลดไฟล์ต้นฉบับ
            </button>
          </div>
        </div>
        <div class="imp-divider" />
        <div class="imp-step" style="align-items:flex-start">
          <div class="imp-step-num">2</div>
          <div class="flex-1">
            <p class="imp-step-title">อัปโหลดไฟล์</p>
            <p class="imp-step-sub">รองรับสูงสุด 1,000 รายการต่อไฟล์</p>
            <div class="imp-dropzone" :class="{'imp-dropzone-over':isDragOver,'imp-dropzone-has':!!importFileMem}"
              @dragover="(e)=>{e.preventDefault();isDragOver=true}" @dragleave="isDragOver=false"
              @drop.prevent="(e)=>{isDragOver=false;const f=e.dataTransfer?.files?.[0];if(f&&/\.xlsx$/i.test(f.name))importFileMem=f}"
              @click="memFileInput?.click()">
              <div v-if="!importFileMem" style="display:flex;flex-direction:column;align-items:center;gap:8px">
                <div class="imp-upload-icon"><PhCloudArrowUp :size="26" weight="fill" color="white" /></div>
                <p style="font-size:14px;color:#3C3C43;text-align:center">ลากและวางไฟล์ตรงนี้ หรือ <span style="color:var(--color-primary);font-weight:500">เลือกไฟล์</span></p>
              </div>
              <div v-else style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <PhFileXls :size="36" weight="fill" style="color:var(--color-primary)" />
                <p style="font-size:14px;font-weight:500;color:var(--color-primary)">{{ importFileMem.name }}</p>
              </div>
            </div>
            <input ref="memFileInput" type="file" accept=".xlsx" style="display:none" @change="(e)=>{const f=(e.target as HTMLInputElement).files?.[0];if(f)importFileMem=f;(e.target as HTMLInputElement).value=''}" />
          </div>
        </div>
        <div class="imp-instructions">
          <p style="font-size:13px;font-weight:500;color:var(--color-primary);margin-bottom:8px">คำแนะนำ:</p>
          <ul style="padding-left:16px;display:flex;flex-direction:column;gap:5px">
            <li style="font-size:13px;color:#3C3C43">การอัปโหลดไฟล์ Excel ใช้เพิ่ม/อัปเดต รายการเท่านั้น ไม่สามารถลบได้</li>
            <li style="font-size:13px;color:#3C3C43">รองรับเฉพาะไฟล์ที่มีนามสกุล .xlsx เท่านั้น</li>
            <li style="font-size:13px;color:#3C3C43">รหัสสิทธิ์: W001,W002,W003,W004,W005 คั่นด้วย ,</li>
          </ul>
        </div>
        <div class="imp-footer">
          <button class="imp-btn-cancel" @click="closeImport">ยกเลิก</button>
          <button :class="['imp-btn-confirm',importFileMem?'imp-btn-confirm-active':'']" :disabled="!importFileMem" @click="closeImport">ยืนยัน</button>
        </div>
      </div>
    </Transition>
  </Teleport>

</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PhPlus, PhDownloadSimple, PhUploadSimple, PhPencilSimple,
  PhKey, PhProhibit, PhCheckCircle, PhX, PhCopy, PhArrowClockwise,
  PhUsers, PhSmiley, PhSmileySad, PhShieldCheck,
  PhCloudArrowUp, PhFileXls,
} from '@phosphor-icons/vue'
import { useWalletsStore } from '@/stores/wallets'
import api from '@/api/axios'
import * as XLSX from 'xlsx'

interface Member {
  uid:         string
  firstName:   string
  lastName:    string
  email?:      string
  cardUid?:    string
  cardStatus?: 'active' | 'inactive' | 'lost'
  balance:     number
  role:        string
  status:      'active' | 'inactive'
}

const walletsStore   = useWalletsStore()
const enabledWallets = computed(() => walletsStore.wallets.filter(w => w.enabled))

const loading     = ref(false)
const members     = ref<Member[]>([
  { uid:'EMP-001', firstName:'สมชาย',  lastName:'ใจดี',      email:'admin@dulwich.ac.th',   cardUid:'04A1B2C3', cardStatus:'active',   balance:850, role:'admin',      status:'active'   },
  { uid:'EMP-002', firstName:'วิภา',   lastName:'รักเรียน',  email:'patcha@school.local',   cardUid:'04D4E5F6', cardStatus:'active',   balance:320, role:'supervisor', status:'active'   },
  { uid:'EMP-003', firstName:'หนอง',   lastName:'แคชเชียร์', email:'nong@school.local',     cardUid:'04G7H8I9', cardStatus:'active',   balance:150, role:'cashier',    status:'active'   },
])
const search      = ref('')
const filterRole  = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize    = ref(10)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return members.value.filter(m => {
    const matchQ = !q || m.uid.toLowerCase().includes(q) || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
    const matchR = !filterRole.value   || m.role   === filterRole.value
    const matchS = !filterStatus.value || m.status === filterStatus.value
    return matchQ && matchR && matchS
  })
})
const totalPages    = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated     = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))
const activeCount   = computed(() => members.value.filter(m => m.status === 'active').length)
const inactiveCount = computed(() => members.value.filter(m => m.status !== 'active').length)
const withCardCount = computed(() => members.value.filter(m => !!m.cardUid).length)

// Edit
const showEditModal = ref(false)
const editTarget    = ref<any>(null)
function openAddModal() { editTarget.value = { uid:'', firstName:'', lastName:'', email:'', cardUid:'', cardStatus:'active', balance:0, role:'cashier', status:'active' }; showEditModal.value = true }
function openEdit(m: Member) { editTarget.value = { ...m }; showEditModal.value = true }
function saveEdit() {
  if (!editTarget.value) return
  if (!editTarget.value.uid) {
    editTarget.value.uid = `EMP-${String(members.value.length + 1).padStart(3,'0')}`
    members.value.unshift({ ...editTarget.value })
  } else {
    const idx = members.value.findIndex(m => m.uid === editTarget.value.uid)
    if (idx >= 0) members.value[idx] = { ...editTarget.value }
  }
  showEditModal.value = false
}
function toggleStatus(m: Member) {
  const idx = members.value.findIndex(x => x.uid === m.uid)
  if (idx >= 0) members.value[idx] = { ...members.value[idx], status: members.value[idx].status === 'active' ? 'inactive' : 'active' }
}

// Enrollment Code
const showCodeModal   = ref(false)
const codeData        = ref<any>(null)
const generatingCode  = ref(false)
const copied          = ref(false)
let copiedTimer: any  = null

async function openCodeModal(m: Member) {
  showCodeModal.value = true
  codeData.value = null
  try {
    const res = await api.get(`/admin/students/${m.uid}/code`)
    codeData.value = { ...res.data, firstName: m.firstName, lastName: m.lastName }
  } catch {
    codeData.value = { uid: m.uid, firstName: m.firstName, lastName: m.lastName, code: null, expiresAt: null, used: false, expired: false }
  }
}
async function generateCode() {
  if (!codeData.value || generatingCode.value) return
  generatingCode.value = true
  try {
    const res = await api.post(`/admin/students/${codeData.value.uid}/code/generate`)
    codeData.value = { ...res.data, firstName: codeData.value.firstName, lastName: codeData.value.lastName }
  } catch {
    const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8,'0')
    const exp = new Date(); exp.setDate(exp.getDate()+14); exp.setHours(23,59,59,0)
    codeData.value = { ...codeData.value, code:`${hex().slice(0,8)}-${hex().slice(0,4)}`, expiresAt:exp.toISOString(), used:false, expired:false }
  } finally { generatingCode.value = false }
}
function copyCode() {
  if (!codeData.value?.code) return
  navigator.clipboard.writeText(codeData.value.code).then(() => {
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 2000)
  })
}
function formatExpiry(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('th-TH', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' น.'
}

// Export
const exportingCodes = ref(false)
async function downloadCodes() {
  exportingCodes.value = true
  try {
    const wb = XLSX.utils.book_new()
    // Template sheet
    const headers  = ['รหัสสมาชิก*','ชื่อ*','นามสกุล*','อีเมล','รหัสบัตร RFID','รหัสสิทธิ์']
    const noteRow  = ['หมายเหตุ:', 'ชื่อจริง', 'นามสกุล', 'email', 'UID บัตร (ถ้ามี)', 'รหัส Wallet คั่นด้วย , เช่น W001,W003']
    const examples = [
      ['EMP-001','สมชาย','ใจดี','admin@dulwich.ac.th','04A1B2C3','W001,W002'],
      ['EMP-002','วิภา','รักเรียน','patcha@school.local','04D4E5F6','W001'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, noteRow, ...examples])
    ws['!cols'] = [{wch:14},{wch:12},{wch:14},{wch:28},{wch:18},{wch:22}]
    XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อสมาชิก')

    // Instructions
    const instr = XLSX.utils.aoa_to_sheet([
      ['คำแนะนำ'],[''],
      ['รหัสสิทธิ์ที่ใช้ได้:'],
      ['W001 = กระเป๋าหลัก (เติมเงิน)'],
      ['W002 = ชำระค่าอาหาร'],
      ['W003 = Pre-order'],
      ['W004 = Buffet (Primary ฿170)'],
      ['W005 = Buffet (Secondary ฿150)'],
      [''],['หากมีหลายสิทธิ์ให้คั่นด้วย , เช่น W001,W003'],
    ])
    instr['!cols'] = [{wch:50}]
    XLSX.utils.book_append_sheet(wb, instr, 'คำแนะนำ')
    XLSX.writeFile(wb, 'Members_Import_Template.xlsx')
  } finally { exportingCodes.value = false }
}

const showImportModal = ref(false)
const importFileMem   = ref<File | null>(null)
const isDragOver      = ref(false)
const memFileInput    = ref<HTMLInputElement | null>(null)

function closeImport()  { showImportModal.value=false; importFileMem.value=null }
function downloadTemplate() {
  const headers  = ['รหัสสมาชิก*','ชื่อ*','นามสกุล*','อีเมล','รหัสบัตร RFID','รหัสสิทธิ์']
  const noteRow  = ['หมายเหตุ:','ชื่อจริง','นามสกุล','email','UID บัตร (ถ้ามี)','W001,W002 คั่นด้วย ,']
  const examples = [
    ['EMP-001','สมชาย','ใจดี','admin@dulwich.ac.th','04A1B2C3','W001,W002'],
    ['EMP-002','วิภา','รักเรียน','patcha@school.local','04D4E5F6','W001'],
    ['EMP-003','หนอง','แคชเชียร์','nong@school.local','04G7H8I9','W001'],
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, noteRow, ...examples])
  ws['!cols'] = [{wch:14},{wch:12},{wch:14},{wch:28},{wch:18},{wch:22}]
  XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อสมาชิก')
  const instr = XLSX.utils.aoa_to_sheet([
    ['คำแนะนำ'],[''],
    ['รหัสสิทธิ์ที่ใช้ได้:'],
    ['W001 = กระเป๋าหลัก (เติมเงิน)'],['W002 = ชำระค่าอาหาร'],
    ['W003 = Pre-order'],['W004 = Buffet (Primary ฿170)'],['W005 = Buffet (Secondary ฿150)'],
    [''],['หากมีหลายสิทธิ์ให้คั่นด้วย , เช่น W001,W003'],
  ])
  instr['!cols'] = [{wch:50}]
  XLSX.utils.book_append_sheet(wb, instr, 'คำแนะนำ')
  XLSX.writeFile(wb, 'Members_Import_Template.xlsx')
}
</script>

<style scoped>
/* Import modal */
.modal-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.imp-modal-mem { position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%); background:#fff; border-radius:16px; width:calc(100vw - 48px); max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,0.18); }
.imp-header  { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title   { font-size:18px; font-weight:500; color:#1C1C1E; }
.imp-close   { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }
.imp-step    { display:flex; align-items:flex-start; gap:14px; padding:20px 24px; }
.imp-step-num { width:32px; height:32px; border-radius:8px; background:var(--color-primary-tint); color:var(--color-primary); font-size:15px; font-weight:500; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.imp-step-title { font-size:15px; font-weight:500; color:#1C1C1E; margin-bottom:4px; }
.imp-step-sub   { font-size:13px; color:#8E8E93; line-height:1.5; margin-bottom:10px; }
.imp-dl-btn { display:inline-flex; align-items:center; gap:5px; font-size:14px; font-weight:500; color:var(--color-primary); background:none; border:none; cursor:pointer; padding:0; font-family:inherit; }
.imp-dropzone { border:2px dashed #D0D0D0; border-radius:12px; background:#FAFAFA; padding:32px 24px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.15s, background 0.15s; min-height:130px; }
.imp-dropzone:hover, .imp-dropzone-over { border-color:var(--color-primary); background:var(--color-primary-tint); }
.imp-dropzone-has { border-color:var(--color-success); background:var(--color-success-bg); }
.imp-upload-icon { width:52px; height:52px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
.imp-instructions { margin:0 24px 20px; background:var(--color-primary-tint); border-radius:10px; padding:14px 16px; }
.imp-footer { display:flex; gap:12px; padding:16px 24px 20px; border-top:1px solid #F0F0F0; }
.imp-btn-cancel { flex:1; height:48px; border-radius:12px; border:2px solid var(--color-primary); color:var(--color-primary); background:transparent; font-size:15px; font-weight:500; cursor:pointer; font-family:inherit; }
.imp-btn-cancel:hover { background:var(--color-primary-tint); }
.imp-btn-confirm { flex:1; height:48px; border-radius:12px; border:none; background:#E5E5EA; color:#AEAEB2; font-size:15px; font-weight:500; cursor:not-allowed; font-family:inherit; }
.imp-btn-confirm-active { background:var(--color-primary); color:#fff; cursor:pointer; }
.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from, .modal-up-leave-to { opacity:0; transform:translate(-50%,-48%); }

/* Stat cards */
.stat-row { display:flex; gap:12px; flex-wrap:wrap; }
.stat-card {
  flex:1; min-width:150px; display:flex; align-items:center; gap:14px;
  padding:16px 18px; border-radius:12px; border:1px solid transparent; background:#fff;
}
.stat-card-primary { border-color:var(--color-primary); color:var(--color-primary); }
.stat-card-success { border-color:var(--color-border-tertiary); color:#028A60; }
.stat-card-danger  { border-color:var(--color-border-tertiary); color:#CC3333; }
.stat-card-ghost   { border-color:var(--color-border-tertiary); color:var(--color-text-secondary); }
.stat-icon { flex-shrink:0; opacity:0.85; }
.stat-body { display:flex; flex-direction:column; gap:2px; }
.stat-label { font-size:12px; opacity:0.75; }
.stat-value { font-size:22px; font-weight:500; line-height:1.1; }

/* Edit fields */
.edit-field-row { display:flex; gap:12px; }
.edit-field { flex:1; display:flex; flex-direction:column; gap:5px; }
.edit-input {
  height:38px; padding:0 12px; border-radius:8px;
  border:1px solid var(--color-border-tertiary); font-size:14px;
  color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff;
}
.edit-input:focus { border-color:var(--color-primary); }

/* Modal shared styles */
.modal-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from, .modal-up-leave-to { opacity:0; transform:translate(-50%,-48%); }

/* Enrollment code modal */
.code-modal {
  position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%);
  background:#fff; border-radius:16px; width:calc(100vw - 48px); max-width:400px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16); overflow:hidden;
}
.code-header { display:flex; justify-content:space-between; align-items:center; padding:18px 20px 14px; }
.code-title { font-size:16px; font-weight:500; color:var(--color-text-primary); }
.code-body { padding:18px 20px 14px; display:flex; flex-direction:column; gap:14px; }
.code-student-name { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.code-box-wrap { margin:2px 0; }
.code-box { display:flex; align-items:center; justify-content:space-between; background:#F2F2F7; border-radius:10px; padding:12px 14px; border:1px solid #E8E8E8; }
.code-box-empty { justify-content:center; padding:14px; }
.code-text { font-family:monospace; font-size:18px; font-weight:500; letter-spacing:0.04em; }
.code-copy-btn { background:none; border:none; cursor:pointer; color:#8E8E93; padding:4px; border-radius:6px; display:flex; align-items:center; }
.code-copy-btn:hover { background:#E8E8E8; }
.code-expiry-row { display:flex; align-items:center; gap:8px; font-size:13px; }
.code-status { font-size:11px; font-weight:500; padding:2px 8px; border-radius:100px; }
.code-status-active  { background:#D1FAE5; color:#065F46; }
.code-status-expired { background:#FEE2E2; color:#991B1B; }
.code-status-used    { background:#F3F4F6; color:#6B7280; }
.code-expiry-text { font-size:14px; color:var(--color-text-primary); }
.promo-close { background:none; border:none; cursor:pointer; color:#8E8E93; padding:4px; border-radius:6px; display:flex; align-items:center; }
.promo-close:hover { background:#F2F2F7; }
.promo-divider { height:1px; background:#F0F0F0; }
.code-footer { padding:14px 20px 18px; border-top:1px solid #F0F0F0; display:flex; flex-direction:column; align-items:center; gap:8px; }
.code-generate-btn { width:100%; height:46px; border-radius:12px; background:var(--color-primary); color:#fff; border:none; cursor:pointer; font-size:15px; font-weight:500; display:flex; align-items:center; justify-content:center; gap:7px; font-family:inherit; }
.code-generate-btn:disabled { opacity:0.5; cursor:not-allowed; }
.code-footer-note { font-size:12px; color:#AEAEB2; }
@keyframes spin { to { transform:rotate(360deg); } }
.spin { animation:spin 0.8s linear infinite; }

/* Imp modal reuse */
.imp-modal {
  position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%);
  background:#fff; border-radius:16px; width:calc(100vw - 48px);
  max-height:90vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,0.18);
}
.imp-header { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title  { font-size:18px; font-weight:500; color:var(--color-text-primary); }
.imp-close  { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }
.imp-footer { display:flex; gap:12px; padding:16px 24px 20px; border-top:1px solid #F0F0F0; }
.imp-btn-cancel { flex:1; height:48px; border-radius:12px; border:2px solid var(--color-primary); color:var(--color-primary); background:transparent; font-size:15px; font-weight:500; cursor:pointer; }
.imp-btn-confirm { flex:1; height:48px; border-radius:12px; border:none; background:#E5E5EA; color:#AEAEB2; font-size:15px; font-weight:500; cursor:not-allowed; }
.imp-btn-confirm-active { background:var(--color-primary); color:#fff; cursor:pointer; }

/* promo-label, promo-select */
.promo-label { font-size:12px; color:var(--color-text-secondary); font-weight:400; }
.promo-select { height:38px; padding:0 10px; border-radius:8px; border:1px solid var(--color-border-tertiary); font-size:14px; color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff; }
.promo-select:focus { border-color:var(--color-primary); }
</style>
