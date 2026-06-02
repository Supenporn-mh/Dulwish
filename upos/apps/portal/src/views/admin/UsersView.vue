<template>
  <div class="users-view">
    <!-- Section header -->
    <div class="ios-section-header">จัดการผู้ใช้งาน</div>

    <!-- Filter card -->
    <div class="ios-card filter-card">
      <div class="filter-row">
        <el-input
          v-model="search"
          placeholder="ค้นหาชื่อ / อีเมล"
          clearable
          class="filter-input"
          @input="handleFilterChange"
        >
          <template #prefix>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:2px">
              <circle cx="6" cy="6" r="5" stroke="#AEAEB2" stroke-width="1.5"/>
              <path d="M10 10l2.5 2.5" stroke="#AEAEB2" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </template>
        </el-input>

        <el-select
          v-model="filterRole"
          placeholder="บทบาท"
          clearable
          class="filter-select"
          @change="handleFilterChange"
        >
          <el-option label="ทั้งหมด" value="" />
          <el-option label="Admin" value="admin" />
          <el-option label="Supervisor" value="supervisor" />
          <el-option label="Cashier" value="cashier" />
          <el-option label="Parent" value="parent" />
          <el-option label="Student" value="student" />
        </el-select>

        <el-select
          v-model="filterStatus"
          placeholder="สถานะ"
          clearable
          class="filter-select filter-select--sm"
          @change="handleFilterChange"
        >
          <el-option label="ทั้งหมด" value="" />
          <el-option label="Active" value="active" />
          <el-option label="Inactive" value="inactive" />
        </el-select>

        <button class="search-btn" @click="fetchUsers">
          ค้นหา
        </button>
      </div>
    </div>

    <!-- Table card -->
    <div class="ios-card table-card">
      <el-table
        v-loading="loading"
        :data="pagedUsers"
        style="width: 100%"
        :header-cell-style="{
          background: '#F2F2F7',
          color: '#6E6E73',
          fontWeight: '600',
          fontSize: '13px',
          borderBottom: '1px solid rgba(198,198,200,0.4)'
        }"
        :cell-style="{ fontSize: '14px', color: '#000000' }"
        :row-style="{ cursor: 'default' }"
      >
        <el-table-column label="UID" prop="id" min-width="80">
          <template #default="{ row }">
            <span class="uid">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="ชื่อ" prop="name" min-width="150">
          <template #default="{ row }">
            <span style="font-weight:500; color:#000000">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="บทบาท" prop="role" min-width="120">
          <template #default="{ row }">
            <span
              class="role-badge"
              :style="roleBadgeStyle(row.role)"
            >{{ row.role }}</span>
          </template>
        </el-table-column>

        <el-table-column label="อีเมล" prop="email" min-width="200">
          <template #default="{ row }">
            <span style="font-size:13px; color:#3C3C43">{{ row.email }}</span>
          </template>
        </el-table-column>

        <el-table-column label="สถานะ" prop="status" min-width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :loading="togglingId === row.id"
              style="--el-switch-on-color: #1264E3; --el-switch-off-color: #C6C6C8"
              @change="(val: boolean) => toggleStatus(row, val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="จัดการ" min-width="100" align="center">
          <template #default="{ row }">
            <button class="edit-btn" @click="editUser(row)">แก้ไข</button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-row">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredUsers.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'

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

const pagedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})

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
