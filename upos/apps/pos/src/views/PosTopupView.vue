<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'

const auth = useAuthStore()

const uidInput = ref('')
const amount = ref<number | null>(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const successMsg = ref('')
const cardData = ref<any>(null)
const newBalance = ref<number | null>(null)

const PRESET_AMOUNTS = [100, 200, 300, 500, 1000, 2000]

async function lookupCard() {
  const uid = uidInput.value.trim()
  if (!uid) return
  error.value = ''
  successMsg.value = ''
  loading.value = true
  cardData.value = null
  newBalance.value = null
  amount.value = null

  try {
    const res = await api.get(`/pos/card/${uid}`)
    cardData.value = res.data
  } catch (e: any) {
    error.value = e.response?.data?.message || 'ไม่พบบัตรในระบบ'
  } finally {
    loading.value = false
  }
}

async function confirmTopup() {
  if (!cardData.value || !amount.value || amount.value <= 0) return
  error.value = ''
  successMsg.value = ''
  submitting.value = true

  try {
    const res = await api.post(`/wallets/${cardData.value.userId}/topup`, {
      amount: amount.value,
      method: 'cash',
    })
    newBalance.value = res.data?.newBalance ?? (cardData.value.walletBalance + amount.value)
    successMsg.value = `เติมเงิน ฿${amount.value} สำเร็จ`
    cardData.value = { ...cardData.value, walletBalance: newBalance.value }
    amount.value = null
  } catch (e: any) {
    error.value = e.response?.data?.message || 'เติมเงินไม่สำเร็จ'
  } finally {
    submitting.value = false
  }
}

function reset() {
  uidInput.value = ''
  cardData.value = null
  amount.value = null
  error.value = ''
  successMsg.value = ''
  newBalance.value = null
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') lookupCard()
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
      <h1 class="font-bold text-white text-sm">เติมเงิน (Cash Top-up)</h1>
      <div class="flex-1"></div>
      <span class="text-white/70 text-sm">{{ auth.user?.name }}</span>
    </header>

    <div class="flex-1 flex flex-col items-center justify-center px-8">
      <div class="w-full max-w-md space-y-5">

        <!-- Step 1: Find card -->
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p class="text-sm font-bold text-slate-300 mb-1">1. ค้นหาบัตร</p>
          <p class="text-xs text-slate-500 mb-3">ป้อน UID บัตรหรือแตะบัตรที่เครื่องอ่าน</p>
          <div class="flex gap-3">
            <input
              v-model="uidInput"
              type="text"
              placeholder="UID บัตร..."
              :disabled="!!cardData"
              class="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/20 transition-all disabled:opacity-50"
              @keydown="handleKeydown"
            />
            <button
              v-if="!cardData"
              @click="lookupCard"
              :disabled="loading || !uidInput.trim()"
              class="px-5 h-12 rounded-xl bg-dulwich hover:bg-dulwich-600 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              ค้นหา
            </button>
            <button
              v-else
              @click="reset"
              class="px-5 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              เปลี่ยนบัตร
            </button>
          </div>

          <!-- Demo -->
          <div v-if="!cardData" class="flex gap-2 mt-2">
            <button @click="uidInput = 'STD-K1-0001'; lookupCard()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs border border-slate-700 transition-colors">
              DEMO: STD-K1-0001
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="flex items-center gap-3 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-400 text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          {{ error }}
        </div>

        <!-- Success -->
        <div v-if="successMsg" class="flex items-center gap-3 p-4 rounded-xl bg-green-950/50 border border-green-700/50 text-green-400 text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
          </svg>
          {{ successMsg }}
        </div>

        <!-- Step 2: Card info + amount -->
        <template v-if="cardData">
          <!-- User card -->
          <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <p class="text-sm font-bold text-slate-300 mb-3">ข้อมูลบัตร</p>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-dulwich/20 flex items-center justify-center flex-shrink-0">
                <svg class="w-7 h-7 text-dulwich-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-bold text-white text-lg">{{ cardData.name }}</p>
                <p class="text-slate-400 text-sm">{{ cardData.role }} {{ cardData.group ? `| ${cardData.group}` : '' }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-400">ยอดเงินปัจจุบัน</p>
                <p class="font-black text-green-400 text-2xl">฿{{ cardData.walletBalance?.toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <!-- Step 2: Amount -->
          <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <p class="text-sm font-bold text-slate-300 mb-3">2. ระบุจำนวนเงิน (บาท)</p>

            <!-- Preset buttons -->
            <div class="grid grid-cols-3 gap-2 mb-4">
              <button
                v-for="preset in PRESET_AMOUNTS"
                :key="preset"
                @click="amount = preset"
                :class="[
                  'h-12 rounded-xl font-bold text-sm transition-all border',
                  amount === preset
                    ? 'bg-dulwich border-dulwich text-white shadow-md shadow-dulwich/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                ]"
              >
                ฿{{ preset.toLocaleString() }}
              </button>
            </div>

            <!-- Custom input -->
            <div class="flex items-center gap-3">
              <span class="text-slate-400 font-semibold">฿</span>
              <input
                v-model.number="amount"
                type="number"
                min="1"
                max="100000"
                placeholder="จำนวนอื่น..."
                class="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-right text-xl font-bold placeholder-slate-600 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/20 transition-all"
              />
            </div>
          </div>

          <!-- Summary + Confirm -->
          <div v-if="amount && amount > 0" class="p-5 rounded-2xl bg-dulwich/5 border border-dulwich/30 space-y-3">
            <div class="flex justify-between text-sm text-slate-400">
              <span>ยอดเดิม</span>
              <span class="text-white">฿{{ cardData.walletBalance?.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm text-slate-400">
              <span>เติมเงิน (เงินสด)</span>
              <span class="text-white font-semibold">+฿{{ amount?.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between border-t border-slate-700 pt-3">
              <span class="font-bold text-white">ยอดใหม่</span>
              <span class="font-black text-green-400 text-xl">฿{{ (cardData.walletBalance + (amount ?? 0)).toFixed(2) }}</span>
            </div>
          </div>

          <button
            @click="confirmTopup"
            :disabled="submitting || !amount || amount <= 0"
            class="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-lg font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-green-900/20"
          >
            <svg v-if="submitting" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ submitting ? 'กำลังเติมเงิน...' : `ยืนยันเติมเงิน ฿${amount?.toLocaleString() ?? 0}` }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
