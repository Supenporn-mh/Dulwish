<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

const wallet = computed(() => store.wallet)

const balanceDisplay = computed(() => {
  if (!wallet.value) return '฿0.00'
  return `฿${wallet.value.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
})

interface TxItem {
  id: number
  type: string
  amount: number
  date: string
  positive: boolean
}

const transactions = ref<TxItem[]>([
  { id: 1, type: 'ซื้ออาหาร', amount: -45, date: '29 พ.ค. 09:12', positive: false },
  { id: 2, type: 'เติมเงิน QR', amount: 200, date: '28 พ.ค. 15:30', positive: true },
  { id: 3, type: 'ซื้ออาหาร', amount: -60, date: '28 พ.ค. 12:05', positive: false },
  { id: 4, type: 'ซื้อขนม', amount: -25, date: '27 พ.ค. 10:40', positive: false },
  { id: 5, type: 'เติมเงิน QR', amount: 500, date: '26 พ.ค. 08:00', positive: true },
  { id: 6, type: 'ซื้ออาหาร', amount: -55, date: '25 พ.ค. 12:10', positive: false },
  { id: 7, type: 'ซื้อเครื่องดื่ม', amount: -30, date: '25 พ.ค. 09:55', positive: false },
  { id: 8, type: 'เติมเงิน QR', amount: 100, date: '24 พ.ค. 14:20', positive: true },
  { id: 9, type: 'ซื้ออาหาร', amount: -50, date: '23 พ.ค. 12:30', positive: false },
  { id: 10, type: 'ซื้อขนม', amount: -35, date: '22 พ.ค. 10:00', positive: false },
])

function goBack() {
  router.push('/kiosk/home')
}

function handlePrint() {
  window.print()
}
</script>

<template>
  <div class="w-full h-full flex flex-col bg-[#F2F2F7] overflow-hidden">
    <!-- Top bar -->
    <div class="bg-white flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0">
      <button @click="goBack" class="ios-btn-ghost flex items-center gap-1 text-[17px]">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path d="M8.5 1L1.5 8l7 7" stroke="#1264E3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        กลับ
      </button>
      <h1 class="ios-navbar-title flex-1 text-center">ประวัติการใช้งาน</h1>
      <!-- Spacer to balance back button -->
      <div class="w-[60px]" />
    </div>

    <!-- Balance card -->
    <div class="ios-card mx-4 mt-4 p-6 text-center flex-shrink-0">
      <p class="text-[15px] text-[#6E6E73]">ยอดเงิน</p>
      <p class="text-[52px] font-black text-[#1264E3] leading-none mt-1 tabular-nums">
        {{ balanceDisplay }}
      </p>
    </div>

    <!-- Section header -->
    <div class="ios-section-header">ประวัติ 10 รายการ</div>

    <!-- Transactions list -->
    <div class="flex-1 overflow-y-auto pb-4">
      <div class="ios-card mx-4">
        <div
          v-for="(tx, idx) in transactions"
          :key="tx.id"
          class="ios-list-row flex items-center gap-4"
          :class="{ 'border-b-0': idx === transactions.length - 1 }"
        >
          <!-- Colored dot -->
          <div
            class="w-3 h-3 rounded-full flex-shrink-0"
            :class="tx.positive ? 'bg-[#34C759]' : 'bg-[#FF3B30]'"
          />

          <!-- Description + date -->
          <div class="flex-1 min-w-0">
            <p class="text-[17px] text-[#000000] font-medium truncate">{{ tx.type }}</p>
            <p class="text-[13px] text-[#6E6E73] mt-0.5">{{ tx.date }}</p>
          </div>

          <!-- Amount -->
          <span
            class="text-[17px] font-semibold tabular-nums flex-shrink-0"
            :class="tx.positive ? 'text-[#34C759]' : 'text-[#FF3B30]'"
          >
            {{ tx.positive ? '+' : '' }}{{ tx.amount.toLocaleString('th-TH') }}
          </span>
        </div>
      </div>

      <!-- Print button -->
      <button @click="handlePrint" class="ios-btn-secondary mx-4 mt-4 w-[calc(100%-32px)]">
        🖨 พิมพ์ใบเสร็จ
      </button>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  display: none;
}
</style>
