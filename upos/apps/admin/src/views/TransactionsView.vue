<template>
  <AppLayout>
    <div class="tx-view" v-loading="loading">
      <!-- Filters -->
      <el-card shadow="never" class="filter-card">
        <div class="filter-row">
          <el-input
            v-model="filters.search"
            placeholder="Search RefNo or student..."
            clearable
            :prefix-icon="Search"
            style="width: 260px"
            @input="debouncedFetch"
          />
          <el-select
            v-model="filters.type"
            placeholder="All Types"
            clearable
            style="width: 140px"
            @change="fetchTransactions"
          >
            <el-option label="Topup" value="topup" />
            <el-option label="Purchase" value="purchase" />
            <el-option label="Buffet" value="buffet" />
            <el-option label="Refund" value="refund" />
          </el-select>
          <el-select
            v-model="filters.status"
            placeholder="All Status"
            clearable
            style="width: 140px"
            @change="fetchTransactions"
          >
            <el-option label="Success" value="success" />
            <el-option label="Failed" value="failed" />
            <el-option label="Pending" value="pending" />
            <el-option label="Reversed" value="reversed" />
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
            @change="fetchTransactions"
          />
          <el-button type="primary" @click="fetchTransactions" :icon="Refresh">Refresh</el-button>
          <div class="spacer" />
          <el-button type="success" plain :icon="Download" @click="exportJSON">
            Export JSON
          </el-button>
          <span class="total-label">{{ total }} records</span>
        </div>
      </el-card>

      <!-- Summary tags -->
      <div class="summary-row">
        <el-tag type="success" effect="plain">
          Topup: ฿{{ formatNum(summary.topup) }}
        </el-tag>
        <el-tag type="danger" effect="plain">
          Purchase: ฿{{ formatNum(summary.purchase) }}
        </el-tag>
        <el-tag type="warning" effect="plain">
          Buffet: {{ summary.buffetCount }} entries
        </el-tag>
        <el-tag type="info" effect="plain">
          Refund: ฿{{ formatNum(summary.refund) }}
        </el-tag>
      </div>

      <!-- Table -->
      <el-card shadow="never" class="table-card">
        <el-table
          :data="transactions"
          stripe
          style="width: 100%"
          :empty-text="loading ? 'Loading...' : 'No transactions found'"
          size="small"
        >
          <el-table-column label="Ref No" prop="refNo" width="170" />
          <el-table-column label="Student" prop="studentName" min-width="150" />
          <el-table-column label="Type" prop="type" width="100">
            <template #default="{ row }">
              <el-tag :type="typeTag(row.type)" size="small" effect="light">
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Amount" prop="amount" width="120" align="right">
            <template #default="{ row }">
              <span :class="amountClass(row.type)">
                {{ row.type === 'topup' ? '+' : '-' }}฿{{ row.amount?.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Channel" prop="channel" width="110" />
          <el-table-column label="Status" prop="status" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" size="small" effect="plain">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Date" prop="createdAt" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[20, 50, 100, 200]"
            layout="total, sizes, prev, pager, next"
            @change="fetchTransactions"
          />
        </div>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import api from '@/api/axios'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'

interface Transaction {
  id: number | string
  refNo: string
  studentName: string
  type: string
  amount: number
  channel: string
  status: string
  createdAt: string
}

const loading = ref(false)
const transactions = ref<Transaction[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)

const filters = ref({
  search: '',
  type: '',
  status: '',
  dateRange: null as [string, string] | null,
})

const summary = computed(() => {
  const t = transactions.value
  return {
    topup: t.filter(x => x.type === 'topup' && x.status === 'success').reduce((s, x) => s + (x.amount || 0), 0),
    purchase: t.filter(x => x.type === 'purchase' && x.status === 'success').reduce((s, x) => s + (x.amount || 0), 0),
    buffetCount: t.filter(x => x.type === 'buffet').length,
    refund: t.filter(x => x.type === 'refund' && x.status === 'success').reduce((s, x) => s + (x.amount || 0), 0),
  }
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchTransactions(), 400)
}

function formatNum(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function typeTag(type: string) {
  const m: Record<string, any> = { topup: 'success', purchase: 'primary', buffet: 'warning', refund: 'info' }
  return m[type] || 'info'
}

function statusTag(status: string) {
  const m: Record<string, any> = { success: 'success', failed: 'danger', pending: 'warning', reversed: 'info' }
  return m[status] || 'info'
}

function amountClass(type: string) {
  return type === 'topup' ? 'amt-pos' : 'amt-neg'
}

async function fetchTransactions() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, limit: pageSize.value }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.dateRange) {
      params.startDate = filters.value.dateRange[0]
      params.endDate = filters.value.dateRange[1]
    }

    const res = await api.get('/admin/transactions', { params })
    transactions.value = res.data.data || res.data.transactions || res.data
    total.value = res.data.total || transactions.value.length
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load transactions')
  } finally {
    loading.value = false
  }
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(transactions.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`Exported ${transactions.value.length} transactions`)
}

onMounted(fetchTransactions)
</script>

<style scoped>
.tx-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.summary-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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

.amt-pos {
  color: #67c23a;
  font-weight: 600;
}

.amt-neg {
  color: #f56c6c;
  font-weight: 600;
}
</style>
