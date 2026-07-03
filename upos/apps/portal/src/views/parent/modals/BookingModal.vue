<script setup lang="ts">
import { computed } from 'vue'
import { PhCalendarBlank, PhCheckCircle, PhClock, PhXCircle, PhX, PhStar } from '@phosphor-icons/vue'
import { useLocaleStore } from '@/stores/locale'
import { useTxFormat } from '@/composables/useTxFormat'
import ModalCard from './ModalCard.vue'
import ReasonBox from './ReasonBox.vue'
import type { Transaction } from '@/types/transaction'

const ACCENT_BG   = 'var(--color-accent-bg)'
const ACCENT_TEXT = 'var(--color-accent)'

type BookingStatus = 'confirmed' | 'ready' | 'collected' | 'missed' | 'cancelled'

interface StatusConfig {
  th: string; en: string
  badgeBg: string; badgeText: string
  icon: any
}

const STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  confirmed: {
    th: 'ยืนยันแล้ว',   en: 'Confirmed',
    badgeBg: 'var(--color-success-bg)', badgeText: 'var(--color-success)',
    icon: PhCheckCircle,
  },
  ready: {
    th: 'พร้อมรับ', en: 'Ready to collect',
    badgeBg: ACCENT_BG, badgeText: ACCENT_TEXT,
    icon: PhClock,
  },
  collected: {
    th: 'รับแล้ว', en: 'Collected',
    badgeBg: 'var(--color-muted-bg)', badgeText: 'var(--color-muted)',
    icon: PhCheckCircle,
  },
  missed: {
    th: 'พลาด', en: 'Missed',
    badgeBg: 'var(--color-danger-bg)', badgeText: 'var(--color-danger)',
    icon: PhXCircle,
  },
  cancelled: {
    th: 'ยกเลิกแล้ว', en: 'Cancelled',
    badgeBg: 'var(--color-danger-bg)', badgeText: 'var(--color-danger)',
    icon: PhX,
  },
}

const props = defineProps<{
  tx: Transaction
  rated: boolean
  ratingValue: number
  ratingLabel: string
}>()
const emit = defineEmits<{
  close: []
  openReview: [tx: Transaction]
}>()

const locale = useLocaleStore()
const { fmtDateTime, deriveSession, derivePurchaseItems } = useTxFormat()

const items = computed(() => derivePurchaseItems(props.tx))

const title    = computed(() => locale.t('รายละเอียดการจอง',      'Booking Details'))
const subtitle = computed(() => locale.t('รายละเอียดการจองอาหาร', 'Food booking details'))

const bStatus = computed<BookingStatus>(() => {
  const s = props.tx.bookingStatus
  if (s === 'confirmed' || s === 'ready' || s === 'collected' || s === 'missed' || s === 'cancelled') return s
  return 'confirmed'
})

const config = computed(() => STATUS_CONFIG[bStatus.value])

const mealDateColor = computed(() =>
  bStatus.value === 'confirmed' || bStatus.value === 'ready' ? ACCENT_TEXT : 'var(--color-text-primary)'
)

function fmtMealDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  const isEN = locale.lang === 'en'
  const loc = isEN ? 'en-GB' : 'th-TH'
  const s = bStatus.value
  if (s === 'confirmed') {
    return d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (s === 'ready') {
    const dateStr = d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })
    return isEN ? `Today, ${dateStr}` : `วันนี้, ${dateStr}`
  }
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <ModalCard
    :icon="PhCalendarBlank"
    :icon-bg="ACCENT_BG"
    :icon-color="ACCENT_TEXT"
    :title="title"
    :subtitle="subtitle"
    @close="emit('close')"
  >
    <div class="mc-rows">
      <!-- Meal -->
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('มื้ออาหาร', 'Meal') }}</span>
        <span class="mc-badge-accent">{{ deriveSession(tx) }}</span>
      </div>

      <!-- Meal date -->
      <div v-if="tx.mealDate" class="mc-row">
        <span class="mc-key">{{ locale.t('วันที่มื้ออาหาร', 'Meal date') }}</span>
        <span class="mc-val" :style="`color:${mealDateColor}`">{{ fmtMealDate(tx.mealDate) }}</span>
      </div>

      <!-- Booked on -->
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('วันที่จอง', 'Booked on') }}</span>
        <span class="mc-val">{{ fmtDateTime(tx.createdAt) }}</span>
      </div>

      <!-- Collected at — only for 'collected' -->
      <div v-if="bStatus === 'collected' && tx.collectedAt" class="mc-row">
        <span class="mc-key">{{ locale.t('รับอาหารเมื่อ', 'Collected at') }}</span>
        <span class="mc-val">{{ fmtDateTime(tx.collectedAt) }}</span>
      </div>

      <!-- Cancelled on — only for 'cancelled' -->
      <div v-if="bStatus === 'cancelled' && tx.cancelledAt" class="mc-row">
        <span class="mc-key">{{ locale.t('ยกเลิกเมื่อ', 'Cancelled on') }}</span>
        <span class="mc-val">{{ fmtDateTime(tx.cancelledAt) }}</span>
      </div>

      <!-- Reference -->
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('เลขอ้างอิง', 'Reference') }}</span>
        <span class="mc-val mc-mono">{{ tx.refNo ?? '-' }}</span>
      </div>

      <!-- Status -->
      <div class="mc-row mc-row-sep mc-row-status">
        <span class="mc-key">{{ locale.t('สถานะ', 'Status') }}</span>
        <span class="mc-badge" :style="`color:${config.badgeText};background:${config.badgeBg}`">
          <component :is="config.icon" :size="13" weight="fill"/>
          {{ locale.lang === 'th' ? config.th : config.en }}
        </span>
      </div>
    </div>

    <ReasonBox v-if="bStatus === 'cancelled'" :reason="tx.reason" />

    <!-- Items ordered -->
    <div v-if="items.length" class="mc-items-section">
      <p class="mc-section-tag">{{ locale.t('เมนูที่สั่ง', 'Items Ordered') }}</p>
      <div v-for="item in items" :key="item.name" class="mc-item-row">
        <span class="mc-item-name">{{ item.name }}</span>
        <span class="mc-item-qty">×{{ item.qty }}</span>
      </div>
    </div>

    <!-- Note -->
    <div v-if="tx.bookingNote" class="mc-note-section">
      <p class="mc-section-tag">{{ locale.t('หมายเหตุ', 'Note') }}</p>
      <p class="mc-note-text">{{ tx.bookingNote }}</p>
    </div>

    <!-- Rate booking — collected only -->
    <div v-if="bStatus === 'collected'" class="mc-review">
      <div v-if="rated" class="mc-rated-row">
        <PhStar v-for="n in 5" :key="n" :size="16"
          :weight="n <= ratingValue ? 'fill' : 'regular'"
          :color="n <= ratingValue ? 'var(--color-warning)' : 'var(--color-border-secondary)'"/>
        <span class="mc-rated-label">{{ ratingValue }}/5 · {{ ratingLabel }}</span>
      </div>
      <button v-else class="mc-rate-btn" @click.stop="emit('openReview', tx)">
        <PhStar :size="14" weight="fill"/>
        {{ locale.t('รีวิวมื้ออาหาร', 'Rate Booking') }}
      </button>
    </div>
  </ModalCard>
</template>

<style scoped>
.mc-rows { padding: 4px 16px 14px; }
.mc-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 6px 0;
}
.mc-row-sep { margin-top: 8px; }
.mc-row-status { padding-top: 12px; padding-bottom: 12px; }
.mc-key  { font-size: 13px; color: var(--color-text-secondary); flex-shrink: 0; }
.mc-val  { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-align: right; }
.mc-mono { font-family: monospace; font-size: 12px; color: var(--color-text-secondary); font-weight: 400; }

.mc-badge-accent {
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
  background: #EEEDFE; color: #3C3489;
}
.mc-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
}

.mc-items-section { padding: 4px 16px 10px; }
.mc-section-tag {
  font-size: 11px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin-bottom: 8px;
}
.mc-item-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 0;
}
.mc-item-name { flex: 1; font-size: 13px; color: var(--color-text-primary); }
.mc-item-qty  { font-size: 13px; color: var(--color-text-secondary); }

.mc-note-section { padding: 4px 16px 10px; }
.mc-note-text { font-size: 13px; color: var(--color-text-primary); line-height: 1.5; white-space: pre-wrap; }

.mc-review { padding: 4px 16px 14px; }
.mc-rated-row { display: flex; align-items: center; gap: 4px; }
.mc-rated-label { font-size: 12px; font-weight: 500; color: var(--color-warning); margin-left: 4px; }
.mc-rate-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 20px;
  font-size: 13px; font-weight: 500;
  background: #EEEDFE; color: #3C3489;
  border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mc-rate-btn:active { opacity: 0.7; }
</style>
