<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white safe-top border-b border-gray-100">
      <div class="page-header">
        <button class="back-btn" @click="$router.back()">
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-bold text-gray-800">เติมเงิน</h1>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 px-4 py-5 space-y-5 overflow-y-auto scroll-smooth-ios">
      <!-- Child + Balance info -->
      <div class="card">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-lg">
            {{ auth.selectedChild?.name?.charAt(0) ?? 'N' }}
          </div>
          <div class="flex-1">
            <p class="font-semibold text-gray-800">{{ auth.selectedChild?.name ?? '-' }}</p>
            <p class="text-xs text-gray-500">{{ auth.selectedChild?.grade }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500">ยอดปัจจุบัน</p>
            <p class="text-xl font-bold text-primary-500">฿{{ formatAmount(currentBalance) }}</p>
          </div>
        </div>
      </div>

      <!-- Amount selector -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-gray-700">เลือกจำนวนเงิน</h2>

        <!-- Preset buttons -->
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="preset in presets"
            :key="preset"
            class="py-3.5 rounded-2xl border-2 font-semibold text-base transition-colors"
            :class="
              selectedAmount === preset
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
            "
            @click="selectPreset(preset)"
          >
            ฿{{ preset.toLocaleString() }}
          </button>
        </div>

        <!-- Custom amount -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">หรือกรอกจำนวนเอง</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">฿</span>
            <input
              v-model.number="customAmount"
              type="number"
              inputmode="numeric"
              min="10"
              max="50000"
              placeholder="0"
              class="input-field pl-9"
              @input="onCustomInput"
            />
          </div>
          <p v-if="amountError" class="text-red-500 text-xs mt-1.5">{{ amountError }}</p>
        </div>

        <!-- Balance preview -->
        <div v-if="finalAmount > 0" class="bg-blue-50 rounded-2xl px-4 py-3 flex justify-between items-center">
          <span class="text-sm text-gray-600">ยอดหลังเติมเงิน</span>
          <span class="font-bold text-primary-500 text-lg">฿{{ formatAmount(currentBalance + finalAmount) }}</span>
        </div>
      </div>

      <!-- Payment method -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-gray-700">วิธีการชำระเงิน</h2>

        <div class="grid grid-cols-2 gap-3">
          <button
            class="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-colors"
            :class="
              method === 'promptpay'
                ? 'border-primary-500 bg-primary-50 text-primary-500'
                : 'border-gray-200 bg-white text-gray-600 active:bg-gray-50'
            "
            @click="method = 'promptpay'"
          >
            <span class="text-3xl">📲</span>
            <span class="text-sm font-semibold">PromptPay</span>
          </button>

          <button
            class="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-colors"
            :class="
              method === 'credit_card'
                ? 'border-primary-500 bg-primary-50 text-primary-500'
                : 'border-gray-200 bg-white text-gray-600 active:bg-gray-50'
            "
            @click="method = 'credit_card'"
          >
            <span class="text-3xl">💳</span>
            <span class="text-sm font-semibold">บัตรเครดิต</span>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
        {{ error }}
      </div>

      <!-- Confirm button -->
      <button
        class="btn-primary"
        :disabled="!canSubmit || loading"
        @click="handleTopup"
      >
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          กำลังดำเนินการ...
        </span>
        <span v-else>ยืนยันการเติมเงิน ฿{{ formatAmount(finalAmount) }}</span>
      </button>
    </main>

    <!-- QR Modal -->
    <Transition name="modal">
      <div v-if="showQr" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
        <div class="bg-white w-full max-w-[430px] rounded-t-3xl p-6 space-y-5">
          <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />

          <div v-if="!paymentDone">
            <h2 class="text-xl font-bold text-center text-gray-800 mb-1">สแกน QR เพื่อชำระเงิน</h2>
            <p class="text-sm text-center text-gray-500 mb-5">กรุณาสแกนภายใน {{ countdown }} วินาที</p>

            <!-- Mock QR Box -->
            <div class="bg-gray-100 rounded-3xl aspect-square max-w-[220px] mx-auto flex flex-col items-center justify-center gap-3 border-4 border-dashed border-gray-300">
              <span class="text-5xl">📱</span>
              <span class="text-base font-bold text-gray-600 text-center px-4">MOCK QR CODE</span>
              <span class="text-sm text-primary-500 font-semibold">฿{{ formatAmount(finalAmount) }}</span>
            </div>

            <!-- Countdown ring -->
            <div class="flex justify-center mt-4">
              <div class="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-500 flex items-center justify-center font-bold text-primary-500 animate-spin-slow">
                {{ countdown }}
              </div>
            </div>
          </div>

          <!-- Success state -->
          <div v-else class="text-center space-y-4 py-4">
            <div class="text-6xl">✅</div>
            <h2 class="text-2xl font-bold text-gray-800">เติมเงินสำเร็จ!</h2>
            <p class="text-gray-500">เงินได้เข้ากระเป๋าแล้ว</p>
            <div class="bg-green-50 rounded-2xl px-4 py-3">
              <p class="text-sm text-gray-600">ยอดเงินใหม่</p>
              <p class="text-3xl font-bold text-green-600">฿{{ formatAmount(newBalance) }}</p>
            </div>
            <button class="btn-primary mt-2" @click="closeQr">กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

const router = useRouter()
const auth = useAuthStore()
const walletStore = useWalletStore()

const presets = [50, 100, 200, 500, 1000, 2000]
const selectedAmount = ref<number | null>(null)
const customAmount = ref<number | null>(null)
const method = ref<'promptpay' | 'credit_card'>('promptpay')
const loading = ref(false)
const error = ref('')
const showQr = ref(false)
const paymentDone = ref(false)
const countdown = ref(30)
const newBalance = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null

const currentBalance = computed(() => walletStore.wallet?.balance ?? 0)

const finalAmount = computed(() => {
  if (customAmount.value && customAmount.value > 0) return customAmount.value
  return selectedAmount.value ?? 0
})

const amountError = computed(() => {
  if (customAmount.value === null || customAmount.value === 0) return ''
  if (customAmount.value < 10) return 'จำนวนขั้นต่ำ 10 บาท'
  if (customAmount.value > 50000) return 'จำนวนสูงสุด 50,000 บาท'
  return ''
})

const canSubmit = computed(
  () => finalAmount.value >= 10 && finalAmount.value <= 50000 && !amountError.value,
)

function formatAmount(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function selectPreset(amount: number) {
  selectedAmount.value = amount
  customAmount.value = null
}

function onCustomInput() {
  selectedAmount.value = null
}

async function handleTopup() {
  if (!canSubmit.value) return

  loading.value = true
  error.value = ''

  try {
    const child = auth.selectedChild
    const userId = child?._id
    if (!userId) throw new Error('ไม่พบข้อมูลนักเรียน')

    showQr.value = true
    loading.value = false

    // Countdown is visual only — does NOT trigger payment completion
    countdown.value = 30
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(countdownTimer!)
    }, 1000)

    // Wait for actual API — topup() already calls fetchWallet internally
    await walletStore.topup(userId, finalAmount.value, method.value)
    clearInterval(countdownTimer!)

    // Refresh transactions (store already has updated balance)
    walletStore.fetchTransactions(userId, true)

    newBalance.value = walletStore.wallet?.balance ?? (currentBalance.value + finalAmount.value)
    paymentDone.value = true
  } catch (e: any) {
    clearInterval(countdownTimer!)
    showQr.value = false
    loading.value = false
    error.value = e?.message ?? e?.response?.data?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  }
}

function closeQr() {
  showQr.value = false
  paymentDone.value = false
  selectedAmount.value = null
  customAmount.value = null
  router.push('/dashboard')
}

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes spin-slow {
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin-slow 1s linear infinite;
}
</style>
