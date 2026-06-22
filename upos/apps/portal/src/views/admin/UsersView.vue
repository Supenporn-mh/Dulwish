<template>
  <div class="users-layout">

    <!-- Table -->
    <div class="users-main">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3" style="margin-bottom:16px">
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการผู้ใช้งาน</h2>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAdd">
          <PhPlus :size="14" /> เพิ่มข้อมูล
        </button>
      </div>

      <!-- Error banner -->
      <div v-if="loadError" style="padding:10px 14px;border-radius:8px;background:var(--color-danger-bg,#FEE2E2);color:var(--color-danger,#CC3333);font-size:13px;margin-bottom:12px">
        {{ loadError }}
      </div>

      <!-- Filters -->
      <div class="adm-table-wrap p-4" style="border-radius:10px;margin-bottom:16px">
        <div class="flex flex-wrap gap-3">
          <input v-model="search" class="adm-filter-input" placeholder="ค้นหาชื่อ / รหัสพนักงาน..." style="min-width:200px" />
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
              <th>รหัสพนักงาน</th>
              <th>ชื่อ-นามสกุล</th>
              <th class="center">บทบาท</th>
              <th>เบอร์ติดต่อ</th>
              <th>สาขา</th>
              <th class="center">สถานะ</th>
              <th class="center" style="width:90px">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="center" style="padding:32px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
            </tr>
            <tr v-else-if="paged.length === 0">
              <td colspan="8" class="center" style="padding:32px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
            </tr>
            <tr v-for="(u, i) in paged" :key="u.id">
              <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
              <td><span class="adm-code">{{ u.employeeCode }}</span></td>
              <td>
                <div style="font-weight:500;color:var(--color-primary)">{{ u.firstName }} {{ u.lastName }}</div>
                <div style="font-size:11px;color:var(--color-text-tertiary)">{{ u.email }}</div>
              </td>
              <td class="center">
                <span class="u-role-badge" :class="`role-${u.role}`">{{ roleLabel(u.role) }}</span>
              </td>
              <td style="font-size:13px;color:var(--color-text-secondary)">{{ u.phone || '—' }}</td>
              <td style="font-size:13px;color:var(--color-text-secondary)">{{ u.branchCode || '—' }}</td>
              <td class="center">
                <span class="adm-status">
                  <span :class="['adm-dot', u.status === 'active' ? 'adm-dot-success' : 'adm-dot-gray']" />
                  <span :style="{color: u.status==='active' ? '#028A60' : '#8E8E93'}">
                    {{ u.status === 'active' ? 'เปิดใช้' : 'ปิดใช้' }}
                  </span>
                </span>
              </td>
              <td>
                <div class="adm-actions">
                  <button class="adm-action-btn" title="แก้ไข" @click="openEdit(u)">
                    <PhPencilSimple :size="14" />
                  </button>
                  <button
                    :class="['adm-action-btn', u.status === 'active' ? 'danger' : 'success']"
                    :title="u.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
                    :disabled="!!togglingStatus[u.id]"
                    @click="toggleStatus(u)"
                  >
                    <PhProhibit v-if="u.status === 'active'" :size="14" />
                    <PhCheckCircle v-else :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
              :class="['adm-page-btn', currentPage===p ? 'active' : '']"
              @click="currentPage=p">{{ p }}</button>
            <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showForm" class="modal-backdrop" @click="closeForm" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showForm" class="users-modal">
          <div class="panel-header">
            <h3 class="panel-title">{{ editTarget ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล' }}</h3>
            <button class="panel-close" @click="closeForm"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="panel-body">

            <!-- ชื่อ + นามสกุล -->
            <div style="display:flex;gap:12px">
              <div class="pf-field" style="flex:1">
                <label class="pf-label">ชื่อ <span class="pf-req">*</span></label>
                <input v-model="form.firstName" class="pf-input" />
              </div>
              <div class="pf-field" style="flex:1">
                <label class="pf-label">นามสกุล <span class="pf-req">*</span></label>
                <input v-model="form.lastName" class="pf-input" />
              </div>
            </div>

            <!-- อีเมล -->
            <div class="pf-field">
              <label class="pf-label">อีเมล <span class="pf-req">*</span></label>
              <input v-model="form.email" class="pf-input" type="email" placeholder="email@example.com" autocomplete="off" />
            </div>

            <!-- สิทธิ์การใช้งาน + สาขา -->
            <div style="display:flex;gap:12px">
              <div class="pf-field" style="flex:1">
                <label class="pf-label">สิทธิ์การใช้งาน <span class="pf-req">*</span></label>
                <select v-model="form.role" class="pf-input pf-select">
                  <option value="" disabled>เลือกสิทธิ์การใช้งาน</option>
                  <option value="admin">admin</option>
                  <option value="supervisor">supervisor</option>
                  <option value="cashier">cashier</option>
                </select>
              </div>
              <div class="pf-field" style="flex:1">
                <label class="pf-label">สาขา</label>
                <select v-model="form.branchCode" class="pf-input pf-select">
                  <option value="">ไม่ระบุสาขา</option>
                  <option v-for="b in branches" :key="b.code" :value="b.code">{{ b.name }} ({{ b.code }})</option>
                </select>
              </div>
            </div>

            <!-- รหัสบัตร RFID -->
            <div class="pf-field">
              <label class="pf-label">รหัสบัตร RFID</label>
              <input v-model="form.cardUid" class="pf-input" style="font-family:monospace" placeholder="UID บัตร (ถ้ามี)" />
            </div>

            <!-- Password -->
            <div class="pf-field">
              <label class="pf-label">Password <span v-if="!editTarget" class="pf-req">*</span><span v-else style="font-size:11px;color:var(--color-text-tertiary)"> (เว้นว่างถ้าไม่เปลี่ยน)</span></label>
              <div class="pf-pw-wrap">
                <input
                  v-model="form.password"
                  :type="showPw ? 'text' : 'password'"
                  class="pf-input"
                  :class="{ 'pf-input-error': pwError }"
                  autocomplete="new-password"
                />
                <button class="pf-pw-eye" @click="showPw = !showPw" type="button">
                  <PhEye v-if="!showPw" :size="16" />
                  <PhEyeSlash v-else :size="16" />
                </button>
              </div>
              <p v-if="pwError" class="pf-error">{{ pwError }}</p>
              <p v-else class="pf-hint">Password must be a combination of lower-case, upper-case, numbers, symbols and at least 8 characters long</p>
            </div>

            <!-- Error -->
            <p v-if="saveError" class="pf-error">{{ saveError }}</p>

          </div>

          <!-- Footer -->
          <div class="panel-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" style="flex:1" @click="closeForm">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" style="flex:1" :disabled="!canSave || saving" @click="saveUser">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm deactivate modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showConfirm" class="modal-backdrop" @click="showConfirm = false; confirmTarget = null" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showConfirm && confirmTarget" class="confirm-modal">
          <div class="confirm-icon">
            <PhWarning :size="32" weight="fill" style="color: var(--color-warning)" />
          </div>
          <h3 class="confirm-title">
            {{ confirmTarget.status === 'active' ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน' }}
          </h3>
          <p class="confirm-body">
            ต้องการ{{ confirmTarget.status === 'active' ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน' }}
            <strong>{{ confirmTarget.firstName }} {{ confirmTarget.lastName }}</strong> ใช่หรือไม่?
          </p>
          <div class="confirm-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" style="flex:1" @click="showConfirm = false; confirmTarget = null">ยกเลิก</button>
            <button
              class="adm-hdr-btn"
              :class="confirmTarget.status === 'active' ? 'adm-hdr-btn-danger' : 'adm-hdr-btn-primary'"
              style="flex:1"
              :disabled="!!togglingStatus[confirmTarget.id]"
              @click="confirmToggle"
            >
              {{ togglingStatus[confirmTarget.id] ? 'กำลังบันทึก...' : (confirmTarget.status === 'active' ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhX, PhEye, PhEyeSlash, PhProhibit, PhCheckCircle, PhWarning } from '@phosphor-icons/vue'
import api from '@/api/axios'

interface StaffUser {
  _id:          string
  id:           string
  employeeCode: string
  firstName:    string
  lastName:     string
  email:        string
  phone:        string
  role:         string
  branchCode:   string
  cardUid:      string
  status:       'active' | 'inactive'
}

interface Branch {
  code: string
  name: string
}

const STAFF_ROLES = ['admin', 'supervisor', 'cashier']

const users         = ref<StaffUser[]>([])
const branches      = ref<Branch[]>([])
const loading       = ref(false)
const loadError     = ref('')
const search        = ref('')
const filterRole    = ref('')
const filterStatus  = ref('')
const currentPage   = ref(1)
const pageSize      = ref(10)
const togglingStatus = ref<Record<string, boolean>>({})

const showForm   = ref(false)
const editTarget = ref<StaffUser | null>(null)
const showPw     = ref(false)
const saving     = ref(false)
const saveError  = ref('')

const form = ref({
  firstName: '', lastName: '', email: '',
  role: '' as string, branchCode: '', cardUid: '', password: '',
})

// ── Data loading ──────────────────────────────────────────────────────────────
async function fetchUsers() {
  loading.value   = true
  loadError.value = ''
  try {
    const res = await api.get('/users')
    const raw: any[] = res.data?.users ?? res.data ?? []
    users.value = raw
      .filter((u: any) => STAFF_ROLES.includes(u.role ?? ''))
      .map((u: any): StaffUser => ({
        _id:          String(u._id ?? u.id ?? ''),
        id:           u.uid ?? u._id ?? u.id ?? '',
        employeeCode: u.uid ?? u._id ?? u.id ?? '',
        firstName:    u.firstName ?? u.first_name ?? '',
        lastName:     u.lastName  ?? u.last_name  ?? '',
        email:        u.email     ?? '',
        phone:        u.phone     ?? '',
        role:         u.role      ?? '',
        branchCode:   u.branchCode ?? u.branch ?? '',
        cardUid:      u.cardUid   ?? u.card_uid ?? '',
        status:       u.status    ?? 'active',
      }))
  } catch {
    loadError.value = 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ'
    users.value = []
  } finally {
    loading.value = false
  }
}

async function fetchBranches() {
  try {
    const res = await api.get('/settings/branches')
    const raw: any[] = res.data?.branches ?? res.data ?? []
    branches.value = raw.map((b: any): Branch => ({
      code: b.code ?? b.branchCode ?? '',
      name: b.name ?? b.branchName ?? '',
    }))
  } catch {
    branches.value = []
  }
}

onMounted(() => {
  fetchUsers()
  fetchBranches()
})

// ── Computed ──────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter(u => {
    const matchQ = !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.employeeCode.toLowerCase().includes(q)
    const matchR = !filterRole.value   || u.role   === filterRole.value
    const matchS = !filterStatus.value || u.status === filterStatus.value
    return matchQ && matchR && matchS
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged      = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))

const pwError = computed(() => {
  const pw = form.value.password
  if (!pw) return ''
  if (pw.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
  if (!/[a-z]/.test(pw)) return 'ต้องมีตัวพิมพ์เล็ก'
  if (!/[A-Z]/.test(pw)) return 'ต้องมีตัวพิมพ์ใหญ่'
  if (!/[0-9]/.test(pw)) return 'ต้องมีตัวเลข'
  if (!/[^a-zA-Z0-9]/.test(pw)) return 'ต้องมีสัญลักษณ์พิเศษ'
  return ''
})

const canSave = computed(() => {
  const f = form.value
  if (!f.firstName || !f.lastName || !f.email || !f.role) return false
  if (!editTarget.value) {
    // create: password required
    if (!f.password || !!pwError.value) return false
  } else {
    // edit: if password provided it must be valid
    if (f.password && !!pwError.value) return false
  }
  return true
})

// ── Methods ───────────────────────────────────────────────────────────────────
function roleLabel(r: string) {
  const map: Record<string, string> = {
    admin: 'Admin', supervisor: 'Supervisor', cashier: 'Cashier',
  }
  return map[r] ?? r
}

function openAdd() {
  editTarget.value = null
  form.value = { firstName: '', lastName: '', email: '', role: '', branchCode: '', cardUid: '', password: '' }
  showPw.value  = false
  saveError.value = ''
  showForm.value  = true
}

function openEdit(u: StaffUser) {
  editTarget.value = u
  form.value = { firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, branchCode: u.branchCode, cardUid: u.cardUid, password: '' }
  showPw.value  = false
  saveError.value = ''
  showForm.value  = true
}

function closeForm() { showForm.value = false }

async function saveUser() {
  if (!canSave.value || saving.value) return
  saving.value    = true
  saveError.value = ''
  try {
    if (editTarget.value) {
      // PATCH /admin/staff/:uid
      const body: Record<string, any> = {
        firstName: form.value.firstName,
        lastName:  form.value.lastName,
        email:     form.value.email,
      }
      if (form.value.cardUid) body.cardUid = form.value.cardUid
      await api.patch(`/admin/staff/${editTarget.value.id}`, body)
    } else {
      // POST /admin/staff
      const body: Record<string, any> = {
        firstName: form.value.firstName,
        lastName:  form.value.lastName,
        email:     form.value.email,
        role:      form.value.role,
        password:  form.value.password,
      }
      if (form.value.branchCode) body.branchCode = form.value.branchCode
      if (form.value.cardUid)    body.cardUid    = form.value.cardUid
      await api.post('/admin/staff', body)
    }
    await fetchUsers()
    closeForm()
  } catch (err: any) {
    saveError.value = err?.response?.data?.message ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    saving.value = false
  }
}

// Confirm modal
const showConfirm   = ref(false)
const confirmTarget = ref<StaffUser | null>(null)

function toggleStatus(u: StaffUser) {
  confirmTarget.value = u
  showConfirm.value   = true
}

async function confirmToggle() {
  const u = confirmTarget.value
  if (!u || togglingStatus.value[u.id]) return
  const newStatus: 'active' | 'inactive' = u.status === 'active' ? 'inactive' : 'active'
  togglingStatus.value[u.id] = true
  showConfirm.value = false
  try {
    await api.patch(`/users/${u._id}/status`, { status: newStatus })
    await fetchUsers()
  } catch {
    loadError.value = 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    togglingStatus.value[u.id] = false
    confirmTarget.value = null
  }
}
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.users-layout { display: flex; flex-direction: column; }
.users-main   { flex: 1; min-width: 0; }

/* ── Modal ──────────────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4);
}
.users-modal {
  position: fixed; top: 50%; left: 50%; z-index: 201;
  transform: translate(-50%, -50%);
  background: #fff; border-radius: 16px;
  width: calc(100vw - 48px); max-width: 520px;
  max-height: 90vh; overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border-tertiary);
  flex-shrink: 0;
}
.panel-title { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
.panel-close {
  background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);
  padding: 4px; border-radius: 6px; display: flex; align-items: center;
}
.panel-close:hover { background: #F2F2F7; }

.panel-body {
  flex: 1; overflow-y: auto;
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 14px;
}
.panel-footer {
  padding: 16px 24px 20px; border-top: 1px solid var(--color-border-tertiary);
  display: flex; gap: 10px; flex-shrink: 0;
}

/* ── Form fields ─────────────────────────────────────────────────────────────── */
.pf-field    { display: flex; flex-direction: column; gap: 5px; }
.pf-label    { font-size: 12px; color: var(--color-text-secondary); font-weight: 400; }
.pf-req      { color: var(--color-danger); }
.pf-input {
  width: 100%; height: 38px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--color-border-tertiary);
  font-size: 14px; color: var(--color-text-primary);
  outline: none; font-family: inherit; background: #fff;
  transition: border-color 0.15s;
}
.pf-input:focus      { border-color: var(--color-primary); }
.pf-input-error      { border-color: var(--color-danger) !important; }
.pf-select           { cursor: pointer; }

.pf-pw-wrap { position: relative; }
.pf-pw-wrap .pf-input { padding-right: 40px; }
.pf-pw-eye {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: var(--color-text-tertiary); display: flex; align-items: center;
}

.pf-hint  { font-size: 11px; color: var(--color-text-tertiary); line-height: 1.4; }
.pf-error { font-size: 11px; color: var(--color-danger); }

/* ── Role badge ──────────────────────────────────────────────────────────────── */
.u-role-badge {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 500;
}
.role-admin      { background: var(--color-primary-tint); color: var(--color-primary); }
.role-supervisor { background: #EDE9FE; color: #5B21B6; }
.role-cashier    { background: var(--color-warning-bg); color: #B35900; }
.role-teacher    { background: #ECFDF5; color: #065F46; }
.role-staff      { background: #F3F4F6; color: #374151; }

/* ── Confirm modal ───────────────────────────────────────────────────────────── */
.confirm-modal {
  position: fixed; top: 50%; left: 50%; z-index: 201;
  transform: translate(-50%, -50%);
  background: var(--color-bg-surface); border-radius: 16px;
  width: calc(100vw - 48px); max-width: 360px;
  padding: 28px 24px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  box-shadow: var(--shadow-modal, 0 16px 48px rgba(0,0,0,0.18));
  text-align: center;
}
.confirm-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--color-warning-bg);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.confirm-title { font-size: 17px; font-weight: 600; color: var(--color-text-primary); margin: 0; }
.confirm-body  { font-size: 14px; color: var(--color-text-secondary); line-height: 1.5; margin: 0 0 8px; }
.confirm-footer { display: flex; gap: 10px; width: 100%; margin-top: 4px; }
.adm-hdr-btn-danger {
  background: var(--color-danger, #CC3333); color: #fff; border: none;
}
.adm-hdr-btn-danger:hover:not(:disabled) { background: #a52828; }

/* ── Transitions ─────────────────────────────────────────────────────────────── */
.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to       { opacity: 0; }
.modal-up-enter-active, .modal-up-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-enter-from, .modal-up-leave-to       { opacity: 0; transform: translate(-50%, -48%); }
</style>
