<script setup lang="ts">
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

function retry() {
  router.push('/kiosk/topup')
}

function close() {
  router.push('/kiosk/topup')
}
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center gap-[10px] px-8" style="background: var(--color-bg-page)">
    <div class="rounded-full flex items-center justify-center" style="width: 48px; height: 48px; background: var(--color-danger)">
      <Icon name="warning" :size="24" color="#fff" />
    </div>
    <div class="font-medium" style="font-size: 14px; color: var(--color-text-primary)">{{ t('เกิดข้อผิดพลาด', 'An Error Occurred') }}</div>
    <div class="font-medium text-center" style="font-size: 11px; color: var(--color-danger)">{{ t('ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้', 'Unable to connect to the internet') }}</div>
    <div class="text-center" style="font-size: 10px; color: var(--color-text-secondary)">{{ t('กรุณารับเงินคืน และลองทำรายการใหม่อีกครั้ง', 'Please take back your cash and try again') }}</div>

    <div class="w-full max-w-xs flex flex-col gap-2 mt-2">
      <button class="btn-lg btn-primary w-full" @click="retry">{{ t('ลองอีกครั้ง', 'Try Again') }}</button>
      <button class="btn-lg btn-secondary w-full" style="background: #fff" @click="close">{{ t('ปิด', 'Close') }}</button>
    </div>
  </div>
</template>
