<script setup lang="ts">
import { computed } from 'vue'
import { PhCalendarBlank, PhCheckCircle, PhStar } from '@phosphor-icons/vue'
import { useLocaleStore } from '@/stores/locale'
import { useTxFormat } from '@/composables/useTxFormat'
import ModalCard from './ModalCard.vue'
import type { Transaction } from '@/types/transaction'

const ACCENT_BG   = '#EEEDFE'
const ACCENT_TEXT = '#3C3489'

const BOOKING_STATUS: Record<string, { th: string; en: string; color: string; bg: string }> = {
  confirmed: { th: 'ยืนยันแล้ว',   en: 'Confirmed',  color: '#028A60',                bg: 'var(--color-success-bg)' },
  consumed:  { th: 'รับอาหารแล้ว', en: 'Consumed',   color: 'var(--color-primary)',   bg: 'var(--color-primary-tint)' },
  cancelled: { th: 'ยกเลิกแล้ว',  en: 'Cancelled',  color: '#CC3333',                bg: 'var(--color-danger-bg)'  },
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
const { fmtDateTime, deriveSession } = useTxFormat()

const title    = computed(() => locale.t('รายละเอียดการจอง',   'Booking Details'))
const subtitle = computed(() => locale.t('รายละเอียดการจองอาหาร', 'Food booking details'))

const bStatus = computed(() => BOOKING_STATUS[props.tx.bookingStatus ?? 'confirmed'])
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
    <!-- Info rows (no amount box) -->
    <div class="mc-rows">
      <!-- Meal -->
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('มื้ออาหาร','Meal') }}</span>
        <span class="mc-badge-accent">{{ deriveSession(tx) }}</span>
      </div>

      <!-- Date/Time -->
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('วันที่ / เวลา','Date / Time') }}</span>
        <span class="mc-val">{{ fmtDateTime(tx.createdAt) }}</span>
      </div>

      <!-- Reference -->
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('เลขจอง','Ref') }}</span>
        <span class="mc-val mc-mono">{{ tx.refNo ?? '-' }}</span>
      </div>

      <!-- Status -->
      <div class="mc-row mc-row-sep">
        <span class="mc-key">{{ locale.t('สถานะ','Status') }}</span>
        <span class="mc-badge" :style="`color:${bStatus.color};background:${bStatus.bg}`">
          <PhCheckCircle :size="13" weight="fill"/>
          {{ locale.lang === 'th' ? bStatus.th : bStatus.en }}
        </span>
      </div>
    </div>

    <!-- Booking items -->
    <div v-if="tx.bookingItems?.length" class="mc-items-section">
      <p class="mc-section-tag">{{ locale.t('เมนูที่จองไว้','Ordered Items') }}</p>
      <div class="mc-chips">
        <span v-for="item in tx.bookingItems" :key="item" class="mc-chip">{{ item }}</span>
      </div>
    </div>

    <!-- Review -->
    <div v-if="tx.bookingStatus === 'consumed'" class="mc-review">
      <div v-if="rated" class="mc-rated-row">
        <PhStar v-for="n in 5" :key="n" :size="16"
          :weight="n <= ratingValue ? 'fill' : 'regular'"
          :color="n <= ratingValue ? 'var(--color-warning)' : 'var(--color-border-secondary)'"/>
        <span class="mc-rated-label">{{ ratingValue }}/5 · {{ ratingLabel }}</span>
      </div>
      <button v-else class="mc-rate-btn" @click.stop="emit('openReview', tx)">
        <PhStar :size="14" weight="fill"/>
        {{ locale.t('รีวิวมื้ออาหาร','Rate Meal') }}
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
.mc-row-sep {
  border-top: 0.5px solid var(--color-border-secondary);
  margin-top: 8px; padding-top: 12px;
}
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

.mc-items-section {
  padding: 10px 16px 14px;
  border-top: 0.5px solid var(--color-border-tertiary);
}
.mc-section-tag {
  font-size: 11px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin-bottom: 8px;
}
.mc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mc-chip {
  font-size: 12px; font-weight: 500;
  padding: 3px 10px; border-radius: 20px;
  background: #EEEDFE; color: #3C3489;
}

.mc-review {
  padding: 4px 16px 14px;
}
.mc-rated-row { display: flex; align-items: center; gap: 4px; }
.mc-rated-label { font-size: 12px; font-weight: 500; color: var(--color-warning); margin-left: 4px; }
.mc-rate-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 20px;
  font-size: 13px; font-weight: 500;
  background: var(--color-warning-bg); color: var(--color-warning);
  border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mc-rate-btn:active { opacity: 0.7; }
</style>
