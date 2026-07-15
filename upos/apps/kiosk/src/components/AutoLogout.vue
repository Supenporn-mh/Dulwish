<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

const progressPercent = computed(() =>
  (store.autoLogoutSeconds / 30) * 100
)

const progressColor = computed(() => {
  if (store.autoLogoutSeconds > 15) return '#22c55e'  // green
  if (store.autoLogoutSeconds > 8)  return '#f59e0b'  // amber
  return '#ef4444'                                      // red
})

function handleActivity() {
  store.resetAutoLogout(logout)
}

function logout() {
  store.clearSession()
  router.push('/')
}

onMounted(() => {
  store.startAutoLogout(logout)

  window.addEventListener('click', handleActivity, { passive: true })
  window.addEventListener('touchstart', handleActivity, { passive: true })
  window.addEventListener('keydown', handleActivity, { passive: true })
  window.addEventListener('mousemove', handleActivity, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('click', handleActivity)
  window.removeEventListener('touchstart', handleActivity)
  window.removeEventListener('keydown', handleActivity)
  window.removeEventListener('mousemove', handleActivity)
})
</script>

<template>
  <div class="w-full flex-shrink-0">
    <!-- Progress bar -->
    <div class="relative h-1 bg-gray-200">
      <div
        class="h-full transition-all duration-1000 ease-linear"
        :style="{
          width: `${progressPercent}%`,
          backgroundColor: progressColor,
        }"
      />
    </div>

    <!-- Countdown label -->
    <div class="flex items-center justify-center gap-3 bg-white border-t border-gray-100 py-2 px-6">
      <span class="text-gray-500" style="font-size: 11px; font-weight: 500">
        {{ t('กำลังออกจากระบบใน', 'Logging out in') }}
      </span>
      <span
        class="font-bold tabular-nums"
        style="font-size: 12px"
        :style="{ color: progressColor }"
      >
        {{ store.autoLogoutSeconds }} {{ t('วินาที', 's') }}
      </span>

      <button
        class="ml-6 px-4 py-1 rounded-full border text-gray-600 active:bg-gray-100 transition-colors"
        style="font-size: 11px; border-color: #D1D5DB"
        @click="handleActivity"
      >
        {{ t('ยังอยู่นะ', "I'm still here") }}
      </button>
    </div>
  </div>
</template>
