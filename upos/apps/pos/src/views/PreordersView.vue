<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'

const auth = useAuthStore()

const uidInput = ref('')
const loading = ref(false)
const redeeming = ref<string | null>(null)
const error = ref('')
const studentInfo = ref<any>(null)
const orders = ref<any[]>([])
const redeemedSet = ref<Set<string>>(new Set())

async function lookupStudent() {
  const uid = uidInput.value.trim()
  if (!uid) return
  error.value = ''
  loading.value = true
  studentInfo.value = null
  orders.value = []
  redeemedSet.value = new Set()

  try {
    // Get card info
    const cardRes = await api.get(`/pos/card/${uid}`)
    studentInfo.value = cardRes.data

    // Get today's preorders for this student
    const ordersRes = await api.get('/preorders', {
      params: { userId: cardRes.data.userId, status: 'confirmed', today: true },
    })
    orders.value = ordersRes.data?.data ?? ordersRes.data ?? []
  } catch (e: any) {
    error.value = e.response?.data?.message || 'ไม่พบข้อมูลหรือไม่มีรายการสั่งจอง'
    studentInfo.value = null
  } finally {
    loading.value = false
  }
}

async function redeemOrder(orderId: string) {
  redeeming.value = orderId
  try {
    await api.post(`/preorders/${orderId}/redeem`)
    redeemedSet.value = new Set([...redeemedSet.value, orderId])
  } catch (e: any) {
    alert(e.response?.data?.message || 'ไม่สามารถรับอาหารได้')
  } finally {
    redeeming.value = null
  }
}

function reset() {
  uidInput.value = ''
  studentInfo.value = null
  orders.value = []
  error.value = ''
  redeemedSet.value = new Set()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') lookupStudent()
}
</script>

<template>
  <div class="fixed inset-0 bg-slate-950 flex flex-col" style="min-width:1280px; min-height:800px;">
    <!-- Top bar -->
    <header class="flex-shrink-0 h-12 bg-dulwich flex items-center px-6 gap-4 shadow-lg">
      <router-link to="/pos" class="text-white/70 hover:text-white transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </router-link>
      <h1 class="font-bold text-white text-sm">รับอาหาร Pre-orders</h1>
      <div class="flex-1"></div>
      <span class="text-white/70 text-sm">{{ auth.user?.name }}</span>
    </header>

    <div class="flex-1 flex flex-col items-center px-8 py-8 overflow-y-auto scrollbar-thin">
      <div class="w-full max-w-2xl space-y-6">

        <!-- Search card -->
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p class="text-sm font-semibold text-slate-300 mb-3">ค้นหานักเรียนด้วย UID บัตร</p>
          <div class="flex gap-3">
            <input
              v-model="uidInput"
              type="text"
              placeholder="UID บัตรนักเรียน..."
              class="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/20 transition-all"
              @keydown="handleKeydown"
            />
            <button
              @click="lookupStudent"
              :disabled="loading || !uidInput.trim()"
              class="px-6 h-12 rounded-xl bg-dulwich hover:bg-dulwich-600 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              ค้นหา
            </button>
            <button
              v-if="studentInfo"
              @click="reset"
              class="px-4 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            >
              ล้าง
            </button>
          </div>

          <!-- Demo buttons -->
          <div class="flex gap-2 mt-3">
            <button @click="uidInput = 'STD-K1-0001'; lookupStudent()" class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium border border-slate-700 transition-colors">
              DEMO: STD-K1-0001
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="flex items-center gap-3 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-400">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          {{ error }}
        </div>

        <!-- Student info -->
        <div v-if="studentInfo" class="p-4 rounded-2xl bg-dulwich/10 border border-dulwich/30 flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-dulwich/20 flex items-center justify-center flex-shrink-0">
            <svg class="w-7 h-7 text-dulwich-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-bold text-white text-lg">{{ studentInfo.name }}</p>
            <p class="text-slate-400 text-sm">{{ studentInfo.role }} {{ studentInfo.group ? `| ${studentInfo.group}` : '' }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-400">ยอดเงิน</p>
            <p class="font-bold text-green-400">฿{{ studentInfo.walletBalance?.toFixed(2) }}</p>
          </div>
        </div>

        <!-- Orders list -->
        <div v-if="studentInfo">
          <h2 class="text-base font-bold text-white mb-4">รายการสั่งจองวันนี้ ({{ orders.length }} รายการ)</h2>

          <div v-if="orders.length === 0" class="text-center py-12 text-slate-500">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            ไม่มีรายการสั่งจองวันนี้
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="order in orders"
              :key="order.id"
              :class="[
                'p-5 rounded-2xl border transition-all',
                redeemedSet.has(order.id)
                  ? 'bg-green-950/30 border-green-700/50'
                  : 'bg-slate-900 border-slate-800'
              ]"
            >
              <!-- Order header -->
              <div class="flex items-start justify-between mb-3">
                <div>
                  <p class="font-semibold text-white text-sm">{{ order.shopName ?? 'Cafe Corner' }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ order.refNo ?? `ORD-${order.id}` }}</p>
                </div>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold',
                    redeemedSet.has(order.id)
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-slate-800 text-slate-300'
                  ]"
                >
                  {{ redeemedSet.has(order.id) ? 'รับแล้ว' : 'ยืนยันแล้ว' }}
                </span>
              </div>

              <!-- Items -->
              <div class="space-y-1 mb-3">
                <div
                  v-for="item in (order.items ?? [])"
                  :key="item.id ?? item.name"
                  class="flex justify-between text-sm"
                >
                  <span class="text-slate-300">{{ item.name }} x{{ item.qty }}</span>
                  <span class="text-slate-400">฿{{ (item.unitPrice ?? item.price) * item.qty }}</span>
                </div>
              </div>

              <div class="flex items-center justify-between pt-3 border-t border-slate-800">
                <div>
                  <span class="text-slate-400 text-sm">รวม </span>
                  <span class="font-bold text-white">฿{{ order.total?.toFixed(2) ?? '—' }}</span>
                </div>

                <!-- Redeemed state -->
                <div v-if="redeemedSet.has(order.id)" class="flex items-center gap-2 text-green-400 font-semibold text-sm">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
                  </svg>
                  รับอาหารสำเร็จ
                </div>

                <!-- Redeem button -->
                <button
                  v-else
                  @click="redeemOrder(order.id)"
                  :disabled="redeeming === order.id"
                  class="px-5 h-10 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <svg v-if="redeeming === order.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  REDEEM รับอาหาร
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
