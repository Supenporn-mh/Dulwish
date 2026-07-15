<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps<{
  name: string
  memberCode: string
  balance: number
  roleLabel: string
  updatedAt?: Date | null
  compact?: boolean
}>()

const formattedBalance = computed(() =>
  props.balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
)

const formattedTime = computed(() => {
  if (!props.updatedAt) return ''
  return props.updatedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="user-card" :class="{ compact }" :style="{ minHeight: compact ? 'auto' : '120px' }">
    <div class="uc-name">{{ name }}</div>
    <div class="uc-lbl">{{ compact ? 'ยอดคงเหลือ' : 'ยอดเงินคงเหลือ (บาท)' }}</div>
    <div class="uc-amount">฿{{ formattedBalance }}</div>

    <template v-if="!compact">
      <div class="uc-code">{{ memberCode }}</div>
      <div class="uc-time">
        <Icon name="clock" :size="10" color="rgba(255,255,255,.65)" />
        Updated at {{ formattedTime }}
      </div>

      <div class="uc-avatar">
        <Icon name="person" :size="22" color="rgba(255,255,255,.85)" />
      </div>
      <div class="uc-badge">{{ roleLabel }}</div>
    </template>
  </div>
</template>

<style scoped>
.user-card {
  background: var(--color-primary);
  border-radius: 16px;
  padding: 16px;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.user-card::before {
  content: '';
  position: absolute;
  right: -20px;
  top: -20px;
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, .06);
  border-radius: 50%;
}
.user-card::after {
  content: '';
  position: absolute;
  right: 30px;
  bottom: -30px;
  width: 90px;
  height: 90px;
  background: rgba(255, 255, 255, .04);
  border-radius: 50%;
}
.user-card.compact {
  border-radius: 14px;
  padding: 14px;
}
.user-card.compact::before {
  right: -16px;
  top: -16px;
  width: 90px;
  height: 90px;
}
.user-card.compact::after {
  display: none;
}
.user-card.compact .uc-name {
  font-size: 14px;
  margin-bottom: 2px;
}
.user-card.compact .uc-lbl {
  margin-bottom: 4px;
}
.user-card.compact .uc-amount {
  font-size: 24px;
  margin-bottom: 0;
}
.uc-avatar {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.uc-name {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 2px;
  position: relative;
  z-index: 1;
}
.uc-lbl {
  font-size: 10px;
  opacity: .7;
  margin-bottom: 3px;
  position: relative;
  z-index: 1;
}
.uc-amount {
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
  letter-spacing: -0.01em;
}
.uc-code {
  font-size: 10px;
  opacity: .7;
  margin-bottom: 1px;
  position: relative;
  z-index: 1;
}
.uc-time {
  font-size: 9px;
  opacity: .65;
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}
.uc-badge {
  position: absolute;
  right: 14px;
  bottom: 14px;
  background: rgba(255, 255, 255, .18);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  z-index: 1;
  letter-spacing: 0.02em;
}
</style>
