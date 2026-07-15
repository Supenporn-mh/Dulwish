<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserCard from './UserCard.vue'
import Icon from './Icon.vue'

const router = useRouter()
const store = useKioskStore()

const user = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

const TX_TYPE_EN: Record<string, string> = {
  'ซื้ออาหาร': 'Food Purchase',
  'เติมเงิน QR': 'Top-up via QR',
  'ซื้อขนม': 'Snack Purchase',
  'ซื้อเครื่องดื่ม': 'Drink Purchase',
}

function displayType(type: string): string {
  return store.locale === 'en' ? (TX_TYPE_EN[type] ?? type) : type
}

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

function formatAmount(tx: TxItem): string {
  const sign = tx.positive ? '+' : '-'
  return `${sign}${Math.abs(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

function goBack() {
  router.push('/kiosk/topup')
}
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden" style="background: var(--color-bg-secondary)">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0" style="background: var(--color-bg-surface); border-bottom: 0.5px solid #E0E0E5">
      <span class="absolute" style="left: 20px; font-size: 11px; color: var(--color-text-tertiary)">{{ t('ประวัติการทำรายการ', 'Transaction History') }}</span>
      <h1 class="font-semibold" style="font-size: 15px; color: var(--color-text-primary)">{{ t('ประวัติการทำรายการ', 'Transaction History') }}</h1>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 pt-4 flex flex-col gap-3 min-h-0">
      <UserCard
        :name="user?.name ?? ''"
        :member-code="user?.uid ?? ''"
        :balance="wallet?.balance ?? 0"
        :role-label="user?.roleLabel ?? ''"
        :updated-at="new Date()"
      />

      <div class="text-center" style="font-size: 11px; color: var(--color-text-secondary)">{{ t('รายการล่าสุด 10 รายการ', 'Last 10 transactions') }}</div>

      <div class="overflow-hidden" style="border-radius: var(--radius-lg); border: 0.5px solid var(--color-border-tertiary); background: var(--color-bg-surface)">
        <div
          v-for="(tx, idx) in transactions"
          :key="tx.id"
          class="flex items-center justify-between px-3 py-3"
          :style="idx < transactions.length - 1 ? 'border-bottom: 0.5px solid var(--color-border-tertiary)' : ''"
        >
          <div class="min-w-0">
            <div class="font-medium truncate" style="font-size: 11px; color: var(--color-text-primary)">{{ displayType(tx.type) }}</div>
            <div class="mt-0.5" style="font-size: 9px; color: var(--color-text-tertiary)">{{ tx.date }}</div>
          </div>
          <div
            class="font-medium flex-shrink-0"
            :style="tx.positive ? 'font-size: 11px; color: var(--color-success)' : 'font-size: 11px; color: var(--color-danger)'"
          >{{ formatAmount(tx) }}</div>
        </div>
      </div>
    </div>

    <!-- Bottom -->
    <div class="flex-shrink-0 flex flex-col gap-[5px] px-5 pb-4 pt-2">
      <button class="btn-lg btn-secondary w-full" style="background: #fff" @click="goBack">
        <Icon name="chevronLeft" :size="14" />
        {{ t('ย้อนกลับ', 'Back') }}
      </button>
      <div class="text-center" style="font-size: 9px; color: var(--color-text-tertiary)">powered by UPOS</div>
    </div>
  </div>
</template>
