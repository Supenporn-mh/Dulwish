<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const store = useKioskStore()

const uidInput = ref('')
const flashError = ref(false)
const isLoading = ref(false)

async function handleCardRead(uid: string) {
  if (!uid.trim() || isLoading.value) return
  isLoading.value = true
  flashError.value = false

  const success = await store.readCard(uid.trim())

  if (success) {
    uidInput.value = ''
    router.push('/kiosk/home')
  } else {
    flashError.value = true
    uidInput.value = ''
    setTimeout(() => {
      flashError.value = false
    }, 2000)
  }
  isLoading.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleCardRead(uidInput.value)
}

function demoStudent() {
  handleCardRead('DEMO-STUDENT')
}

function demoTeacher() {
  handleCardRead('DEMO-TEACHER')
}
</script>

<template>
  <div
    class="w-full h-full flex flex-col items-center justify-center gap-8 relative select-none overflow-hidden"
    style="background: linear-gradient(180deg, #1264E3 0%, #0F52C1 100%)"
  >
    <!-- Error message -->
    <Transition name="error-fade">
      <div
        v-if="flashError"
        class="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-[#FF3B30] text-white rounded-[12px] px-5 py-3 text-[17px] font-semibold animate-bounce shadow-xl"
      >
        ไม่พบข้อมูลบัตร กรุณาลองใหม่อีกครั้ง
      </div>
    </Transition>

    <!-- Logo card -->
    <div class="bg-white/15 backdrop-blur-md rounded-[28px] px-8 py-6 text-center">
      <div class="text-[36px] font-black text-white tracking-[4px]">DULWICH</div>
      <div class="text-[14px] text-white/60 tracking-[6px] mt-1">COLLEGE CANTEEN</div>
    </div>

    <!-- Pulsing ring -->
    <div class="relative flex items-center justify-center w-[120px] h-[120px]">
      <div class="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" style="animation-duration: 2s;" />
      <div class="w-[80px] h-[80px] rounded-full bg-white/20 flex items-center justify-center">
        <span class="text-[40px]" role="img" aria-label="card tap">💳</span>
      </div>
    </div>

    <!-- Instruction text -->
    <div class="text-center flex flex-col gap-2">
      <p class="text-[28px] font-bold text-white">แตะบัตรเพื่อเริ่มต้น</p>
      <p class="text-[16px] text-white/60">หรือใส่ UID ด้านล่าง</p>
    </div>

    <!-- UID input area -->
    <div class="bg-white/10 backdrop-blur-md rounded-[16px] p-4 w-full max-w-[420px] mx-4">
      <input
        v-model="uidInput"
        type="text"
        placeholder="พิมพ์รหัสบัตร..."
        class="bg-transparent text-white text-[20px] font-mono text-center placeholder-white/40 outline-none w-full border-b border-white/30 pb-2"
        :disabled="isLoading"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @keydown="handleKeydown"
      />
    </div>

    <!-- Demo buttons -->
    <div class="flex gap-3 justify-center">
      <button
        @click="demoStudent"
        :disabled="isLoading"
        class="bg-white/20 backdrop-blur-md text-white rounded-full px-5 py-2 text-[15px] font-medium active:scale-95 transition-transform disabled:opacity-40"
      >
        👦 นักเรียน K1
      </button>
      <button
        @click="demoTeacher"
        :disabled="isLoading"
        class="bg-white/20 backdrop-blur-md text-white rounded-full px-5 py-2 text-[15px] font-medium active:scale-95 transition-transform disabled:opacity-40"
      >
        👩‍🏫 ครู Anna
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center gap-2 text-white/70 text-[17px]">
      <span class="animate-spin text-[20px]">⏳</span>
      <span>กำลังตรวจสอบ...</span>
    </div>
  </div>
</template>

<style scoped>
.error-fade-enter-active,
.error-fade-leave-active {
  transition: opacity 0.2s ease;
}
.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
}
</style>
