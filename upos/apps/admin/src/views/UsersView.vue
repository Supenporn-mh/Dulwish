<template>
  <AppLayout>
    <div class="users-view" v-loading="loading">
      <!-- Filters -->
      <el-card shadow="never" class="filter-card">
        <div class="filter-row">
          <el-input
            v-model="filters.search"
            placeholder="Search by name or email..."
            clearable
            :prefix-icon="Search"
            style="width: 280px"
            @input="debouncedFetch"
          />
          <el-select
            v-model="filters.role"
            placeholder="All Roles"
            clearable
            style="width: 160px"
            @change="fetchUsers"
          >
            <el-option label="Admin" value="admin" />
            <el-option label="Cashier" value="cashier" />
            <el-option label="Manager" value="manager" />
            <el-option label="Teacher" value="teacher" />
          </el-select>
          <el-select
            v-model="filters.status"
            placeholder="All Status"
            clearable
            style="width: 140px"
            @change="fetchUsers"
          >
            <el-option label="Active" value="active" />
            <el-option label="Inactive" value="inactive" />
          </el-select>
          <el-button type="primary" @click="fetchUsers" :icon="Refresh">Refresh</el-button>
          <div class="spacer" />
          <span class="total-label">{{ total }} users</span>
        </div>
      </el-card>

      <!-- Table -->
      <el-card shadow="never" class="table-card">
        <el-table
          :data="users"
          stripe
          style="width: 100%"
          :empty-text="loading ? 'Loading...' : 'No users found'"
        >
          <el-table-column label="UID" prop="uid" width="160" />
          <el-table-column label="Name" prop="name" min-width="160" />
          <el-table-column label="Role" prop="role" width="110">
            <template #default="{ row }">
              <el-tag :type="roleTagType(row.role)" size="small" effect="light">
                {{ row.role }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Email" prop="email" min-width="200" />
          <el-table-column label="Status" prop="status" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'active' ? 'success' : 'danger'"
                size="small"
                effect="plain"
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Actions" width="130" fixed="right">
            <template #default="{ row }">
              <el-button
                :type="row.status === 'active' ? 'warning' : 'success'"
                size="small"
                plain
                :loading="togglingUid === row.uid"
                @click="toggleStatus(row)"
              >
                {{ row.status === 'active' ? 'Deactivate' : 'Activate' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @change="fetchUsers"
          />
        </div>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import api from '@/api/axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'

interface User {
  uid: string
  name: string
  role: string
  email: string
  status: string
}

const loading = ref(false)
const users = ref<User[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const togglingUid = ref<string | null>(null)

const filters = ref({
  search: '',
  role: '',
  status: '',
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchUsers(), 400)
}

function roleTagType(role: string) {
  const map: Record<string, any> = {
    admin: 'danger',
    manager: 'warning',
    cashier: 'primary',
    teacher: 'info',
  }
  return map[role] || 'info'
}

async function fetchUsers() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      limit: pageSize.value,
    }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.role) params.role = filters.value.role
    if (filters.value.status) params.status = filters.value.status

    const res = await api.get('/users', { params })
    users.value = res.data.data || res.data.users || res.data
    total.value = res.data.total || users.value.length
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load users')
  } finally {
    loading.value = false
  }
}

async function toggleStatus(user: User) {
  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  try {
    await ElMessageBox.confirm(
      `Set user "${user.name}" to ${newStatus}?`,
      'Confirm Status Change',
      { confirmButtonText: 'Confirm', cancelButtonText: 'Cancel', type: 'warning' }
    )
    togglingUid.value = user.uid
    await api.patch(`/users/${user.uid}/status`, { status: newStatus })
    user.status = newStatus
    ElMessage.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || 'Failed to update status')
    }
  } finally {
    togglingUid.value = null
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.spacer {
  flex: 1;
}

.total-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
}

.table-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
