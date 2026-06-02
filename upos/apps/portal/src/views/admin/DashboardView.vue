<template>
  <div class="dashboard">
    <!-- Metric cards -->
    <div class="metrics-grid">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="metric-skeleton" />
      </template>
      <template v-else>
        <div
          v-for="card in metricCards"
          :key="card.key"
          class="ios-card metric-card"
        >
          <div class="metric-icon-wrap" :style="{ background: card.iconBg }">
            <component :is="card.icon" :size="24" weight="fill" :style="{ color: card.color }" />
          </div>
          <div class="metric-value" :style="{ color: card.color }">
            {{ card.formatted }}
          </div>
          <div class="metric-label">{{ card.label }}</div>
          <div class="metric-sub">{{ card.sub }}</div>
        </div>
      </template>
    </div>

    <!-- Recent transactions -->
    <div>
      <p style="font-size:13px;font-weight:500;color:#AEAEB2;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px">
        รายการล่าสุด
      </p>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>วัน/เวลา</th>
              <th>RefNo</th>
              <th>ประเภท</th>
              <th class="right">จำนวน</th>
              <th>ช่องทาง</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
            </tr>
            <tr v-for="tx in recentTransactions" :key="tx._id ?? tx.id">
              <td style="color:#8E8E93;white-space:nowrap">{{ formatDateTime(tx.createdAt) }}</td>
              <td><span class="adm-code">{{ tx.refNo }}</span></td>
              <td>
                <span :class="['adm-badge', `adm-badge-${tx.type}`]">{{ typeLabel(tx.type) }}</span>
              </td>
              <td class="right">
                <span :class="tx.amount > 0 ? 'adm-amount-pos' : 'adm-amount-neg'">
                  {{ tx.amount > 0 ? '+' : '' }}฿{{ Math.abs(tx.amount).toLocaleString() }}
                </span>
              </td>
              <td style="color:#3C3C43">{{ tx.channel }}</td>
              <td>
                <span class="adm-status">
                  <span :class="['adm-dot', tx.status === 'success' ? 'adm-dot-success' : tx.status === 'pending' ? 'adm-dot-warning' : 'adm-dot-danger']" />
                  <span :style="{color: tx.status==='success'?'#028A60':tx.status==='pending'?'#C67100':'#CC3333'}">
                    {{ tx.status }}
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhMoney, PhArrowUp, PhForkKnife, PhWarningCircle } from '@phosphor-icons/vue'

const API_BASE = 'http://localhost:4000'

interface DashboardData {
  todayRevenue: number
  topUps: number
  buffetEntries: number
  lowBalance: number
}

interface Transaction {
  id: string
  refNo: string
  type: 'topup' | 'purchase' | 'buffet' | 'void'
  amount: number
  channel: string
  status: string
  createdAt: string
}

const loading = ref(true)
const dashboardData = ref<DashboardData>({
  todayRevenue: 12450,
  topUps: 8200,
  buffetEntries: 87,
  lowBalance: 12,
})
const recentTransactions = ref<Transaction[]>([])

const DEMO_DATA: DashboardData = {
  todayRevenue: 12450,
  topUps: 8200,
  buffetEntries: 87,
  lowBalance: 12,
}

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', refNo: 'TXN-20240101-001', type: 'topup', amount: 500, channel: 'QR Code', status: 'success', createdAt: '2024-01-01T08:00:00Z' },
  { id: '2', refNo: 'TXN-20240101-002', type: 'purchase', amount: 45, channel: 'NFC', status: 'success', createdAt: '2024-01-01T08:15:00Z' },
  { id: '3', refNo: 'TXN-20240101-003', type: 'buffet', amount: 120, channel: 'QR Code', status: 'success', createdAt: '2024-01-01T09:00:00Z' },
  { id: '4', refNo: 'TXN-20240101-004', type: 'topup', amount: 1000, channel: 'Cash', status: 'success', createdAt: '2024-01-01T09:30:00Z' },
  { id: '5', refNo: 'TXN-20240101-005', type: 'void', amount: 45, channel: 'NFC', status: 'voided', createdAt: '2024-01-01T10:00:00Z' },
  { id: '6', refNo: 'TXN-20240101-006', type: 'purchase', amount: 80, channel: 'NFC', status: 'success', createdAt: '2024-01-01T10:30:00Z' },
  { id: '7', refNo: 'TXN-20240101-007', type: 'topup', amount: 200, channel: 'QR Code', status: 'success', createdAt: '2024-01-01T11:00:00Z' },
  { id: '8', refNo: 'TXN-20240101-008', type: 'buffet', amount: 120, channel: 'QR Code', status: 'success', createdAt: '2024-01-01T11:30:00Z' },
  { id: '9', refNo: 'TXN-20240101-009', type: 'purchase', amount: 35, channel: 'NFC', status: 'success', createdAt: '2024-01-01T12:00:00Z' },
  { id: '10', refNo: 'TXN-20240101-010', type: 'topup', amount: 300, channel: 'Cash', status: 'pending', createdAt: '2024-01-01T12:30:00Z' },
]

const metricCards = computed(() => [
  {
    key: 'revenue',
    icon: PhMoney,
    label: 'รายรับวันนี้',
    formatted: `฿${dashboardData.value.todayRevenue.toLocaleString()}`,
    sub: 'Total today revenue',
    color: '#1264E3',
    iconBg: 'rgba(18,100,227,0.1)',
  },
  {
    key: 'topups',
    icon: PhArrowUp,
    label: 'เติมเงิน',
    formatted: `฿${dashboardData.value.topUps.toLocaleString()}`,
    sub: 'Top-up amount today',
    color: '#34C759',
    iconBg: 'rgba(52,199,89,0.1)',
  },
  {
    key: 'buffet',
    icon: PhForkKnife,
    label: 'Buffet วันนี้',
    formatted: dashboardData.value.buffetEntries.toString(),
    sub: 'Buffet entries today',
    color: '#FF9500',
    iconBg: 'rgba(255,149,0,0.1)',
  },
  {
    key: 'low',
    icon: PhWarningCircle,
    label: 'ยอดต่ำ',
    formatted: dashboardData.value.lowBalance.toString(),
    sub: 'Students with low balance',
    color: '#FF3B30',
    iconBg: 'rgba(255,59,48,0.1)',
  },
])

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('th-TH', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAmount(n: number): string {
  return `฿${n.toLocaleString()}`
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    topup: 'เติมเงิน',
    purchase: 'ซื้อ',
    buffet: 'Buffet',
    void: 'ยกเลิก',
  }
  return map[type] ?? type
}

function typeTagColor(type: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    topup:    { bg: 'rgba(52,199,89,0.12)',  text: '#1A7F3C' },
    purchase: { bg: 'rgba(255,149,0,0.12)',  text: '#B35900' },
    buffet:   { bg: 'rgba(18,100,227,0.10)', text: '#1264E3' },
    void:     { bg: 'rgba(255,59,48,0.10)',  text: '#FF3B30' },
  }
  return map[type] ?? { bg: '#F2F2F7', text: '#6E6E73' }
}

function statusTagColor(status: string): { bg: string; text: string } {
  if (status === 'success') return { bg: 'rgba(52,199,89,0.12)', text: '#1A7F3C' }
  if (status === 'pending') return { bg: 'rgba(255,149,0,0.12)', text: '#B35900' }
  if (status === 'voided' || status === 'failed') return { bg: 'rgba(255,59,48,0.10)', text: '#FF3B30' }
  return { bg: '#F2F2F7', text: '#6E6E73' }
}

function amountClass(type: string): string {
  if (type === 'topup') return 'amount--positive'
  if (type === 'void') return 'amount--neutral'
  return 'amount--negative'
}

function amountSign(type: string): string {
  if (type === 'topup') return '+'
  if (type === 'void') return ''
  return '-'
}

async function fetchDashboard() {
  loading.value = true
  try {
    const [dashRes, txRes] = await Promise.all([
      fetch(`${API_BASE}/admin/dashboard`),
      fetch(`${API_BASE}/admin/transactions?limit=10`),
    ])
    if (dashRes.ok) {
      dashboardData.value = await dashRes.json()
    } else {
      dashboardData.value = DEMO_DATA
    }
    if (txRes.ok) {
      const data = await txRes.json()
      recentTransactions.value = Array.isArray(data) ? data.slice(0, 10) : data.data?.slice(0, 10) ?? DEMO_TRANSACTIONS
    } else {
      recentTransactions.value = DEMO_TRANSACTIONS
    }
  } catch {
    dashboardData.value = DEMO_DATA
    recentTransactions.value = DEMO_TRANSACTIONS
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
  gap: 8px;
}

/* Metric grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 8px;
}

@media (min-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.metric-skeleton {
  height: 130px;
  border-radius: 16px;
  background: #E5E5EA;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.metric-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.metric-icon {
  font-size: 22px;
  line-height: 1;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.5px;
}

.metric-label {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.metric-sub {
  font-size: 12px;
  color: #AEAEB2;
}

/* Table card */
.table-card {
  padding: 0;
  overflow: hidden;
}

.table-card :deep(.el-table) {
  border-radius: 0;
}

.table-card :deep(.el-table th.el-table__cell) {
  background: #F2F2F7 !important;
  color: #6E6E73;
  font-weight: 600;
  font-size: 13px;
}

.table-card :deep(.el-table__row:hover > td) {
  background: rgba(18, 100, 227, 0.04) !important;
}

.refno {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #6E6E73;
  background: #F2F2F7;
  padding: 2px 6px;
  border-radius: 5px;
}

.amount--positive { color: #34C759; }
.amount--negative { color: #FF3B30; }
.amount--neutral  { color: #AEAEB2; }
</style>
