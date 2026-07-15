<script setup lang="ts">
import { computed } from 'vue'

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
  <div class="relative" style="border-radius: var(--radius-lg); background: var(--color-primary); color: #fff; padding: 13px 12px">
    <div class="font-bold" style="font-size: 16px; color: #fff">{{ name }}</div>

    <div class="mt-1">
      <div style="font-size: 10px; color: rgba(255,255,255,0.7)">ยอดเงินคงเหลือ (บาท)</div>
      <div class="font-medium" style="font-size: 22px; color: #fff">฿{{ formattedBalance }}</div>
    </div>

    <template v-if="!compact">
      <div class="flex items-end justify-between mt-2">
        <div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.7)">{{ memberCode }}</div>
          <div class="flex items-center gap-1 mt-0.5" style="font-size: 10px; color: rgba(255,255,255,0.7)">
            <i class="ti ti-refresh" style="font-size: 10px" />
            <span>Updated at {{ formattedTime }}</span>
          </div>
        </div>
        <span
          class="font-medium"
          style="font-size: 10px; padding: 2px 8px; border-radius: 20px; background: rgba(255,255,255,0.2); color: #fff"
        >{{ roleLabel }}</span>
      </div>

      <div
        class="absolute flex items-center justify-center rounded-full"
        style="top: 13px; right: 12px; width: 38px; height: 38px; background: rgba(255,255,255,0.2)"
      >
        <i class="ti ti-user" style="font-size: 18px; color: rgba(255,255,255,0.8)" />
      </div>
    </template>
  </div>
</template>
