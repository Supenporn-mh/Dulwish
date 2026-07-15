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
  <div
    class="relative rounded-xl bg-brand-primary text-white"
    :style="compact ? 'padding: 13px 12px' : 'padding: 13px 12px'"
  >
    <div class="font-bold text-white" style="font-size: 16px">{{ name }}</div>

    <div class="mt-1">
      <div class="text-white/70" style="font-size: 10px">ยอดเงินคงเหลือ (บาท)</div>
      <div class="font-medium text-white" style="font-size: 22px">฿{{ formattedBalance }}</div>
    </div>

    <template v-if="!compact">
      <div class="flex items-end justify-between mt-2">
        <div>
          <div class="text-white/70" style="font-size: 10px">{{ memberCode }}</div>
          <div class="flex items-center gap-1 text-white/70 mt-0.5" style="font-size: 10px">
            <i class="ti ti-refresh" style="font-size: 10px" />
            <span>Updated at {{ formattedTime }}</span>
          </div>
        </div>
        <span
          class="rounded-full bg-white/20 text-white font-medium"
          style="font-size: 10px; padding: 2px 8px"
        >{{ roleLabel }}</span>
      </div>

      <!-- Avatar circle -->
      <div
        class="absolute top-[13px] right-[12px] w-[38px] h-[38px] rounded-full bg-white/20
               flex items-center justify-center"
      >
        <i class="ti ti-user text-white/80" style="font-size: 18px" />
      </div>
    </template>
  </div>
</template>
