<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

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
  <div class="fixed bottom-0 left-0 right-0 z-50">
    <!-- Progress bar -->
    <div class="relative h-3 bg-white/20">
      <div
        class="h-full transition-all duration-1000 ease-linear"
        :style="{
          width: `${progressPercent}%`,
          backgroundColor: progressColor,
        }"
      />
    </div>

    <!-- Countdown label -->
    <div class="flex items-center justify-center gap-3 bg-black/30 backdrop-blur-sm py-3 px-6">
      <span class="text-white/70 text-kiosk-sm font-medium">
        กำลังออกจากระบบใน
      </span>
      <span
        class="font-bold text-kiosk-base tabular-nums"
        :style="{ color: progressColor }"
      >
        {{ store.autoLogoutSeconds }} วินาที
      </span>

      <button
        class="ml-6 px-5 py-1.5 rounded-full border-2 border-white/50 text-white text-kiosk-sm
               hover:bg-white/20 active:bg-white/30 transition-colors"
        @click="handleActivity"
      >
        ยังอยู่นะ
      </button>
    </div>
  </div>
</template>
