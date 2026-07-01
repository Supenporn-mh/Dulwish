<script setup lang="ts">
import { computed } from 'vue'
import { PhArrowUp, PhCheckCircle } from '@phosphor-icons/vue'
import { useLocaleStore } from '@/stores/locale'
import { useTxFormat } from '@/composables/useTxFormat'
import ModalCard from './ModalCard.vue'
import type { Transaction } from '@/types/transaction'

const props = defineProps<{ tx: Transaction }>()
const emit  = defineEmits<{ close: [] }>()

const locale = useLocaleStore()
const { fmtAmt, fmtDateTime, paymentLabel, channelLabel, txStatusLabel, txStatusColor, txStatusBg } = useTxFormat()

const title    = computed(() => locale.t('รายละเอียดการเติมเงิน',      'Top-up Details'))
const subtitle = computed(() => locale.t('รายละเอียดการทำรายการเติมเงิน', 'Top-up transaction details'))
</script>

<template>
  <ModalCard
    :icon="PhArrowUp"
    icon-bg="var(--color-success-bg)"
    icon-color="var(--color-success)"
    :title="title"
    :subtitle="subtitle"
    @close="emit('close')"
  >
    <!-- Amount -->
    <div class="mc-amount" style="background:var(--color-success-bg)">
      <p class="mc-amt-label" style="color:var(--color-success)">
        {{ locale.t('จำนวนเงิน','Amount') }}
      </p>
      <p class="mc-amt-value" style="color:var(--color-success)">
        +{{ fmtAmt(tx.amount) }}
      </p>
    </div>

    <!-- Info rows -->
    <div class="mc-rows">
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('วันที่ / เวลา','Date / Time') }}</span>
        <span class="mc-val">{{ fmtDateTime(tx.createdAt) }}</span>
      </div>
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('วิธีชำระ','Method') }}</span>
        <span class="mc-val">{{ paymentLabel(tx.paymentMethod) }}</span>
      </div>
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('ช่องทาง','Channel') }}</span>
        <span class="mc-val">{{ tx.topupSource ?? channelLabel(tx.channel) }}</span>
      </div>
      <div class="mc-row">
        <span class="mc-key">{{ locale.t('อ้างอิง','Reference') }}</span>
        <span class="mc-val mc-mono">{{ tx.refNo ?? '-' }}</span>
      </div>

      <!-- Balance -->
      <template v-if="tx.balanceBefore != null || tx.balanceAfter != null">
        <div v-if="tx.balanceBefore != null" class="mc-row mc-row-sep">
          <span class="mc-key" style="color:var(--color-primary)">
            {{ locale.t('ยอดก่อน','Balance before') }}
          </span>
          <span class="mc-val">{{ fmtAmt(tx.balanceBefore!) }}</span>
        </div>
        <div v-if="tx.balanceAfter != null" class="mc-row"
          :class="{'mc-row-sep': tx.balanceBefore == null}">
          <span class="mc-key" style="color:var(--color-primary)">
            {{ locale.t('ยอดหลัง','Balance after') }}
          </span>
          <span class="mc-val" style="color:var(--color-success)">
            {{ fmtAmt(tx.balanceAfter!) }}
          </span>
        </div>
      </template>

      <!-- Status -->
      <div v-if="tx.status" class="mc-row mc-row-sep">
        <span class="mc-key">{{ locale.t('สถานะ','Status') }}</span>
        <span class="mc-badge"
          :style="`color:${txStatusColor(tx.status)};background:${txStatusBg(tx.status)}`">
          <PhCheckCircle :size="13" weight="fill"/>
          {{ txStatusLabel(tx.status) }}
        </span>
      </div>
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
  border-top: 0.5px solid var(--color-border-secondary);
  margin-top: 8px; padding-top: 12px;
}
.mc-key  { font-size: 13px; color: var(--color-text-secondary); flex-shrink: 0; }
.mc-val  { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-align: right; }
.mc-mono { font-family: monospace; font-size: 12px; color: var(--color-text-secondary); font-weight: 400; }
.mc-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
}
</style>
