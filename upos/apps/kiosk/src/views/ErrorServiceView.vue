<script setup lang="ts">
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

function close() {
  router.push('/home')
}
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col items-center justify-center gap-[10px] bg-white px-8">
    <div class="rounded-full bg-brand-danger flex items-center justify-center" style="width: 48px; height: 48px">
      <Icon name="cloudOff" :size="24" color="#fff" />
    </div>
    <div class="font-medium text-gray-900" style="font-size: 14px">{{ t('เกิดข้อผิดพลาด', 'An Error Occurred') }}</div>
    <div class="font-medium text-brand-danger text-center" style="font-size: 11px">503 Service Unavailable</div>
    <div class="text-gray-500 text-center" style="font-size: 10px">{{ t('กรุณารับเงินคืน และติดต่อผู้ดูแลระบบ', 'Please take back your cash and contact staff') }}</div>

    <div class="w-full max-w-xs mt-2">
      <button class="btn-outline-full" @click="close">{{ t('ปิด', 'Close') }}</button>
    </div>
  </div>
</template>
