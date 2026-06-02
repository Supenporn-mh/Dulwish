<template>
  <AppLayout>
    <div class="reports-view">
      <el-tabs v-model="activeTab" type="border-card" class="reports-tabs">
        <!-- Sales Tab -->
        <el-tab-pane label="Sales Report" name="sales">
          <div class="report-toolbar">
            <el-date-picker
              v-model="salesDateRange"
              type="daterange"
              range-separator="to"
              start-placeholder="Start date"
              end-placeholder="End date"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              style="width: 280px"
              @change="fetchSalesReport"
            />
            <el-button type="primary" @click="fetchSalesReport" :icon="Refresh" :loading="salesLoading">
              Load Report
            </el-button>
          </div>

          <div v-loading="salesLoading" class="chart-container">
            <Bar
              v-if="salesChartData.datasets[0].data.length > 0"
              :data="salesChartData"
              :options="salesChartOptions"
              style="max-height: 380px"
            />
            <el-empty v-else description="No data for selected period" :image-size="80" />
          </div>

          <div class="summary-cards" v-if="salesSummary">
            <div class="summary-card">
              <div class="summary-label">Total Revenue</div>
              <div class="summary-value green">฿{{ formatNum(salesSummary.totalRevenue) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Orders</div>
              <div class="summary-value">{{ salesSummary.totalOrders }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Avg Order Value</div>
              <div class="summary-value">฿{{ formatNum(salesSummary.avgOrderValue) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Peak Day</div>
              <div class="summary-value">{{ salesSummary.peakDay || '-' }}</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Buffet Tab -->
        <el-tab-pane label="Buffet Report" name="buffet">
          <div class="report-toolbar">
            <el-date-picker
              v-model="buffetDateRange"
              type="daterange"
              range-separator="to"
              start-placeholder="Start date"
              end-placeholder="End date"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              style="width: 280px"
              @change="fetchBuffetReport"
            />
            <el-button type="primary" @click="fetchBuffetReport" :icon="Refresh" :loading="buffetLoading">
              Load Report
            </el-button>
          </div>

          <div v-loading="buffetLoading" class="chart-container">
            <Bar
              v-if="buffetChartData.datasets[0].data.length > 0"
              :data="buffetChartData"
              :options="buffetChartOptions"
              style="max-height: 380px"
            />
            <el-empty v-else description="No data for selected period" :image-size="80" />
          </div>

          <div class="summary-cards" v-if="buffetSummary">
            <div class="summary-card">
              <div class="summary-label">Total Entries</div>
              <div class="summary-value blue">{{ buffetSummary.totalEntries }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Revenue</div>
              <div class="summary-value green">฿{{ formatNum(buffetSummary.totalRevenue) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Avg Daily</div>
              <div class="summary-value">{{ buffetSummary.avgDaily }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Peak Day</div>
              <div class="summary-value">{{ buffetSummary.peakDay || '-' }}</div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import api from '@/api/axios'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const activeTab = ref('sales')

// Sales
const salesLoading = ref(false)
const salesDateRange = ref<[string, string] | null>(null)
const salesLabels = ref<string[]>([])
const salesData = ref<number[]>([])
const salesSummary = ref<any>(null)

// Buffet
const buffetLoading = ref(false)
const buffetDateRange = ref<[string, string] | null>(null)
const buffetLabels = ref<string[]>([])
const buffetData = ref<number[]>([])
const buffetSummary = ref<any>(null)

const salesChartData = computed(() => ({
  labels: salesLabels.value,
  datasets: [
    {
      label: 'Daily Sales (฿)',
      data: salesData.value,
      backgroundColor: 'rgba(102, 126, 234, 0.7)',
      borderColor: '#667eea',
      borderWidth: 1,
      borderRadius: 6,
    },
  ],
}))

const salesChartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Daily Sales Revenue', font: { size: 14 } },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `฿${ctx.parsed.y.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (val: any) => `฿${Number(val).toLocaleString('th-TH')}`,
      },
    },
  },
}

const buffetChartData = computed(() => ({
  labels: buffetLabels.value,
  datasets: [
    {
      label: 'Daily Buffet Entries',
      data: buffetData.value,
      backgroundColor: 'rgba(103, 194, 58, 0.7)',
      borderColor: '#67c23a',
      borderWidth: 1,
      borderRadius: 6,
    },
  ],
}))

const buffetChartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Daily Buffet Entries', font: { size: 14 } },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
    },
  },
}

function formatNum(n: number) {
  return (n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function defaultDateRange(): [string, string] {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return [fmt(start), fmt(end)]
}

async function fetchSalesReport() {
  salesLoading.value = true
  try {
    const [start, end] = salesDateRange.value || defaultDateRange()
    const res = await api.get('/admin/reports/sales', { params: { startDate: start, endDate: end } })
    const data = res.data
    salesLabels.value = data.labels || data.daily?.map((d: any) => d.date) || []
    salesData.value = data.values || data.daily?.map((d: any) => d.revenue) || []
    salesSummary.value = data.summary || null
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load sales report')
  } finally {
    salesLoading.value = false
  }
}

async function fetchBuffetReport() {
  buffetLoading.value = true
  try {
    const [start, end] = buffetDateRange.value || defaultDateRange()
    const res = await api.get('/admin/reports/buffet', { params: { startDate: start, endDate: end } })
    const data = res.data
    buffetLabels.value = data.labels || data.daily?.map((d: any) => d.date) || []
    buffetData.value = data.values || data.daily?.map((d: any) => d.entries) || []
    buffetSummary.value = data.summary || null
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load buffet report')
  } finally {
    buffetLoading.value = false
  }
}

onMounted(() => {
  salesDateRange.value = defaultDateRange()
  buffetDateRange.value = defaultDateRange()
  fetchSalesReport()
})
</script>

<style scoped>
.reports-view {
  display: flex;
  flex-direction: column;
}

.reports-tabs {
  border-radius: 12px;
}

.report-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.chart-container {
  min-height: 200px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.summary-card {
  background: #f9fafb;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.summary-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.summary-value.green { color: #67c23a; }
.summary-value.blue  { color: #409eff; }
</style>
