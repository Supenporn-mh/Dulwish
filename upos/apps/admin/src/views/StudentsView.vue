<template>
  <AppLayout>
    <div class="students-view" v-loading="loading">
      <!-- Filters -->
      <el-card shadow="never" class="filter-card">
        <div class="filter-row">
          <el-input
            v-model="filters.search"
            placeholder="Search by name or UID..."
            clearable
            :prefix-icon="Search"
            style="width: 280px"
            @input="debouncedFetch"
          />
          <el-select
            v-model="filters.grade"
            placeholder="All Grades"
            clearable
            style="width: 150px"
            @change="fetchStudents"
          >
            <el-option v-for="g in gradeOptions" :key="g" :label="g" :value="g" />
          </el-select>
          <el-button type="primary" @click="fetchStudents" :icon="Refresh">Refresh</el-button>
          <div class="spacer" />
          <el-tag type="danger" effect="plain" size="small">
            <el-icon><Warning /></el-icon>
            {{ lowBalanceCount }} low balance
          </el-tag>
          <span class="total-label">{{ total }} students</span>
        </div>
      </el-card>

      <!-- Table -->
      <el-card shadow="never" class="table-card">
        <el-table
          :data="students"
          stripe
          style="width: 100%"
          :empty-text="loading ? 'Loading...' : 'No students found'"
          :row-class-name="rowClass"
        >
          <el-table-column label="UID" prop="uid" width="160" />
          <el-table-column label="Name" prop="name" min-width="180" />
          <el-table-column label="Grade" prop="grade" width="100" />
          <el-table-column label="Class" prop="class" width="100" />
          <el-table-column label="Wallet Balance" prop="walletBalance" width="150" align="right">
            <template #default="{ row }">
              <span :class="balanceClass(row.walletBalance)">
                ฿{{ formatBalance(row.walletBalance) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Status" prop="status" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'active' ? 'success' : 'danger'"
                size="small"
                effect="plain"
              >
                {{ row.status || 'active' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[20, 50, 100, 200]"
            layout="total, sizes, prev, pager, next"
            @change="fetchStudents"
          />
        </div>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import api from '@/api/axios'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Warning } from '@element-plus/icons-vue'

interface Student {
  uid: string
  name: string
  grade: string
  class: string
  walletBalance: number
  status: string
}

const LOW_BALANCE_THRESHOLD = 200

const loading = ref(false)
const students = ref<Student[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = ref({
  search: '',
  grade: '',
})

const gradeOptions = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
  'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']

const lowBalanceCount = computed(() =>
  students.value.filter((s) => s.walletBalance < LOW_BALANCE_THRESHOLD).length
)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchStudents(), 400)
}

function formatBalance(n: number): string {
  return (n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function balanceClass(balance: number) {
  if (balance < LOW_BALANCE_THRESHOLD) return 'balance-low'
  if (balance < 500) return 'balance-medium'
  return 'balance-ok'
}

function rowClass({ row }: { row: Student }) {
  return row.walletBalance < LOW_BALANCE_THRESHOLD ? 'row-low-balance' : ''
}

async function fetchStudents() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      role: 'student',
      page: page.value,
      limit: pageSize.value,
    }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.grade) params.grade = filters.value.grade

    const res = await api.get('/users', { params })
    students.value = res.data.data || res.data.users || res.data
    total.value = res.data.total || students.value.length
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load students')
  } finally {
    loading.value = false
  }
}

onMounted(fetchStudents)
</script>

<style scoped>
.students-view {
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

.balance-low {
  color: #f56c6c;
  font-weight: 700;
}

.balance-medium {
  color: #e6a23c;
  font-weight: 600;
}

.balance-ok {
  color: #67c23a;
  font-weight: 600;
}

:deep(.row-low-balance) {
  background-color: #fff5f5 !important;
}
</style>
