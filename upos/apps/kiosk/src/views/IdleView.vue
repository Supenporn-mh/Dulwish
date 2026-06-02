<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

const manualUid = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

// Clear session whenever we land on idle
onMounted(() => {
  store.clearSession()
})

async function handleCardRead(uid: string) {
  if (!uid.trim() || isLoading.value) return

  isLoading.value = true
  errorMsg.value = ''

  const success = await store.readCard(uid.trim())

  isLoading.value = false

  if (success) {
    router.push('/home')
  } else {
    errorMsg.value = store.error || 'ไม่พบข้อมูลบัตร'
    setTimeout(() => { errorMsg.value = '' }, 3000)
  }
}

function submitManual() {
  handleCardRead(manualUid.value)
}

function demoStudent() {
  manualUid.value = 'STD-K1-0001'
  handleCardRead('STD-K1-0001')
}

function demoTeacher() {
  manualUid.value = 'STF-ANNA-01'
  handleCardRead('STF-ANNA-01')
}
</script>

<template>
  <div
    class="w-screen h-screen overflow-hidden flex flex-col items-center justify-between
           bg-gradient-to-b from-dulwich-900 via-dulwich-700 to-dulwich-800
           relative"
  >
    <!-- Top decorative band -->
    <div class="w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 flex-shrink-0" />

    <!-- Main content -->
    <div class="flex-1 flex flex-col items-center justify-center gap-10 px-12 w-full max-w-3xl">

      <!-- Logo / School name -->
      <div class="flex flex-col items-center gap-3">
        <div
          class="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-2xl
                 border-4 border-yellow-400"
        >
          <div class="text-center">
            <div class="text-dulwich-700 font-black text-2xl leading-tight tracking-wider">DULWICH</div>
            <div class="text-dulwich-500 font-bold text-sm tracking-widest">COLLEGE</div>
          </div>
        </div>

        <div class="text-white font-black text-kiosk-2xl tracking-wide text-center drop-shadow-lg">
          DULWICH COLLEGE
        </div>
        <div class="text-yellow-300 font-bold text-kiosk-lg tracking-widest text-center">
          CANTEEN SELF-SERVICE
        </div>
      </div>

      <!-- Animated card icon -->
      <div class="flex flex-col items-center gap-4">
        <div class="relative">
          <!-- Outer ping rings -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-40 h-40 rounded-full border-4 border-white/30 animate-ping" />
          </div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div
              class="w-32 h-32 rounded-full border-4 border-white/40 animate-ping"
              style="animation-delay: 0.5s"
            />
          </div>

          <!-- Card icon -->
          <div
            class="relative w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm
                   border-4 border-white/60 flex items-center justify-center
                   animate-pulse-slow shadow-2xl"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-14 h-14 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25
                   2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0
                   00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
          </div>
        </div>

        <!-- Prompt text -->
        <div class="text-white font-bold text-kiosk-xl text-center drop-shadow-lg mt-4">
          แตะบัตรเพื่อเริ่มต้น
        </div>
        <div class="text-white/70 text-kiosk-base text-center">
          Tap your card to begin
        </div>
      </div>

      <!-- Error message -->
      <transition name="fade">
        <div
          v-if="errorMsg"
          class="w-full bg-red-500/90 text-white rounded-kiosk p-4 text-center text-kiosk-base font-bold"
        >
          {{ errorMsg }}
        </div>
      </transition>

      <!-- Manual UID input -->
      <div class="w-full flex flex-col gap-4">
        <div class="flex gap-3">
          <input
            v-model="manualUid"
            type="text"
            placeholder="พิมพ์รหัสบัตร / Enter card UID"
            class="flex-1 bg-white/10 border-2 border-white/40 rounded-kiosk px-6 py-4
                   text-white placeholder-white/50 text-kiosk-base focus:outline-none
                   focus:border-yellow-400 focus:bg-white/20 transition-all"
            @keydown.enter="submitManual"
          />
          <button
            class="kiosk-btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isLoading || !manualUid.trim()"
            @click="submitManual"
          >
            <span v-if="isLoading">...</span>
            <span v-else>เข้าสู่ระบบ</span>
          </button>
        </div>

        <!-- Demo buttons -->
        <div class="flex gap-4">
          <button
            class="flex-1 kiosk-btn border-2 border-yellow-400/60 text-yellow-300
                   hover:bg-yellow-400/10 active:bg-yellow-400/20 text-kiosk-sm py-4"
            @click="demoStudent"
          >
            <span class="text-2xl">🎒</span>
            Student K1 (STD-K1-0001)
          </button>
          <button
            class="flex-1 kiosk-btn border-2 border-yellow-400/60 text-yellow-300
                   hover:bg-yellow-400/10 active:bg-yellow-400/20 text-kiosk-sm py-4"
            @click="demoTeacher"
          >
            <span class="text-2xl">👩‍🏫</span>
            Teacher (STF-ANNA-01)
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom band -->
    <div class="w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 flex-shrink-0" />

    <!-- Loading overlay -->
    <transition name="fade">
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-dulwich-900/80 backdrop-blur-sm flex flex-col
               items-center justify-center gap-6 z-50"
      >
        <div class="w-20 h-20 border-8 border-white/30 border-t-white rounded-full animate-spin" />
        <div class="text-white text-kiosk-xl font-bold">กำลังอ่านบัตร...</div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
