<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการ Visitor</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">รายการผู้เข้าใช้งานชั่วคราว</p>
      </div>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAddModal">
        <PhUserPlus :size="14" /> เพิ่ม Visitor
      </button>
    </div>

    <!-- Toolbar -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3 items-end">
        <div style="display:flex;flex-direction:column;gap:5px;flex:2;min-width:220px">
          <label class="promo-label">ค้นหา</label>
          <div class="vis-search-wrap">
            <PhMagnifyingGlass :size="14" style="color:#AEAEB2;flex-shrink:0" />
            <input v-model="search" class="vis-search-input" placeholder="ค้นหาชื่อ / UID / Card UID" />
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;min-width:140px">
          <label class="promo-label">สถานะ</label>
          <select v-model="filterStatus" class="adm-filter-select" style="height:38px">
            <option value="">ทั้งหมด</option>
            <option value="active">เปิดใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </div>
        <button class="adm-search-btn" style="height:38px;min-width:80px" @click="currentPage = 1">ค้นหา</button>
      </div>
    </div>

    <p style="font-size:13px;color:#3C3C43">ผลการค้นหา : {{ filtered.length }} รายการ</p>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>UID</th>
            <th>ชื่อ - นามสกุล</th>
            <th>Card UID</th>
            <th class="right">ยอดเงิน (฿)</th>
            <th class="center">สถานะ</th>
            <th class="center">วันที่ลงทะเบียน</th>
            <th class="center">ดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="7" class="center" style="padding:32px;color:#CC3333;font-size:13px">{{ error }}</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="7" class="center" style="padding:64px;color:#AEAEB2;font-size:15px">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="v in paginated" v-else :key="v.uid" :style="v.status === 'inactive' ? 'opacity:0.75' : ''">
            <td><span class="adm-code" style="font-family:monospace;font-size:11px;color:var(--color-text-tertiary)">{{ v.uid }}</span></td>
            <td style="font-size:13px;font-weight:500;color:var(--color-text-primary)">{{ v.firstName }}{{ v.lastName ? ' ' + v.lastName : '' }}</td>
            <td>
              <span v-if="v.cardUid" style="font-family:monospace;font-size:11px;color:var(--color-text-tertiary)">{{ v.cardUid }}</span>
              <span v-else style="color:var(--color-warning);font-size:12px">ยังไม่ผูกบัตร</span>
            </td>
            <td class="right" :style="v.balance > 0 ? 'color:var(--color-success);font-weight:500' : 'color:var(--color-text-tertiary)'">
              {{ v.balance.toLocaleString() }}
            </td>
            <td class="center">
              <span class="adm-badge" :style="{ background: visitorBadge(v).bg, color: visitorBadge(v).color }">{{ visitorBadge(v).label }}</span>
            </td>
            <td class="center" style="font-size:12px;color:var(--color-text-tertiary)">{{ formatDate(v.createdAt) }}</td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" style="color:var(--color-accent)" @click="openEdit(v)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn" title="เติมเงิน" style="color:var(--color-success)" :disabled="!canTopup(v)" @click="openTopup(v)">
                  <PhWallet :size="14" />
                </button>
                <button class="adm-action-btn" title="คืนเงิน" style="color:var(--color-warning)" :disabled="!canRefund(v)" @click="openRefund(v)">
                  <PhMoney :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="openDelete(v)">
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
          <select v-model="pageSize" class="adm-page-size">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage === p ? 'active' : '']"
            @click="currentPage = p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- Add Visitor Modal -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="showModal" class="vis-backdrop" @click="closeModal" /></Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="vis-modal2">
          <div class="vis-modal2-header">
            <div class="vis-header-left">
              <div class="vis-icon-circle" style="background:var(--color-accent-bg);color:var(--color-accent)">
                <PhUserPlus :size="20" weight="bold" />
              </div>
              <div><h3 class="vis-modal2-title">เพิ่ม Visitor</h3></div>
            </div>
            <button class="vis-close" @click="closeModal"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="vis-divider" />

          <div class="vis-modal2-body">
            <div class="vis-field">
              <label class="promo-label">ชื่อ - นามสกุล <span style="color:var(--color-danger)">*</span></label>
              <div class="flex gap-2">
                <input v-model="form.firstName" class="vis-input" :class="{ 'vis-input-error': submitted && !form.firstName.trim() }" placeholder="ชื่อ" style="flex:1" />
                <input v-model="form.lastName"  class="vis-input" placeholder="นามสกุล" style="flex:1" />
              </div>
              <p v-if="submitted && !form.firstName.trim()" class="vis-field-error">กรุณากรอกชื่อ</p>
            </div>

            <div class="vis-field">
              <label class="promo-label">Card UID <span style="color:var(--color-danger)">*</span></label>
              <input v-model="form.cardUid" class="vis-input" :class="{ 'vis-input-error': submitted && !form.cardUid.trim() }" placeholder="เช่น 04:AB:CD:12:34:56" />
              <p v-if="submitted && !form.cardUid.trim()" class="vis-field-error">กรุณากรอก Card UID</p>
              <p v-else class="vis-hint">แตะบัตรที่เครื่องอ่าน หรือกรอก UID ด้วยตนเอง</p>
            </div>

            <div class="vis-field">
              <label class="promo-label">ยอดเงินเริ่มต้น (฿)</label>
              <input v-model.number="form.initialBalance" type="number" min="0" step="10" class="vis-input" placeholder="0" />
            </div>

            <p v-if="formError" class="vis-form-error">{{ formError }}</p>
          </div>

          <div class="vis-divider" />
          <div class="vis-modal2-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="closeModal">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="saving" @click="submitAdd">
              <PhFloppyDisk :size="14" /> {{ saving ? 'กำลังบันทึก...' : 'ลงทะเบียน Visitor' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="editTarget" class="vis-backdrop" @click="closeEdit" /></Transition>
      <Transition name="modal-up">
        <div v-if="editTarget" class="vis-modal2">
          <div class="vis-modal2-header">
            <div class="vis-header-left">
              <div class="vis-icon-circle" style="background:var(--color-accent-bg);color:var(--color-accent)">
                <PhPencilSimple :size="20" weight="bold" />
              </div>
              <div>
                <h3 class="vis-modal2-title">แก้ไข Visitor</h3>
                <p class="vis-modal2-sub">{{ editTarget.uid }} · {{ editTarget.firstName }} {{ editTarget.lastName }}</p>
              </div>
            </div>
            <button class="vis-close" :disabled="editSaving" @click="closeEdit"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="vis-divider" />

          <div class="vis-modal2-body">
            <p class="vis-section-label">แก้ไขไม่ได้</p>
            <div class="vis-readonly-row"><PhLock :size="13" /> <span>UID: {{ editTarget.uid }}</span> <span class="vis-lock-tag">ระบบกำหนด</span></div>
            <div class="vis-readonly-row"><PhCreditCard :size="13" /> <span>Card UID: {{ editTarget.cardUid || '—' }}</span> <span class="vis-lock-tag">จัดการที่หน้าบัตร</span></div>
            <div class="vis-readonly-row"><PhWallet :size="13" /> <span>ยอดเงิน: ฿{{ editTarget.balance.toLocaleString() }}</span> <span class="vis-lock-tag">เติม/คืนผ่านปุ่มใน table</span></div>

            <p class="vis-section-label" style="margin-top:6px">แก้ไขได้</p>
            <div class="flex gap-2">
              <div class="vis-field" style="flex:1">
                <label class="promo-label">ชื่อ <span style="color:var(--color-danger)">*</span></label>
                <input v-model="editForm.firstName" class="vis-input" />
              </div>
              <div class="vis-field" style="flex:1">
                <label class="promo-label">นามสกุล <span style="color:var(--color-danger)">*</span></label>
                <input v-model="editForm.lastName" class="vis-input" />
              </div>
            </div>
            <div class="vis-field">
              <label class="promo-label">เบอร์โทรศัพท์</label>
              <input v-model="editForm.phone" type="tel" class="vis-input" placeholder="08x-xxx-xxxx" />
            </div>
            <div class="vis-field">
              <label class="promo-label">สถานะ <span style="color:var(--color-danger)">*</span></label>
              <select v-model="editForm.status" class="vis-input" style="height:38px">
                <option value="active">เปิดใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
            </div>
            <p v-if="editError" class="vis-form-error">{{ editError }}</p>
          </div>

          <div class="vis-divider" />
          <div class="vis-modal2-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="editSaving" @click="closeEdit">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="editSaving" @click="saveEdit">
              <PhFloppyDisk :size="14" /> {{ editSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Topup Modal -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="topupTarget" class="vis-backdrop" @click="closeTopup" /></Transition>
      <Transition name="modal-up">
        <div v-if="topupTarget" class="vis-modal2">
          <div class="vis-modal2-header">
            <div class="vis-header-left">
              <div class="vis-icon-circle" style="background:var(--color-success-bg);color:var(--color-success)">
                <PhWallet :size="20" weight="bold" />
              </div>
              <div>
                <h3 class="vis-modal2-title">เติมเงินบัตร Visitor</h3>
                <p class="vis-modal2-sub">{{ topupTarget.uid }} · {{ topupTarget.firstName }} {{ topupTarget.lastName }}</p>
              </div>
            </div>
            <button class="vis-close" :disabled="topupSaving" @click="closeTopup"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="vis-divider" />

          <div class="vis-modal2-body">
            <div class="vis-amount-box" style="background:var(--color-success-bg)">
              <div>
                <p style="font-size:12px;color:var(--color-success);margin:0">ยอดเงินในบัตรปัจจุบัน</p>
                <p style="font-size:20px;font-weight:500;color:var(--color-success);margin:2px 0 0 0">฿{{ topupTarget.balance.toLocaleString() }}</p>
              </div>
              <PhWallet :size="24" style="color:var(--color-success);opacity:0.6" />
            </div>

            <div class="vis-field">
              <label class="promo-label">จำนวนเงินที่เติม (฿) <span style="color:var(--color-danger)">*</span></label>
              <input v-model.number="topupForm.amount" type="number" min="1" step="10" class="vis-input" placeholder="0" />
            </div>
            <div class="vis-field">
              <label class="promo-label">เติมเงินทาง <span style="color:var(--color-danger)">*</span></label>
              <select v-model="topupForm.paymentMethod" class="vis-input" style="height:38px">
                <option value="cash">เงินสด</option>
                <option value="bank_transfer">โอนธนาคาร</option>
              </select>
            </div>
            <p v-if="topupError" class="vis-form-error">{{ topupError }}</p>
          </div>

          <div class="vis-divider" />
          <div class="vis-modal2-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="topupSaving" @click="closeTopup">ยกเลิก</button>
            <button class="adm-hdr-btn vis-btn-success" :disabled="!canSubmitTopup || topupSaving" @click="submitTopup">
              <PhWallet :size="14" /> {{ topupSaving ? 'กำลังเติมเงิน...' : 'ยืนยันเติมเงิน' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Refund Modal -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="refundTarget" class="vis-backdrop" @click="closeRefund" /></Transition>
      <Transition name="modal-up">
        <div v-if="refundTarget" class="vis-modal2">
          <div class="vis-modal2-header">
            <div class="vis-header-left">
              <div class="vis-icon-circle" style="background:var(--color-warning-bg);color:var(--color-warning)">
                <PhMoney :size="20" weight="bold" />
              </div>
              <div>
                <h3 class="vis-modal2-title">คืนเงินบัตร Visitor</h3>
                <p class="vis-modal2-sub">{{ refundTarget.uid }} · {{ refundTarget.firstName }} {{ refundTarget.lastName }}</p>
              </div>
            </div>
            <button class="vis-close" :disabled="refundSaving" @click="closeRefund"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="vis-divider" />

          <div class="vis-modal2-body">
            <div class="vis-amount-box" style="background:var(--color-warning-bg)">
              <div>
                <p style="font-size:12px;color:var(--color-warning);margin:0">ยอดเงินในบัตร</p>
                <p style="font-size:20px;font-weight:500;color:var(--color-warning);margin:2px 0 0 0">฿{{ refundTarget.balance.toLocaleString() }}</p>
              </div>
              <PhWallet :size="24" style="color:var(--color-warning);opacity:0.6" />
            </div>

            <div class="vis-field">
              <label class="promo-label">จำนวนเงินที่คืน (฿) <span style="color:var(--color-danger)">*</span></label>
              <input v-model.number="refundForm.amount" type="number" min="1" :max="refundTarget.balance" step="10" class="vis-input" placeholder="0" />
              <p class="vis-hint">คืนได้สูงสุด ฿{{ refundTarget.balance.toLocaleString() }}</p>
            </div>
            <div class="vis-field">
              <label class="promo-label">คืนเงินทาง <span style="color:var(--color-danger)">*</span></label>
              <select v-model="refundForm.paymentMethod" class="vis-input" style="height:38px">
                <option value="cash">เงินสด</option>
                <option value="bank_transfer">โอนธนาคาร</option>
              </select>
            </div>
            <div class="vis-field">
              <label class="promo-label">เหตุผล <span style="color:var(--color-danger)">*</span></label>
              <select v-model="refundForm.reason" class="vis-input" style="height:38px">
                <option value="สิ้นสุดการเข้าใช้งาน">สิ้นสุดการเข้าใช้งาน</option>
                <option value="ยกเลิกการใช้บริการ">ยกเลิกการใช้บริการ</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            <div class="vis-warn-box">
              <PhWarning :size="16" weight="fill" style="color:var(--color-danger);flex-shrink:0" />
              <span>หลังคืนเงินแล้ว ยอดในบัตรจะถูกหักออก และบันทึกลง transaction history</span>
            </div>
            <p v-if="refundError" class="vis-form-error">{{ refundError }}</p>
          </div>

          <div class="vis-divider" />
          <div class="vis-modal2-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="refundSaving" @click="closeRefund">ยกเลิก</button>
            <button class="adm-hdr-btn vis-btn-warning" :disabled="!canSubmitRefund || refundSaving" @click="submitRefund">
              <PhMoney :size="14" /> {{ refundSaving ? 'กำลังคืนเงิน...' : 'ยืนยันคืนเงิน' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirm -->
    <Teleport to="body">
      <Transition name="modal-bg"><div v-if="deleteTarget" class="vis-backdrop" @click="closeDelete" /></Transition>
      <Transition name="modal-up">
        <div v-if="deleteTarget" class="vis-modal2" style="max-width:420px">
          <div class="vis-modal2-header">
            <div class="vis-header-left">
              <div class="vis-icon-circle" style="background:var(--color-danger-bg);color:var(--color-danger)">
                <PhTrash :size="20" weight="bold" />
              </div>
              <div>
                <h3 class="vis-modal2-title">ลบ Visitor</h3>
                <p class="vis-modal2-sub">ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <button class="vis-close" :disabled="deleteSaving" @click="closeDelete"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="vis-divider" />

          <div class="vis-modal2-body">
            <p style="font-size:14px;color:var(--color-text-primary)">
              ต้องการลบ Visitor <strong>{{ deleteTarget.firstName }} {{ deleteTarget.lastName }}</strong>
              ({{ deleteTarget.uid }}) ออกจากระบบ?
            </p>
            <div v-if="deleteTarget.balance > 0" class="vis-warn-box">
              <PhWarning :size="16" weight="fill" style="color:var(--color-danger);flex-shrink:0" />
              <span>Visitor นี้มียอดเงินคงเหลือ ฿{{ deleteTarget.balance.toLocaleString() }} — ควรคืนเงินก่อนลบ</span>
            </div>
            <p v-if="deleteError" class="vis-form-error">{{ deleteError }}</p>
          </div>

          <div class="vis-divider" />
          <div class="vis-modal2-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="deleteSaving" @click="closeDelete">ยกเลิก</button>
            <button class="adm-hdr-btn vis-btn-danger" :disabled="deleteSaving" @click="confirmDelete">
              <PhTrash :size="14" /> {{ deleteSaving ? 'กำลังลบ...' : 'ลบถาวร' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PhUserPlus, PhMagnifyingGlass, PhX, PhPencilSimple, PhWallet, PhMoney, PhTrash,
  PhLock, PhCreditCard, PhFloppyDisk, PhWarning,
} from '@phosphor-icons/vue'
import api from '@/api/axios'

interface Visitor {
  _id:        string
  uid:        string
  firstName:  string
  lastName:   string
  phone?:     string
  status:     'active' | 'inactive'
  balance:    number
  cardUid:    string | null
  cardStatus: string | null
  createdAt:  string
}

const loading      = ref(false)
const error        = ref('')
const visitors      = ref<Visitor[]>([])
const search        = ref('')
const filterStatus  = ref('')
const currentPage    = ref(1)
const pageSize       = ref(20)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return visitors.value.filter(v => {
    const matchSearch = !q ||
      `${v.firstName} ${v.lastName}`.toLowerCase().includes(q) ||
      v.uid.toLowerCase().includes(q) ||
      (v.cardUid ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus.value || v.status === filterStatus.value
    return matchSearch && matchStatus
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

function visitorBadge(v: Visitor) {
  if (v.status === 'inactive') return { label: 'ปิดใช้งาน', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' }
  if (!v.cardUid) return { label: 'รอผูกบัตร', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' }
  return { label: 'เปิดใช้งาน', bg: 'var(--color-success-bg)', color: 'var(--color-success)' }
}

function canTopup(v: Visitor) { return v.status === 'active' && !!v.cardUid }
function canRefund(v: Visitor) { return v.status === 'active' && v.balance > 0 }

async function fetchVisitors() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/admin/visitors')
    visitors.value = res.data.visitors ?? []
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

// ── Add ───────────────────────────────────────────────────────────────────────

const showModal = ref(false)
const saving    = ref(false)
const submitted = ref(false)
const formError = ref('')
const form = ref({ firstName: '', lastName: '', cardUid: '', initialBalance: 0 })

function openAddModal() {
  form.value = { firstName: '', lastName: '', cardUid: '', initialBalance: 0 }
  formError.value = ''
  submitted.value = false
  showModal.value = true
}
function closeModal() {
  if (saving.value) return
  showModal.value = false
}

async function submitAdd() {
  submitted.value = true
  formError.value = ''
  if (!form.value.firstName.trim() || !form.value.cardUid.trim()) return

  saving.value = true
  try {
    const payload: any = {
      firstName:      form.value.firstName.trim(),
      lastName:       form.value.lastName.trim(),
      cardUid:        form.value.cardUid.trim(),
      initialBalance: form.value.initialBalance || undefined,
    }
    const res = await api.post('/admin/visitors', payload)
    visitors.value.unshift(res.data.visitor)
    showModal.value = false
  } catch (e: any) {
    formError.value = e?.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────

const editTarget = ref<Visitor | null>(null)
const editForm    = ref({ firstName: '', lastName: '', phone: '', status: 'active' as 'active' | 'inactive' })
const editSaving  = ref(false)
const editError   = ref('')

function openEdit(v: Visitor) {
  editTarget.value = v
  editForm.value = { firstName: v.firstName, lastName: v.lastName, phone: v.phone ?? '', status: v.status }
  editError.value = ''
}
function closeEdit() {
  if (editSaving.value) return
  editTarget.value = null
}
async function saveEdit() {
  if (!editTarget.value || editSaving.value) return
  editSaving.value = true
  editError.value = ''
  try {
    const { data } = await api.patch(`/admin/visitors/${editTarget.value.uid}`, { ...editForm.value })
    const idx = visitors.value.findIndex(x => x.uid === editTarget.value!.uid)
    if (idx !== -1) visitors.value[idx] = { ...visitors.value[idx], ...data.visitor }
    editTarget.value = null
  } catch (e: any) {
    editError.value = e?.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    editSaving.value = false
  }
}

// ── Topup ─────────────────────────────────────────────────────────────────────

const topupTarget = ref<Visitor | null>(null)
const topupForm    = ref({ amount: 0, paymentMethod: 'cash' })
const topupSaving  = ref(false)
const topupError   = ref('')
const canSubmitTopup = computed(() => topupForm.value.amount > 0)

function openTopup(v: Visitor) {
  topupTarget.value = v
  topupForm.value = { amount: 0, paymentMethod: 'cash' }
  topupError.value = ''
}
function closeTopup() {
  if (topupSaving.value) return
  topupTarget.value = null
}
async function submitTopup() {
  if (!topupTarget.value || !canSubmitTopup.value || topupSaving.value) return
  topupSaving.value = true
  topupError.value = ''
  try {
    const { data } = await api.post(`/admin/visitors/${topupTarget.value.uid}/topup`, topupForm.value)
    const idx = visitors.value.findIndex(x => x.uid === topupTarget.value!.uid)
    if (idx !== -1) visitors.value[idx].balance = data.balance
    topupTarget.value = null
  } catch (e: any) {
    topupError.value = e?.response?.data?.error?.message ?? 'เติมเงินไม่สำเร็จ'
  } finally {
    topupSaving.value = false
  }
}

// ── Refund ────────────────────────────────────────────────────────────────────

const refundTarget = ref<Visitor | null>(null)
const refundForm    = ref({ amount: 0, paymentMethod: 'cash', reason: 'สิ้นสุดการเข้าใช้งาน' })
const refundSaving  = ref(false)
const refundError   = ref('')
const canSubmitRefund = computed(() =>
  refundTarget.value != null &&
  refundForm.value.amount > 0 &&
  refundForm.value.amount <= refundTarget.value.balance
)

function openRefund(v: Visitor) {
  refundTarget.value = v
  refundForm.value = { amount: 0, paymentMethod: 'cash', reason: 'สิ้นสุดการเข้าใช้งาน' }
  refundError.value = ''
}
function closeRefund() {
  if (refundSaving.value) return
  refundTarget.value = null
}
async function submitRefund() {
  if (!refundTarget.value || !canSubmitRefund.value || refundSaving.value) return
  refundSaving.value = true
  refundError.value = ''
  try {
    const { data } = await api.post(`/admin/visitors/${refundTarget.value.uid}/refund`, refundForm.value)
    const idx = visitors.value.findIndex(x => x.uid === refundTarget.value!.uid)
    if (idx !== -1) visitors.value[idx].balance = data.balance
    refundTarget.value = null
  } catch (e: any) {
    refundError.value = e?.response?.data?.error?.message ?? 'คืนเงินไม่สำเร็จ'
  } finally {
    refundSaving.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteTarget = ref<Visitor | null>(null)
const deleteSaving = ref(false)
const deleteError  = ref('')

function openDelete(v: Visitor) {
  deleteTarget.value = v
  deleteError.value = ''
}
function closeDelete() {
  if (deleteSaving.value) return
  deleteTarget.value = null
}
async function confirmDelete() {
  if (!deleteTarget.value || deleteSaving.value) return
  deleteSaving.value = true
  deleteError.value = ''
  try {
    await api.delete(`/admin/visitors/${deleteTarget.value.uid}`)
    visitors.value = visitors.value.filter(x => x.uid !== deleteTarget.value!.uid)
    deleteTarget.value = null
  } catch (e: any) {
    deleteError.value = e?.response?.data?.error?.message ?? 'ลบไม่สำเร็จ'
  } finally {
    deleteSaving.value = false
  }
}

onMounted(fetchVisitors)
</script>

<style scoped>
.vis-search-wrap {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid #E8E8E8; border-radius: 8px;
  padding: 0 12px; height: 38px; background: #fff;
}
.vis-search-input {
  border: none; outline: none; flex: 1;
  font-size: 13px; color: #1C1C1E; background: transparent; font-family: inherit;
}
.vis-search-input::placeholder { color: #AEAEB2; }

.adm-action-btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }

/* Shared modal shell (add / edit / topup / refund / delete) */
.vis-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); }
.vis-modal2 {
  position: fixed; top: 50%; left: 50%; z-index: 201; transform: translate(-50%,-50%);
  background: #fff; border-radius: 14px; width: calc(100vw - 48px); max-width: 460px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.16); overflow: hidden;
  display: flex; flex-direction: column; max-height: calc(100vh - 48px);
}
.vis-modal2-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px; }
.vis-header-left { display: flex; align-items: flex-start; gap: 12px; }
.vis-icon-circle {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.vis-modal2-title { font-size: 17px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.vis-modal2-sub { font-size: 12px; color: var(--color-text-tertiary); margin: 2px 0 0 0; }
.vis-close { background: none; border: none; cursor: pointer; color: var(--color-text-tertiary); padding: 4px; border-radius: 6px; display: flex; align-items: center; }
.vis-close:hover:not(:disabled) { background: #F2F2F7; }
.vis-close:disabled { opacity: 0.4; cursor: not-allowed; }
.vis-divider { height: 1px; background: var(--color-border-tertiary); flex-shrink: 0; }
.vis-modal2-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.vis-modal2-footer { display: flex; gap: 10px; padding: 16px 24px; justify-content: flex-end; flex-shrink: 0; }

.vis-field { display: flex; flex-direction: column; gap: 6px; }
.vis-input {
  height: 38px; border: 1px solid #E8E8E8; border-radius: 8px; padding: 0 12px;
  font-size: 13px; color: #1C1C1E; font-family: inherit; outline: none; background: #fff; width: 100%; box-sizing: border-box;
}
.vis-input:focus { border-color: var(--color-primary); }
.vis-input-error { border-color: var(--color-danger) !important; }
.vis-field-error { font-size: 11px; color: var(--color-danger); margin: 0; }
.vis-hint { font-size: 11px; color: #AEAEB2; margin: 0; }
.vis-form-error { font-size: 13px; color: #CC3333; background: var(--color-danger-bg); border-radius: 8px; padding: 10px 14px; margin: 0; }

.vis-section-label { font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin: 4px 0 2px 0; }
.vis-readonly-row {
  display: flex; align-items: center; gap: 6px;
  background: var(--color-bg-secondary); border: 1px solid var(--color-border-tertiary);
  border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--color-text-secondary);
}
.vis-readonly-row svg { color: var(--color-text-tertiary); flex-shrink: 0; }
.vis-readonly-row span:first-of-type { flex: 1; }
.vis-lock-tag { font-size: 10px; color: var(--color-text-tertiary); background: #fff; border-radius: 100px; padding: 2px 8px; flex-shrink: 0; }

.vis-amount-box { display: flex; align-items: center; justify-content: space-between; border-radius: 8px; padding: 12px 14px; }

.vis-warn-box {
  display: flex; align-items: flex-start; gap: 8px;
  background: var(--color-danger-bg); border-radius: 10px; padding: 12px 14px;
  font-size: 12px; color: var(--color-text-primary); line-height: 1.5;
}

.vis-btn-success { display: inline-flex; align-items: center; gap: 6px; background: var(--color-success); color: #fff; }
.vis-btn-success:hover:not(:disabled) { opacity: 0.9; }
.vis-btn-success:disabled { opacity: 0.4; cursor: not-allowed; }
.vis-btn-warning { display: inline-flex; align-items: center; gap: 6px; background: var(--color-warning); color: #fff; }
.vis-btn-warning:hover:not(:disabled) { opacity: 0.9; }
.vis-btn-warning:disabled { opacity: 0.4; cursor: not-allowed; }
.vis-btn-danger { display: inline-flex; align-items: center; gap: 6px; background: var(--color-danger); color: #fff; }
.vis-btn-danger:hover:not(:disabled) { opacity: 0.9; }
.vis-btn-danger:disabled { opacity: 0.4; cursor: not-allowed; }

.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity: 0; }
.modal-up-enter-active, .modal-up-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity: 0; transform: translate(-50%,-48%); }
</style>
