<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserCard from '@/components/UserCard.vue'
import Icon from '@/components/Icon.vue'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

type Phase = 'amount' | 'qr' | 'success'

const phase = ref<Phase>('amount')
const inputStr = ref('0')
const qrCountdown = ref(300)
let qrTimer: ReturnType<typeof setInterval> | null = null
const isProcessing = ref(false)
const successAt = ref<Date | null>(null)
const paidAmount = ref(0)

const MAX_AMOUNT = 5000
const MIN_AMOUNT = 20
const QUICK = [50, 100, 200, 500]
const NUMPAD_ROWS = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['0', '00', 'C']]

const user = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

const displayName = computed(() => {
  if (store.locale === 'en') return user.value?.name || user.value?.nameTh || t('ผู้ใช้', 'User')
  return user.value?.nameTh || user.value?.name || t('ผู้ใช้', 'User')
})

const numericAmount = computed(() => parseInt(inputStr.value || '0', 10))
const displayAmount = computed(() => numericAmount.value.toLocaleString('th-TH', { minimumFractionDigits: 2 }))
const canConfirm = computed(() => numericAmount.value >= MIN_AMOUNT && numericAmount.value <= MAX_AMOUNT)

const methodLabel = computed(() => {
  if (store.selectedMethod === 'promptpay') return t('พร้อมเพย์', 'PromptPay')
  return store.selectedMethod === 'alipay' ? 'Alipay' : 'WeChat Pay'
})

const qrMM = computed(() => Math.floor(qrCountdown.value / 60))
const qrSS = computed(() => String(qrCountdown.value % 60).padStart(2, '0'))
const qrProgressPercent = computed(() => (qrCountdown.value / 300) * 100)

const breadcrumb = computed(() => {
  if (phase.value === 'amount') return ''
  if (phase.value === 'qr') return t('สแกน QR', 'Scan QR')
  return t('สำเร็จ', 'Success')
})

const formattedSuccessAt = computed(() => {
  if (!successAt.value) return ''
  return successAt.value.toLocaleString(store.locale === 'en' ? 'en-GB' : 'th-TH', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
})

function numpadPress(key: string) {
  if (key === 'C') { inputStr.value = '0'; return }
  const cur = inputStr.value === '0' ? '' : inputStr.value
  const next = key === '00' ? (cur ? cur + '00' : '') : cur + key
  if (!next) return
  if (parseInt(next, 10) <= 99999) inputStr.value = next
}

function setQuick(amount: number) {
  inputStr.value = String(amount)
}

function goBackFromAmount() {
  router.push('/home')
}

function confirmAmount() {
  if (!canConfirm.value) return
  phase.value = 'qr'
  qrCountdown.value = 300
  startQrTimer()
}

function startQrTimer() {
  clearQrTimer()
  qrTimer = setInterval(() => {
    qrCountdown.value -= 1
    if (qrCountdown.value <= 0) {
      clearQrTimer()
      phase.value = 'amount'
    }
  }, 1000)
}

function clearQrTimer() {
  if (qrTimer) { clearInterval(qrTimer); qrTimer = null }
}

function backFromQr() {
  clearQrTimer()
  phase.value = 'amount'
}

async function simulatePaymentSuccess() {
  if (isProcessing.value) return
  isProcessing.value = true
  clearQrTimer()

  await new Promise((resolve) => setTimeout(resolve, 1500))
  await store.submitTopup(numericAmount.value)

  paidAmount.value = numericAmount.value
  successAt.value = new Date()
  isProcessing.value = false
  phase.value = 'success'
}

function simulateNetworkError() {
  clearQrTimer()
  router.push('/error/network')
}

function simulateServiceError() {
  clearQrTimer()
  router.push('/error/503')
}

function backToHome() {
  inputStr.value = '0'
  phase.value = 'amount'
  router.push('/home')
}

onUnmounted(() => {
  clearQrTimer()
})
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col" style="background: #F0F2F5">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0 bg-white" style="border-bottom: 0.5px solid #E0E0E5">
      <span v-if="breadcrumb" class="absolute" style="left: 20px; font-size: 11px; color: #9A9AB0">{{ breadcrumb }}</span>
      <h1 class="font-semibold" style="font-size: 15px; color: #1264E3">{{ t('เติมเงิน', 'Top Up') }}</h1>
    </div>

    <!-- ═ Screen 4: Amount entry ═ -->
    <template v-if="phase === 'amount'">
      <div class="flex-1 overflow-y-auto px-3.5 flex flex-col gap-2.5 min-h-0">
        <UserCard
          :name="displayName"
          :member-code="user?.id ?? ''"
          :balance="wallet?.balance ?? 0"
          :role-label="user?.roleLabel ?? ''"
          compact
        />

        <div class="flex items-center justify-between" style="border-radius: 10px; background: #fff; border: 0.5px solid #E0E0E5; padding: 12px 14px">
          <span
            class="font-medium"
            :style="numericAmount > 0 ? 'font-size: 32px; color: #1264E3' : 'font-size: 32px; color: #A0A0A0'"
          >{{ numericAmount > 0 ? displayAmount : '0.00' }}</span>
          <span class="text-gray-400" style="font-size: 14px; flex-shrink: 0">฿</span>
        </div>
        <div class="text-gray-400" style="font-size: 10px">{{ t(`เติมเงินสูงสุด ${MAX_AMOUNT.toLocaleString()} บาท / ครั้ง`, `Max ฿${MAX_AMOUNT.toLocaleString()} per top-up`) }}</div>

        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="q in QUICK"
            :key="q"
            class="rounded-full bg-white text-brand-primary"
            style="border: 1.5px solid #1264E3; font-size: 12px; font-weight: 600; padding: 5px 13px"
            @click="setQuick(q)"
          >{{ q }}</button>
        </div>

        <div class="overflow-hidden" style="border-radius: 10px; background: #fff; border: 0.5px solid #E0E0E5">
          <div v-for="(row, ri) in NUMPAD_ROWS" :key="ri" class="grid grid-cols-3" :style="ri > 0 ? 'border-top: 0.5px solid #E0E0E5' : ''">
            <button
              v-for="key in row"
              :key="key"
              class="flex items-center justify-center active:bg-gray-50"
              :style="key === 'C' ? 'font-size: 22px; font-weight: 600; color: #FF5252; padding: 16px' : 'font-size: 22px; font-weight: 500; color: #1A1A1A; padding: 16px'"
              @click="numpadPress(key)"
            >{{ key }}</button>
          </div>
        </div>

        <div class="flex-shrink-0 flex items-center gap-2.5 pb-4">
          <button class="back-link" @click="goBackFromAmount">
            <Icon name="chevronLeft" :size="15" color="#1264E3" />
            {{ t('ย้อนกลับ', 'Back') }}
          </button>
          <button v-if="!canConfirm" class="btn-confirm-disabled" disabled>{{ t('ยืนยัน', 'Confirm') }}</button>
          <button v-else class="btn-confirm-active" @click="confirmAmount">{{ t('ยืนยัน', 'Confirm') }}</button>
        </div>
      </div>
    </template>

    <!-- ═ Screen 3: QR scan ═ -->
    <template v-else-if="phase === 'qr'">
      <div class="flex-1 overflow-y-auto px-5 flex flex-col gap-3 min-h-0">
        <UserCard
          :name="displayName"
          :member-code="user?.id ?? ''"
          :balance="wallet?.balance ?? 0"
          :role-label="user?.roleLabel ?? ''"
          :updated-at="new Date()"
        />

        <div class="text-gray-700 text-center" style="font-size: 12px; font-weight: 500">{{ t('สแกน QR Code เพื่อชำระเงิน', 'Scan QR Code to Pay') }}</div>

        <div class="rounded-xl bg-white flex flex-col items-center gap-2 py-5" style="border: 0.5px solid #E0E0E0">
          <div
            class="flex items-center justify-center rounded-lg"
            style="width: 100px; height: 100px; border: 2px solid #1264E3; background: #F8FAFF"
          >
            <Icon name="qrcode" :size="48" color="#1264E3" />
          </div>
          <div class="text-gray-500" style="font-size: 10px">{{ t('สแกนด้วยพร้อมเพย์หรือแอปธนาคาร', 'Scan with PromptPay or your banking app') }}</div>
          <div class="font-medium text-brand-primary" style="font-size: 18px">฿{{ displayAmount }}</div>
          <div class="text-gray-400" style="font-size: 9px">{{ t(`หมดอายุใน ${qrMM}:${qrSS} นาที`, `Expires in ${qrMM}:${qrSS} min`) }}</div>
          <div class="w-full rounded-full bg-brand-tint overflow-hidden" style="height: 3px">
            <div class="h-full bg-brand-primary rounded-full transition-all duration-1000 ease-linear" :style="`width: ${qrProgressPercent}%`" />
          </div>
        </div>

        <div class="text-gray-400 text-center" style="font-size: 9px">
          {{ isProcessing ? t('กำลังดำเนินการ...', 'Processing...') : t('รอการยืนยันจากธนาคาร...', 'Waiting for bank confirmation...') }}
        </div>

        <!-- Demo triggers (no real payment gateway in this environment) -->
        <div class="flex items-center justify-center gap-4 mt-1">
          <button class="text-brand-primary underline disabled:opacity-40" style="font-size: 10px" :disabled="isProcessing" @click="simulatePaymentSuccess">{{ t('จำลอง: ชำระสำเร็จ', 'Simulate: Success') }}</button>
          <button class="text-brand-danger underline disabled:opacity-40" style="font-size: 10px" :disabled="isProcessing" @click="simulateNetworkError">{{ t('จำลอง: ไม่มีอินเทอร์เน็ต', 'Simulate: No internet') }}</button>
          <button class="text-brand-danger underline disabled:opacity-40" style="font-size: 10px" :disabled="isProcessing" @click="simulateServiceError">{{ t('จำลอง: 503', 'Simulate: 503') }}</button>
        </div>
      </div>

      <div class="flex-shrink-0 px-5 pb-4 pt-2">
        <button class="btn-outline-full flex items-center justify-center gap-1" @click="backFromQr">
          <Icon name="chevronLeft" :size="14" color="#1264E3" />
          {{ t('ย้อนกลับ', 'Back') }}
        </button>
      </div>
    </template>

    <!-- ═ Screen 5: Success ═ -->
    <template v-else-if="phase === 'success'">
      <div class="flex-1 overflow-y-auto px-5 flex flex-col gap-3 min-h-0">
        <UserCard
          :name="displayName"
          :member-code="user?.id ?? ''"
          :balance="wallet?.balance ?? 0"
          :role-label="user?.roleLabel ?? ''"
          :updated-at="successAt"
          compact
        />

        <div class="rounded-xl bg-white flex flex-col items-center gap-2 py-6" style="border: 0.5px solid #E0E0E0">
          <div class="rounded-full bg-brand-success flex items-center justify-center" style="width: 48px; height: 48px">
            <Icon name="checkCircle" :size="24" color="#fff" />
          </div>
          <div class="font-medium" style="font-size: 16px; color: #0A4BAD">{{ t('เติมเงินสำเร็จ', 'Top-up Successful') }}</div>
          <div class="text-gray-500" style="font-size: 10px">{{ formattedSuccessAt }}</div>
          <div class="text-gray-500" style="font-size: 10px">{{ t('วิธี', 'Method') }}: {{ methodLabel }}</div>
          <div class="font-medium text-brand-success" style="font-size: 22px">฿{{ paidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}</div>
        </div>
      </div>

      <div class="flex-shrink-0 px-5 pb-4 pt-2">
        <button class="btn-primary-full" @click="backToHome">{{ t('กลับไปหน้าเติมเงิน', 'Back to Top Up') }}</button>
      </div>
    </template>

    <AutoLogout v-if="phase !== 'success'" />
  </div>
</template>
