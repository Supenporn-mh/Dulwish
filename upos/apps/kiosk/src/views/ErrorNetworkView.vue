<script setup lang="ts">
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'

const router = useRouter()

function retry() {
  router.push('/topup')
}

function close() {
  router.push('/home')
}
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col items-center justify-center gap-[10px] bg-white px-8">
    <div class="rounded-full bg-brand-danger flex items-center justify-center" style="width: 48px; height: 48px">
      <Icon name="warning" :size="24" color="#fff" />
    </div>
    <div class="font-medium text-gray-900" style="font-size: 14px">เกิดข้อผิดพลาด</div>
    <div class="font-medium text-brand-danger text-center" style="font-size: 11px">ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้</div>
    <div class="text-gray-500 text-center" style="font-size: 10px">กรุณารับเงินคืน และลองทำรายการใหม่อีกครั้ง</div>

    <div class="w-full max-w-xs flex flex-col gap-2 mt-2">
      <button class="btn-primary-full" @click="retry">ลองอีกครั้ง</button>
      <button class="btn-outline-full" @click="close">ปิด</button>
    </div>
  </div>
</template>
