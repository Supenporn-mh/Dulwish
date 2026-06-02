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

    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:52px">ลำดับ</th>
            <th>วัน/เวลา</th>
            <th>ผู้กระทำ</th>
            <th>Action</th>
            <th>Entity</th>
            <th>เหตุผล</th>
            <th class="center" style="width:70px">ดู</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="pagedLogs.length === 0">
            <td colspan="7" class="center" style="padding:32px;color:#AEAEB2">ไม่มีรายการ</td>
          </tr>
          <tr v-for="(log, i) in pagedLogs" :key="log.id ?? i" style="cursor:pointer" @click="openDetail(log)">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td style="color:#8E8E93;white-space:nowrap;font-size:12px">
              {{ new Date(log.createdAt).toLocaleString('th-TH',{hour12:false}) }}
            </td>
            <td style="color:#1C1C1E">{{ log.actor ?? log.actorRole ?? '-' }}</td>
            <td><span :class="['adm-badge', actionBadgeClass(log.action)]">{{ log.action }}</span></td>
            <td style="color:#3C3C43;font-size:12px">{{ log.entity ?? log.entityType ?? '-' }}</td>
            <td style="color:#3C3C43;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              {{ log.reason || '—' }}
            </td>
            <td class="center">
              <button class="adm-action-btn" @click.stop="openDetail(log)" title="ดูรายละเอียด">
                <PhEye :size="15" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="adm-pagination">
        <span>ทั้งหมด {{ filteredLogs.length }} รายการ</span>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage--">‹</button>
          <button v-for="p in Math.ceil(filteredLogs.length/pageSize)" :key="p"
            :class="['adm-page-btn', currentPage===p?'active':'']" @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===Math.ceil(filteredLogs.length/pageSize)" @click="currentPage++">›</button>
        </div>
      </div>
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
import { PhEye } from '@phosphor-icons/vue'
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

function actionBadgeClass(a: string) {
  return { login: 'adm-badge-topup', topup: 'adm-badge-topup', void_txn: 'adm-badge-void', policy_change: 'adm-badge-buffet', purchase: 'adm-badge-purchase', buffet: 'adm-badge-buffet', user_update: 'adm-badge-student' }[a] ?? 'adm-badge-voided'
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
