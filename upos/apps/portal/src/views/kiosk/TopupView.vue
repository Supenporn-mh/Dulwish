<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserProfileCard from '@/components/UserProfileCard.vue'
import {
  PhQrCode, PhClockCounterClockwise, PhCaretRight,
  PhCheckCircle, PhWarningCircle, PhArrowLeft, PhArrowsClockwise,
} from '@phosphor-icons/vue'

const router = useRouter()
const store  = useKioskStore()

type Phase     = 'method' | 'amount' | 'qr' | 'success'
type ErrorType = 'service' | 'network' | null

const phase          = ref<Phase>('method')
const inputStr       = ref('0')
const selectedMethod = ref('promptpay')
const isProcessing   = ref(false)
const errorType      = ref<ErrorType>(null)
const successAt      = ref<Date | null>(null)
const paidAmount     = ref(0)
const qrCountdown    = ref(300)
let   qrTimer: ReturnType<typeof setInterval> | null = null

const user   = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

// ── Amount ────────────────────────────────────────────────────────────────
const displayAmount = computed(() => {
  const n = parseInt(inputStr.value || '0', 10)
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
})
const numericAmount = computed(() => parseInt(inputStr.value || '0', 10))
const canConfirm    = computed(() => numericAmount.value >= 20 && numericAmount.value <= 5000)
const QUICK         = [50, 100, 200, 500, 1000]

// ── QR countdown ──────────────────────────────────────────────────────────
const qrMM      = computed(() => Math.floor(qrCountdown.value / 60))
const qrSS      = computed(() => String(qrCountdown.value % 60).padStart(2, '0'))
const qrExpired = computed(() => qrCountdown.value <= 0)

// ── Methods ───────────────────────────────────────────────────────────────
const methodLabel = computed(() =>
  selectedMethod.value === 'promptpay' ? 'PromptPay' : selectedMethod.value
)

// ── Numpad ────────────────────────────────────────────────────────────────
function numpadPress(key: string) {
  if (key === 'C') { inputStr.value = '0'; return }
  const cur  = inputStr.value === '0' ? '' : inputStr.value
  const next = key === '00' ? (cur ? cur + '00' : '') : cur + key
  if (!next) return
  if (parseInt(next, 10) <= 99999) inputStr.value = next
}

function setQuick(amt: number) { inputStr.value = String(amt) }

// ── Navigation ────────────────────────────────────────────────────────────
function goBack() {
  if (qrTimer) clearInterval(qrTimer)
  if (phase.value === 'amount') { phase.value = 'method'; inputStr.value = '0'; return }
  if (phase.value === 'qr')    { phase.value = 'amount'; return }
  router.push('/kiosk/home')
}

function selectMethod(id: string) {
  if (id === 'history') { router.push('/kiosk/balance'); return }
  selectedMethod.value = id
  phase.value = 'amount'
}

function confirmAmount() {
  if (!canConfirm.value) return
  phase.value = 'qr'
  qrCountdown.value = 300
  startQrTimer()
}

function startQrTimer() {
  if (qrTimer) clearInterval(qrTimer)
  qrTimer = setInterval(() => {
    if (--qrCountdown.value <= 0) clearInterval(qrTimer!)
  }, 1000)
}

async function simulatePayment() {
  if (isProcessing.value || qrExpired.value) return
  isProcessing.value = true
  if (qrTimer) clearInterval(qrTimer)
  await new Promise(r => setTimeout(r, 1800))
  store.updateBalance((wallet.value?.balance ?? 0) + numericAmount.value)
  paidAmount.value   = numericAmount.value
  successAt.value    = new Date()
  isProcessing.value = false
  phase.value        = 'success'
}

function dismissError()  { errorType.value = null }
function retryPayment()  { errorType.value = null; isProcessing.value = false }

const formattedSuccess = computed(() => {
  if (!successAt.value) return ''
  return successAt.value.toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
})

onUnmounted(() => { if (qrTimer) clearInterval(qrTimer) })
if (!user.value) router.replace('/kiosk/idle')
</script>

<template>
  <div class="w-full min-h-full flex flex-col overflow-y-auto" style="background: var(--color-bg-page)">

    <!-- Navbar -->
    <header class="relative flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
      <button
        v-if="phase !== 'success'"
        @click="goBack"
        class="flex items-center gap-1 text-[14px] font-medium z-10"
        style="color: var(--color-primary); background: none; border: none; cursor: pointer;"
      >
        <PhArrowLeft :size="18" weight="bold" />
        กลับ
      </button>
      <div v-else class="w-10" />
      <h1 class="text-heading-lg font-semibold absolute left-1/2 -translate-x-1/2"
          style="color: var(--color-text-primary)">เติมเงิน</h1>
      <div class="w-10" />
    </header>

    <!-- Profile card -->
    <div class="px-5 pb-4 flex-shrink-0">
      <UserProfileCard
        :name="user?.name ?? ''"
        :uid="user?.uid ?? ''"
        :role="user?.role ?? 'student'"
        :balance="wallet?.balance"
        :grade="user?.grade"
        :class-name="user?.classRoom"
        :updated-at="new Date()"
      />
    </div>

    <!-- ══ METHOD ══════════════════════════════════════════════════════ -->
    <div v-if="phase === 'method'" class="flex-1 px-5 pb-8">
      <h2 class="text-heading-xl mb-5" style="color: var(--color-text-primary)">เลือกวิธีการเติมเงิน</h2>

      <div class="flex flex-col gap-3">
        <!-- PromptPay -->
        <button
          @click="selectMethod('promptpay')"
          class="flex items-center gap-4 px-4 py-[14px] rounded-[14px] active:scale-[0.98] transition-transform"
          style="background: var(--color-bg-surface); border: 1.5px solid var(--color-border-tertiary); cursor: pointer; text-align: left;"
        >
          <div class="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
               style="background: var(--color-success-bg)">
            <PhQrCode :size="22" weight="fill" style="color: var(--color-success)" />
          </div>
          <div class="flex-1">
            <p class="text-[16px] font-semibold" style="color: var(--color-text-primary)">PromptPay</p>
            <p class="text-[12px]" style="color: var(--color-text-secondary)">สแกน QR จ่ายได้เลย</p>
          </div>
          <PhCaretRight :size="16" weight="bold" style="color: var(--color-border-secondary)" />
        </button>

        <!-- History -->
        <button
          @click="selectMethod('history')"
          class="flex items-center gap-4 px-4 py-[14px] rounded-[14px] active:scale-[0.98] transition-transform"
          style="background: var(--color-bg-surface); border: 1.5px solid var(--color-border-tertiary); cursor: pointer; text-align: left;"
        >
          <div class="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
               style="background: var(--color-primary-tint)">
            <PhClockCounterClockwise :size="22" weight="fill" style="color: var(--color-primary)" />
          </div>
          <div class="flex-1">
            <p class="text-[16px] font-semibold" style="color: var(--color-text-primary)">ประวัติการทำรายการ</p>
            <p class="text-[12px]" style="color: var(--color-text-secondary)">ดูรายการเติมเงินย้อนหลัง</p>
          </div>
          <PhCaretRight :size="16" weight="bold" style="color: var(--color-border-secondary)" />
        </button>
      </div>
    </div>

    <!-- ══ AMOUNT ══════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'amount'" class="flex-1 flex flex-col pb-4">

      <!-- Display -->
      <div class="mx-5 mb-2 rounded-[14px] px-5 py-4 flex items-center justify-between"
           style="background: var(--color-bg-secondary)">
        <span class="text-[40px] font-bold tabular-nums leading-none"
              style="color: var(--color-text-primary)">{{ displayAmount }}</span>
        <span class="text-[22px] font-medium" style="color: var(--color-text-tertiary)">฿</span>
      </div>
      <p class="px-5 text-[12px] mb-3" style="color: var(--color-text-tertiary)">
        เติมเงินสูงสุด 5,000 บาท / ครั้ง
      </p>

      <!-- Quick chips -->
      <div class="flex gap-2 px-5 mb-3 overflow-x-auto scrollbar-none flex-shrink-0">
        <button
          v-for="q in QUICK"
          :key="q"
          @click="setQuick(q)"
          class="flex-shrink-0 px-4 h-9 rounded-full text-[14px] font-semibold transition-colors"
          :style="numericAmount === q
            ? 'background: var(--color-primary); color: #fff; border: 1.5px solid var(--color-primary)'
            : 'background: transparent; color: var(--color-primary); border: 1.5px solid var(--color-primary)'"
        >{{ q }}</button>
      </div>

      <!-- Numpad -->
      <div class="flex-1 mx-5 rounded-[14px] overflow-hidden"
           style="background: var(--color-bg-surface); border: 0.5px solid var(--color-border-tertiary); min-height: 240px;">
        <template v-for="(row, ri) in [['7','8','9'],['4','5','6'],['1','2','3'],['0','00','C']]" :key="ri">
          <div class="flex"
               :style="ri > 0 ? 'border-top: 0.5px solid var(--color-border-tertiary)' : ''">
            <button
              v-for="(key, ki) in row"
              :key="key"
              @click="numpadPress(key)"
              class="flex-1 flex items-center justify-center text-[26px] font-medium py-4 transition-opacity active:opacity-50"
              :style="[
                ki > 0 ? 'border-left: 0.5px solid var(--color-border-tertiary)' : '',
                key === 'C' ? 'color: var(--color-danger)' : 'color: var(--color-text-primary)',
                'background: transparent; border-top: none; border-bottom: none; cursor: pointer;'
              ].join(';')"
            >{{ key }}</button>
          </div>
        </template>
      </div>

      <!-- Bottom bar -->
      <div class="flex items-center gap-3 px-5 pt-4">
        <button
          @click="goBack"
          class="flex items-center gap-1 text-[14px] font-medium"
          style="color: var(--color-primary); background: none; border: none; cursor: pointer;"
        >
          <PhArrowLeft :size="16" weight="bold" />
          กลับ
        </button>
        <button
          @click="confirmAmount"
          :disabled="!canConfirm"
          class="flex-1 h-[50px] rounded-full text-[16px] font-semibold transition-all"
          :style="canConfirm
            ? 'background: var(--color-primary); color: #fff; border: none; cursor: pointer;'
            : 'background: var(--color-bg-secondary); color: var(--color-text-tertiary); border: none; cursor: not-allowed;'"
        >ยืนยัน</button>
      </div>
    </div>

    <!-- ══ QR ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'qr'" class="flex-1 flex flex-col px-5 pb-6 gap-4">
      <div class="card flex flex-col items-center py-8 px-6 gap-5">
        <div class="w-[200px] h-[200px] rounded-[12px] flex flex-col items-center justify-center gap-3"
             style="border: 2px dashed var(--color-border-secondary); background: var(--color-bg-secondary)">
          <PhQrCode :size="72" weight="thin" style="color: var(--color-text-tertiary)" />
          <span class="text-[11px] font-medium" style="color: var(--color-text-tertiary)">SCAN QR CODE</span>
        </div>

        <div class="text-center">
          <p class="text-[13px]" style="color: var(--color-text-secondary)">จำนวนเงิน</p>
          <p class="text-[38px] font-extrabold" style="color: var(--color-primary)">
            ฿{{ numericAmount.toLocaleString() }}.00
          </p>
          <p class="text-[12px] mt-1 flex items-center justify-center gap-1">
            <template v-if="!qrExpired">
              <PhArrowsClockwise :size="12" weight="bold" style="color: var(--color-text-tertiary)" />
              <span style="color: var(--color-text-tertiary)">หมดอายุใน {{ qrMM }}:{{ qrSS }}</span>
            </template>
            <span v-else class="font-semibold" style="color: var(--color-danger)">QR หมดอายุ — กลับไปเลือกใหม่</span>
          </p>
        </div>
      </div>

      <button
        @click="simulatePayment"
        :disabled="isProcessing || qrExpired"
        class="btn-lg btn-primary w-full"
        :style="isProcessing || qrExpired ? 'opacity: 0.4; cursor: not-allowed' : ''"
      >
        <span v-if="isProcessing" class="flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          กำลังดำเนินการ...
        </span>
        <span v-else>จำลองการชำระเงิน</span>
      </button>
    </div>

    <!-- ══ SUCCESS ══════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'success'" class="flex-1 flex flex-col px-5 pb-6 gap-4">
      <div class="card flex flex-col items-center py-10 px-6 gap-3">
        <PhCheckCircle :size="72" weight="fill" style="color: var(--color-success)" />

        <h2 class="text-heading-xl font-bold text-center" style="color: var(--color-text-primary)">
          เติมเงินสำเร็จ
        </h2>

        <div class="w-full mt-2 space-y-2">
          <div class="flex justify-between items-baseline">
            <span class="text-body-sm" style="color: var(--color-text-secondary)">วันที่และเวลาที่ทำรายการ:</span>
            <span class="text-body-sm font-medium" style="color: var(--color-text-primary)">{{ formattedSuccess }}</span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-body-sm" style="color: var(--color-text-secondary)">วิธีการเติมเงิน:</span>
            <span class="text-body-sm font-medium" style="color: var(--color-text-primary)">{{ methodLabel }}</span>
          </div>
        </div>

        <p class="text-[44px] font-extrabold mt-3" style="color: var(--color-success)">
          ฿{{ paidAmount.toLocaleString() }}.00
        </p>
      </div>

      <button
        @click="router.push('/kiosk/home')"
        class="w-full h-[52px] rounded-full text-[16px] font-semibold"
        style="background: var(--color-primary); color: #fff; border: none; cursor: pointer;"
      >
        กลับไปหน้าหลัก
      </button>
    </div>

    <!-- ══ ERROR MODAL ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="errorType"
        class="fixed inset-0 z-50 flex items-center justify-center px-6"
        style="background: rgba(0,0,0,0.45); backdrop-filter: blur(4px)"
        @click.self="dismissError"
      >
        <div class="card w-full max-w-[340px] py-8 px-6 flex flex-col items-center gap-4 text-center">

          <div class="w-16 h-16 rounded-full flex items-center justify-center"
               style="background: var(--color-danger-bg)">
            <PhWarningCircle :size="36" weight="fill" style="color: var(--color-danger)" />
          </div>

          <h2 class="text-heading-lg font-bold" style="color: var(--color-text-primary)">เกิดข้อผิดพลาด</h2>

          <!-- 503 Service Error -->
          <template v-if="errorType === 'service'">
            <p class="text-body-md font-semibold" style="color: var(--color-danger)">503 Service Unavailable</p>
            <p class="text-body-sm" style="color: var(--color-text-secondary)">
              กรุณารับเงินคืน และติดต่อผู้ดูแลระบบ
            </p>
            <button
              @click="dismissError"
              class="w-full h-[48px] rounded-full text-[15px] font-semibold mt-1"
              style="border: 1.5px solid var(--color-primary); color: var(--color-primary); background: transparent; cursor: pointer;"
            >ปิด</button>
          </template>

          <!-- Network Error -->
          <template v-else-if="errorType === 'network'">
            <p class="text-body-md font-semibold" style="color: var(--color-danger)">ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้</p>
            <p class="text-body-sm" style="color: var(--color-text-secondary)">
              กรุณารับเงินคืน<br>และลองทำรายการใหม่อีกครั้ง
            </p>
            <div class="flex flex-col gap-2 w-full mt-1">
              <button
                @click="retryPayment"
                class="w-full h-[48px] rounded-full text-[15px] font-semibold"
                style="background: var(--color-primary); color: #fff; border: none; cursor: pointer;"
              >ลองอีกครั้ง</button>
              <button
                @click="dismissError"
                class="w-full h-[48px] rounded-full text-[15px] font-semibold"
                style="border: 1.5px solid var(--color-primary); color: var(--color-primary); background: transparent; cursor: pointer;"
              >ปิด</button>
            </div>
          </template>

        </div>
      </div>
    </Teleport>

  </div>
</template>
