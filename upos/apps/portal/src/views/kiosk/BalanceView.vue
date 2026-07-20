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

type TxType = 'topup' | 'purchase' | 'booking' | 'buffet' | 'refund'

interface TxItem {
  id: number
  type: TxType
  description: string
  amount: number
  date: string
  method: string
  channel: string
  refNo: string
}

const TX_DESC_EN: Record<string, string> = {
  'ซื้ออาหาร': 'Food Purchase',
  'เติมเงิน QR': 'Top-up via QR',
  'ซื้อขนม': 'Snack Purchase',
  'ซื้อเครื่องดื่ม': 'Drink Purchase',
  'บุฟเฟต์กลางวัน': 'Lunch Buffet',
  'จองอาหารกลางวัน': 'Lunch Booking',
}

function displayDescription(desc: string): string {
  return store.locale === 'en' ? (TX_DESC_EN[desc] ?? desc) : desc
}

const transactions = ref<TxItem[]>([
  { id: 1, type: 'purchase', description: 'ซื้ออาหาร', amount: -45, date: '29 พ.ค. 09:12', method: 'RFID Card', channel: 'POS', refNo: 'ORD-20260529-001' },
  { id: 2, type: 'topup', description: 'เติมเงิน QR', amount: 200, date: '28 พ.ค. 15:30', method: 'QR Code', channel: 'Kiosk', refNo: 'TOP-20260528-004' },
  { id: 3, type: 'buffet', description: 'บุฟเฟต์กลางวัน', amount: -60, date: '28 พ.ค. 12:05', method: 'RFID Card', channel: 'POS', refNo: 'BUF-20260528-003' },
  { id: 4, type: 'purchase', description: 'ซื้อขนม', amount: -25, date: '27 พ.ค. 10:40', method: 'RFID Card', channel: 'POS', refNo: 'ORD-20260527-002' },
  { id: 5, type: 'topup', description: 'เติมเงิน QR', amount: 500, date: '26 พ.ค. 08:00', method: 'QR Code', channel: 'Kiosk', refNo: 'TOP-20260526-001' },
  { id: 6, type: 'purchase', description: 'ซื้ออาหาร', amount: -55, date: '25 พ.ค. 12:10', method: 'RFID Card', channel: 'POS', refNo: 'ORD-20260525-005' },
  { id: 7, type: 'purchase', description: 'ซื้อเครื่องดื่ม', amount: -30, date: '25 พ.ค. 09:55', method: 'RFID Card', channel: 'POS', refNo: 'ORD-20260525-004' },
  { id: 8, type: 'topup', description: 'เติมเงิน QR', amount: 100, date: '24 พ.ค. 14:20', method: 'QR Code', channel: 'Mobile App', refNo: 'TOP-20260524-002' },
  { id: 9, type: 'booking', description: 'จองอาหารกลางวัน', amount: 0, date: '23 พ.ค. 12:30', method: '-', channel: 'Mobile App', refNo: 'BKG-20260523-001' },
  { id: 10, type: 'purchase', description: 'ซื้อขนม', amount: -35, date: '22 พ.ค. 10:00', method: 'RFID Card', channel: 'POS', refNo: 'ORD-20260522-001' },
])

function formatAmount(amount: number): string {
  if (amount === 0) return '–'
  const sign = amount > 0 ? '+' : '-'
  return `${sign}${Math.abs(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

function goBack() {
  router.push('/kiosk/topup')
}

// ── Type styling ──────────────────────────────────────────────────────────────
const TYPE_ICON: Record<TxType, string> = {
  topup: 'arrowUp',
  purchase: 'shoppingBag',
  booking: 'event',
  buffet: 'restaurant',
  refund: 'arrowUp',
}
const TYPE_COLOR: Record<TxType, string> = {
  topup: 'var(--color-success)',
  purchase: 'var(--color-danger)',
  booking: 'var(--color-primary)',
  buffet: 'var(--color-warning)',
  refund: 'var(--color-text-tertiary)',
}
const TYPE_BG: Record<TxType, string> = {
  topup: 'var(--color-success-bg)',
  purchase: 'var(--color-danger-bg)',
  booking: 'var(--color-primary-tint)',
  buffet: 'var(--color-warning-bg)',
  refund: 'var(--color-bg-secondary)',
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
const selectedTx = ref<TxItem | null>(null)

function openModal(tx: TxItem) {
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

      <div class="text-center" style="font-size: 11px; color: var(--color-text-secondary)">{{ t('รายการล่าสุด 10 รายการ · กดเพื่อดูรายละเอียด', 'Last 10 transactions · Tap for details') }}</div>

      <div class="overflow-hidden" style="border-radius: var(--radius-lg); border: 0.5px solid var(--color-border-tertiary); background: var(--color-bg-surface)">
        <button
          v-for="(tx, idx) in transactions"
          :key="tx.id"
          type="button"
          class="w-full flex items-center gap-3 px-3 py-3 text-left"
          :style="idx < transactions.length - 1 ? 'border-bottom: 0.5px solid var(--color-border-tertiary)' : ''"
          @click="openModal(tx)"
        >
          <div
            class="rounded-full flex items-center justify-center flex-shrink-0"
            :style="{ width: '32px', height: '32px', background: TYPE_BG[tx.type] }"
          >
            <Icon :name="TYPE_ICON[tx.type]" :size="16" :color="TYPE_COLOR[tx.type]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium truncate" style="font-size: 11px; color: var(--color-text-primary)">{{ displayDescription(tx.description) }}</div>
            <div class="mt-0.5" style="font-size: 9px; color: var(--color-text-tertiary)">{{ tx.date }}</div>
          </div>
          <div
            class="font-medium flex-shrink-0"
            :style="tx.amount > 0 ? 'font-size: 11px; color: var(--color-success)' : tx.amount < 0 ? 'font-size: 11px; color: var(--color-danger)' : 'font-size: 11px; color: var(--color-text-tertiary)'"
          >{{ formatAmount(tx.amount) }}</div>
          <Icon name="chevronRight" :size="12" color="var(--color-text-tertiary)" />
        </button>
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

  <!-- Transaction detail modal -->
  <Teleport to="body">
    <div
      v-if="selectedTx"
      class="fixed inset-0 flex items-center justify-center z-50 px-5"
      style="background: rgba(0,0,0,.45)"
      @click.self="closeModal"
    >
      <div class="rounded-2xl overflow-hidden w-full" style="max-width: 340px; background: var(--color-bg-surface); box-shadow: 0 24px 64px rgba(0,0,0,.18)">
        <!-- Header -->
        <div class="flex items-center justify-between gap-2 px-4 py-3" style="border-bottom: 0.5px solid var(--color-border-tertiary)">
          <div class="flex items-center gap-2 min-w-0">
            <div
              class="rounded-full flex items-center justify-center flex-shrink-0"
              :style="{ width: '30px', height: '30px', background: TYPE_BG[selectedTx.type] }"
            >
              <Icon :name="TYPE_ICON[selectedTx.type]" :size="15" :color="TYPE_COLOR[selectedTx.type]" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold truncate" style="font-size: 13px; color: var(--color-text-primary)">{{ displayDescription(selectedTx.description) }}</div>
              <div style="font-size: 10px; color: var(--color-text-tertiary)">{{ typeLabel(selectedTx.type) }}</div>
            </div>
          </div>
          <button
            type="button"
            class="rounded-md flex items-center justify-center flex-shrink-0"
            style="width: 26px; height: 26px; border: 0.5px solid var(--color-border-tertiary); background: transparent"
            @click="closeModal"
          >
            <Icon name="close" :size="13" color="var(--color-text-secondary)" />
          </button>
        </div>

        <!-- Amount box -->
        <div
          class="mx-4 mt-3 rounded-lg text-center py-3"
          :style="{ background: selectedTx.amount > 0 ? 'var(--color-success-bg)' : selectedTx.amount < 0 ? 'var(--color-danger-bg)' : 'var(--color-bg-secondary)' }"
        >
          <div
            style="font-size: 11px"
            :style="{ color: selectedTx.amount > 0 ? 'var(--color-success)' : selectedTx.amount < 0 ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }"
          >{{ t('จำนวนเงิน', 'Amount') }}</div>
          <div
            class="font-semibold"
            style="font-size: 22px"
            :style="{ color: selectedTx.amount > 0 ? 'var(--color-success)' : selectedTx.amount < 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }"
          >{{ formatAmount(selectedTx.amount) }}</div>
        </div>

        <!-- Info rows -->
        <div class="px-4 pt-2 pb-1">
          <div class="flex items-center justify-between py-1.5">
            <span style="font-size: 12px; color: var(--color-text-secondary)">{{ t('วันที่ / เวลา', 'Date / Time') }}</span>
            <span class="font-medium" style="font-size: 12px; color: var(--color-text-primary)">{{ selectedTx.date }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span style="font-size: 12px; color: var(--color-text-secondary)">{{ t('วิธีการ', 'Method') }}</span>
            <span class="font-medium" style="font-size: 12px; color: var(--color-text-primary)">{{ selectedTx.method || '-' }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span style="font-size: 12px; color: var(--color-text-secondary)">{{ t('ช่องทาง', 'Channel') }}</span>
            <span class="font-medium" style="font-size: 12px; color: var(--color-text-primary)">{{ selectedTx.channel || '-' }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span style="font-size: 12px; color: var(--color-text-secondary)">{{ t('เลขที่อ้างอิง', 'Reference') }}</span>
            <span style="font-size: 11px; font-family: monospace; color: var(--color-text-tertiary)">{{ selectedTx.refNo || '-' }}</span>
          </div>

          <div class="my-1" style="height: 0.5px; background: var(--color-border-tertiary)"></div>

          <div class="flex items-center justify-between py-1.5">
            <span style="font-size: 12px; color: var(--color-text-secondary)">{{ t('ยอดก่อนทำรายการ', 'Balance before') }}</span>
            <span class="font-medium" style="font-size: 12px; color: var(--color-text-primary)">{{ fmtBalance(modalBalanceBefore) }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span style="font-size: 12px; color: var(--color-text-secondary)">{{ t('ยอดหลังทำรายการ', 'Balance after') }}</span>
            <span
              class="font-semibold"
              style="font-size: 12px"
              :style="{ color: selectedTx.amount > 0 ? 'var(--color-success)' : 'var(--color-text-primary)' }"
            >{{ fmtBalance(modalBalanceAfter) }}</span>
          </div>

          <div class="my-1" style="height: 0.5px; background: var(--color-border-tertiary)"></div>

          <div class="flex items-center justify-between py-2">
            <span style="font-size: 12px; color: var(--color-text-secondary)">{{ t('สถานะ', 'Status') }}</span>
            <span
              class="inline-flex items-center gap-1 rounded-full font-medium"
              style="font-size: 11px; padding: 3px 10px; background: var(--color-success-bg); color: var(--color-success)"
            >
              <Icon name="checkCircle" :size="12" color="var(--color-success)" />
              {{ t('สำเร็จ', 'Complete') }}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 px-4 pt-2 pb-4">
          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-1 rounded-lg font-semibold active:scale-95 transition-transform"
            style="height: 40px; font-size: 12px; background: var(--color-primary); color: #fff; border: none"
            @click="printReceipt"
          >
            <Icon name="print" :size="14" color="#fff" />
            {{ t('พิมพ์ใบเสร็จ', 'Print Receipt') }}
          </button>
          <button
            type="button"
            class="rounded-lg font-semibold active:scale-95 transition-transform"
            style="height: 40px; padding: 0 16px; font-size: 12px; background: var(--color-bg-surface); color: var(--color-primary); border: 1.5px solid var(--color-primary)"
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
