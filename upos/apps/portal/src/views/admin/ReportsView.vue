<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 mb-6">รายงาน</h2>

    <el-tabs v-model="tab">
      <el-tab-pane label="📊 ยอดขาย" name="sales">
        <!-- Summary cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div v-for="s in summaryCards" :key="s.label" class="bg-white rounded-xl border p-4 text-center">
            <div class="text-2xl font-black" :class="s.color">{{ s.value }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ s.label }}</div>
          </div>
        </div>
        <!-- Bar Chart -->
        <el-card shadow="never">
          <template #header>ยอดขายรายวัน (30 วันล่าสุด)</template>
          <div style="height:280px">
            <canvas ref="salesChart" />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="🍽 Buffet" name="buffet">
        <el-card shadow="never">
          <template #header>จำนวนเข้า Buffet รายวัน</template>
          <div style="height:280px">
            <canvas ref="buffetChart" />
          </div>
        </el-card>
        <el-table :data="buffetData" class="mt-4" size="small" stripe>
          <el-table-column prop="entryDate" label="วันที่" width="120" />
          <el-table-column label="มื้อ">
            <template #default="{ row }">{{ row.mealPeriodId?.name ?? row.mealPeriodId }}</template>
          </el-table-column>
          <el-table-column prop="priceCharged" label="ราคา (฿)" width="100" align="right" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import api from '@/api/axios'

Chart.register(...registerables)

const tab         = ref('sales')
const salesData   = ref<any[]>([])
const buffetData  = ref<any[]>([])
const salesChart  = ref<HTMLCanvasElement | null>(null)
const buffetChart = ref<HTMLCanvasElement | null>(null)
let sc: Chart | null = null
let bc: Chart | null = null

function makeDemoData() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    return { date: d.toISOString().split('T')[0], total: Math.floor(Math.random() * 8000 + 2000) }
  })
}

const chartData = computed(() => {
  if (salesData.value.length) {
    const grouped: Record<string, number> = {}
    salesData.value.forEach(t => {
      const d = t.createdAt?.split('T')[0] ?? ''
      grouped[d] = (grouped[d] ?? 0) + Math.abs(t.amount)
    })
    return Object.entries(grouped).map(([date, total]) => ({ date, total }))
  }
  return makeDemoData()
})

const summaryCards = computed(() => {
  const data = chartData.value
  const total = data.reduce((s, d) => s + d.total, 0)
  return [
    { label: 'รายได้รวม', value: `฿${total.toLocaleString()}`, color: 'text-green-600' },
    { label: 'เฉลี่ย/วัน', value: `฿${Math.round(total / data.length).toLocaleString()}`, color: 'text-blue-600' },
    { label: 'วันสูงสุด', value: `฿${Math.max(...data.map(d => d.total)).toLocaleString()}`, color: 'text-purple-600' },
    { label: 'จำนวนวัน', value: data.length, color: 'text-orange-500' },
  ]
})

function drawSalesChart() {
  if (!salesChart.value) return
  sc?.destroy()
  sc = new Chart(salesChart.value, {
    type: 'bar',
    data: {
      labels: chartData.value.map(d => d.date.slice(5)),
      datasets: [{ label: 'ยอดขาย (฿)', data: chartData.value.map(d => d.total), backgroundColor: '#3B82F6' }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  })
}

async function fetchAll() {
  try {
    const [s, b] = await Promise.all([
      api.get('/admin/reports/sales'),
      api.get('/admin/reports/buffet'),
    ])
    salesData.value  = s.data.transactions ?? []
    buffetData.value = b.data.sessions ?? []
  } catch { /* use demo */ }
  setTimeout(drawSalesChart, 100)
}

onMounted(fetchAll)
watch(tab, () => setTimeout(drawSalesChart, 100))
</script>
