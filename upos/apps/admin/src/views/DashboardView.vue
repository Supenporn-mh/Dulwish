<template>
  <AppLayout>
    <div class="dashboard" v-loading="loading">
      <!-- Metric Cards -->
      <div class="metric-grid">
        <div class="metric-card revenue">
          <div class="metric-icon">
            <el-icon><Money /></el-icon>
          </div>
          <div class="metric-body">
            <div class="metric-value">฿{{ formatNumber(metrics.todayRevenue) }}</div>
            <div class="metric-label">Today Revenue</div>
          </div>
        </div>

        <div class="metric-card topup">
          <div class="metric-icon">
            <el-icon><WalletFilled /></el-icon>
          </div>
          <div class="metric-body">
            <div class="metric-value">฿{{ formatNumber(metrics.todayTopups) }}</div>
            <div class="metric-label">Today Topups</div>
          </div>
        </div>

        <div class="metric-card buffet">
          <div class="metric-icon">
            <el-icon><Food /></el-icon>
          </div>
          <div class="metric-body">
            <div class="metric-value">{{ formatNumber(metrics.buffetEntries) }}</div>
            <div class="metric-label">Buffet Entries</div>
          </div>
        </div>

        <div class="metric-card lowbalance">
          <div class="metric-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="metric-body">
            <div class="metric-value">{{ metrics.lowBalanceStudents }}</div>
            <div class="metric-label">Low Balance Students</div>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <el-card class="recent-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-title">Recent Transactions</span>
            <el-button type="primary" text size="small" @click="$router.push('/transactions')">
              View All
            </el-button>
          </div>
        </template>

        <el-table
          :data="recentTransactions"
          size="small"
          stripe
          style="width: 100%"
          :empty-text="loading ? 'Loading...' : 'No transactions'"
        >
          <el-table-column label="Ref No" prop="refNo" width="160" />
          <el-table-column label="Student" prop="studentName" min-width="140" />
          <el-table-column label="Type" prop="type" width="110">
            <template #default="{ row }">
              <el-tag
                :type="typeTagType(row.type)"
                size="small"
                effect="light"
              >
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Amount" prop="amount" width="110" align="right">
            <template #default="{ row }">
              <span :class="amountClass(row.type)">
                {{ row.type === 'topup' ? '+' : '-' }}฿{{ formatNumber(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Status" prop="status" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'success' ? 'success' : 'danger'"
                size="small"
                effect="plain"
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Date" prop="createdAt" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import api from '@/api/axios'
import { ElMessage } from 'element-plus'
import { Money, Warning, Food } from '@element-plus/icons-vue'

// WalletFilled may not exist, fallback
import { Wallet as WalletFilled } from '@element-plus/icons-vue'

interface DashboardMetrics {
  todayRevenue: number
  todayTopups: number
  buffetEntries: number
  lowBalanceStudents: number
}

interface Transaction {
  refNo: string
  studentName: string
  type: string
  amount: number
  status: string
  createdAt: string
}

const loading = ref(false)

const metrics = ref<DashboardMetrics>({
  todayRevenue: 0,
  todayTopups: 0,
  buffetEntries: 0,
  lowBalanceStudents: 0,
})

const recentTransactions = ref<Transaction[]>([])

function formatNumber(n: number): string {
  return (n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDate(d: string): string {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function typeTagType(type: string) {
  const map: Record<string, any> = {
    topup: 'success',
    purchase: 'primary',
    buffet: 'warning',
    refund: 'info',
  }
  return map[type] || 'info'
}

function amountClass(type: string) {
  return type === 'topup' ? 'amount-positive' : 'amount-negative'
}

async function fetchDashboard() {
  loading.value = true
  try {
    const res = await api.get('/admin/dashboard')
    metrics.value = res.data.metrics || res.data
    recentTransactions.value = res.data.recentTransactions || []
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load dashboard data')
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 4px solid transparent;
  transition: transform 0.15s, box-shadow 0.15s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-card.revenue { border-left-color: #67c23a; }
.metric-card.topup   { border-left-color: #409eff; }
.metric-card.buffet  { border-left-color: #e6a23c; }
.metric-card.lowbalance { border-left-color: #f56c6c; }

.metric-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.revenue .metric-icon { background: #f0f9eb; color: #67c23a; }
.topup .metric-icon   { background: #ecf5ff; color: #409eff; }
.buffet .metric-icon  { background: #fdf6ec; color: #e6a23c; }
.lowbalance .metric-icon { background: #fef0f0; color: #f56c6c; }

.metric-body {
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.recent-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.amount-positive {
  color: #67c23a;
  font-weight: 600;
}

.amount-negative {
  color: #f56c6c;
  font-weight: 600;
}
</style>
