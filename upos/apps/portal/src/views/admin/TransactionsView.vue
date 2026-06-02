<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h2 style="font-size:22px;font-weight:500;color:#1C1C1E">รายการธุรกรรม</h2>
      <button class="adm-action-btn" style="width:auto;padding:0 14px;gap:6px;height:36px;border-radius:8px;border:1px solid #E8E8E8;font-size:13px;font-weight:500;color:#1C1C1E" @click="exportJson">
        <PhArrowSquareOut :size="16" /> Export
      </button>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap mb-4 p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3">
        <select v-model="filter.type" class="adm-filter-select">
          <option value="">ประเภททั้งหมด</option>
          <option value="topup">Topup</option>
          <option value="purchase">Purchase</option>
          <option value="buffet">Buffet</option>
          <option value="void">Void</option>
          <option value="refund">Refund</option>
        </select>
        <select v-model="filter.status" class="adm-filter-select">
          <option value="">สถานะทั้งหมด</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="voided">Voided</option>
          <option value="failed">Failed</option>
        </select>
        <input v-model="filter.q" class="adm-filter-input" placeholder="ค้นหา RefNo..." />
        <button class="adm-search-btn" @click="fetchTxns">ค้นหา</button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th style="width:52px" class="center">ลำดับ</th>
            <th>เลขอ้างอิง</th>
            <th>วัน/เวลา</th>
            <th>ประเภท</th>
            <th class="right">จำนวน (฿)</th>
            <th>ช่องทาง</th>
            <th>วิธีชำระ</th>
            <th class="center">สถานะ</th>
            <th class="center" style="width:80px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="center" style="padding:32px;color:#8E8E93">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="9" class="center" style="padding:32px;color:#8E8E93">ไม่มีรายการ</td>
          </tr>
          <tr v-for="(tx, i) in paginated" :key="tx._id ?? i">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ tx.refNo }}</span></td>
            <td style="color:#3C3C43;white-space:nowrap">
              {{ fmtDate(tx.createdAt) }}
            </td>
            <td><span :class="['adm-badge', `adm-badge-${tx.type}`]">{{ tx.type }}</span></td>
            <td class="right">
              <span :class="tx.amount > 0 ? 'adm-amount-pos' : 'adm-amount-neg'">
                {{ tx.amount > 0 ? '+' : '' }}฿{{ Math.abs(tx.amount).toLocaleString('th-TH', {minimumFractionDigits:2}) }}
              </span>
            </td>
            <td style="color:#3C3C43">{{ channelLabel(tx.channel) }}</td>
            <td style="color:#3C3C43">{{ tx.paymentMethod ?? '-' }}</td>
            <td class="center">
              <span class="adm-status">
                <span :class="['adm-dot', statusDot(tx.status)]" />
                <span :style="{color: statusColor(tx.status)}">{{ tx.status }}</span>
              </span>
            </td>
            <td>
              <div class="adm-actions">
                <button class="adm-action-btn" title="ดูรายละเอียด">
                  <PhEye :size="15" />
                </button>
                <button class="adm-action-btn danger" title="Void">
                  <PhProhibit :size="15" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <span>ทั้งหมด {{ filtered.length }} รายการ</span>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button
            v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage === p ? 'active' : '']"
            @click="currentPage = p"
          >{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import { PhArrowSquareOut, PhEye, PhProhibit } from '@phosphor-icons/vue'

const loading     = ref(false)
const txns        = ref<any[]>([])
const filter      = ref({ type: '', status: '', q: '' })
const currentPage = ref(1)
const pageSize    = ref(10)

const filtered = computed(() => {
  let list = txns.value
  if (filter.value.type)   list = list.filter(t => t.type === filter.value.type)
  if (filter.value.status) list = list.filter(t => t.status === filter.value.status)
  if (filter.value.q)      list = list.filter(t => t.refNo?.includes(filter.value.q.toUpperCase()))
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
}
function channelLabel(c: string) {
  return { mobile_web:'Mobile', pos:'POS', kiosk:'Kiosk', system:'System', admin:'Admin' }[c] ?? c ?? '-'
}
function statusDot(s: string)   { return { success:'adm-dot-success', pending:'adm-dot-warning', failed:'adm-dot-danger', voided:'adm-dot-gray' }[s] ?? 'adm-dot-gray' }
function statusColor(s: string) { return { success:'#028A60', pending:'#C67100', failed:'#CC3333', voided:'#8E8E93' }[s] ?? '#8E8E93' }

async function fetchTxns() {
  loading.value = true
  currentPage.value = 1
  try {
    const params: any = {}
    if (filter.value.type)   params.type   = filter.value.type
    if (filter.value.status) params.status = filter.value.status
    const { data } = await api.get('/admin/transactions', { params })
    txns.value = data.transactions ?? []
  } catch {
    txns.value = [
      { _id:'1', refNo:'TXN2026-000001', type:'topup',    amount: 1000, channel:'mobile_web', paymentMethod:'promptpay',   status:'success', createdAt: new Date(Date.now()-3600000*2).toISOString() },
      { _id:'2', refNo:'TXN2026-000002', type:'buffet',   amount: -170, channel:'pos',        paymentMethod:'card_wallet', status:'success', createdAt: new Date(Date.now()-3600000*4).toISOString() },
      { _id:'3', refNo:'TXN2026-000003', type:'purchase', amount:  -65, channel:'pos',        paymentMethod:'card_wallet', status:'success', createdAt: new Date(Date.now()-3600000*6).toISOString() },
      { _id:'4', refNo:'TXN2026-000004', type:'topup',    amount:  500, channel:'kiosk',      paymentMethod:'scb_qr',      status:'success', createdAt: new Date(Date.now()-3600000*8).toISOString() },
      { _id:'5', refNo:'TXN2026-000005', type:'purchase', amount:  -85, channel:'pos',        paymentMethod:'card_wallet', status:'pending', createdAt: new Date(Date.now()-3600000*10).toISOString() },
      { _id:'6', refNo:'TXN2026-000006', type:'refund',   amount:   65, channel:'system',     paymentMethod:'wallet',      status:'success', createdAt: new Date(Date.now()-3600000*12).toISOString() },
    ]
  } finally { loading.value = false }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(filtered.value, null, 2)], { type:'application/json' })
  const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:'transactions.json' })
  a.click()
}

onMounted(fetchTxns)
</script>

<style scoped>
.adm-filter-select,
.adm-filter-input {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #E8E8E8;
  background: #fff;
  font-size: 13px;
  color: #1C1C1E;
  outline: none;
  min-width: 130px;
}
.adm-filter-select:focus,
.adm-filter-input:focus { border-color: var(--color-primary); }

.adm-search-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.adm-search-btn:active { opacity: 0.8; }
</style>
