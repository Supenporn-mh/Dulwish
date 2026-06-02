<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

const wallet = computed(() => store.wallet)
const transactions = computed(() => store.transactions)

const formattedBalance = computed(() => {
  const bal = wallet.value?.balance ?? 0
  return bal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}฿${Math.abs(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function typeIcon(type: string): string {
  if (type === 'purchase') return '🛒'
  if (type === 'topup') return '💰'
  if (type === 'refund') return '↩️'
  return '📄'
}

function printReceipt() {
  window.print()
}

onMounted(() => {
  store.fetchTransactions()
})
</script>

<template>
  <div
    class="w-screen h-screen overflow-hidden flex flex-col
           bg-gradient-to-br from-dulwich-800 via-dulwich-700 to-dulwich-900"
  >
    <!-- Top accent bar -->
    <div class="w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 flex-shrink-0" />

    <!-- Header -->
    <div class="flex items-center gap-6 px-10 py-6 flex-shrink-0">
      <button
        class="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center
               justify-center text-white text-kiosk-xl hover:bg-white/20 active:scale-95
               transition-all"
        @click="router.push('/home')"
      >
        ←
      </button>
      <div>
        <div class="text-white font-black text-kiosk-2xl">ประวัติรายการ</div>
        <div class="text-white/60 text-kiosk-base">Transaction History</div>
      </div>
    </div>

    <!-- Balance summary -->
    <div class="px-10 flex-shrink-0">
      <div class="rounded-kiosk bg-white/10 border border-white/20 p-6 flex items-center justify-between">
        <div>
          <div class="text-white/70 text-kiosk-base">ยอดเงินคงเหลือ</div>
          <div class="text-white font-black tabular-nums" style="font-size: 4rem; line-height: 1;">
            ฿{{ formattedBalance }}
          </div>
        </div>
        <button
          class="kiosk-btn-primary px-8 py-4"
          @click="printReceipt"
        >
          🖨 พิมพ์ใบเสร็จ
        </button>
      </div>
    </div>

    <!-- Transactions list -->
    <div class="flex-1 overflow-y-auto px-10 py-4 min-h-0">
      <div
        v-if="transactions.length === 0"
        class="flex flex-col items-center justify-center h-full gap-4 text-white/50"
      >
        <div style="font-size: 4rem;">📭</div>
        <div class="text-kiosk-lg">ไม่มีรายการ</div>
      </div>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="flex items-center gap-5 rounded-kiosk border border-white/15
                 p-5 transition-colors"
          style="background: rgba(255,255,255,0.07)"
        >
          <!-- Type icon -->
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-4xl
                   border-2"
            :class="tx.type === 'topup'
              ? 'bg-green-500/20 border-green-400/40'
              : tx.type === 'refund'
                ? 'bg-blue-500/20 border-blue-400/40'
                : 'bg-red-500/20 border-red-400/40'"
          >
            {{ typeIcon(tx.type) }}
          </div>

          <!-- Description -->
          <div class="flex-1 min-w-0">
            <div class="text-white font-bold text-kiosk-base truncate">{{ tx.description }}</div>
            <div class="text-white/50 text-kiosk-sm">{{ formatTime(tx.createdAt) }}</div>
          </div>

          <!-- Amount -->
          <div
            class="font-black text-kiosk-lg tabular-nums flex-shrink-0"
            :class="tx.amount >= 0 ? 'text-green-400' : 'text-red-400'"
          >
            {{ formatAmount(tx.amount) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Auto logout bar -->
    <AutoLogout />
  </div>
</template>
