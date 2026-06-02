<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">รายการธุรกรรม</h2>
      <el-button @click="exportJson" size="small" type="primary" plain>⬇ Export JSON</el-button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-5">
      <el-select v-model="filter.type" placeholder="ประเภท" clearable style="width:140px">
        <el-option label="Topup"    value="topup" />
        <el-option label="Purchase" value="purchase" />
        <el-option label="Buffet"   value="buffet" />
        <el-option label="Void"     value="void" />
        <el-option label="Refund"   value="refund" />
      </el-select>
      <el-select v-model="filter.status" placeholder="สถานะ" clearable style="width:130px">
        <el-option label="Success" value="success" />
        <el-option label="Pending" value="pending" />
        <el-option label="Voided"  value="voided" />
        <el-option label="Failed"  value="failed" />
      </el-select>
      <el-input v-model="filter.q" placeholder="RefNo..." clearable style="width:180px" />
      <el-button @click="fetchTxns" type="primary">ค้นหา</el-button>
    </div>

    <el-table :data="filtered" v-loading="loading" stripe border size="small" style="width:100%">
      <el-table-column prop="createdAt" label="วัน/เวลา" width="160"
        :formatter="(r:any) => new Date(r.createdAt).toLocaleString('th-TH',{hour12:false})" />
      <el-table-column prop="refNo" label="RefNo" width="190" />
      <el-table-column label="ประเภท" width="110">
        <template #default="{ row }">
          <el-tag :type="typeTag(row.type)" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="จำนวน (฿)" width="120" align="right">
        <template #default="{ row }">
          <span :class="row.amount > 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
            {{ row.amount > 0 ? '+' : '' }}{{ row.amount.toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="channel" label="ช่องทาง" width="110" />
      <el-table-column label="สถานะ" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="paymentMethod" label="วิธีชำระ" />
    </el-table>

    <div class="mt-4 text-sm text-gray-400">แสดง {{ filtered.length }} รายการ</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'

const loading = ref(false)
const txns    = ref<any[]>([])
const filter  = ref({ type: '', status: '', q: '' })

const filtered = computed(() => {
  let list = txns.value
  if (filter.value.q) list = list.filter(t => t.refNo?.includes(filter.value.q))
  return list
})

function typeTag(t: string) {
  return { topup:'success', purchase:'warning', buffet:'info', void:'danger', refund:'info' }[t] ?? ''
}
function statusTag(s: string) {
  return { success:'success', pending:'warning', voided:'danger', failed:'danger' }[s] ?? ''
}

async function fetchTxns() {
  loading.value = true
  try {
    const params: any = {}
    if (filter.value.type)   params.type   = filter.value.type
    if (filter.value.status) params.status = filter.value.status
    const { data } = await api.get('/admin/transactions', { params })
    txns.value = data.transactions ?? []
  } catch {
    txns.value = [
      { _id:'1', refNo:'TXN20260801-000001', type:'topup',    amount: 1000, balanceAfter:1850, channel:'mobile_web', paymentMethod:'scb_qr',      status:'success', createdAt: new Date().toISOString() },
      { _id:'2', refNo:'TXN20260801-000002', type:'buffet',   amount: -170, balanceAfter:1680, channel:'pos',        paymentMethod:'card_wallet',  status:'success', createdAt: new Date().toISOString() },
      { _id:'3', refNo:'TXN20260801-000003', type:'purchase', amount:  -65, balanceAfter: 850, channel:'pos',        paymentMethod:'card_wallet',  status:'success', createdAt: new Date().toISOString() },
    ]
  } finally { loading.value = false }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(filtered.value, null, 2)], { type: 'application/json' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'transactions.json' })
  a.click()
}

onMounted(fetchTxns)
</script>
