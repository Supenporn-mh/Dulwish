<template>
  <div style="background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden">

    <div class="bm-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['bm-tab', activeTab === tab.key ? 'bm-tab-active' : '']"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <div class="bm-content">
      <BuffetCategoryTab v-if="activeTab === 'category'"  />
      <BuffetPriceTab    v-else-if="activeTab === 'price'"    />
      <BuffetScheduleTab v-else-if="activeTab === 'schedule'" />
      <BuffetUsageTab    v-else-if="activeTab === 'usage'"    />
      <BuffetVoidTab     v-else-if="activeTab === 'void'"     />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BuffetCategoryTab from './BuffetCategoryTab.vue'
import BuffetPriceTab    from './BuffetPriceTab.vue'
import BuffetScheduleTab from './BuffetScheduleTab.vue'
import BuffetUsageTab    from './BuffetUsageTab.vue'
import BuffetVoidTab     from './BuffetVoidTab.vue'

const tabs = [
  { key: 'category', label: 'ประเภทอาหาร' },
  { key: 'price',    label: 'ราคา Buffet' },
  { key: 'schedule', label: 'ตารางเวลา' },
  { key: 'usage',    label: 'ยอดวันนี้' },
  { key: 'void',     label: 'ยกเลิกรายการ' },
] as const
type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('price')
</script>

<style scoped>
.bm-tabs {
  display:flex;gap:4px;
  border-bottom:1.5px solid #EBEBEB;
  padding:4px 20px 0;
  margin-bottom:0;
}
.bm-content {
  padding:20px;
  display:flex;flex-direction:column;gap:16px;
}
.bm-tab {
  height:36px;padding:0 16px;
  background:none;border:none;
  font-size:14px;font-weight:500;font-family:inherit;
  color:var(--color-text-secondary);cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-1.5px;
  transition:color 0.15s,border-color 0.15s;
}
.bm-tab:hover { color:#1C1C1E; }
.bm-tab-active { color:var(--color-primary);border-bottom-color:var(--color-primary); }
</style>
