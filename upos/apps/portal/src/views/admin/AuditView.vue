<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 mb-6">Audit Log</h2>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-5">
      <el-select v-model="actionFilter" placeholder="Action" clearable style="width:180px">
        <el-option v-for="a in actionOptions" :key="a.value" :label="a.label" :value="a.value" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="ถึง"
        start-placeholder="วันเริ่ม"
        end-placeholder="วันสิ้นสุด"
        style="width:260px"
      />
      <el-button @click="fetchLogs" type="primary">ค้นหา</el-button>
    </div>

    <el-table
      :data="pagedLogs"
      v-loading="loading"
      stripe
      border
      size="small"
      style="width:100%"
      @row-click="openDetail"
    >
      <el-table-column
        label="วัน/เวลา"
        width="160"
        :formatter="(r: any) => new Date(r.createdAt).toLocaleString('th-TH', { hour12: false })"
      />
      <el-table-column prop="actor" label="ผู้กระทำ" min-width="160" />
      <el-table-column label="Action" width="150">
        <template #default="{ row }">
          <el-tag :type="actionColor(row.action)" size="small">{{ row.action }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="entity" label="Entity" min-width="140" />
      <el-table-column prop="reason" label="เหตุผล" min-width="180" show-overflow-tooltip />
      <el-table-column label="" width="70" align="center">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click.stop="openDetail(row)">ดู</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="mt-4 flex justify-end">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredLogs.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
      />
    </div>

    <!-- Detail dialog -->
    <el-dialog v-model="dialogVisible" title="รายละเอียด Audit" width="560px" destroy-on-close>
      <template v-if="detail">
        <el-descriptions :column="2" border class="mb-4">
          <el-descriptions-item label="วัน/เวลา">
            {{ new Date(detail.createdAt).toLocaleString('th-TH', { hour12: false }) }}
          </el-descriptions-item>
          <el-descriptions-item label="ผู้กระทำ">{{ detail.actor ?? detail.actorRole }}</el-descriptions-item>
          <el-descriptions-item label="Action">
            <el-tag :type="actionColor(detail.action)" size="small">{{ detail.action }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Entity">{{ detail.entity ?? detail.entityType }}</el-descriptions-item>
          <el-descriptions-item label="เหตุผล" :span="2">{{ detail.reason || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detail.before || detail.after" class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs font-bold bg-red-100 text-red-700 rounded px-2 py-1 mb-2">Before</div>
            <pre class="text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">{{ JSON.stringify(detail.before ?? {}, null, 2) }}</pre>
          </div>
          <div>
            <div class="text-xs font-bold bg-green-100 text-green-700 rounded px-2 py-1 mb-2">After</div>
            <pre class="text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">{{ JSON.stringify(detail.after ?? {}, null, 2) }}</pre>
          </div>
        </div>
        <div v-else>
          <pre class="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-80">{{ JSON.stringify(detail, null, 2) }}</pre>
        </div>
      </template>
      <template #footer>
        <el-button @click="dialogVisible = false">ปิด</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api/axios'

interface AuditLog {
  id?: string
  createdAt: string
  actor?: string
  actorRole?: string
  action: string
  entity?: string
  entityType?: string
  reason?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

const DEMO_LOGS: AuditLog[] = [
  { id: '1', createdAt: new Date().toISOString(), actor: 'somchai@school.ac.th', actorRole: 'admin', action: 'login', entity: 'User:U001', entityType: 'User', reason: 'Normal login' },
  { id: '2', createdAt: new Date().toISOString(), actor: 'somchai@school.ac.th', actorRole: 'admin', action: 'topup', entity: 'Wallet:W-0002', entityType: 'Wallet', reason: 'เติมเงินให้นักเรียน', before: { balance: 250 }, after: { balance: 750 } },
  { id: '3', createdAt: new Date().toISOString(), actor: 'wipa@school.ac.th', actorRole: 'supervisor', action: 'void_txn', entity: 'Transaction:TXN-005', entityType: 'Transaction', reason: 'รายการผิดพลาด', before: { status: 'success', amount: 45 }, after: { status: 'voided' } },
  { id: '4', createdAt: new Date().toISOString(), actor: 'somchai@school.ac.th', actorRole: 'admin', action: 'policy_change', entity: 'Policy:low_balance_threshold', entityType: 'Policy', reason: 'ปรับ threshold', before: { value: 100 }, after: { value: 150 } },
  { id: '5', createdAt: new Date().toISOString(), actor: 'somchai@school.ac.th', actorRole: 'admin', action: 'user_update', entity: 'User:U006', entityType: 'User', reason: 'อัปเดตสถานะ', before: { status: 'active' }, after: { status: 'inactive' } },
]

const loading = ref(false)
const logs = ref<AuditLog[]>([])
const actionFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const detail = ref<AuditLog | null>(null)
const dialogVisible = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

const actionOptions = [
  { label: 'login', value: 'login' },
  { label: 'topup', value: 'topup' },
  { label: 'void_txn', value: 'void_txn' },
  { label: 'policy_change', value: 'policy_change' },
  { label: 'purchase', value: 'purchase' },
  { label: 'buffet', value: 'buffet' },
  { label: 'user_update', value: 'user_update' },
  { label: 'menu_update', value: 'menu_update' },
]

function actionColor(a: string): 'info' | 'success' | 'danger' | 'warning' | '' {
  return ({ login: 'info', topup: 'success', void_txn: 'danger', policy_change: 'warning' } as Record<string, 'info' | 'success' | 'danger' | 'warning'>)[a] ?? ''
}

const filteredLogs = computed(() => {
  return logs.value.filter((l) => {
    const matchAction = !actionFilter.value || l.action === actionFilter.value
    let matchDate = true
    if (dateRange.value) {
      const d = new Date(l.createdAt)
      matchDate = d >= dateRange.value[0] && d <= dateRange.value[1]
    }
    return matchAction && matchDate
  })
})

const pagedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredLogs.value.slice(start, start + pageSize.value)
})

watch([actionFilter, dateRange], () => { currentPage.value = 1 })

function openDetail(row: AuditLog) {
  detail.value = row
  dialogVisible.value = true
}

async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (actionFilter.value) params.action = actionFilter.value
    const { data } = await api.get('/admin/audit', { params })
    logs.value = data.logs ?? DEMO_LOGS
  } catch {
    logs.value = DEMO_LOGS
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)
</script>
