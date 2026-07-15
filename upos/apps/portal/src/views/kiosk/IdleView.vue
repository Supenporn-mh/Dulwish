<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import Icon from './Icon.vue'

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
    router.push('/kiosk/topup')
  } else {
    errorMsg.value = store.error || 'ไม่พบข้อมูลบัตร'
    setTimeout(() => { errorMsg.value = '' }, 3000)
  }
}

function demoStudent() {
  handleCardRead('DEMO-STUDENT')
}

function demoTeacher() {
  handleCardRead('DEMO-TEACHER')
}
</script>

<template>
  <div class="w-full h-full overflow-hidden flex flex-col" style="background: var(--color-bg-page)">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0" style="background: var(--color-bg-surface); border-bottom: 0.5px solid #E0E0E5">
      <span class="absolute" style="left: 20px; font-size: 11px; color: var(--color-text-tertiary)">แตะบัตร</span>
      <h1 class="font-semibold" style="font-size: 15px; color: var(--color-primary)">เติมเงิน</h1>
      <div class="absolute right-5" style="font-size: 11px; font-weight: 500; color: var(--color-text-tertiary)">TH | EN</div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex flex-col items-center justify-center gap-3 px-8">
      <div class="font-bold" style="font-size: 20px; color: var(--color-text-primary)">แตะการ์ด</div>
      <div style="font-size: 11px; color: var(--color-text-secondary)">เพื่อดำเนินการเติมเงินเข้าบัญชี</div>

      <div
        class="mt-2 flex items-center justify-center"
        style="width: 36px; height: 26px; border-radius: 8px; background: var(--color-primary-tint)"
      >
        <Icon name="wifi" :size="16" color="var(--color-primary)" />
      </div>

      <div class="mt-4">
        <Icon name="monitor" :size="52" color="var(--color-primary)" />
      </div>

      <!-- Error message -->
      <div
        v-if="errorMsg"
        class="mt-4 text-center px-4 py-2"
        style="border-radius: 8px; background: var(--color-danger); color: #fff; font-size: 12px; font-weight: 600"
      >
        {{ errorMsg }}
      </div>

      <!-- Demo login (no real card reader in this environment) -->
      <div class="flex gap-3 mt-6">
        <button
          class="px-4 py-2 disabled:opacity-40"
          style="border-radius: 8px; border: 1px solid var(--color-primary); color: var(--color-primary); font-size: 11px"
          :disabled="isLoading"
          @click="demoStudent"
        >
          Demo: นักเรียน
        </button>
        <button
          class="px-4 py-2 disabled:opacity-40"
          style="border-radius: 8px; border: 1px solid var(--color-primary); color: var(--color-primary); font-size: 11px"
          :disabled="isLoading"
          @click="demoTeacher"
        >
          Demo: ครู
        </button>
      </div>
    </div>

    <!-- Version footer -->
    <div class="flex-shrink-0 text-center pb-4" style="font-size: 10px; color: var(--color-text-tertiary)">
      เวอร์ชั่น: 1.0.0 build 20260715
    </div>
  </div>
</template>
