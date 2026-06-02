<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

type Phase = 'select' | 'qr' | 'processing' | 'success'

const phase = ref<Phase>('select')
const selectedAmount = ref<number | null>(null)
const qrCountdown = ref(300) // 5 minutes
const qrTimer = ref<ReturnType<typeof setInterval> | null>(null)

const AMOUNTS = [100, 200, 500, 1000]

const formattedBalance = computed(() => {
  const bal = store.wallet?.balance ?? 0
  return bal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

const qrMinutes = computed(() => Math.floor(qrCountdown.value / 60))
const qrSeconds = computed(() => qrCountdown.value % 60)
const qrProgressPercent = computed(() => (qrCountdown.value / 300) * 100)

function selectAmount(amount: number) {
  selectedAmount.value = amount
  showQr()
}

function showQr() {
  phase.value = 'qr'
  qrCountdown.value = 300

  qrTimer.value = setInterval(() => {
    qrCountdown.value -= 1
    if (qrCountdown.value <= 0) {
      clearTimer()
      phase.value = 'select'
    }
  }, 1000)
}

function clearTimer() {
  if (qrTimer.value) {
    clearInterval(qrTimer.value)
    qrTimer.value = null
  }
}

async function mockPayment() {
  clearTimer()
  phase.value = 'processing'

  // Simulate 2-second processing delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  if (selectedAmount.value) {
    await store.submitTopup(selectedAmount.value)
  }

  phase.value = 'success'
}

function backToSelect() {
  clearTimer()
  phase.value = 'select'
  selectedAmount.value = null
  qrCountdown.value = 300
}

onUnmounted(() => {
  clearTimer()
})
</script>

<template>
  <div
    class="w-screen h-screen overflow-hidden flex flex-col
           bg-gradient-to-br from-dulwich-800 via-dulwich-700 to-dulwich-900"
  >
    <!-- Top accent bar -->
    <div class="w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 flex-shrink-0" />

    <!-- Header -->
    <div class="flex items-center gap-6 px-10 py-6 flex-shrink-0">
      <button
        v-if="phase !== 'success'"
        class="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center
               justify-center text-white text-kiosk-xl hover:bg-white/20 active:scale-95
               transition-all"
        @click="phase === 'qr' ? backToSelect() : router.push('/home')"
      >
        ←
      </button>
      <div>
        <div class="text-white font-black text-kiosk-2xl">เติมเงิน QR</div>
        <div class="text-white/60 text-kiosk-base">Top-up via QR Code</div>
      </div>
    </div>

    <!-- Current balance -->
    <div class="px-10 flex-shrink-0 mb-4">
      <div class="rounded-kiosk bg-white/10 border border-white/20 px-6 py-3 inline-flex items-center gap-4">
        <span class="text-white/70 text-kiosk-base">ยอดปัจจุบัน:</span>
        <span class="text-white font-black text-kiosk-xl tabular-nums">฿{{ formattedBalance }}</span>
      </div>
    </div>

    <!-- Phase: Select amount -->
    <div v-if="phase === 'select'" class="flex-1 px-10 flex flex-col justify-center gap-8 min-h-0">
      <div class="text-white font-bold text-kiosk-xl text-center">เลือกจำนวนเงินที่ต้องการเติม</div>
      <div class="grid grid-cols-2 gap-6">
        <button
          v-for="amount in AMOUNTS"
          :key="amount"
          class="rounded-kiosk bg-white/10 border-2 border-white/30 flex flex-col
                 items-center justify-center py-10 gap-3 hover:bg-white/20 active:scale-95
                 transition-all duration-150 shadow-lg"
          @click="selectAmount(amount)"
        >
          <div class="text-yellow-300 font-black tabular-nums" style="font-size: 4rem; line-height: 1;">
            {{ amount }}
          </div>
          <div class="text-white/70 text-kiosk-base font-medium">บาท</div>
        </button>
      </div>
    </div>

    <!-- Phase: QR Code -->
    <div
      v-else-if="phase === 'qr'"
      class="flex-1 px-10 flex flex-col items-center justify-center gap-8 min-h-0"
    >
      <!-- Amount label -->
      <div class="text-white/70 text-kiosk-lg font-medium text-center">
        จำนวนเงิน
        <span class="text-yellow-300 font-black ml-3">฿{{ selectedAmount?.toLocaleString('th-TH') }}</span>
      </div>

      <!-- QR placeholder box -->
      <div
        class="w-80 h-80 rounded-kiosk bg-white flex flex-col items-center justify-center
               border-8 border-dulwich-700 shadow-2xl"
      >
        <!-- Mock QR grid pattern -->
        <div class="grid grid-cols-5 gap-2 mb-4">
          <div
            v-for="i in 25"
            :key="i"
            class="w-8 h-8 rounded-sm"
            :class="[1,2,3,5,6,8,11,13,15,18,20,23,24,25].includes(i) ? 'bg-dulwich-700' : 'bg-white'"
          />
        </div>
        <div class="text-dulwich-700 font-black text-xl text-center px-4">
          SCAN WITH<br>BANKING APP
        </div>
      </div>

      <!-- Countdown -->
      <div class="w-full max-w-md">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white/70 text-kiosk-base">หมดเวลาใน</span>
          <span class="text-white font-bold text-kiosk-xl tabular-nums">
            {{ qrMinutes }}:{{ String(qrSeconds).padStart(2, '0') }}
          </span>
        </div>
        <div class="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            class="h-full bg-yellow-400 transition-all duration-1000 ease-linear rounded-full"
            :style="{ width: `${qrProgressPercent}%` }"
          />
        </div>
      </div>

      <!-- Mock payment button -->
      <button
        class="kiosk-btn bg-yellow-400 text-dulwich-900 px-12 py-5 text-kiosk-lg font-black
               hover:bg-yellow-300 active:scale-95 shadow-lg rounded-kiosk"
        @click="mockPayment"
      >
        MOCK PAYMENT (ทดสอบ)
      </button>
    </div>

    <!-- Phase: Processing -->
    <div
      v-else-if="phase === 'processing'"
      class="flex-1 flex flex-col items-center justify-center gap-8"
    >
      <div class="w-24 h-24 border-8 border-white/30 border-t-yellow-400 rounded-full animate-spin" />
      <div class="text-white font-black text-kiosk-2xl text-center">กำลังดำเนินการ...</div>
      <div class="text-white/60 text-kiosk-lg text-center">Processing payment</div>
    </div>

    <!-- Phase: Success -->
    <div
      v-else-if="phase === 'success'"
      class="flex-1 flex flex-col items-center justify-center gap-8 px-10"
    >
      <div class="text-8xl animate-bounce-slow">✅</div>
      <div class="text-white font-black text-kiosk-3xl text-center">เติมเงินสำเร็จ!</div>
      <div class="text-white/70 text-kiosk-xl text-center">
        เพิ่มเงิน ฿{{ selectedAmount?.toLocaleString('th-TH') }} สำเร็จ
      </div>

      <!-- New balance -->
      <div class="rounded-kiosk bg-green-500/20 border-2 border-green-400/50 px-10 py-6 text-center">
        <div class="text-white/70 text-kiosk-base">ยอดเงินใหม่</div>
        <div class="text-white font-black tabular-nums" style="font-size: 4rem; line-height: 1;">
          ฿{{ formattedBalance }}
        </div>
      </div>

      <button
        class="kiosk-btn-primary px-16 py-6 text-kiosk-lg"
        @click="router.push('/home')"
      >
        กลับหน้าหลัก
      </button>
    </div>

    <!-- Auto logout bar (not on processing/success final) -->
    <AutoLogout v-if="phase !== 'processing'" />
  </div>
</template>
