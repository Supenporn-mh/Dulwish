<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale'

defineProps<{ reason?: string }>()

const locale = useLocaleStore()
</script>

<template>
  <div v-if="reason" class="reason-box">
    <p class="reason-label">{{ locale.t('เหตุผล', 'Reason') }}</p>
    <p class="reason-value">{{ reason }}</p>
  </div>
</template>

<style scoped>
.reason-box {
  background: var(--color-warning-bg);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 16px 10px;
}
.reason-label {
  font-size: 11px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--color-warning);
  margin-bottom: 2px;
}
.reason-value {
  font-size: 13px;
  color: var(--color-text-primary);
}
</style>
