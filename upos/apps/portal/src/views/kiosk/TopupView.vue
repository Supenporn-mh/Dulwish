<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserCard from './UserCard.vue'
import Icon from './Icon.vue'

const router = useRouter()
const store  = useKioskStore()

type Phase = 'method' | 'amount' | 'qr' | 'success'

const phase          = ref<Phase>('method')
const inputStr       = ref('0')
const isProcessing   = ref(false)
const successAt      = ref<Date | null>(null)
const paidAmount     = ref(0)
const qrCountdown    = ref(300)
let   qrTimer: ReturnType<typeof setInterval> | null = null

const user   = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

// ── Amount ────────────────────────────────────────────────────────────────
const displayAmount = computed(() => {
  const n = parseInt(inputStr.value || '0', 10)
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
})
const numericAmount = computed(() => parseInt(inputStr.value || '0', 10))
const canConfirm    = computed(() => numericAmount.value >= 20 && numericAmount.value <= 5000)
const QUICK         = [50, 100, 200, 500]

// ── QR countdown ──────────────────────────────────────────────────────────
const qrMM      = computed(() => Math.floor(qrCountdown.value / 60))
const qrSS      = computed(() => String(qrCountdown.value % 60).padStart(2, '0'))
const qrExpired = computed(() => qrCountdown.value <= 0)

// ── Methods ───────────────────────────────────────────────────────────────
const methodLabel = computed(() => {
  if (store.selectedMethod === 'promptpay') return t('พร้อมเพย์', 'PromptPay')
  return store.selectedMethod === 'alipay' ? 'Alipay' : 'WeChat Pay'
})

const FEEDBACK_FORM_URL = 'https://okontekconnect.sg.larksuite.com/share/base/form/shrlgI0kruWBrrAJOdGlQLpeiFc'

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
  store.clearSession()
  router.push('/kiosk/idle')
}

function selectItem(id: string) {
  if (id === 'history')  { router.push('/kiosk/balance'); return }
  if (id === 'feedback') { window.open(FEEDBACK_FORM_URL, '_blank'); return }
  store.selectedMethod = id as 'promptpay' | 'alipay' | 'wechat'
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

function simulateNetworkError() {
  if (qrTimer) clearInterval(qrTimer)
  router.push('/kiosk/error/network')
}

function simulateServiceError() {
  if (qrTimer) clearInterval(qrTimer)
  router.push('/kiosk/error/503')
}

function backToMethod() {
  inputStr.value = '0'
  phase.value = 'method'
  router.push('/kiosk/topup')
}

const breadcrumb = computed(() => {
  if (phase.value === 'method') return t('เลือกวิธีการชำระเงิน', 'Select Payment Method')
  if (phase.value === 'amount') return ''
  if (phase.value === 'qr') return t('สแกน QR', 'Scan QR')
  return t('สำเร็จ', 'Success')
})

const formattedSuccess = computed(() => {
  if (!successAt.value) return ''
  return successAt.value.toLocaleString(store.locale === 'en' ? 'en-GB' : 'th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
})

const menuItems = computed(() => [
  { id: 'promptpay', label: t('พร้อมเพย์', 'PromptPay'), icon: 'qrcode' },
  { id: 'alipay',    label: 'Alipay', icon: 'card' },
  { id: 'wechat',    label: 'WeChat Pay', icon: 'wechat' },
  { id: 'history',   label: t('ประวัติการทำรายการ', 'Transaction History'), icon: 'receipt' },
  { id: 'feedback',  label: t('ประเมินความพึงพอใจ', 'Satisfaction Survey'), icon: 'smile' },
])

onUnmounted(() => { if (qrTimer) clearInterval(qrTimer) })
if (!user.value) router.replace('/kiosk/idle')
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-y-auto" style="background: var(--color-bg-secondary)">

    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0" style="background: var(--color-bg-surface); border-bottom: 0.5px solid #E0E0E5">
      <span v-if="breadcrumb" class="absolute" style="left: 20px; font-size: 11px; color: var(--color-text-tertiary)">{{ breadcrumb }}</span>
      <h1 class="font-semibold" style="font-size: 15px; color: var(--color-primary)">{{ t('เติมเงิน', 'Top Up') }}</h1>
    </div>

    <!-- Profile card -->
    <div class="px-5 pt-4 pb-4 flex-shrink-0">
      <UserCard
        :name="user?.name ?? ''"
        :member-code="user?.uid ?? ''"
        :balance="wallet?.balance ?? 0"
        :role-label="user?.roleLabel ?? ''"
        :updated-at="new Date()"
        :compact="phase === 'amount' || phase === 'success'"
      />
    </div>

    <!-- ══ METHOD (Screen 2) ══════════════════════════════════════════ -->
    <div v-if="phase === 'method'" class="flex-1 px-5 pb-8">
      <h2 class="mb-3" style="font-size: 13px; font-weight: 500; color: var(--color-text-primary)">{{ t('เลือกวิธีการชำระเงิน', 'Select Payment Method') }}</h2>

      <div class="flex flex-col" style="gap: 8px">
        <template v-for="item in menuItems" :key="item.id">
          <button @click="selectItem(item.id)" class="menu-row">
            <div class="m-icon">
              <Icon :name="item.icon" :size="20" color="var(--color-primary)" />
            </div>
            <div class="flex-1" style="font-size: 14px; font-weight: 500; color: var(--color-text-primary)">
              {{ item.label }}
            </div>
            <Icon name="chevronRight" :size="18" color="var(--color-text-tertiary)" />
          </button>
        </template>
      </div>

      <button @click="goBack" class="btn-lg btn-secondary w-full mt-4" style="background: #fff">
        <Icon name="chevronLeft" :size="16" />
        {{ t('ย้อนกลับ', 'Back') }}
      </button>
    </div>

    <!-- ══ AMOUNT (Screen 4) ══════════════════════════════════════════ -->
    <div v-else-if="phase === 'amount'" class="flex-1 flex flex-col px-3.5 pb-2.5 gap-2.5">

      <!-- Display -->
      <div class="flex items-center justify-between" style="border-radius: 10px; border: 0.5px solid #E0E0E5; background: var(--color-bg-surface); padding: 12px 14px">
        <span class="font-medium" :style="numericAmount > 0 ? 'font-size: 32px; color: var(--color-primary)' : 'font-size: 32px; color: var(--color-text-tertiary)'">{{ displayAmount }}</span>
        <span style="font-size: 14px; color: var(--color-text-tertiary); flex-shrink: 0">฿</span>
      </div>
      <div style="font-size: 10px; color: var(--color-text-tertiary)">
        {{ t('เติมเงินสูงสุด 5,000 บาท / ครั้ง', 'Max ฿5,000 per top-up') }}
      </div>

      <!-- Quick chips -->
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="q in QUICK"
          :key="q"
          @click="setQuick(q)"
          class="rounded-full transition-colors"
          style="font-size: 12px; font-weight: 600; padding: 5px 13px"
          :style="numericAmount === q
            ? 'background: var(--color-primary); color: #fff; border: 1.5px solid var(--color-primary)'
            : 'background: #fff; color: var(--color-primary); border: 1.5px solid var(--color-primary)'"
        >{{ q }}</button>
      </div>

      <!-- Numpad -->
      <div class="overflow-hidden" style="border-radius: 10px; background: var(--color-bg-surface); border: 0.5px solid #E0E0E5">
        <template v-for="(row, ri) in [['7','8','9'],['4','5','6'],['1','2','3'],['0','00','C']]" :key="ri">
          <div class="flex" :style="ri > 0 ? 'border-top: 0.5px solid #E0E0E5' : ''">
            <button
              v-for="(key, ki) in row"
              :key="key"
              @click="numpadPress(key)"
              class="flex-1 flex items-center justify-center transition-opacity active:opacity-50"
              :style="[
                ki > 0 ? 'border-left: 0.5px solid #E0E0E5' : '',
                key === 'C' ? 'color: var(--color-danger); font-weight: 600' : 'color: var(--color-text-primary); font-weight: 500',
                'font-size: 22px; padding: 16px; background: transparent; cursor: pointer;'
              ].join(';')"
            >{{ key }}</button>
          </div>
        </template>
      </div>

      <!-- Bottom bar -->
      <div class="flex items-center gap-2.5 pt-1">
        <button
          @click="goBack"
          class="flex items-center gap-1"
          style="font-size: 13px; font-weight: 600; color: var(--color-primary); background: none; border: none; cursor: pointer; flex-shrink: 0"
        >
          <Icon name="chevronLeft" :size="15" color="var(--color-primary)" />
          {{ t('ย้อนกลับ', 'Back') }}
        </button>
        <button
          @click="confirmAmount"
          :disabled="!canConfirm"
          class="flex-1 transition-all"
          style="height: 46px; border-radius: 8px; font-size: 15px; font-weight: 600"
          :style="canConfirm
            ? 'background: var(--color-primary); color: #fff; border: none; cursor: pointer;'
            : 'background: #DCDCDC; color: #A0A0A0; border: none; cursor: not-allowed;'"
        >{{ t('ยืนยัน', 'Confirm') }}</button>
      </div>
    </div>

    <!-- ══ QR (Screen 3) ══════════════════════════════════════════════ -->
    <div v-else-if="phase === 'qr'" class="flex-1 flex flex-col px-5 pb-6 gap-4">
      <div class="card flex flex-col items-center py-8 px-6 gap-3">
        <div style="font-size: 12px; font-weight: 500; color: var(--color-text-primary)">{{ t('สแกน QR Code เพื่อชำระเงิน', 'Scan QR Code to Pay') }}</div>

        <div
          class="w-[100px] h-[100px] flex flex-col items-center justify-center"
          style="border-radius: 8px; border: 2px solid var(--color-primary); background: #F8FAFF"
        >
          <Icon name="qrcode" :size="48" color="var(--color-primary)" />
        </div>

        <div class="text-center">
          <p style="font-size: 10px; color: var(--color-text-secondary)">{{ t('สแกนด้วยพร้อมเพย์หรือแอปธนาคาร', 'Scan with PromptPay or your banking app') }}</p>
          <p class="font-medium" style="font-size: 18px; color: var(--color-primary)">
            ฿{{ numericAmount.toLocaleString() }}
          </p>
          <p class="mt-1" style="font-size: 9px; color: var(--color-text-tertiary)">
            <template v-if="!qrExpired">{{ t(`หมดอายุใน ${qrMM}:${qrSS} นาที`, `Expires in ${qrMM}:${qrSS} min`) }}</template>
            <span v-else style="font-weight: 600; color: var(--color-danger)">{{ t('QR หมดอายุ — กลับไปเลือกใหม่', 'QR expired — please try again') }}</span>
          </p>
        </div>

        <div class="w-full rounded-full overflow-hidden" style="height: 3px; background: var(--color-primary-tint)">
          <div class="h-full rounded-full transition-all duration-1000 ease-linear" :style="`width: ${(qrCountdown / 300) * 100}%; background: var(--color-primary)`" />
        </div>

        <p style="font-size: 9px; color: var(--color-text-tertiary)">
          {{ isProcessing ? t('กำลังดำเนินการ...', 'Processing...') : t('รอการยืนยันจากธนาคาร...', 'Waiting for bank confirmation...') }}
        </p>
      </div>

      <button
        @click="simulatePayment"
        :disabled="isProcessing || qrExpired"
        class="btn-lg btn-primary w-full"
        :style="isProcessing || qrExpired ? 'opacity: 0.4; cursor: not-allowed' : ''"
      >
        <span v-if="isProcessing" class="flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {{ t('กำลังดำเนินการ...', 'Processing...') }}
        </span>
        <span v-else>{{ t('จำลองการชำระเงิน', 'Simulate Payment') }}</span>
      </button>

      <!-- Demo triggers (no real payment gateway in this environment) -->
      <div class="flex items-center justify-center gap-4">
        <button style="font-size: 10px; color: var(--color-danger); text-decoration: underline" :disabled="isProcessing" @click="simulateNetworkError">{{ t('จำลอง: ไม่มีอินเทอร์เน็ต', 'Simulate: No internet') }}</button>
        <button style="font-size: 10px; color: var(--color-danger); text-decoration: underline" :disabled="isProcessing" @click="simulateServiceError">{{ t('จำลอง: 503', 'Simulate: 503') }}</button>
      </div>

      <button @click="goBack" class="btn-lg btn-secondary w-full" style="background: #fff">
        <Icon name="chevronLeft" :size="14" />
        {{ t('ย้อนกลับ', 'Back') }}
      </button>
    </div>

    <!-- ══ SUCCESS (Screen 5) ══════════════════════════════════════════ -->
    <div v-else-if="phase === 'success'" class="flex-1 flex flex-col px-5 pb-6 gap-4">
      <div class="card flex flex-col items-center py-10 px-6 gap-3">
        <div class="rounded-full flex items-center justify-center" style="width: 48px; height: 48px; background: var(--color-success)">
          <Icon name="checkCircle" :size="24" color="#fff" />
        </div>

        <h2 class="font-bold text-center" style="font-size: 16px; color: #0A4BAD">
          {{ t('เติมเงินสำเร็จ', 'Top-up Successful') }}
        </h2>

        <div class="w-full mt-2 space-y-2">
          <div class="flex justify-between items-baseline">
            <span style="font-size: 10px; color: var(--color-text-secondary)">{{ t('วันที่และเวลาที่ทำรายการ:', 'Date & time:') }}</span>
            <span class="font-medium" style="font-size: 10px; color: var(--color-text-primary)">{{ formattedSuccess }}</span>
          </div>
          <div class="flex justify-between items-baseline">
            <span style="font-size: 10px; color: var(--color-text-secondary)">{{ t('วิธีการเติมเงิน:', 'Payment method:') }}</span>
            <span class="font-medium" style="font-size: 10px; color: var(--color-text-primary)">{{ methodLabel }}</span>
          </div>
        </div>

        <p class="font-extrabold mt-3" style="font-size: 22px; color: var(--color-success)">
          ฿{{ paidAmount.toLocaleString() }}.00
        </p>
      </div>

      <button @click="backToMethod" class="btn-lg btn-primary w-full">
        {{ t('กลับไปหน้าเติมเงิน', 'Back to Top Up') }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-bg-surface);
  border-radius: 12px;
  border: 0.5px solid #E0E0E5;
  padding: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
  -webkit-tap-highlight-color: transparent;
}
.menu-row:hover { border-color: var(--color-primary); background: var(--color-primary-tint); }
.menu-row:active { background: #daeaff; }
.m-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--color-primary-tint);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
