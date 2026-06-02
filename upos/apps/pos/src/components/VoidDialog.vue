<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const emit = defineEmits<{
  close: []
  voided: [txnId: string]
}>()

interface Transaction {
  id: string
  refNo: string
  createdAt: string
  total: number
  customerName: string
  items: { name: string; qty: number; unitPrice: number }[]
}

const transactions = ref<Transaction[]>([])
const selectedTxn = ref<Transaction | null>(null)
const supervisorPin = ref('')
const loading = ref(false)
const loadingTxns = ref(false)
const error = ref('')
const success = ref('')

async function loadTransactions() {
  loadingTxns.value = true
  try {
    const res = await api.get('/admin/transactions', { params: { limit: 20 } })
    transactions.value = res.data?.data ?? res.data ?? []
  } catch {
    // Demo fallback
    transactions.value = [
      {
        id: 'txn-001',
        refNo: 'POS-20240101-001',
        createdAt: new Date().toISOString(),
        total: 115,
        customerName: 'Demo Student',
        items: [{ name: 'ข้าวผัดกุ้ง', qty: 1, unitPrice: 60 }, { name: 'ชาเย็น', qty: 1, unitPrice: 30 }, { name: 'น้ำเปล่า', qty: 1, unitPrice: 10 }],
      },
      {
        id: 'txn-002',
        refNo: 'POS-20240101-002',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        total: 55,
        customerName: 'Teacher Anna',
        items: [{ name: 'ผัดไทย', qty: 1, unitPrice: 55 }],
      },
    ]
  } finally {
    loadingTxns.value = false
  }
}

async function submitVoid() {
  if (!selectedTxn.value) {
    error.value = 'กรุณาเลือกรายการที่ต้องการยกเลิก'
    return
  }
  if (!supervisorPin.value) {
    error.value = 'กรุณาใส่ Supervisor PIN'
    return
  }
  error.value = ''
  loading.value = true
  try {
    await api.post(`/pos/sale/${selectedTxn.value.id}/void`, {
      supervisorPin: supervisorPin.value,
    })
    success.value = `ยกเลิกรายการ ${selectedTxn.value.refNo} สำเร็จ`
    emit('voided', selectedTxn.value.id)
    setTimeout(() => emit('close'), 1500)
  } catch (e: any) {
    error.value = e.response?.data?.message || 'ไม่สามารถยกเลิกรายการได้'
  } finally {
    loading.value = false
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

onMounted(loadTransactions)
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('close')"></div>

    <div class="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-red-950/30">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-red-600/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 class="text-lg font-bold text-white">VOID รายการขาย</h2>
        </div>
        <button @click="emit('close')" class="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <!-- Success -->
        <div v-if="success" class="flex items-center gap-3 p-4 rounded-xl bg-green-950/50 border border-green-700/50 text-green-400">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
          </svg>
          {{ success }}
        </div>

        <!-- Transactions list -->
        <div>
          <p class="text-sm font-medium text-slate-400 mb-3">เลือกรายการที่ต้องการยกเลิก (20 รายการล่าสุด)</p>
          <div v-if="loadingTxns" class="text-center py-8 text-slate-500">กำลังโหลด...</div>
          <div v-else class="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            <button
              v-for="txn in transactions"
              :key="txn.id"
              @click="selectedTxn = txn"
              :class="[
                'w-full text-left p-3 rounded-xl border transition-all',
                selectedTxn?.id === txn.id
                  ? 'bg-dulwich/20 border-dulwich/60 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
              ]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold text-sm">{{ txn.refNo }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ txn.customerName }} &bull; {{ formatTime(txn.createdAt) }}</p>
                </div>
                <span class="font-bold text-lg">฿{{ txn.total }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Selected transaction detail -->
        <div v-if="selectedTxn" class="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
          <p class="text-xs font-medium text-slate-400 mb-2">รายการสินค้า</p>
          <div class="space-y-1">
            <div v-for="item in selectedTxn.items" :key="item.name" class="flex justify-between text-sm text-slate-300">
              <span>{{ item.name }} x{{ item.qty }}</span>
              <span>฿{{ item.unitPrice * item.qty }}</span>
            </div>
          </div>
        </div>

        <!-- Supervisor PIN -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Supervisor PIN (สำหรับ Demo: ใส่อะไรก็ได้)</label>
          <input
            v-model="supervisorPin"
            type="password"
            placeholder="••••"
            class="w-full h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/30 transition-all"
          />
        </div>

        <!-- Error -->
        <div v-if="error" class="flex items-center gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          {{ error }}
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-1">
          <button
            @click="emit('close')"
            class="flex-1 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
          >
            ยกเลิก
          </button>
          <button
            @click="submitVoid"
            :disabled="loading || !selectedTxn || !!success"
            class="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            ยืนยัน VOID
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
