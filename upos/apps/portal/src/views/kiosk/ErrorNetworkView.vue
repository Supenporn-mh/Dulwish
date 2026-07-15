<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

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
      <i class="ti ti-alert-triangle" style="font-size: 24px; color: #fff" />
    </div>
    <div class="font-medium" style="font-size: 14px; color: var(--color-text-primary)">เกิดข้อผิดพลาด</div>
    <div class="font-medium text-center" style="font-size: 11px; color: var(--color-danger)">ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้</div>
    <div class="text-center" style="font-size: 10px; color: var(--color-text-secondary)">กรุณารับเงินคืน และลองทำรายการใหม่อีกครั้ง</div>

    <div class="w-full max-w-xs flex flex-col gap-2 mt-2">
      <button class="btn-lg btn-primary w-full" @click="retry">ลองอีกครั้ง</button>
      <button class="btn-lg btn-secondary w-full" @click="close">ปิด</button>
    </div>
  </div>
</template>
