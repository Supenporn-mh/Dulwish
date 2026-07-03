<script setup lang="ts">
import { computed } from 'vue'
import { PhForkKnife, PhStar } from '@phosphor-icons/vue'
import { useLocaleStore } from '@/stores/locale'
import { useTxFormat } from '@/composables/useTxFormat'
import ModalCard from './ModalCard.vue'
import ReasonBox from './ReasonBox.vue'
import type { Transaction } from '@/types/transaction'

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
const { fmtAmt, fmtDateTime, txStatusLabel, txStatusColor, txStatusBg, txStatusIcon, deriveSession, deriveVenue } = useTxFormat()

const title    = computed(() => locale.t('รายละเอียดบุฟเฟต์',      'Buffet Details'))
const subtitle = computed(() => locale.t('รายละเอียดการใช้บุฟเฟต์', 'Buffet session details'))
const canRate  = computed(() => {
  const s = props.tx.status?.toLowerCase()
  return s === 'active' || s === 'complete' || s === 'completed' || s === 'success'
})
const isDimmed = computed(() => props.tx.status?.toLowerCase() === 'refunded')
</script>

<template>
  <ModalCard
    :icon="PhForkKnife"
    icon-bg="var(--color-warning-bg)"
    icon-color="var(--color-warning)"
    :title="title"
    :subtitle="subtitle"
    @close="emit('close')"
  >
    <!-- Amount -->
    <div v-if="tx.amount" class="mc-amount" :style="`background:${isDimmed ? 'var(--color-muted-bg)' : 'var(--color-warning-bg)'}`">
      <p class="mc-amt-label" :style="`color:${isDimmed ? 'var(--color-muted)' : 'var(--color-warning)'}`">
        {{ locale.t('จำนวนเงิน','Amount') }}
      </p>
      <p class="mc-amt-value"
        :style="isDimmed ? 'color:var(--color-muted);text-decoration:line-through' : 'color:var(--color-warning)'">
        {{ fmtAmt(Math.abs(tx.amount)) }}
      </p>
    </div>

    <ReasonBox :reason="tx.reason" />

    <!-- Info rows -->
    <div class="mc-rows">
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('มื้อ','Meal') }}</span>
        <span class="mc-badge-primary">{{ deriveSession(tx) }}</span>
      </div>
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('วันที่ / เวลา','Date / Time') }}</span>
        <span class="mc-val">{{ fmtDateTime(tx.createdAt) }}</span>
      </div>
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('ห้องอาหาร','Venue') }}</span>
        <span class="mc-val">{{ deriveVenue(tx) }}</span>
      </div>

      <!-- Status -->
      <div v-if="tx.status" class="mc-row mc-row-sep">
        <span class="mc-key">{{ locale.t('สถานะ','Status') }}</span>
        <span class="mc-badge"
          :style="`color:${txStatusColor(tx.status)};background:${txStatusBg(tx.status)}`">
          <component :is="txStatusIcon(tx.status)" :size="13" weight="fill"/>
          {{ txStatusLabel(tx.status) }}
        </span>
      </div>

      <!-- Refunded -->
      <template v-if="tx.status?.toLowerCase() === 'refunded'">
        <div class="mc-row">
          <span class="mc-key">{{ locale.t('คืนเงินเมื่อ','Refunded at') }}</span>
          <span class="mc-val">{{ fmtDateTime(tx.actionedAt ?? tx.createdAt) }}</span>
        </div>
        <div class="mc-row">
          <span class="mc-key">{{ locale.t('คืนไปที่','Refund to') }}</span>
          <span class="mc-val">{{ locale.t('ยอดคงเหลือ','Balance') }}</span>
        </div>
      </template>
    </div>

    <!-- Buffet items -->
    <div v-if="tx.items?.length || tx.buffetItems?.length" class="mc-items-section">
      <p class="mc-section-tag">{{ locale.t('เมนูที่กินในมื้อนี้','Consumed Items') }}</p>
      <template v-if="tx.items?.length">
        <div v-for="item in tx.items" :key="item.name" class="mc-item-row">
          <span class="mc-item-name">{{ item.name }}</span>
          <span class="mc-item-qty">×{{ item.qty }}</span>
          <span class="mc-item-price">{{ fmtAmt(item.lineTotal) }}</span>
        </div>
      </template>
      <template v-else>
        <div class="mc-chips">
          <span v-for="item in tx.buffetItems" :key="item" class="mc-chip">{{ item }}</span>
        </div>
      </template>
    </div>

    <!-- Review -->
    <div v-if="canRate" class="mc-review">
      <div v-if="rated" class="mc-rated-row">
        <PhStar v-for="n in 5" :key="n" :size="16"
          :weight="n <= ratingValue ? 'fill' : 'regular'"
          :color="n <= ratingValue ? 'var(--color-warning)' : 'var(--color-border-secondary)'"/>
        <span class="mc-rated-label">{{ ratingValue }}/5 · {{ ratingLabel }}</span>
      </div>
      <button v-else class="mc-rate-btn" @click.stop="emit('openReview', tx)">
        <PhStar :size="14" weight="fill"/>
        {{ locale.t('รีวิวบุฟเฟต์','Rate Buffet') }}
      </button>
    </div>
  </ModalCard>
</template>

<style scoped>
.mc-amount {
  margin: 14px 16px 0;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}
.mc-amt-label { font-size: 12px; font-weight: 500; margin-bottom: 4px; }
.mc-amt-value { font-size: 26px; font-weight: 500; line-height: 1.2; }

.mc-rows { padding: 4px 16px 14px; }
.mc-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 6px 0;
}
.mc-row-sep {
  margin-top: 8px;
}
.mc-key  { font-size: 13px; color: var(--color-text-secondary); flex-shrink: 0; }
.mc-val  { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-align: right; }

.mc-badge-primary {
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
  background: var(--color-primary-tint); color: var(--color-primary);
}
.mc-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
}

.mc-items-section {
  padding: 10px 16px 14px;
}
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
.mc-item-name  { flex: 1; font-size: 13px; color: var(--color-text-primary); }
.mc-item-qty   { font-size: 13px; color: var(--color-text-secondary); }
.mc-item-price { font-size: 13px; font-weight: 500; width: 64px; text-align: right; color: var(--color-text-primary); }
.mc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mc-chip {
  font-size: 12px; font-weight: 500;
  padding: 3px 10px; border-radius: 20px;
  background: var(--color-bg-page); color: var(--color-text-secondary);
  border: 0.5px solid var(--color-border-tertiary);
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
