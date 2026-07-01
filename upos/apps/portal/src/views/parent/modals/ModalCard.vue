<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { useLocaleStore } from '@/stores/locale'

defineProps<{
  icon: any
  iconBg: string
  iconColor: string
  title: string
  subtitle?: string
}>()

const emit = defineEmits<{ close: [] }>()
const locale = useLocaleStore()
</script>

<template>
  <div class="mc-card" role="dialog" aria-modal="true">
    <div class="mc-header">
      <div class="mc-header-left">
        <div class="mc-icon" :style="`background:${iconBg}`">
          <component :is="icon" :size="15" weight="regular" :color="iconColor"/>
        </div>
        <div>
          <h3 class="mc-title">{{ title }}</h3>
          <p v-if="subtitle" class="mc-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <button class="mc-close" @click="emit('close')" :aria-label="locale.t('ปิด','Close')">
        <PhX :size="14" weight="bold"/>
      </button>
    </div>
    <slot/>
  </div>
</template>

<style scoped>
.mc-card {
  width: min(420px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--color-bg-surface);
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
}
.mc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  flex-shrink: 0;
}
.mc-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mc-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.mc-title {
  font-size: 15px; font-weight: 500;
  color: var(--color-text-primary);
  margin: 0; line-height: 1.3;
}
.mc-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
}
.mc-close {
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 0.5px solid var(--color-border-secondary);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.mc-close:active { opacity: 0.7; }
</style>
