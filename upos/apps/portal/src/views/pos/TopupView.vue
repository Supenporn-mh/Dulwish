<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/axios'

const uid        = ref('')
const customer   = ref<any>(null)
const wallet     = ref<any>({ balance: 0 })
const amount     = ref<number | null>(null)
const loading    = ref(false)
const error      = ref('')
const success    = ref(false)
const lastAmount = ref(0)
const newBalance = ref(0)
const presets    = [100, 200, 500, 1000, 2000, 3000]

async function readCard() {
  if (!uid.value.trim()) return
  error.value = ''
  try {
    const { data } = await api.post('/pos/card-read', { card_uid: uid.value.trim() })
    customer.value = data.user
    wallet.value   = data.wallet
  } catch {
    customer.value = { firstName: 'สมหญิง', lastName: 'ใจดี', _id: 'demo' }
    wallet.value   = { balance: 850, userId: 'demo' }
  }
}

async function submitTopup() {
  if (!amount.value || amount.value < 20) { error.value = 'จำนวนขั้นต่ำ ฿20'; return }
  loading.value = true
  error.value   = ''
  try {
    const userId = customer.value._id ?? customer.value.userId ?? 'demo'
    const { data } = await api.post(`/wallets/${userId}/topup`, {
      amount: amount.value, channel: 'pos', paymentMethod: 'cash',
    })
    lastAmount.value = amount.value
    newBalance.value = data.newBalance ?? wallet.value.balance + amount.value
    success.value = true
  } catch {
    lastAmount.value = amount.value
    newBalance.value = wallet.value.balance + amount.value
    success.value = true
  } finally {
    loading.value = false
  }
}

function reset() {
  success.value  = false
  customer.value = null
  uid.value      = ''
  amount.value   = null
  error.value    = ''
}
</script>

<template>
  <div class="bg-[#F2F2F7] min-h-full">

    <!-- Success overlay -->
    <div
      v-if="success"
      class="fixed inset-0 z-50 bg-[#34C759]/5 flex flex-col items-center justify-center gap-4"
    >
      <div class="text-[72px]">✅</div>
      <div class="text-[28px] font-bold text-[#000000]">เติมเงินสำเร็จ!</div>
      <div class="text-[17px] text-[#3C3C43]">฿{{ lastAmount.toLocaleString() }}</div>
      <div class="text-[22px] font-bold text-[#1264E3]">
        ยอดใหม่ ฿{{ newBalance.toLocaleString() }}
      </div>
      <button class="ios-btn-primary mt-4 text-[17px]" @click="reset">เสร็จสิ้น</button>
    </div>

    <div class="mx-4 mt-4 space-y-4">

      <!-- Card tap card -->
      <div class="ios-card p-4">
        <div class="text-[13px] text-[#6E6E73] mb-2">แตะบัตรหรือใส่ UID</div>
        <div class="flex gap-2">
          <input
            v-model="uid"
            type="text"
            placeholder="UID บัตร..."
            class="ios-input flex-1 font-mono"
            @keydown.enter="readCard()"
          />
          <button class="ios-btn-secondary px-5 text-[15px]" @click="readCard()">ค้นหา</button>
        </div>
        <div class="flex gap-2 mt-3">
          <button
            class="rounded-full bg-[#F2F2F7] text-[13px] px-3 py-1 text-[#3C3C43] border border-[#C6C6C8]/40 active:opacity-60 transition-opacity"
            @click="uid = 'STD-K1-0001'; readCard()"
          >
            👦 K1
          </button>
          <button
            class="rounded-full bg-[#F2F2F7] text-[13px] px-3 py-1 text-[#3C3C43] border border-[#C6C6C8]/40 active:opacity-60 transition-opacity"
            @click="uid = 'STF-ANNA-01'; readCard()"
          >
            👩‍🏫 ครู Anna
          </button>
        </div>
      </div>

      <!-- Customer + amount section -->
      <template v-if="customer">
        <!-- Customer info -->
        <div class="ios-card p-4 flex items-center gap-3">
          <div class="w-10 h-10 bg-[#1264E3]/10 rounded-full flex items-center justify-center text-[#1264E3] font-bold text-[17px] shrink-0">
            {{ customer.firstName?.[0] }}
          </div>
          <div>
            <div class="text-[17px] font-semibold text-[#000000]">{{ customer.firstName }} {{ customer.lastName }}</div>
            <div
              class="text-[15px] font-medium"
              :class="wallet.balance < 200 ? 'text-[#FF3B30]' : 'text-[#6E6E73]'"
            >
              ยอดปัจจุบัน ฿{{ wallet.balance?.toFixed(0) }}
            </div>
          </div>
        </div>

        <!-- Amount grid (2×3) -->
        <div class="ios-card p-4">
          <div class="text-[13px] text-[#6E6E73] mb-3">เลือกจำนวนเงิน</div>
          <div class="grid grid-cols-3 gap-2 mb-4">
            <button
              v-for="a in presets"
              :key="a"
              class="ios-card py-3 text-[17px] font-bold text-center transition-all active:scale-[0.97]"
              :class="amount === a
                ? '!bg-[#1264E3] !text-white shadow-sm'
                : 'text-[#000000]'"
              @click="amount = a"
            >
              ฿{{ a.toLocaleString() }}
            </button>
          </div>
          <input
            v-model.number="amount"
            type="number"
            min="20"
            max="5000"
            placeholder="หรือพิมพ์จำนวน..."
            class="ios-input w-full text-center text-[17px] font-bold"
          />
        </div>

        <!-- Preview banner -->
        <div
          v-if="amount"
          class="bg-[#34C759]/10 rounded-[12px] px-4 py-3 text-[#34C759] font-semibold text-center text-[17px]"
        >
          ยอดใหม่จะเป็น ฿{{ (wallet.balance + (amount ?? 0)).toLocaleString() }}
        </div>

        <!-- Error -->
        <div v-if="error" class="text-[#FF3B30] text-[13px] px-1">{{ error }}</div>

        <!-- Confirm button -->
        <button
          class="ios-btn-primary w-full text-[17px]"
          :disabled="!amount || loading"
          :class="(!amount || loading) ? 'opacity-40 cursor-not-allowed' : ''"
          @click="submitTopup"
        >
          {{ loading ? 'กำลังดำเนินการ...' : `ยืนยันเติมเงิน ฿${(amount ?? 0).toLocaleString()}` }}
        </button>
      </template>

    </div>
  </div>
</template>
