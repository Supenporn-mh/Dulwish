<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 mb-6">รายงาน</h2>

    <!-- Error state -->
    <div v-if="fetchError" style="padding:24px;color:var(--color-danger);background:#FEF2F2;border-radius:10px;margin-bottom:16px;font-size:14px">
      {{ fetchError }}
    </div>

    <el-tabs v-model="tab">
      <el-tab-pane label="📊 ยอดขาย" name="sales">
        <!-- Summary cards -->
        <div v-if="summaryCards.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div v-for="s in summaryCards" :key="s.label" class="bg-white rounded-xl border p-4 text-center">
            <div class="text-2xl font-black" :class="s.color">{{ s.value }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ s.label }}</div>
          </div>
        </div>
        <div v-else-if="!fetchError" class="mb-6" style="padding:16px;color:#8E8E93;font-size:13px;text-align:center">
          ไม่มีข้อมูลยอดขาย
        </div>
        <!-- Bar Chart -->
        <el-card shadow="never">
          <template #header>ยอดขายรายวัน (30 วันล่าสุด)</template>
          <div style="height:280px">
            <div v-if="chartData.length === 0 && !fetchError" style="display:flex;align-items:center;justify-content:center;height:100%;color:#AEAEB2;font-size:13px">
              ไม่มีข้อมูล
            </div>
            <canvas v-else ref="salesChart" />
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
        <div class="adm-table-wrap mt-4">
          <table class="adm-table">
            <thead>
              <tr>
                <th style="width:120px">วันที่</th>
                <th>มื้ออาหาร</th>
                <th class="right" style="width:100px">ราคา (฿)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="buffetData.length === 0">
                <td colspan="3" class="center" style="padding:32px;color:#AEAEB2">ไม่มีรายการ</td>
              </tr>
              <tr v-for="(row, i) in buffetData" :key="i">
                <td style="color:#8E8E93;white-space:nowrap;font-size:12px">{{ row.entryDate }}</td>
                <td><span class="adm-badge adm-badge-buffet">{{ row.mealPeriodId?.name ?? row.mealPeriodId }}</span></td>
                <td class="right" style="font-variant-numeric:tabular-nums">{{ row.priceCharged }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
const fetchError  = ref<string | null>(null)
let sc: Chart | null = null
let bc: Chart | null = null

const chartData = computed(() => {
  const grouped: Record<string, number> = {}
  salesData.value.forEach(t => {
    const d = t.createdAt?.split('T')[0] ?? ''
    if (d) grouped[d] = (grouped[d] ?? 0) + Math.abs(t.amount)
  })
  return Object.entries(grouped).map(([date, total]) => ({ date, total }))
})

const summaryCards = computed(() => {
  const data = chartData.value
  if (data.length === 0) return []
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
  fetchError.value = null
  try {
    const [s, b] = await Promise.all([
      api.get('/admin/reports/sales'),
      api.get('/admin/reports/buffet'),
    ])
    salesData.value  = s.data.transactions ?? []
    buffetData.value = b.data.sessions ?? []
  } catch (e: unknown) {
    fetchError.value = e instanceof Error ? e.message : 'โหลดข้อมูลรายงานไม่สำเร็จ'
    salesData.value  = []
    buffetData.value = []
  }
  setTimeout(drawSalesChart, 100)
}

onMounted(fetchAll)
watch(tab, () => setTimeout(drawSalesChart, 100))
</script>
