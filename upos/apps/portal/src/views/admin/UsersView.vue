<template>
  <div class="users-layout">

    <!-- Left: table -->
    <div class="users-main">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3" style="margin-bottom:16px">
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการผู้ใช้งาน</h2>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAdd">
          <PhPlus :size="14" /> เพิ่มข้อมูล
        </button>
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
              <td class="num center">{{ (currentPage-1)*pageSize.value + i + 1 }}</td>
              <td><span class="adm-code">{{ u.employeeCode }}</span></td>
              <td>
                <div style="font-weight:500;color:var(--color-primary)">{{ u.firstName }} {{ u.lastName }}</div>
                <div style="font-size:11px;color:var(--color-text-tertiary)">{{ u.username }}</div>
              </td>
              <td class="center">
                <span class="u-role-badge" :class="`role-${u.role}`">{{ roleLabel(u.role) }}</span>
              </td>
              <td style="font-size:13px;color:var(--color-text-secondary)">{{ u.phone || '—' }}</td>
              <td style="font-size:13px;color:var(--color-text-secondary)">{{ u.branch || '—' }}</td>
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
                  <button class="adm-action-btn danger" title="ลบ" @click="deleteUser(u)">
                    <PhTrash :size="14" />
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

    <!-- Right: form panel -->
    <Transition name="panel-slide">
      <div v-if="showForm" class="users-panel">
        <div class="panel-header">
          <h3 class="panel-title">{{ editTarget ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล' }}</h3>
          <button class="panel-close" @click="closeForm"><PhX :size="18" weight="bold" /></button>
        </div>
        <div class="panel-body">

          <!-- รหัสพนักงาน -->
          <div class="pf-field">
            <label class="pf-label">รหัสพนักงาน <span class="pf-req">*</span></label>
            <input v-model="form.employeeCode" class="pf-input" placeholder="กรุณาระบุรหัสพนักงาน" />
          </div>

          <!-- ชื่อ -->
          <div class="pf-field">
            <label class="pf-label">ชื่อ <span class="pf-req">*</span></label>
            <input v-model="form.firstName" class="pf-input" />
          </div>

          <!-- นามสกุล -->
          <div class="pf-field">
            <label class="pf-label">นามสกุล <span class="pf-req">*</span></label>
            <input v-model="form.lastName" class="pf-input" />
          </div>

          <!-- เบอร์ติดต่อ -->
          <div class="pf-field">
            <label class="pf-label">เบอร์ติดต่อ <span class="pf-req">*</span></label>
            <input v-model="form.phone" class="pf-input" inputmode="tel" placeholder="0812345678" />
          </div>

          <!-- สิทธิ์การใช้งาน -->
          <div class="pf-field">
            <label class="pf-label">สิทธิ์การใช้งาน <span class="pf-req">*</span></label>
            <select v-model="form.role" class="pf-input pf-select">
              <option value="" disabled>เลือกสิทธิ์การใช้งาน</option>
              <option value="admin">admin</option>
              <option value="supervisor">supervisor</option>
              <option value="cashier">cashier</option>
            </select>
          </div>

          <!-- Select Branches -->
          <div class="pf-field">
            <label class="pf-label">Select Branches <span class="pf-req">*</span></label>
            <select v-model="form.branch" class="pf-input pf-select">
              <option value="" disabled>เลือกสาขา</option>
              <option value="Headquarter">Headquarter (00000)</option>
            </select>
          </div>

          <!-- Username -->
          <div class="pf-field">
            <label class="pf-label">Username <span class="pf-req">*</span></label>
            <input v-model="form.username" class="pf-input" autocomplete="off" />
          </div>

          <!-- Password -->
          <div class="pf-field">
            <label class="pf-label">Password <span class="pf-req">*</span></label>
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
            <p v-else class="pf-hint">
              Password must be a combination of lower-case, upper-case, numbers, symbols and at least 8 characters long
            </p>
          </div>

          <!-- แสดง toggle -->
          <div class="pf-field pf-toggle-row">
            <label class="pf-label">แสดง</label>
            <button
              :class="['pf-toggle', form.status === 'active' ? 'pf-toggle-on' : '']"
              @click="form.status = form.status === 'active' ? 'inactive' : 'active'"
              type="button"
            >
              <span class="pf-toggle-thumb" />
            </button>
          </div>

        </div>

        <!-- Footer -->
        <div class="panel-footer">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" style="flex:1" @click="closeForm">ยกเลิก</button>
          <button class="adm-hdr-btn adm-hdr-btn-primary" style="flex:1" :disabled="!canSave" @click="saveUser">
            บันทึก
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash, PhX, PhEye, PhEyeSlash } from '@phosphor-icons/vue'

interface User {
  id:           string
  employeeCode: string
  firstName:    string
  lastName:     string
  phone:        string
  role:         'admin' | 'supervisor' | 'cashier'
  branch:       string
  username:     string
  status:       'active' | 'inactive'
}

const DEMO: User[] = [
  { id:'1', employeeCode:'EMP-001', firstName:'สมชาย',  lastName:'ใจดี',    phone:'0811111111', role:'admin',      branch:'Headquarter', username:'admin',    status:'active'   },
  { id:'2', employeeCode:'EMP-002', firstName:'วิภา',   lastName:'รักเรียน',phone:'0822222222', role:'supervisor', branch:'Headquarter', username:'patcha',   status:'active'   },
  { id:'3', employeeCode:'EMP-003', firstName:'หนอง',   lastName:'แคชเชียร์',phone:'0833333333',role:'cashier',    branch:'Headquarter', username:'nong',     status:'active'   },
]

const users       = ref<User[]>([])
const loading     = ref(false)
const search      = ref('')
const filterRole  = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize    = ref(10)

const showForm   = ref(false)
const editTarget = ref<User | null>(null)
const showPw     = ref(false)

const form = ref({
  employeeCode: '', firstName: '', lastName: '',
  phone: '', role: '' as any, branch: '',
  username: '', password: '', status: 'active' as 'active' | 'inactive',
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

const canSave = computed(() =>
  form.value.employeeCode && form.value.firstName && form.value.lastName &&
  form.value.phone && form.value.role && form.value.branch &&
  form.value.username && form.value.password && !pwError.value
)

// ── Methods ───────────────────────────────────────────────────────────────────
function roleLabel(r: string) {
  return r === 'admin' ? 'Admin' : r === 'supervisor' ? 'Supervisor' : 'Cashier'
}

function openAdd() {
  editTarget.value = null
  form.value = { employeeCode:'', firstName:'', lastName:'', phone:'', role:'', branch:'', username:'', password:'', status:'active' }
  showPw.value = false
  showForm.value = true
}

function openEdit(u: User) {
  editTarget.value = u
  form.value = { employeeCode: u.employeeCode, firstName: u.firstName, lastName: u.lastName, phone: u.phone, role: u.role, branch: u.branch, username: u.username, password:'', status: u.status }
  showPw.value = false
  showForm.value = true
}

function closeForm() { showForm.value = false }

function saveUser() {
  if (!canSave.value) return
  if (editTarget.value) {
    const idx = users.value.findIndex(u => u.id === editTarget.value!.id)
    if (idx >= 0) users.value[idx] = { ...users.value[idx], ...form.value }
  } else {
    users.value.unshift({
      id: String(Date.now()),
      employeeCode: form.value.employeeCode,
      firstName:    form.value.firstName,
      lastName:     form.value.lastName,
      phone:        form.value.phone,
      role:         form.value.role,
      branch:       form.value.branch,
      username:     form.value.username,
      status:       form.value.status,
    })
  }
  closeForm()
}

function deleteUser(u: User) {
  users.value = users.value.filter(x => x.id !== u.id)
}

onMounted(() => { users.value = DEMO })
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.users-layout {
  display: flex; gap: 20px; align-items: flex-start;
}
.users-main { flex: 1; min-width: 0; }

/* ── Panel ──────────────────────────────────────────────────────────────────── */
.users-panel {
  width: 320px; flex-shrink: 0;
  background: #fff; border-radius: 12px;
  border: 1px solid var(--color-border-tertiary);
  display: flex; flex-direction: column;
  max-height: calc(100vh - 100px); overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--color-border-tertiary);
  flex-shrink: 0;
}
.panel-title { font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
.panel-close {
  background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);
  padding: 4px; border-radius: 6px; display: flex; align-items: center;
}
.panel-close:hover { background: #F2F2F7; }

.panel-body {
  flex: 1; overflow-y: auto;
  padding: 16px 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.panel-footer {
  padding: 14px 20px; border-top: 1px solid var(--color-border-tertiary);
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

.pf-toggle-row { flex-direction: row; align-items: center; gap: 10px; }
.pf-toggle {
  width: 40px; height: 22px; border-radius: 100px; border: none; cursor: pointer;
  background: #D1D1D6; position: relative; transition: background 0.2s; flex-shrink: 0;
  padding: 0;
}
.pf-toggle-on    { background: var(--color-primary); }
.pf-toggle-thumb {
  width: 18px; height: 18px; border-radius: 50%; background: #fff;
  position: absolute; top: 2px; left: 2px;
  transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.pf-toggle-on .pf-toggle-thumb { transform: translateX(18px); }

/* ── Role badge ──────────────────────────────────────────────────────────────── */
.u-role-badge {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 500;
}
.role-admin      { background: var(--color-primary-tint); color: var(--color-primary); }
.role-supervisor { background: #EDE9FE; color: #5B21B6; }
.role-cashier    { background: var(--color-warning-bg); color: #B35900; }

/* ── Transition ──────────────────────────────────────────────────────────────── */
.panel-slide-enter-active, .panel-slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.panel-slide-enter-from, .panel-slide-leave-to       { opacity: 0; transform: translateX(20px); }
</style>
