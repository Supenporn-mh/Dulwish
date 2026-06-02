<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:#1C1C1E">จัดการนักเรียน</h2>
      <div class="flex gap-2 flex-wrap">
        <!-- Promote class -->
        <button class="adm-hdr-btn adm-hdr-btn-warn" @click="showPromoteModal = true">
          <PhArrowUp :size="14" />
          เลื่อนชั้นเรียน
        </button>
        <!-- Import Excel -->
        <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showImportModal = true">
          <PhUploadSimple :size="14" />
          นำเข้าไฟล์ Excel
        </button>
        <input ref="csvInput" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="handleImport" />
        <!-- Add individual -->
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="showAddModal = true">
          <PhPlus :size="14" />
          เพิ่มนักเรียน
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหาชื่อ / รหัสนักเรียน..." style="min-width:220px" />
        <select v-model="filterGrade" class="adm-filter-select">
          <option value="">ชั้นปีทั้งหมด</option>
          <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
        </select>
        <select v-model="filterClass" class="adm-filter-select">
          <option value="">ห้องทั้งหมด</option>
          <option v-for="c in availableClasses" :key="c" :value="c">{{ c }}</option>
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
            <th>รหัสนักเรียน</th>
            <th>ชื่อ-นามสกุล</th>
            <th class="center">ชั้น / ห้อง</th>
            <th>บัตร RFID</th>
            <th class="right">ยอดเงิน (฿)</th>
            <th class="center">ผู้ปกครอง</th>
            <th class="center">สิทธิ</th>
            <th class="center">สถานะ</th>
            <th class="center" style="width:90px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="10" class="center" style="padding:32px;color:#AEAEB2">ไม่พบนักเรียน</td>
          </tr>
          <tr v-for="(s, i) in paginated" :key="s.uid">
            <!-- ลำดับ -->
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>

            <!-- รหัสนักเรียน -->
            <td><span class="adm-code">{{ s.uid }}</span></td>

            <!-- ชื่อ -->
            <td>
              <div style="font-weight:500;color:var(--color-primary)">{{ s.firstName }} {{ s.lastName }}</div>
              <div v-if="s.guardianEmail" style="font-size:11px;color:#AEAEB2;margin-top:2px">{{ s.guardianEmail }}</div>
            </td>

            <!-- ชั้น/ห้อง -->
            <td class="center">
              <div style="font-weight:500;color:#1C1C1E">{{ s.gradeLevel }}</div>
              <div style="font-size:11px;color:#8E8E93">{{ s.className }}</div>
            </td>

            <!-- บัตร RFID -->
            <td>
              <div v-if="s.cardUid" class="flex items-center gap-1.5">
                <span class="adm-code" style="font-size:11px">{{ s.cardUid }}</span>
                <span :class="['adm-badge', s.cardStatus === 'active' ? 'adm-badge-success' : s.cardStatus === 'lost' ? 'adm-badge-void' : 'adm-badge-voided']"
                  style="font-size:10px;padding:2px 7px">
                  {{ s.cardStatus === 'active' ? 'ใช้งาน' : s.cardStatus === 'lost' ? 'หาย' : 'ปิด' }}
                </span>
              </div>
              <span v-else style="color:#AEAEB2;font-size:12px">ยังไม่มีบัตร</span>
            </td>

            <!-- ยอดเงิน -->
            <td class="right">
              <span :style="{
                fontWeight: '500',
                color: s.balance < s.lowThreshold ? 'var(--color-danger)' : 'var(--color-success)'
              }">
                ฿{{ s.balance.toLocaleString('th-TH', {minimumFractionDigits:2}) }}
              </span>
              <div v-if="s.balance < s.lowThreshold" style="font-size:10px;color:var(--color-warning);margin-top:1px">
                ⚠ ต่ำกว่า ฿{{ s.lowThreshold }}
              </div>
            </td>

            <!-- ผู้ปกครอง -->
            <td class="center">
              <span v-if="s.parentCount > 0" class="adm-badge adm-badge-success" style="font-size:11px;padding:3px 10px">
                มีผู้ปกครอง
              </span>
              <span v-else class="adm-badge adm-badge-voided" style="font-size:11px;padding:3px 10px">
                ยังไม่มี
              </span>
            </td>

            <!-- สิทธิ -->
            <td class="center">
              <div class="flex flex-col items-center gap-1">
                <span :class="['adm-badge', s.canPreorder ? 'adm-badge-buffet' : 'adm-badge-voided']"
                  style="font-size:10px;padding:2px 8px">
                  {{ s.canPreorder ? 'Pre-order ✓' : 'Pre-order ✗' }}
                </span>
                <span :class="['adm-badge', s.buffetGroup === 'primary' ? 'adm-badge-topup' : 'adm-badge-purchase']"
                  style="font-size:10px;padding:2px 8px">
                  {{ s.buffetGroup === 'primary' ? 'Buffet: P' : 'Buffet: S' }}
                </span>
              </div>
            </td>

            <!-- สถานะ -->
            <td class="center">
              <span class="adm-status">
                <span :class="['adm-dot', s.status === 'active' ? 'adm-dot-success' : 'adm-dot-gray']" />
                <span :style="{color: s.status === 'active' ? '#028A60' : '#8E8E93'}">
                  {{ s.status === 'active' ? 'เปิดใช้' : 'ปิดใช้' }}
                </span>
              </span>
            </td>

            <!-- จัดการ -->
            <td>
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn" title="บัตร RFID">
                  <PhCreditCard :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ปิดใช้งาน">
                  <PhProhibit :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <span>ทั้งหมด {{ filtered.length }} คน · สรุป: ใช้งาน {{ activeCount }} / ปิด {{ inactiveCount }}</span>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage===p?'active':'']" @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- ── Import Modal ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showImportModal" class="modal-backdrop" @click="closeImportModal" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showImportModal" class="imp-modal">

          <!-- Title row -->
          <div class="imp-header">
            <h3 class="imp-title">นำเข้าข้อมูล</h3>
            <button class="imp-close" @click="closeImportModal"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="imp-divider" />

          <!-- Step 1 -->
          <div class="imp-step">
            <div class="imp-step-num">1</div>
            <div class="flex-1">
              <p class="imp-step-title">แก้ไขข้อมูลจากไฟล์ต้นฉบับ</p>
              <p class="imp-step-sub">เพื่อให้แน่ใจว่าข้อมูลของคุณถูกจัดรูปแบบอย่างถูกต้อง</p>
              <button class="imp-dl-btn" @click="downloadTemplate">
                <PhDownloadSimple :size="14" weight="bold" />
                ดาวน์โหลดไฟล์ต้นฉบับ
              </button>
            </div>
          </div>
          <div class="imp-divider" />

          <!-- Step 2 -->
          <div class="imp-step" style="align-items:flex-start">
            <div class="imp-step-num">2</div>
            <div class="flex-1">
              <p class="imp-step-title">อัปโหลดไฟล์</p>
              <p class="imp-step-sub">
                ระบุรายการตามคำแนะนำ โดยอัปโหลดครั้งละ 1 ไฟล์<br>
                รองรับสูงสุด 1,000 รายการต่อไฟล์เพื่อการประมวลผลที่มีประสิทธิภาพ
              </p>

              <!-- Drop zone -->
              <div
                class="imp-dropzone"
                :class="{ 'imp-dropzone-over': isDragOver, 'imp-dropzone-has': !!importFile }"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="openFileSelect"
              >
                <div v-if="!importFile" class="flex flex-col items-center gap-3">
                  <div class="imp-upload-icon">
                    <PhCloudArrowUp :size="26" weight="fill" color="white" />
                  </div>
                  <p class="imp-dropzone-text">
                    ลากและวางไฟล์ตรงนี้ หรือ
                    <span class="imp-select-link">เลือกไฟล์</span>
                    จากเครื่องของคุณ
                  </p>
                </div>
                <div v-else class="flex flex-col items-center gap-2">
                  <PhFileXls :size="36" weight="fill" style="color:var(--color-primary)" />
                  <p style="font-size:14px;font-weight:500;color:var(--color-primary)">{{ importFile.name }}</p>
                  <p style="font-size:12px;color:#8E8E93">{{ (importFile.size/1024).toFixed(1) }} KB · คลิกเพื่อเปลี่ยนไฟล์</p>
                </div>
              </div>
              <input ref="csvInput" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="onFileChange" />
            </div>
          </div>

          <!-- Instructions -->
          <div class="imp-instructions">
            <p style="font-size:13px;font-weight:500;color:var(--color-primary);margin-bottom:8px">คำแนะนำ:</p>
            <ul style="padding-left:16px;display:flex;flex-direction:column;gap:5px">
              <li style="font-size:13px;color:#3C3C43">การอัปโหลดไฟล์ Excel ใช้เพิ่ม/อัปเดต รายการเท่านั้น ไม่สามารถลบได้</li>
              <li style="font-size:13px;color:#3C3C43">โปรดตรวจสอบให้แน่ใจว่าไฟล์ Excel ของคุณตรงกับรูปแบบต้นฉบับที่กำหนด</li>
              <li style="font-size:13px;color:#3C3C43">รองรับเฉพาะไฟล์ที่มีนามสกุล .xlsx เท่านั้น</li>
              <li style="font-size:13px;color:#3C3C43">ข้อมูลในไฟล์ที่ถูกต้องเท่านั้นที่จะถูกอัปโหลด ส่วนข้อมูลที่ผิดจะไม่ถูกอัปโหลดเข้าสู่ระบบ</li>
            </ul>
          </div>

          <!-- Footer buttons -->
          <div class="imp-footer">
            <button class="imp-btn-cancel" @click="closeImportModal">ยกเลิก</button>
            <button
              :class="['imp-btn-confirm', importFile ? 'imp-btn-confirm-active' : '']"
              :disabled="!importFile"
              @click="confirmImport"
            >ยืนยัน</button>
          </div>

        </div>
      </Transition>
    </Teleport>

    <!-- ── Import Result Modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showImportResult" class="modal-backdrop" @click="showImportResult=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showImportResult && importResult" class="modal-box" style="max-width:500px">
          <h3 class="modal-title">ผลการนำเข้าข้อมูล</h3>

          <!-- Success count -->
          <div style="display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:8px;background:var(--color-success-bg);margin-bottom:12px">
            <span style="font-size:20px">✅</span>
            <span style="font-size:15px;font-weight:500;color:#028A60">
              นำเข้าสำเร็จ {{ importResult.success }} รายการ
            </span>
          </div>

          <!-- Errors -->
          <div v-if="importResult.errors.length > 0">
            <p style="font-size:13px;font-weight:500;color:var(--color-danger);margin-bottom:8px">
              ⚠ พบข้อผิดพลาด {{ importResult.errors.length }} รายการ:
            </p>
            <div style="max-height:200px;overflow-y:auto;border:1px solid var(--color-danger-bg);border-radius:8px;padding:10px;background:var(--color-danger-bg)">
              <p v-for="(err, i) in importResult.errors" :key="i"
                style="font-size:12px;color:#CC3333;margin-bottom:4px">
                • {{ err }}
              </p>
            </div>
          </div>

          <div class="modal-actions" style="margin-top:16px">
            <button class="adm-hdr-btn adm-hdr-btn-primary" @click="showImportResult=false">ตกลง</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Promote Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showPromoteModal" class="modal-backdrop" @click="showPromoteModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showPromoteModal" class="modal-box">
          <h3 class="modal-title">เลื่อนชั้นเรียน</h3>
          <p class="modal-sub">ระบบจะเลื่อนชั้นนักเรียนทั้งหมด (K1→K2, K2→P1, ... P6→S1, S6→จบการศึกษา) และปรับกลุ่มราคา Buffet อัตโนมัติ</p>
          <div class="modal-warn">
            ⚠️ การเลื่อนชั้นไม่สามารถย้อนกลับได้ — กรุณาตรวจสอบข้อมูลก่อนดำเนินการ
          </div>
          <div class="modal-actions">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showPromoteModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-warn" @click="promoteAll">ยืนยันเลื่อนชั้น</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PhArrowUp, PhUploadSimple, PhDownloadSimple, PhPlus,
  PhPencilSimple, PhCreditCard, PhProhibit,
  PhX, PhCloudArrowUp, PhFileXls,
} from '@phosphor-icons/vue'
import * as XLSX from 'xlsx'
import api from '@/api/axios'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Student {
  uid:           string
  firstName:     string
  lastName:      string
  gradeLevel:    string
  className:     string
  guardianEmail?: string
  cardUid?:      string
  cardStatus?:   'active' | 'inactive' | 'lost'
  balance:       number
  lowThreshold:  number
  parentCount:   number
  canPreorder:   boolean
  buffetGroup:   'primary' | 'secondary'
  status:        'active' | 'inactive' | 'suspended'
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GRADES = ['K1','K2','P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6']
const PRE_ORDER_GRADES = ['K1','K2']  // configurable via policy

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO: Student[] = [
  { uid:'STD-K1-0001', firstName:'สมหญิง', lastName:'ใจดี',   gradeLevel:'K1', className:'K1-A', guardianEmail:'suchart@dulwich.ac.th', cardUid:'04A3B5C6', cardStatus:'active',   balance:850,  lowThreshold:200, parentCount:1, canPreorder:true,  buffetGroup:'primary',   status:'active'   },
  { uid:'STD-P3-0015', firstName:'สมชาย',  lastName:'ใจดี',   gradeLevel:'P3', className:'P3-B', guardianEmail:'suchart@dulwich.ac.th', cardUid:'04B1C2D3', cardStatus:'active',   balance:320,  lowThreshold:200, parentCount:1, canPreorder:false, buffetGroup:'primary',   status:'active'   },
  { uid:'STD-K2-0008', firstName:'มานี',   lastName:'สุขดี',  gradeLevel:'K2', className:'K2-A', guardianEmail:'somying@gmail.com',     cardUid:'04C3D4E5', cardStatus:'active',   balance:150,  lowThreshold:200, parentCount:1, canPreorder:true,  buffetGroup:'primary',   status:'active'   },
  { uid:'STD-P6-0022', firstName:'วิชัย',  lastName:'รักเรียน',gradeLevel:'P6', className:'P6-A', guardianEmail:'vichai.p@example.com',  cardUid:'04D5E6F7', cardStatus:'inactive', balance:500,  lowThreshold:200, parentCount:1, canPreorder:false, buffetGroup:'primary',   status:'active'   },
  { uid:'STD-S1-0003', firstName:'อรุณี',  lastName:'ดีงาม',  gradeLevel:'S1', className:'S1-B', guardianEmail:'arunee.d@example.com',  cardUid:undefined,  cardStatus:undefined, balance:200,  lowThreshold:200, parentCount:1, canPreorder:false, buffetGroup:'secondary', status:'active'   },
  { uid:'STD-K1-0012', firstName:'ปรีชา',  lastName:'มานะ',   gradeLevel:'K1', className:'K1-B', guardianEmail:'preecha@gmail.com',     cardUid:'04E7F8A9', cardStatus:'lost',     balance:0,    lowThreshold:200, parentCount:0, canPreorder:true,  buffetGroup:'primary',   status:'inactive' },
]

// ── State ─────────────────────────────────────────────────────────────────────
const loading          = ref(false)
const students         = ref<Student[]>([])
const search           = ref('')
const filterGrade      = ref('')
const filterClass      = ref('')
const filterStatus     = ref('')
const currentPage      = ref(1)
const pageSize         = ref(10)
const showPromoteModal = ref(false)
const showAddModal     = ref(false)
const csvInput         = ref<HTMLInputElement | null>(null)

// ── Computed ──────────────────────────────────────────────────────────────────
const availableClasses = computed(() => {
  const classes = [...new Set(students.value
    .filter(s => !filterGrade.value || s.gradeLevel === filterGrade.value)
    .map(s => s.className)
  )].sort()
  return classes
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return students.value.filter(s => {
    const matchSearch = !q || s.uid.toLowerCase().includes(q) ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
    const matchGrade  = !filterGrade.value  || s.gradeLevel === filterGrade.value
    const matchClass  = !filterClass.value  || s.className  === filterClass.value
    const matchStatus = !filterStatus.value || s.status     === filterStatus.value
    return matchSearch && matchGrade && matchClass && matchStatus
  })
})

const totalPages   = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated    = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))
const activeCount  = computed(() => filtered.value.filter(s => s.status === 'active').length)
const inactiveCount= computed(() => filtered.value.filter(s => s.status !== 'active').length)

// ── Methods ───────────────────────────────────────────────────────────────────
// ── Column definitions (ตรงกับ template) ─────────────────────────────────────
const TEMPLATE_COLUMNS = [
  { key: 'uid',           header: 'รหัสนักเรียน*',      example: 'STD-K1-0001',          note: 'รูปแบบ STD-{ชั้น}-{ลำดับ} เช่น STD-K1-0001' },
  { key: 'firstName',     header: 'ชื่อ*',               example: 'สมหญิง',                note: 'ชื่อจริงภาษาไทย' },
  { key: 'lastName',      header: 'นามสกุล*',            example: 'ใจดี',                  note: 'นามสกุลภาษาไทย' },
  { key: 'gradeLevel',    header: 'ชั้นปี*',             example: 'K1',                    note: 'K1, K2, P1-P6, S1-S6' },
  { key: 'className',     header: 'ห้องเรียน*',          example: 'K1-A',                  note: 'เช่น K1-A, P3-B, S1-C' },
  { key: 'dob',           header: 'วันเกิด',             example: '01/01/2563',            note: 'DD/MM/YYYY (ปี พ.ศ.)' },
  { key: 'guardianEmail', header: 'อีเมลผู้ปกครอง',     example: 'parent@example.com',    note: 'ใช้ส่งรหัส Verification' },
  { key: 'cardUid',       header: 'รหัสบัตร RFID',       example: '04A3B5C6D7E8',          note: 'UID จากบัตร RFID/NFC (ถ้ามี)' },
]

const EXAMPLE_ROWS = [
  ['STD-K1-0001', 'สมหญิง',  'ใจดี',     'K1', 'K1-A', '15/03/2562', 'suchart@dulwich.ac.th', '04A3B5C6'],
  ['STD-K1-0002', 'สมชาย',   'ใจดี',     'K1', 'K1-A', '22/07/2562', 'suchart@dulwich.ac.th', '04B1C2D3'],
  ['STD-K2-0008', 'มานี',    'สุขดี',    'K2', 'K2-A', '10/11/2561', 'somying@gmail.com',      '04C3D4E5'],
  ['STD-P3-0015', 'วิชัย',   'รักเรียน', 'P3', 'P3-B', '05/05/2559', 'vichai.p@example.com',   '04D5E6F7'],
  ['STD-S1-0003', 'อรุณี',   'ดีงาม',    'S1', 'S1-B', '30/09/2555', 'arunee.d@example.com',   ''],
]

// ── Import result state ────────────────────────────────────────────────────────
const importResult    = ref<{ success: number; errors: string[] } | null>(null)
const showImportResult = ref(false)
const showImportModal  = ref(false)
const importFile       = ref<File | null>(null)
const isDragOver       = ref(false)

function triggerImport() { csvInput.value?.click() }

function openFileSelect() { csvInput.value?.click() }

function onDragOver(e: DragEvent) { e.preventDefault(); isDragOver.value = true }
function onDragLeave()             { isDragOver.value = false }
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) importFile.value = file
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) { importFile.value = file }
  ;(e.target as HTMLInputElement).value = ''
}

function closeImportModal() {
  showImportModal.value = false
  importFile.value = null
  isDragOver.value = false
}

// ── Download Template ──────────────────────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Template with example rows
  const headers = TEMPLATE_COLUMNS.map(c => c.header)
  const notes   = ['หมายเหตุ:', ...TEMPLATE_COLUMNS.map(c => c.note)]
  const rows    = [headers, notes, ...EXAMPLE_ROWS]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = TEMPLATE_COLUMNS.map((_, i) => ({ wch: [18, 12, 14, 10, 12, 14, 26, 18][i] ?? 16 }))

  // Style header row (row 0) — note: xlsx free tier has limited styling
  XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักเรียน')

  // Sheet 2: Instructions
  const instrRows = [
    ['คำแนะนำการกรอกข้อมูล'],
    [''],
    ['คอลัมน์', 'คำอธิบาย', 'ตัวอย่าง', 'จำเป็น'],
    ...TEMPLATE_COLUMNS.map(c => [c.header.replace('*',''), c.note, c.example, c.header.includes('*') ? 'ใช่' : 'ไม่จำเป็น']),
    [''],
    ['ชั้นปีที่รองรับ:', 'K1, K2, P1, P2, P3, P4, P5, P6, S1, S2, S3, S4, S5, S6'],
    ['รูปแบบรหัสนักเรียน:', 'STD-{ชั้น}-{ลำดับ 4 หลัก}  เช่น STD-K1-0001, STD-P3-0015'],
    ['ตัวอย่างห้องเรียน:', 'K1-A, K1-B, P3-A, P3-B, S1-C'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows)
  wsInstr['!cols'] = [{ wch: 22 }, { wch: 42 }, { wch: 22 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'คำแนะนำ')

  XLSX.writeFile(wb, 'Student_Import_Template.xlsx')
}

// ── Confirm Import (called from modal) ────────────────────────────────────────
function confirmImport() {
  const file = importFile.value
  if (!file) return
  closeImportModal()
  processFile(file)
}

// ── Handle file input change (fallback) ────────────────────────────────────────
function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''
  processFile(file)
}

function processFile(file: File) {

  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const data    = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb      = XLSX.read(data, { type: 'array' })
      const ws      = wb.Sheets[wb.SheetNames[0]]
      const rows    = XLSX.utils.sheet_to_json<Record<string,string>>(ws, { header: 1 }) as string[][]

      const errors: string[] = []
      const imported: Student[] = []
      const HEADER_ROW = 0
      const NOTE_ROW   = 1

      for (let i = 2; i < rows.length; i++) {
        const r = rows[i]
        if (!r || r.every(c => !c)) continue  // skip empty rows

        const [uid, firstName, lastName, gradeLevel, className, dob, guardianEmail, cardUid] = r.map(c => String(c ?? '').trim())

        if (!uid || !firstName || !lastName || !gradeLevel || !className) {
          errors.push(`แถว ${i+1}: ข้อมูลจำเป็นไม่ครบ (รหัส/ชื่อ/ชั้น/ห้อง)`)
          continue
        }
        if (!['K1','K2','P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6'].includes(gradeLevel)) {
          errors.push(`แถว ${i+1}: ชั้นปี "${gradeLevel}" ไม่ถูกต้อง`)
          continue
        }

        imported.push({
          uid, firstName, lastName, gradeLevel, className,
          guardianEmail: guardianEmail || undefined,
          cardUid:       cardUid || undefined,
          cardStatus:    cardUid ? 'active' : undefined,
          balance:       0,
          lowThreshold:  200,
          parentCount:   guardianEmail ? 0 : 0,
          canPreorder:   ['K1','K2'].includes(gradeLevel),
          buffetGroup:   ['K1','K2','P1','P2','P3','P4','P5','P6'].includes(gradeLevel) ? 'primary' : 'secondary',
          status:        'active',
        })
      }

      // Merge: update existing or add new
      const uidSet = new Set(students.value.map(s => s.uid))
      let updated = 0
      for (const s of imported) {
        if (uidSet.has(s.uid)) {
          const idx = students.value.findIndex(x => x.uid === s.uid)
          if (idx >= 0) { students.value[idx] = s; updated++ }
        } else {
          students.value.push(s)
        }
      }

      importResult.value = { success: imported.length, errors }
      showImportResult.value = true
    } catch (err) {
      importResult.value = { success: 0, errors: ['ไม่สามารถอ่านไฟล์ได้ — กรุณาใช้ไฟล์ .xlsx หรือ .csv ตาม Template'] }
      showImportResult.value = true
    }
  }
  reader.readAsArrayBuffer(file)
}

function promoteAll() {
  // Demo: simulate promotion
  students.value = students.value.map(s => {
    const idx = GRADES.indexOf(s.gradeLevel)
    if (idx < 0 || idx >= GRADES.length - 1) return s
    const newGrade = GRADES[idx + 1]
    return {
      ...s,
      gradeLevel: newGrade,
      canPreorder: PRE_ORDER_GRADES.includes(newGrade),
      buffetGroup: ['K1','K2','P1','P2','P3','P4','P5','P6'].includes(newGrade) ? 'primary' : 'secondary',
    }
  })
  showPromoteModal.value = false
  alert('เลื่อนชั้นเรียบร้อย (Demo)')
}

async function fetchStudents() {
  loading.value = true
  try {
    const res = await api.get('/admin/students')
    students.value = (res.data?.students ?? res.data ?? []).map((s: any) => ({
      uid:          s.uid ?? s.id,
      firstName:    s.firstName ?? s.first_name,
      lastName:     s.lastName  ?? s.last_name,
      gradeLevel:   s.gradeLevel ?? s.grade_level ?? s.grade,
      className:    s.className  ?? s.class_name  ?? '',
      guardianEmail:s.guardianEmail ?? s.guardian_email,
      cardUid:      s.cardUid ?? s.card_uid,
      cardStatus:   s.cardStatus ?? 'active',
      balance:      s.balance ?? 0,
      lowThreshold: s.lowThreshold ?? 200,
      parentCount:  s.parentCount ?? 0,
      canPreorder:  PRE_ORDER_GRADES.includes(s.gradeLevel ?? s.grade ?? ''),
      buffetGroup:  ['K1','K2','P1','P2','P3','P4','P5','P6'].includes(s.gradeLevel ?? '') ? 'primary' : 'secondary',
      status:       s.status ?? 'active',
    }))
    if (students.value.length === 0) students.value = DEMO
  } catch {
    students.value = DEMO
  } finally {
    loading.value = false
  }
}

onMounted(fetchStudents)
</script>

<style scoped>
/* Header action buttons */
.adm-hdr-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px;
  border-radius: var(--radius-md);
  font-size: 13px; font-weight: 500;
  font-family: inherit; cursor: pointer;
  transition: opacity 0.15s;
  border: none;
  white-space: nowrap;
}
.adm-hdr-btn:active { opacity: 0.8; }
.adm-hdr-btn-primary { background: var(--color-primary); color: #fff; }
.adm-hdr-btn-ghost   { background: #fff; color: var(--color-text-secondary); border: 1px solid var(--color-border-tertiary); }
.adm-hdr-btn-warn    { background: var(--color-warning-bg); color: var(--color-warning); border: 1px solid #FFCC80; }

/* Filter inputs */
.adm-filter-select,
.adm-filter-input {
  height: 36px; padding: 0 12px; border-radius: 8px;
  border: 1px solid #E8E8E8; background: #fff;
  font-size: 13px; color: #1C1C1E; outline: none; min-width: 130px;
}
.adm-filter-select:focus, .adm-filter-input:focus { border-color: var(--color-primary); }
.adm-search-btn {
  height: 36px; padding: 0 16px; border-radius: 8px;
  background: var(--color-primary); color: #fff;
  font-size: 13px; font-weight: 500; border: none; cursor: pointer;
}
.adm-search-btn:active { opacity: 0.8; }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.4);
}
.modal-box {
  position: fixed; top: 50%; left: 50%; z-index: 51;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 12px;
  width: calc(100% - 48px); max-width: 440px;
  padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.14);
}
.modal-title { font-size: 18px; font-weight: 500; color: #1C1C1E; margin-bottom: 8px; }
.modal-sub   { font-size: 13px; color: #3C3C43; line-height: 1.5; margin-bottom: 12px; }
.modal-warn  { font-size: 12px; background: var(--color-warning-bg); color: #C67100; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* Transitions */
.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to       { opacity: 0; }
.modal-up-enter-active, .modal-up-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-enter-from, .modal-up-leave-to       { opacity: 0; transform: translate(-50%,-48%); }

/* ── Import modal ──────────────────────────────────────────────────── */
.imp-modal {
  position: fixed; top: 50%; left: 50%; z-index: 51;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 16px;
  width: calc(100vw - 48px); max-width: 560px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
}
.imp-header { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title  { font-size:18px; font-weight:500; color:#1C1C1E; }
.imp-close  { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; transition:background 0.1s; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }

.imp-step { display:flex; align-items:flex-start; gap:14px; padding:20px 24px; }
.imp-step-num {
  width:32px; height:32px; border-radius:8px;
  background:var(--color-primary-tint);
  color:var(--color-primary);
  font-size:15px; font-weight:500;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.imp-step-title { font-size:15px; font-weight:500; color:#1C1C1E; margin-bottom:4px; }
.imp-step-sub   { font-size:13px; color:#8E8E93; line-height:1.5; margin-bottom:10px; }

.imp-dl-btn {
  display:inline-flex; align-items:center; gap:5px;
  font-size:14px; font-weight:500;
  color:var(--color-primary);
  background:none; border:none; cursor:pointer; padding:0;
  transition:opacity 0.15s;
}
.imp-dl-btn:active { opacity:0.7; }

/* Drop zone */
.imp-dropzone {
  border: 2px dashed #D0D0D0;
  border-radius: 12px;
  background: #FAFAFA;
  padding: 36px 24px;
  display: flex; flex-direction:column; align-items:center; justify-content:center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 150px;
  -webkit-tap-highlight-color: transparent;
}
.imp-dropzone:hover, .imp-dropzone-over {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.imp-dropzone-has {
  border-color: var(--color-success);
  background: var(--color-success-bg);
}

.imp-upload-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--color-primary);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.imp-dropzone-text {
  font-size: 14px; color: #3C3C43; text-align: center; line-height: 1.6;
}
.imp-select-link { color: var(--color-primary); font-weight: 500; cursor:pointer; }

/* Instructions */
.imp-instructions {
  margin: 0 24px 20px;
  background: var(--color-primary-tint);
  border-radius: 10px;
  padding: 14px 16px;
}

/* Footer */
.imp-footer {
  display:flex; gap:12px; padding:16px 24px 20px;
  border-top: 1px solid #F0F0F0;
}
.imp-btn-cancel {
  flex:1; height:48px; border-radius:12px;
  border:2px solid var(--color-primary);
  color:var(--color-primary); background:transparent;
  font-size:15px; font-weight:500; cursor:pointer;
  transition:background 0.15s;
}
.imp-btn-cancel:hover { background:var(--color-primary-tint); }

.imp-btn-confirm {
  flex:1; height:48px; border-radius:12px;
  border:none; background:#E5E5EA; color:#AEAEB2;
  font-size:15px; font-weight:500; cursor:not-allowed;
  transition:background 0.15s, color 0.15s;
}
.imp-btn-confirm-active {
  background:var(--color-primary); color:#fff; cursor:pointer;
}
.imp-btn-confirm-active:active { opacity:0.8; }
</style>
