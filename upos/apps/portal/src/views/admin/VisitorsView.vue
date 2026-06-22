<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการ Visitor</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAddModal">
        <PhPlus :size="14" /> เพิ่ม Visitor
      </button>
    </div>

    <!-- Filters -->
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
            <option value="active">ใช้งานอยู่</option>
            <option value="inactive">ปิดการใช้งาน</option>
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
            <th>ชื่อ</th>
            <th>Card UID</th>
            <th class="center">สถานะบัตร</th>
            <th class="right">ยอดเงิน (฿)</th>
            <th class="center">สถานะ</th>
            <th class="center">วันที่ลงทะเบียน</th>
            <th class="center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="8" class="center" style="padding:32px;color:#CC3333;font-size:13px">{{ error }}</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="8" class="center" style="padding:64px;color:#AEAEB2;font-size:15px">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="v in paginated" :key="v.uid">
            <td><span class="adm-code">{{ v.uid }}</span></td>
            <td style="font-weight:500;color:#1C1C1E">{{ v.firstName }}{{ v.lastName ? ' ' + v.lastName : '' }}</td>
            <td>
              <span v-if="v.cardUid" class="adm-code" style="font-size:11px">{{ v.cardUid }}</span>
              <span v-else style="color:#AEAEB2;font-size:12px">ไม่มีบัตร</span>
            </td>
            <td class="center">
              <span v-if="v.cardUid" :class="['vis-badge', v.cardStatus === 'active' ? 'vis-badge-active' : 'vis-badge-inactive']">
                {{ v.cardStatus === 'active' ? 'ใช้งาน' : 'ปิด' }}
              </span>
              <span v-else style="color:#AEAEB2;font-size:12px">—</span>
            </td>
            <td class="right" style="font-weight:500">{{ v.balance.toLocaleString() }}</td>
            <td class="center">
              <span :class="['vis-badge', v.status === 'active' ? 'vis-badge-active' : 'vis-badge-inactive']">
                {{ v.status === 'active' ? 'ใช้งาน' : 'ปิด' }}
              </span>
            </td>
            <td class="center" style="font-size:12px;color:#AEAEB2">{{ formatDate(v.createdAt) }}</td>
            <td class="center">
              <button
                v-if="v.status === 'active'"
                class="vis-action-btn vis-action-deactivate"
                :disabled="actionLoading === v.uid"
                @click="setStatus(v, 'inactive')"
              >ปิดการใช้งาน</button>
              <button
                v-else
                class="vis-action-btn vis-action-activate"
                :disabled="actionLoading === v.uid"
                @click="setStatus(v, 'active')"
              >เปิดใช้งาน</button>
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
    <div v-if="showModal" class="vis-modal-overlay" @click.self="closeModal">
      <div class="vis-modal">
        <div class="vis-modal-header">
          <h3 class="vis-modal-title">เพิ่ม Visitor</h3>
          <button class="vis-modal-close" @click="closeModal">
            <PhX :size="18" />
          </button>
        </div>

        <div class="vis-modal-body">
          <!-- ชื่อ -->
          <div class="vis-field">
            <label class="promo-label">ชื่อ <span style="color:var(--color-danger)">*</span></label>
            <div class="flex gap-2">
              <input v-model="form.firstName" class="vis-input" :class="{ 'vis-input-error': submitted && !form.firstName.trim() }" placeholder="ชื่อ" style="flex:1" />
              <input v-model="form.lastName"  class="vis-input" :class="{ 'vis-input-error': submitted && !form.lastName.trim() }"  placeholder="นามสกุล" style="flex:1" />
            </div>
            <p v-if="submitted && (!form.firstName.trim() || !form.lastName.trim())" class="vis-field-error">กรุณากรอกชื่อและนามสกุล</p>
          </div>

          <!-- Card UID -->
          <div class="vis-field">
            <label class="promo-label">Card UID <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.cardUid" class="vis-input" :class="{ 'vis-input-error': submitted && !form.cardUid.trim() }" placeholder="เช่น 04:AB:CD:12:34:56" />
            <p v-if="submitted && !form.cardUid.trim()" class="vis-field-error">กรุณากรอก Card UID</p>
            <p v-else class="vis-hint">แตะบัตรที่เครื่องอ่าน หรือกรอก UID ด้วยตนเอง</p>
          </div>

          <!-- ยอดเงินเริ่มต้น -->
          <div class="vis-field">
            <label class="promo-label">ยอดเงินเริ่มต้น (฿)</label>
            <input
              v-model.number="form.initialBalance"
              type="number" min="0" step="10"
              class="vis-input"
              placeholder="0"
            />
          </div>

          <!-- Error -->
          <p v-if="formError" class="vis-form-error">{{ formError }}</p>
        </div>

        <div class="vis-modal-footer">
          <button class="vis-btn-cancel" @click="closeModal">ยกเลิก</button>
          <button class="vis-btn-save" :disabled="saving" @click="submitAdd">
            {{ saving ? 'กำลังบันทึก...' : 'ลงทะเบียน Visitor' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import api from '@/api/axios'

interface Visitor {
  _id:        string
  uid:        string
  firstName:  string
  lastName:   string
  status:     'active' | 'inactive'
  balance:    number
  cardUid:    string | null
  cardStatus: string | null
  createdAt:  string
}

const loading      = ref(false)
const error        = ref('')
const visitors     = ref<Visitor[]>([])
const search       = ref('')
const filterStatus = ref('')
const currentPage  = ref(1)
const pageSize     = ref(20)
const actionLoading = ref('')

const showModal = ref(false)
const saving    = ref(false)
const submitted = ref(false)
const formError = ref('')
const form = ref({ firstName: '', lastName: '', cardUid: '', initialBalance: 0 })

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
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()+543}`
}

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

  if (!form.value.firstName.trim() || !form.value.lastName.trim() || !form.value.cardUid.trim()) return

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

async function setStatus(v: Visitor, status: 'active' | 'inactive') {
  actionLoading.value = v.uid
  try {
    await api.patch(`/admin/visitors/${v.uid}/status`, { status })
    v.status = status
    if (status === 'inactive' && v.cardUid) v.cardStatus = 'inactive'
    else if (status === 'active' && v.cardUid)  v.cardStatus = 'active'
  } catch {
    // silently fail — table state unchanged
  } finally {
    actionLoading.value = ''
  }
}

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

.vis-badge { display:inline-block; padding:3px 10px; border-radius:100px; font-size:11px; font-weight:500; }
.vis-badge-active   { background:var(--color-success-bg); color:#028A60; }
.vis-badge-inactive { background:var(--color-danger-bg); color:#CC3333; }

.vis-action-btn {
  padding:5px 10px; border-radius:6px; font-size:12px; font-weight:500;
  border:none; cursor:pointer; font-family:inherit; transition:opacity 0.15s;
}
.vis-action-btn:disabled { opacity:0.5; cursor:default; }
.vis-action-deactivate { background:var(--color-danger-bg);  color:#CC3333; }
.vis-action-activate   { background:var(--color-success-bg); color:#028A60; }

/* Modal */
.vis-modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:500;
  display:flex; align-items:center; justify-content:center; padding:24px;
}
.vis-modal {
  background:#fff; border-radius:16px; width:100%; max-width:480px;
  box-shadow:0 20px 60px rgba(0,0,0,0.18); display:flex; flex-direction:column; overflow:hidden;
}
.vis-modal-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 20px; border-bottom:1px solid var(--color-border-tertiary);
}
.vis-modal-title { font-size:16px; font-weight:500; color:var(--color-text-primary); margin:0; }
.vis-modal-close {
  width:30px; height:30px; border-radius:8px; border:none; background:var(--color-bg-secondary);
  cursor:pointer; display:flex; align-items:center; justify-content:center; color:#8E8E93;
}
.vis-modal-close:hover { background:#E8E8E8; }

.vis-modal-body { padding:20px; display:flex; flex-direction:column; gap:16px; }

.vis-field { display:flex; flex-direction:column; gap:6px; }
.vis-input {
  height:38px; border:1px solid #E8E8E8; border-radius:8px; padding:0 12px;
  font-size:13px; color:#1C1C1E; font-family:inherit; outline:none; background:#fff;
}
.vis-input:focus { border-color:var(--color-primary); }
.vis-input-error { border-color: var(--color-danger) !important; }
.vis-input-error:focus { border-color: var(--color-danger) !important; }
.vis-field-error { font-size:11px; color:var(--color-danger); margin:0; }
.vis-hint { font-size:11px; color:#AEAEB2; margin:0; }

.vis-form-error {
  font-size:13px; color:#CC3333; background:var(--color-danger-bg);
  border-radius:8px; padding:10px 14px; margin:0;
}

.vis-modal-footer {
  display:flex; gap:10px; padding:16px 20px;
  border-top:1px solid var(--color-border-tertiary);
}
.vis-btn-cancel {
  flex:1; height:40px; border-radius:10px; border:1px solid var(--color-border-tertiary);
  background:#fff; color:var(--color-text-secondary); font-size:14px; font-weight:500;
  cursor:pointer; font-family:inherit;
}
.vis-btn-cancel:hover { background:var(--color-bg-secondary); }
.vis-btn-save {
  flex:2; height:40px; border-radius:10px; border:none;
  background:var(--color-primary); color:#fff; font-size:14px; font-weight:500;
  cursor:pointer; font-family:inherit; transition:opacity 0.15s;
}
.vis-btn-save:disabled { opacity:0.6; cursor:default; }
.vis-btn-save:hover:not(:disabled) { opacity:0.9; }
</style>
