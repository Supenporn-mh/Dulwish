<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLocaleStore } from '@/stores/locale'
import api from '@/api/axios'
import { useParentStore } from '@/stores/parent'
import UserProfileCard from '@/components/UserProfileCard.vue'
import ChildCard from '@/components/ChildCard.vue'
import {
  PhQrCode, PhCreditCard, PhCaretRight, PhCheckCircle,
  PhWarningCircle, PhArrowLeft, PhArrowsClockwise,
} from '@phosphor-icons/vue'

const router      = useRouter()
const parentStore = useParentStore()
const locale      = useLocaleStore()

// ── Child data from store (locked — can only change on dashboard) ─────────
const activeChild  = computed(() => parentStore.selectedChild)
const childBalance = ref(activeChild.value?.balance ?? 0)
const loadingChild = ref(false)

// ── Phase ─────────────────────────────────────────────────────────────────
type Phase     = 'method' | 'amount' | 'qr' | 'success'
type ErrorType = 'service' | 'network' | null
type Method    = 'promptpay' | 'credit_card' | 'alipay' | 'wechat'

const phase          = ref<Phase>('method')
const selectedMethod = ref<Method>('promptpay')
const inputStr       = ref('0')
const submitting     = ref(false)
const errorType      = ref<ErrorType>(null)
const successAt      = ref<Date | null>(null)
const paidAmount     = ref(0)
const qrCountdown    = ref(300)
let   qrTimer: ReturnType<typeof setInterval> | null = null

// ── Amount ────────────────────────────────────────────────────────────────
const displayAmount = computed(() => {
  const n = parseInt(inputStr.value || '0', 10)
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
})
const numericAmount = computed(() => parseInt(inputStr.value || '0', 10))
const canConfirm    = computed(() => numericAmount.value >= 20 && numericAmount.value <= 5000)
const QUICK         = [50, 100, 200, 500, 1000]

const qrMM      = computed(() => Math.floor(qrCountdown.value / 60))
const qrSS      = computed(() => String(qrCountdown.value % 60).padStart(2, '0'))
const qrExpired = computed(() => qrCountdown.value <= 0)

const METHOD_META: Record<Method, { label: string; subTh: string; subEn: string; iconBg: string; iconColor: string }> = {
  promptpay:   { label: 'PromptPay',         subTh: 'สแกน QR จ่ายได้เลย',            subEn: 'Scan QR to pay',          iconBg: '#E0FAF3', iconColor: '#03BA81' },
  credit_card: { label: 'Credit/Debit Card', subTh: 'บัตรเครดิต/เดบิต',              subEn: 'Visa / Mastercard',        iconBg: '#EAF1FD', iconColor: '#1264E3' },
  alipay:      { label: 'Alipay',            subTh: 'สำหรับลูกค้าที่ใช้ Alipay',     subEn: 'For Alipay users',         iconBg: '#E8F4FF', iconColor: '#1677FF' },
  wechat:      { label: 'WeChat Pay',        subTh: 'สำหรับลูกค้าที่ใช้ WeChat Pay', subEn: 'For WeChat Pay users',     iconBg: '#E8F8EC', iconColor: '#07C160' },
}
const methodLabel = computed(() => METHOD_META[selectedMethod.value]?.label ?? selectedMethod.value)

const formattedSuccess = computed(() => {
  if (!successAt.value) return ''
  const loc = locale.lang === 'th' ? 'th-TH' : 'en-GB'
  return successAt.value.toLocaleString(loc, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
})

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
  router.push('/parent/dashboard')
}

function selectMethod(m: Method) {
  selectedMethod.value = m
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
  if (submitting.value || qrExpired.value) return
  submitting.value = true
  errorType.value  = null
  if (qrTimer) clearInterval(qrTimer)

  try {
    // topup route resolves the wallet by student userId (not wallet _id)
    const userId = activeChild.value?.id
    await api.post(`/wallets/${userId}/topup`, {
      amount: numericAmount.value,
      channel: 'mobile_web',
      paymentMethod: selectedMethod.value === 'promptpay' ? 'scb_qr' : 'credit_card',
    })
    childBalance.value += numericAmount.value
    paidAmount.value    = numericAmount.value
    successAt.value     = new Date()
    phase.value         = 'success'
    // Update store balance so dashboard reflects new amount
    if (activeChild.value) {
      parentStore.updateBalance(activeChild.value.id, childBalance.value)
    }
  } catch (err: any) {
    // Show real error — no demo fallback
    const status = err?.response?.status
    errorType.value = status === 503 || status === 500 ? 'service' : 'network'
  } finally {
    submitting.value = false
  }
}

function dismissError()  { errorType.value = null }
function retryPayment()  { errorType.value = null; submitting.value = false }

// ── On mount: read balance from store (already loaded by dashboard) ───────
onMounted(() => {
  childBalance.value = activeChild.value?.balance ?? 0
})

onUnmounted(() => { if (qrTimer) clearInterval(qrTimer) })
</script>

<template>
  <div class="flex-1 flex flex-col overflow-y-auto" style="background: var(--color-bg-page)">
  <div class="flex-1 flex flex-col w-full max-w-[560px] mx-auto">

    <!-- Child card (read-only — locked, change on dashboard) -->
    <div class="px-4 pt-2 pb-3 flex-shrink-0">
      <ChildCard
        :name="activeChild?.name ?? ''"
        :student-code="activeChild?.studentCode ?? ''"
        role="student"
        :balance="childBalance"
        :grade="activeChild?.grade"
        :updated-at="new Date()"
      />
      <p class="text-[11px] mt-1.5 text-center"
         style="color: var(--color-text-tertiary)">
        {{ locale.t('กลับหน้าหลักเพื่อเปลี่ยนนักเรียน', 'Go back to change student') }}
      </p>
    </div>

    <!-- ══ METHOD ══════════════════════════════════════════════════════ -->
    <div v-if="phase === 'method'" class="flex-1 px-4 pb-8">
      <h2 class="text-[22px] font-medium mb-4" style="color: var(--color-text-primary)">{{ locale.t('เลือกวิธีการเติมเงิน', 'Select Top-Up Method') }}</h2>

      <div class="flex flex-col gap-3">
        <button
          v-for="(meta, key) in METHOD_META"
          :key="key"
          @click="selectMethod(key as Method)"
          class="flex items-center gap-4 px-4 py-[14px] rounded-[14px] active:scale-[0.98] transition-transform"
          style="background: var(--color-bg-surface); border: 1.5px solid var(--color-border-tertiary); cursor: pointer; text-align: left;"
        >
          <!-- Icon: QR for QR-based, CreditCard for card, text logo for Alipay/WeChat -->
          <div class="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
               :style="`background: ${meta.iconBg}`">
            <PhQrCode      v-if="key === 'promptpay'"   :size="22" weight="fill" :style="`color: ${meta.iconColor}`" />
            <PhCreditCard  v-else-if="key === 'credit_card'" :size="22" weight="fill" :style="`color: ${meta.iconColor}`" />
            <!-- Alipay / WeChat: text logo -->
            <span v-else
              class="text-[13px] font-medium leading-tight text-center px-1"
              :style="`color: ${meta.iconColor}`">
              {{ key === 'alipay' ? 'Ali' : 'WC' }}
            </span>
          </div>
          <div class="flex-1">
            <p class="text-[16px] font-medium" style="color: var(--color-text-primary)">{{ meta.label }}</p>
            <p class="text-[12px]" style="color: var(--color-text-secondary)">{{ locale.lang === 'th' ? meta.subTh : meta.subEn }}</p>
          </div>
          <PhCaretRight :size="16" weight="bold" style="color: var(--color-border-secondary)" />
        </button>
      </div>
    </div>

    <!-- ══ AMOUNT ══════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'amount'" class="flex-1 flex flex-col pb-4">

      <!-- Display -->
      <div class="mx-4 mb-2 rounded-[14px] px-5 py-4 flex items-center justify-between"
           style="background: var(--color-bg-secondary)">
        <span class="text-[40px] font-medium tabular-nums leading-none"
              style="color: var(--color-text-primary)">{{ displayAmount }}</span>
        <span class="text-[22px] font-medium" style="color: var(--color-text-tertiary)">฿</span>
      </div>
      <p class="px-4 text-[12px] mb-3" style="color: var(--color-text-tertiary)">
        {{ locale.t('เติมเงินสูงสุด 5,000 บาท / ครั้ง', 'Maximum ฿5,000 per transaction') }}
      </p>

      <!-- Quick chips -->
      <div class="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-none flex-shrink-0">
        <button
          v-for="q in QUICK"
          :key="q"
          @click="setQuick(q)"
          class="flex-shrink-0 px-4 h-9 rounded-full text-[14px] font-medium transition-colors"
          :style="numericAmount === q
            ? 'background: var(--color-primary); color: #fff; border: 1.5px solid var(--color-primary)'
            : 'background: transparent; color: var(--color-primary); border: 1.5px solid var(--color-primary)'"
        >{{ q }}</button>
      </div>

      <!-- Numpad -->
      <div class="flex-1 mx-4 rounded-[14px] overflow-hidden"
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
      <div class="flex items-center gap-3 px-4 pt-4">
        <button
          @click="goBack"
          class="flex items-center gap-1 text-[14px] font-medium"
          style="color: var(--color-primary); background: none; border: none; cursor: pointer;"
        >
          <PhArrowLeft :size="16" weight="bold" />
          {{ locale.t('กลับ', 'Back') }}
        </button>
        <button
          @click="confirmAmount"
          :disabled="!canConfirm"
          class="flex-1 h-[50px] rounded-full text-[16px] font-medium transition-all"
          :style="canConfirm
            ? 'background: var(--color-primary); color: #fff; border: none; cursor: pointer;'
            : 'background: var(--color-bg-secondary); color: var(--color-text-tertiary); border: none; cursor: not-allowed;'"
        >{{ locale.t('ยืนยัน', 'Confirm') }}</button>
      </div>
    </div>

    <!-- ══ QR ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'qr'" class="flex-1 flex flex-col px-4 pb-6 gap-4">
      <div class="card flex flex-col items-center py-8 px-6 gap-5">
        <div class="w-[190px] h-[190px] rounded-[12px] flex flex-col items-center justify-center gap-3"
             style="border: 2px dashed var(--color-border-secondary); background: var(--color-bg-secondary)">
          <PhQrCode :size="72" weight="thin" style="color: var(--color-text-tertiary)" />
          <span class="text-[11px] font-medium" style="color: var(--color-text-tertiary)">SCAN QR CODE</span>
          <!-- Test mode label — payment is simulated, not real -->
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style="background: var(--color-warning-bg); color: var(--color-warning)">
            {{ locale.t('โหมดทดสอบ', 'Test Mode') }}
          </span>
        </div>

        <div class="text-center">
          <p class="text-[13px]" style="color: var(--color-text-secondary)">{{ locale.t('จำนวนเงิน', 'Amount') }}</p>
          <p class="text-[38px] font-medium" style="color: var(--color-primary)">
            ฿{{ numericAmount.toLocaleString() }}.00
          </p>
          <p class="text-[12px] mt-1 flex items-center justify-center gap-1">
            <template v-if="!qrExpired">
              <PhArrowsClockwise :size="12" weight="bold" style="color: var(--color-text-tertiary)" />
              <span style="color: var(--color-text-tertiary)">{{ locale.t('หมดอายุใน', 'Expires in') }} {{ qrMM }}:{{ qrSS }}</span>
            </template>
            <span v-else class="font-medium" style="color: var(--color-danger)">{{ locale.t('QR หมดอายุ — กลับเลือกใหม่', 'QR expired — go back to retry') }}</span>
          </p>
        </div>
      </div>

      <button
        @click="simulatePayment"
        :disabled="submitting || qrExpired"
        class="btn-lg btn-primary w-full"
        :style="submitting || qrExpired ? 'opacity: 0.4; cursor: not-allowed' : ''"
      >
        <span v-if="submitting" class="flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {{ locale.t('กำลังดำเนินการ...', 'Processing...') }}
        </span>
        <span v-else>{{ locale.t('จำลองการชำระเงิน', 'Simulate Payment') }}</span>
      </button>

      <button @click="goBack" class="text-[14px] font-medium text-center"
              style="color: var(--color-primary); background: none; border: none; cursor: pointer;">
        {{ locale.t('← กลับ', '← Back') }}
      </button>
    </div>

    <!-- ══ SUCCESS ══════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'success'" class="flex-1 flex flex-col px-4 pb-6 gap-4">
      <div class="card flex flex-col items-center py-10 px-6 gap-3">
        <PhCheckCircle :size="72" weight="fill" style="color: var(--color-success)" />

        <h2 class="text-heading-xl font-medium text-center" style="color: var(--color-text-primary)">
          {{ locale.t('เติมเงินสำเร็จ', 'Top-Up Successful') }}
        </h2>

        <div class="w-full mt-2 space-y-2">
          <div class="flex justify-between items-baseline">
            <span class="text-body-sm" style="color: var(--color-text-secondary)">{{ locale.t('วันที่และเวลาที่ทำรายการ:', 'Date & Time:') }}</span>
            <span class="text-body-sm font-medium" style="color: var(--color-text-primary)">{{ formattedSuccess }}</span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-body-sm" style="color: var(--color-text-secondary)">{{ locale.t('วิธีการเติมเงิน:', 'Method:') }}</span>
            <span class="text-body-sm font-medium" style="color: var(--color-text-primary)">{{ methodLabel }}</span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-body-sm" style="color: var(--color-text-secondary)">{{ locale.t('เข้าบัญชีของ:', 'Credited to:') }}</span>
            <span class="text-body-sm font-medium" style="color: var(--color-text-primary)">{{ activeChild?.name }}</span>
          </div>
        </div>

        <p class="text-[44px] font-medium mt-3" style="color: var(--color-success)">
          ฿{{ paidAmount.toLocaleString() }}.00
        </p>
      </div>

      <button
        @click="router.push('/parent/dashboard')"
        class="w-full h-[52px] rounded-full text-[16px] font-medium"
        style="background: var(--color-primary); color: #fff; border: none; cursor: pointer;"
      >
        {{ locale.t('กลับไปหน้าหลัก', 'Back to Home') }}
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

          <h2 class="text-heading-lg font-medium" style="color: var(--color-text-primary)">{{ locale.t('เกิดข้อผิดพลาด', 'An Error Occurred') }}</h2>

          <template v-if="errorType === 'service'">
            <p class="text-body-md font-medium" style="color: var(--color-danger)">503 Service Unavailable</p>
            <p class="text-body-sm" style="color: var(--color-text-secondary)">
              {{ locale.t('กรุณารับเงินคืน และติดต่อผู้ดูแลระบบ', 'Please request a refund and contact the administrator') }}
            </p>
            <button @click="dismissError"
              class="w-full h-[48px] rounded-full text-[15px] font-medium mt-1"
              style="border: 1.5px solid var(--color-primary); color: var(--color-primary); background: transparent; cursor: pointer;">
              {{ locale.t('ปิด', 'Close') }}
            </button>
          </template>

          <template v-else-if="errorType === 'network'">
            <p class="text-body-md font-medium" style="color: var(--color-danger)">{{ locale.t('ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้', 'Unable to connect to the internet') }}</p>
            <p class="text-body-sm" style="color: var(--color-text-secondary)">
              {{ locale.t('กรุณาลองทำรายการใหม่อีกครั้ง', 'Please try again') }}
            </p>
            <div class="flex flex-col gap-2 w-full mt-1">
              <button @click="retryPayment"
                class="w-full h-[48px] rounded-full text-[15px] font-medium"
                style="background: var(--color-primary); color: #fff; border: none; cursor: pointer;">
                {{ locale.t('ลองอีกครั้ง', 'Try Again') }}
              </button>
              <button @click="dismissError"
                class="w-full h-[48px] rounded-full text-[15px] font-medium"
                style="border: 1.5px solid var(--color-primary); color: var(--color-primary); background: transparent; cursor: pointer;">
                {{ locale.t('ปิด', 'Close') }}
              </button>
            </div>
          </template>

        </div>
      </div>
    </Teleport>

  </div> <!-- /centering wrapper -->
  </div>
</template>
