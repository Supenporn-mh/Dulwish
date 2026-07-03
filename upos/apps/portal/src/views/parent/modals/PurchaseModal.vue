<script setup lang="ts">
import { computed } from 'vue'
import { PhShoppingBag } from '@phosphor-icons/vue'
import { useLocaleStore } from '@/stores/locale'
import { useTxFormat } from '@/composables/useTxFormat'
import ModalCard from './ModalCard.vue'
import ReasonBox from './ReasonBox.vue'
import type { Transaction } from '@/types/transaction'

const props = defineProps<{ tx: Transaction }>()
const emit  = defineEmits<{ close: [] }>()

const locale = useLocaleStore()
const { fmtAmt, fmtDateTime, channelLabel, txStatusLabel, txStatusColor, txStatusBg, txStatusIcon, derivePurchaseItems, purchaseTotal } = useTxFormat()

const title    = computed(() => locale.t('รายละเอียดการซื้อสินค้า', 'Purchase Details'))
const subtitle = computed(() => locale.t('รายละเอียดการซื้อสินค้า',  'Purchase transaction details'))
const items    = computed(() => derivePurchaseItems(props.tx))
const total    = computed(() => purchaseTotal(items.value))
const isDimmed = computed(() => ['voided','refunded'].includes(props.tx.status?.toLowerCase() ?? ''))
</script>

<template>
  <ModalCard
    :icon="PhShoppingBag"
    icon-bg="var(--color-danger-bg)"
    icon-color="var(--color-danger)"
    :title="title"
    :subtitle="subtitle"
    @close="emit('close')"
  >
    <!-- Amount -->
    <div class="mc-amount" :style="`background:${isDimmed ? 'var(--color-muted-bg)' : 'var(--color-danger-bg)'}`">
      <p class="mc-amt-label" :style="`color:${isDimmed ? 'var(--color-muted)' : 'var(--color-danger)'}`">
        {{ locale.t('จำนวนเงิน','Amount') }}
      </p>
      <p class="mc-amt-value"
        :style="isDimmed ? 'color:var(--color-muted);text-decoration:line-through' : 'color:var(--color-danger)'">
        −{{ fmtAmt(Math.abs(tx.amount)) }}
      </p>
    </div>

    <ReasonBox :reason="tx.reason" />

    <!-- Items section -->
    <div class="mc-items-section">
      <p class="mc-section-tag">{{ locale.t('รายการสินค้า','Items Purchased') }}</p>
      <div v-for="item in items" :key="item.name" class="mc-item-row">
        <span class="mc-item-name">{{ item.name }}</span>
        <span class="mc-item-qty">×{{ item.qty }}</span>
        <span class="mc-item-price">{{ fmtAmt(item.qty * item.price) }}</span>
      </div>
      <div class="mc-total-row">
        <span class="mc-key">{{ locale.t('รวม','Total') }}</span>
        <span class="mc-total-val">{{ fmtAmt(total) }}</span>
      </div>
    </div>

    <!-- Info rows -->
    <div class="mc-rows">
      <div class="mc-row mc-row-sep">
        <span class="mc-key">{{ locale.t('จุดชำระ','Point') }}</span>
        <span class="mc-val">{{ channelLabel(tx.channel) }}</span>
      </div>
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('วันที่ / เวลา','Date / Time') }}</span>
        <span class="mc-val">{{ fmtDateTime(tx.createdAt) }}</span>
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

      <!-- Voided -->
      <template v-if="tx.status?.toLowerCase() === 'voided'">
        <div class="mc-row">
          <span class="mc-key">{{ locale.t('ยกเลิกเมื่อ','Voided at') }}</span>
          <span class="mc-val">{{ fmtDateTime(tx.actionedAt ?? tx.createdAt) }}</span>
        </div>
        <div class="mc-row">
          <span class="mc-key">{{ locale.t('ยกเลิกโดย','Voided by') }}</span>
          <span class="mc-val">{{ tx.actionedByName || '-' }}</span>
        </div>
      </template>

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

.mc-items-section {
  padding: 12px 16px;
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
.mc-item-name { flex: 1; font-size: 13px; color: var(--color-text-primary); }
.mc-item-qty  { font-size: 13px; color: var(--color-text-secondary); }
.mc-item-price{ font-size: 13px; font-weight: 500; width: 64px; text-align: right; color: var(--color-text-primary); }
.mc-total-row {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 8px;
}
.mc-total-val { font-size: 15px; font-weight: 500; color: var(--color-danger); }

.mc-rows { padding: 0 16px 14px; }
.mc-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 6px 0;
}
.mc-row-sep {
  margin-top: 8px;
}
.mc-key { font-size: 13px; color: var(--color-text-secondary); flex-shrink: 0; }
.mc-val { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-align: right; }
.mc-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
}
</style>
