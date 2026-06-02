<template>
  <div style="display:flex;flex-direction:column;gap:16px">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 style="font-size:22px;font-weight:500;color:#1C1C1E">จัดการผู้ใช้งาน</h2>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหาชื่อ / อีเมล..." @input="handleFilterChange" />
        <select v-model="filterRole" class="adm-filter-select" @change="handleFilterChange">
          <option value="">บทบาททั้งหมด</option>
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="cashier">Cashier</option>
          <option value="parent">Parent</option>
          <option value="student">Student</option>
        </select>
        <select v-model="filterStatus" class="adm-filter-select" @change="handleFilterChange">
          <option value="">สถานะทั้งหมด</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button class="adm-search-btn" @click="fetchUsers">ค้นหา</button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:52px">ลำดับ</th>
            <th>รหัสผู้ใช้</th>
            <th>ชื่อ-นามสกุล</th>
            <th>บทบาท</th>
            <th>อีเมล</th>
            <th class="center">สถานะ</th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center" style="padding:32px;color:#8E8E93">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="pagedUsers.length === 0">
            <td colspan="7" class="center" style="padding:32px;color:#8E8E93">ไม่มีรายการ</td>
          </tr>
          <tr v-for="(user, i) in pagedUsers" :key="user.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ user.id }}</span></td>
            <td style="font-weight:500;color:var(--color-primary)">{{ user.name }}</td>
            <td>
              <span :class="['adm-badge', `adm-badge-${user.role}`]">{{ user.role }}</span>
            </td>
            <td style="color:#3C3C43;font-size:13px">{{ user.email }}</td>
            <td class="center">
              <span class="adm-status">
                <span :class="['adm-dot', user.status === 'active' ? 'adm-dot-success' : 'adm-dot-gray']" />
                <span :style="{color: user.status==='active' ? '#028A60' : '#8E8E93'}">
                  {{ user.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                </span>
              </span>
            </td>
            <td>
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="editUser(user)">
                  <PhPencilSimple :size="15" />
                </button>
                <button
                  class="adm-action-btn"
                  :title="user.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
                  @click="toggleStatus(user, user.status !== 'active')"
                >
                  <PhToggleLeft v-if="user.status !== 'active'" :size="15" />
                  <PhToggleRight v-else :size="15" style="color:var(--color-primary)" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <span>ทั้งหมด {{ filteredUsers.length }} รายการ</span>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button
            v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage === p ? 'active' : '']"
            @click="currentPage = p"
          >{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { PhPencilSimple, PhToggleLeft, PhToggleRight } from '@phosphor-icons/vue'

const API_BASE = 'http://localhost:4000'

interface User {
  id: string
  name: string
  role: 'admin' | 'supervisor' | 'cashier' | 'parent' | 'student'
  email: string
  status: 'active' | 'inactive'
}

const DEMO_USERS: User[] = [
  { id: 'U001', name: 'สมชาย ใจดี', role: 'admin', email: 'somchai@school.ac.th', status: 'active' },
  { id: 'U002', name: 'วิภา รักเรียน', role: 'supervisor', email: 'wipa@school.ac.th', status: 'active' },
  { id: 'U003', name: 'ประยุทธ์ คำดี', role: 'cashier', email: 'prayuth@school.ac.th', status: 'active' },
  { id: 'U004', name: 'นิภา สุขใจ', role: 'parent', email: 'nipa@gmail.com', status: 'active' },
  { id: 'U005', name: 'เด็กหญิง มานี', role: 'student', email: 'manee@student.ac.th', status: 'active' },
  { id: 'U006', name: 'เด็กชาย มานะ', role: 'student', email: 'mana@student.ac.th', status: 'inactive' },
]

const users = ref<User[]>([])
const loading = ref(false)
const togglingId = ref<string | null>(null)

const search = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    const matchSearch =
      !search.value ||
      u.name.toLowerCase().includes(search.value.toLowerCase()) ||
      u.email.toLowerCase().includes(search.value.toLowerCase())
    const matchRole = !filterRole.value || u.role === filterRole.value
    const matchStatus = !filterStatus.value || u.status === filterStatus.value
    return matchSearch && matchRole && matchStatus
  })
})

const pagedUsers  = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)))

function handleFilterChange() {
  currentPage.value = 1
}

watch([search, filterRole, filterStatus], () => {
  currentPage.value = 1
})

interface RoleBadgeStyle {
  background: string
  color: string
  borderRadius: string
  padding: string
  fontSize: string
  fontWeight: string
}

function roleBadgeStyle(role: string): RoleBadgeStyle {
  const map: Record<string, { bg: string; text: string }> = {
    admin:      { bg: 'rgba(18,100,227,0.10)',  text: '#1264E3' },
    supervisor: { bg: 'rgba(88,86,214,0.10)',   text: '#5856D6' },
    cashier:    { bg: 'rgba(255,149,0,0.12)',   text: '#B35900' },
    parent:     { bg: 'rgba(52,199,89,0.12)',   text: '#1A7F3C' },
    student:    { bg: 'rgba(90,200,250,0.15)',  text: '#0069A3' },
  }
  const c = map[role] ?? { bg: '#F2F2F7', text: '#6E6E73' }
  return {
    background: c.bg,
    color: c.text,
    borderRadius: '6px',
    padding: '3px 9px',
    fontSize: '12px',
    fontWeight: '600',
  }
}

async function toggleStatus(user: User, active: boolean) {
  togglingId.value = user.id
  const newStatus = active ? 'active' : 'inactive'
  try {
    const res = await fetch(`${API_BASE}/users/${user.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      user.status = newStatus
      ElMessage.success(`อัปเดตสถานะเป็น ${newStatus}`)
    } else {
      user.status = newStatus
      ElMessage.warning('API ไม่พร้อม — อัปเดตเฉพาะ UI')
    }
  } catch {
    user.status = newStatus
    ElMessage.warning('API ไม่พร้อม — อัปเดตเฉพาะ UI')
  } finally {
    togglingId.value = null
  }
}

function editUser(user: User) {
  ElMessage.info(`แก้ไขผู้ใช้: ${user.name}`)
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filterRole.value) params.set('role', filterRole.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (search.value) params.set('search', search.value)
    const res = await fetch(`${API_BASE}/users?${params}`)
    if (res.ok) {
      const data = await res.json()
      users.value = Array.isArray(data) ? data : data.data ?? DEMO_USERS
    } else {
      users.value = DEMO_USERS
    }
  } catch {
    users.value = DEMO_USERS
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
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

/* keep old classes for compat */
.users-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Filter card */
.filter-card {
  padding: 14px 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-input {
  max-width: 240px;
  flex: 1;
}

.filter-select {
  width: 150px;
}

.filter-select--sm {
  width: 130px;
}

.search-btn {
  height: 32px;
  padding: 0 18px;
  background: #1264E3;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.search-btn:hover {
  background: #0F52C1;
}

/* Table card */
.table-card {
  padding: 0;
  overflow: hidden;
}

.table-card :deep(.el-table) {
  border-radius: 0;
}

.table-card :deep(.el-table__row:hover > td) {
  background: rgba(18, 100, 227, 0.04) !important;
}

.table-card :deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid rgba(198, 198, 200, 0.25);
}

.uid {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #AEAEB2;
  background: #F2F2F7;
  padding: 2px 6px;
  border-radius: 5px;
}

.role-badge {
  display: inline-block;
  text-transform: capitalize;
}

.edit-btn {
  height: 28px;
  padding: 0 14px;
  background: rgba(18, 100, 227, 0.10);
  color: #1264E3;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.edit-btn:hover {
  background: rgba(18, 100, 227, 0.18);
}

/* Pagination */
.pagination-row {
  padding: 14px 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid rgba(198, 198, 200, 0.25);
}

.pagination-row :deep(.el-pagination.is-background .el-pager li.is-active) {
  background: #1264E3 !important;
}
</style>
