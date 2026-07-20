<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import type { Transaction } from '@/stores/kiosk'
import UserCard from '@/components/UserCard.vue'
import Icon from '@/components/Icon.vue'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

const user = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)
const transactions = computed(() => store.transactions)

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

const displayName = computed(() => {
  if (store.locale === 'en') return user.value?.name || user.value?.nameTh || t('ผู้ใช้', 'User')
  return user.value?.nameTh || user.value?.name || t('ผู้ใช้', 'User')
})

const TX_DESC_EN: Record<string, string> = {
  'อาหารกลางวัน - ข้าวผัด': 'Lunch - Fried Rice',
  'ขนม - คุกกี้ช็อกโกแลต': 'Snack - Chocolate Cookie',
  'เติมเงินผ่าน QR Code': 'Top-up via QR Code',
  'อาหารเช้า - โจ๊ก': 'Breakfast - Congee',
  'เครื่องดื่ม - น้ำผลไม้': 'Drink - Fruit Juice',
  'บุฟเฟต์เช้า': 'Breakfast Buffet',
  'จองอาหารกลางวัน': 'Lunch Booking',
}

function displayDescription(desc: string): string {
  return store.locale === 'en' ? (TX_DESC_EN[desc] ?? desc) : desc
}

function formatAmount(amount: number): string {
  if (amount === 0) return '–'
  const sign = amount > 0 ? '+' : '-'
  return `${sign}${Math.abs(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(store.locale === 'en' ? 'en-GB' : 'th-TH', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function goBack() {
  router.push('/home')
}

onMounted(() => {
  store.fetchTransactions()
})

// ── Type styling ──────────────────────────────────────────────────────────────
type TxType = Transaction['type']

const TYPE_ICON: Record<TxType, string> = {
  topup: 'arrowUp',
  purchase: 'shoppingBag',
  booking: 'event',
  buffet: 'restaurant',
  refund: 'arrowUp',
}
const TYPE_COLOR: Record<TxType, string> = {
  topup: '#03BA81',
  purchase: '#FF5252',
  booking: '#1264E3',
  buffet: '#FF9800',
  refund: '#9A9AB0',
}
const TYPE_BG: Record<TxType, string> = {
  topup: '#E0FAF3',
  purchase: '#FFEBEB',
  booking: '#EAF1FD',
  buffet: '#FFF3E0',
  refund: '#F0F0F5',
}
const TYPE_LABEL: Record<TxType, [string, string]> = {
  topup: ['เติมเงิน', 'Top-up'],
  purchase: ['ซื้อสินค้า', 'Purchase'],
  booking: ['จองอาหาร', 'Booking'],
  buffet: ['บุฟเฟต์', 'Buffet'],
  refund: ['คืนเงิน', 'Refund'],
}
function typeLabel(type: TxType): string {
  const [th, en] = TYPE_LABEL[type]
  return t(th, en)
}

// ── Detail modal ──────────────────────────────────────────────────────────────
const selectedTx = ref<Transaction | null>(null)

function openModal(tx: Transaction) {
  selectedTx.value = tx
}
function closeModal() {
  selectedTx.value = null
}

const modalIndex = computed(() => {
  if (!selectedTx.value) return -1
  return transactions.value.findIndex(tx => tx.id === selectedTx.value!.id)
})

// Index 0 = ล่าสุด: ยอดคงเหลือปัจจุบันคือ balance-after ของรายการนั้น
// เดินย้อนกลับสะสม amount เพื่อหา balance-after/before ของแต่ละแถว
const modalBalanceAfter = computed(() => {
  const idx = modalIndex.value
  if (idx === -1 || !wallet.value) return 0
  let running = wallet.value.balance
  for (let i = 0; i < idx; i++) {
    running -= transactions.value[i].amount
  }
  return running
})
const modalBalanceBefore = computed(() => modalBalanceAfter.value - (selectedTx.value?.amount ?? 0))

function fmtBalance(v: number): string {
  return `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

// ── Print receipt (visual simulation only, no real printer integration) ───────
const showToast = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function printReceipt() {
  showToast.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { showToast.value = false }, 2500)
}

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col" style="background: #F0F2F5">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0 bg-white" style="border-bottom: 0.5px solid #E0E0E5">
      <span class="absolute" style="left: 20px; font-size: 11px; color: #9A9AB0">{{ t('ประวัติการทำรายการ', 'Transaction History') }}</span>
      <h1 class="font-semibold text-gray-900" style="font-size: 15px">{{ t('ประวัติการทำรายการ', 'Transaction History') }}</h1>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 pt-4 flex flex-col gap-3 min-h-0">
      <UserCard
        :name="displayName"
        :member-code="user?.id ?? ''"
        :balance="wallet?.balance ?? 0"
        :role-label="user?.roleLabel ?? ''"
        :updated-at="new Date()"
      />

      <div class="text-gray-500 text-center" style="font-size: 11px">{{ t('รายการล่าสุด 10 รายการ · กดเพื่อดูรายละเอียด', 'Last 10 transactions · Tap for details') }}</div>

      <div v-if="transactions.length === 0" class="flex-1 flex items-center justify-center text-gray-400" style="font-size: 11px">
        {{ t('ไม่มีรายการ', 'No transactions') }}
      </div>

      <div v-else class="rounded-xl overflow-hidden bg-white" style="border: 0.5px solid #E0E0E0">
        <button
          v-for="(tx, idx) in transactions"
          :key="tx.id"
          type="button"
          class="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-gray-50"
          :style="idx < transactions.length - 1 ? 'border-bottom: 0.5px solid #E0E0E0' : ''"
          @click="openModal(tx)"
        >
          <div
            class="rounded-full flex items-center justify-center flex-shrink-0"
            :style="{ width: '32px', height: '32px', background: TYPE_BG[tx.type] }"
          >
            <Icon :name="TYPE_ICON[tx.type]" :size="16" :color="TYPE_COLOR[tx.type]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-gray-900 truncate" style="font-size: 11px">{{ displayDescription(tx.description) }}</div>
            <div class="text-gray-400 mt-0.5" style="font-size: 9px">{{ formatDate(tx.createdAt) }}</div>
          </div>
          <div
            class="font-medium flex-shrink-0"
            :style="tx.amount > 0 ? 'font-size: 11px; color: #03BA81' : tx.amount < 0 ? 'font-size: 11px; color: #FF5252' : 'font-size: 11px; color: #9A9AB0'"
          >{{ formatAmount(tx.amount) }}</div>
          <Icon name="chevronRight" :size="12" color="#C0C0CC" />
        </button>
      </div>
    </div>

    <!-- Bottom -->
    <div class="flex-shrink-0 flex flex-col gap-[5px] px-5 pb-4 pt-2">
      <button class="btn-outline-full flex items-center justify-center gap-1" @click="goBack">
        <Icon name="chevronLeft" :size="14" color="#1264E3" />
        {{ t('ย้อนกลับ', 'Back') }}
      </button>
      <div class="text-center text-gray-400" style="font-size: 9px">powered by UPOS</div>
    </div>

    <AutoLogout />
  </div>

  <!-- Transaction detail modal -->
  <Teleport to="body">
    <div
      v-if="selectedTx"
      class="fixed inset-0 flex items-center justify-center z-50 px-5"
      style="background: rgba(0,0,0,.45)"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl overflow-hidden w-full" style="max-width: 340px; box-shadow: 0 24px 64px rgba(0,0,0,.18)">
        <!-- Header -->
        <div class="flex items-center justify-between gap-2 px-4 py-3" style="border-bottom: 0.5px solid #E4E4EC">
          <div class="flex items-center gap-2 min-w-0">
            <div
              class="rounded-full flex items-center justify-center flex-shrink-0"
              :style="{ width: '30px', height: '30px', background: TYPE_BG[selectedTx.type] }"
            >
              <Icon :name="TYPE_ICON[selectedTx.type]" :size="15" :color="TYPE_COLOR[selectedTx.type]" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate" style="font-size: 13px">{{ displayDescription(selectedTx.description) }}</div>
              <div class="text-gray-400" style="font-size: 10px">{{ typeLabel(selectedTx.type) }}</div>
            </div>
          </div>
          <button
            type="button"
            class="rounded-md flex items-center justify-center flex-shrink-0"
            style="width: 26px; height: 26px; border: 0.5px solid #E4E4EC"
            @click="closeModal"
          >
            <Icon name="close" :size="13" color="#5A5A7A" />
          </button>
        </div>

        <!-- Amount box -->
        <div
          class="mx-4 mt-3 rounded-lg text-center py-3"
          :style="{ background: selectedTx.amount > 0 ? '#E0FAF3' : selectedTx.amount < 0 ? '#FFEBEB' : '#F5F5FA' }"
        >
          <div
            style="font-size: 11px"
            :style="{ color: selectedTx.amount > 0 ? '#03BA81' : selectedTx.amount < 0 ? '#FF5252' : '#9A9AB0' }"
          >{{ t('จำนวนเงิน', 'Amount') }}</div>
          <div
            class="font-semibold"
            style="font-size: 22px"
            :style="{ color: selectedTx.amount > 0 ? '#03BA81' : selectedTx.amount < 0 ? '#FF5252' : '#5A5A7A' }"
          >{{ formatAmount(selectedTx.amount) }}</div>
        </div>

        <!-- Info rows -->
        <div class="px-4 pt-2 pb-1">
          <div class="flex items-center justify-between py-1.5">
            <span class="text-gray-500" style="font-size: 12px">{{ t('วันที่ / เวลา', 'Date / Time') }}</span>
            <span class="text-gray-900 font-medium" style="font-size: 12px">{{ formatDate(selectedTx.createdAt) }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span class="text-gray-500" style="font-size: 12px">{{ t('วิธีการ', 'Method') }}</span>
            <span class="text-gray-900 font-medium" style="font-size: 12px">{{ selectedTx.method || '-' }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span class="text-gray-500" style="font-size: 12px">{{ t('ช่องทาง', 'Channel') }}</span>
            <span class="text-gray-900 font-medium" style="font-size: 12px">{{ selectedTx.channel || '-' }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span class="text-gray-500" style="font-size: 12px">{{ t('เลขที่อ้างอิง', 'Reference') }}</span>
            <span class="text-gray-400" style="font-size: 11px; font-family: monospace">{{ selectedTx.refNo || '-' }}</span>
          </div>

          <div class="my-1" style="height: 0.5px; background: #E4E4EC"></div>

          <div class="flex items-center justify-between py-1.5">
            <span class="text-gray-500" style="font-size: 12px">{{ t('ยอดก่อนทำรายการ', 'Balance before') }}</span>
            <span class="text-gray-900 font-medium" style="font-size: 12px">{{ fmtBalance(modalBalanceBefore) }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span class="text-gray-500" style="font-size: 12px">{{ t('ยอดหลังทำรายการ', 'Balance after') }}</span>
            <span
              class="font-semibold"
              style="font-size: 12px"
              :style="{ color: selectedTx.amount > 0 ? '#03BA81' : '#1A1A2E' }"
            >{{ fmtBalance(modalBalanceAfter) }}</span>
          </div>

          <div class="my-1" style="height: 0.5px; background: #E4E4EC"></div>

          <div class="flex items-center justify-between py-2">
            <span class="text-gray-500" style="font-size: 12px">{{ t('สถานะ', 'Status') }}</span>
            <span
              class="inline-flex items-center gap-1 rounded-full font-medium"
              style="font-size: 11px; padding: 3px 10px; background: #E0FAF3; color: #03BA81"
            >
              <Icon name="checkCircle" :size="12" color="#03BA81" />
              {{ t('สำเร็จ', 'Complete') }}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 px-4 pt-2 pb-4">
          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-1 rounded-lg font-semibold active:scale-95 transition-transform"
            style="height: 40px; font-size: 12px; background: #1264E3; color: #fff; border: none"
            @click="printReceipt"
          >
            <Icon name="print" :size="14" color="#fff" />
            {{ t('พิมพ์ใบเสร็จ', 'Print Receipt') }}
          </button>
          <button
            type="button"
            class="rounded-lg font-semibold active:scale-95 transition-transform"
            style="height: 40px; padding: 0 16px; font-size: 12px; background: #fff; color: #1264E3; border: 1.5px solid #1264E3"
            @click="closeModal"
          >
            {{ t('ปิด', 'Close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Print toast -->
  <Teleport to="body">
    <div
      v-if="showToast"
      class="fixed left-1/2 z-[60] rounded-lg font-medium"
      style="bottom: 24px; transform: translateX(-50%); background: #1A1A2E; color: #fff; font-size: 12px; padding: 10px 18px; white-space: nowrap"
    >
      🖨️ {{ t('กำลังพิมพ์ใบเสร็จ...', 'Printing receipt...') }}
    </div>
  </Teleport>
</template>
