<template>
  <AppLayout>
    <div class="audit-view" v-loading="loading">
      <!-- Filters -->
      <el-card shadow="never" class="filter-card">
        <div class="filter-row">
          <el-input
            v-model="filters.search"
            placeholder="Search by actor or entity..."
            clearable
            :prefix-icon="Search"
            style="width: 260px"
            @input="debouncedFetch"
          />
          <el-select
            v-model="filters.action"
            placeholder="All Actions"
            clearable
            style="width: 180px"
            @change="fetchAudit"
          >
            <el-option label="Create" value="create" />
            <el-option label="Update" value="update" />
            <el-option label="Delete" value="delete" />
            <el-option label="Login" value="login" />
            <el-option label="Logout" value="logout" />
            <el-option label="Status Change" value="status_change" />
            <el-option label="Policy Update" value="policy_update" />
            <el-option label="Topup" value="topup" />
            <el-option label="Refund" value="refund" />
          </el-select>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="to"
            start-placeholder="Start date"
            end-placeholder="End date"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="fetchAudit"
          />
          <el-button type="primary" @click="fetchAudit" :icon="Refresh">Refresh</el-button>
          <div class="spacer" />
          <span class="total-label">{{ total }} entries</span>
        </div>
      </el-card>

      <!-- Table -->
      <el-card shadow="never" class="table-card">
        <el-table
          :data="auditLogs"
          stripe
          style="width: 100%"
          :empty-text="loading ? 'Loading...' : 'No audit logs found'"
          size="small"
        >
          <el-table-column label="Date" prop="createdAt" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="Actor" prop="actorName" width="160" />
          <el-table-column label="Action" prop="action" width="130">
            <template #default="{ row }">
              <el-tag :type="actionTag(row.action)" size="small" effect="light">
                {{ row.action }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Entity" prop="entity" width="130">
            <template #default="{ row }">
              <span class="entity-text">{{ row.entity }}</span>
              <span v-if="row.entityId" class="entity-id">#{{ row.entityId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Details" prop="details" min-width="200">
            <template #default="{ row }">
              <span class="details-text">{{ row.details || row.reason || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="IP" prop="ipAddress" width="130" />
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @change="fetchAudit"
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
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'

interface AuditLog {
  id: number | string
  createdAt: string
  actorName: string
  action: string
  entity: string
  entityId?: number | string
  details?: string
  reason?: string
  ipAddress?: string
}

const loading = ref(false)
const auditLogs = ref<AuditLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)

const filters = ref({
  search: '',
  action: '',
  dateRange: null as [string, string] | null,
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchAudit(), 400)
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function actionTag(action: string) {
  const m: Record<string, any> = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    login: 'info',
    logout: 'info',
    status_change: 'warning',
    policy_update: 'warning',
    topup: 'success',
    refund: 'danger',
  }
  return m[action] || 'info'
}

async function fetchAudit() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, limit: pageSize.value }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.action) params.action = filters.value.action
    if (filters.value.dateRange) {
      params.startDate = filters.value.dateRange[0]
      params.endDate = filters.value.dateRange[1]
    }

    const res = await api.get('/admin/audit', { params })
    auditLogs.value = res.data.data || res.data.logs || res.data
    total.value = res.data.total || auditLogs.value.length
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load audit logs')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAudit)
</script>

<style scoped>
.audit-view {
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
  gap: 10px;
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

.entity-text {
  font-weight: 500;
  color: #1a1a2e;
}

.entity-id {
  font-size: 11px;
  color: #909399;
  margin-left: 4px;
}

.details-text {
  font-size: 12px;
  color: #606266;
}
</style>
