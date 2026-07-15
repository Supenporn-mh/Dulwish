<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

const isLoading = ref(false)
const errorMsg = ref('')

onMounted(() => {
  store.clearSession()
})

async function handleCardRead(uid: string) {
  if (isLoading.value) return

  isLoading.value = true
  errorMsg.value = ''

  const success = await store.readCard(uid)

  isLoading.value = false

  if (success) {
    router.push('/home')
  } else {
    errorMsg.value = store.error || 'ไม่พบข้อมูลบัตร'
    setTimeout(() => { errorMsg.value = '' }, 3000)
  }
}

function demoStudent() {
  handleCardRead('STD-K1-0001')
}

function demoTeacher() {
  handleCardRead('STF-ANNA-01')
}
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col bg-white">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-5 pb-3 flex-shrink-0">
      <h1 class="font-bold" style="font-size: 16px; color: #1264E3">เติมเงิน</h1>
      <div class="absolute right-5 text-gray-400" style="font-size: 12px; font-weight: 500">TH | EN</div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex flex-col items-center justify-center gap-3 px-8">
      <div class="font-bold text-gray-900" style="font-size: 20px">แตะการ์ด</div>
      <div class="text-gray-500" style="font-size: 11px">เพื่อดำเนินการเติมเงินเข้าบัญชี</div>

      <div
        class="mt-2 flex items-center justify-center rounded-lg bg-brand-tint"
        style="width: 36px; height: 26px"
      >
        <i class="ti ti-wifi text-brand-primary" style="font-size: 16px" />
      </div>

      <i class="ti ti-device-desktop-analytics text-brand-primary mt-4" style="font-size: 52px" />

      <!-- Error message -->
      <div
        v-if="errorMsg"
        class="mt-4 rounded-lg bg-brand-danger text-white text-center px-4 py-2"
        style="font-size: 12px; font-weight: 600"
      >
        {{ errorMsg }}
      </div>

      <!-- Demo login (no real card reader in this environment) -->
      <div class="flex gap-3 mt-6">
        <button
          class="rounded-lg border text-brand-primary px-4 py-2 disabled:opacity-40"
          style="font-size: 11px; border-color: #1264E3"
          :disabled="isLoading"
          @click="demoStudent"
        >
          Demo: นักเรียน
        </button>
        <button
          class="rounded-lg border text-brand-primary px-4 py-2 disabled:opacity-40"
          style="font-size: 11px; border-color: #1264E3"
          :disabled="isLoading"
          @click="demoTeacher"
        >
          Demo: ครู
        </button>
      </div>
    </div>

    <!-- Version footer -->
    <div class="flex-shrink-0 text-center text-gray-400 pb-4" style="font-size: 10px">
      เวอร์ชั่น: 1.0.0 build 20260714
    </div>
  </div>
</template>
