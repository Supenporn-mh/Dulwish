<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const route = useRoute()
const store = useKioskStore()

const AUTO_LOGOUT_SECONDS = 30
const remaining = ref(AUTO_LOGOUT_SECONDS)
let timer: ReturnType<typeof setInterval> | null = null

const isIdleScreen = computed(
  () => route.path === '/kiosk' || route.path === '/kiosk/idle' || route.path === '/kiosk/'
)

const barWidth = computed(() => `${(remaining.value / AUTO_LOGOUT_SECONDS) * 100}%`)

function resetTimer() {
  remaining.value = AUTO_LOGOUT_SECONDS
}

function startCountdown() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (isIdleScreen.value) {
      remaining.value = AUTO_LOGOUT_SECONDS
      return
    }
    remaining.value -= 1
    if (remaining.value <= 0) {
      store.clearSession()
      router.push('/kiosk/idle')
      remaining.value = AUTO_LOGOUT_SECONDS
    }
  }, 1000)
}

function handleActivity() {
  resetTimer()
}

onMounted(() => {
  startCountdown()
  window.addEventListener('click', handleActivity)
  window.addEventListener('touchstart', handleActivity)
  window.addEventListener('keydown', handleActivity)
  window.addEventListener('pointermove', handleActivity)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('click', handleActivity)
  window.removeEventListener('touchstart', handleActivity)
  window.removeEventListener('keydown', handleActivity)
  window.removeEventListener('pointermove', handleActivity)
})
</script>

<template>
  <div class="w-screen h-screen overflow-hidden relative flex flex-col bg-[#F2F2F7]">
    <!-- Main content area -->
    <div class="flex-1 overflow-hidden">
      <RouterView />
    </div>

    <!-- Countdown bar — only shown on non-idle screens -->
    <div v-if="!isIdleScreen" class="flex-shrink-0 h-1 bg-[#C6C6C8] w-full">
      <div
        class="h-full bg-[#1264E3] transition-all duration-1000 ease-linear"
        :style="{ width: barWidth }"
      />
    </div>
  </div>
</template>
