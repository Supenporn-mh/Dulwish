<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserCard from './UserCard.vue'

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
  store.selectedMethod === 'promptpay' ? 'พร้อมเพย์' : 'Alipay'
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
  store.clearSession()
  router.push('/kiosk/idle')
}

function selectItem(id: string) {
  if (id === 'history')  { router.push('/kiosk/balance');  return }
  if (id === 'feedback') { router.push('/kiosk/feedback'); return }
  store.selectedMethod = id as 'promptpay' | 'alipay'
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
  <div class="w-full h-full flex flex-col overflow-y-auto" style="background: var(--color-bg-secondary)">

    <!-- Top bar -->
    <div class="flex items-center justify-center px-5 pt-5 pb-3 flex-shrink-0">
      <h1 class="font-bold" style="font-size: 16px; color: var(--color-primary)">เติมเงิน</h1>
    </div>

    <!-- Profile card -->
    <div class="px-5 pb-4 flex-shrink-0">
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
      <h2 class="mb-3" style="font-size: 13px; font-weight: 500; color: var(--color-text-primary)">เลือกวิธีการเติมเงิน</h2>

      <div class="flex flex-col" style="border-radius: var(--radius-lg); border: 1px solid var(--color-border-tertiary); overflow: hidden">
        <template v-for="(item, idx) in [
          { id: 'promptpay', label: 'พร้อมเพย์', icon: 'ti-qrcode' },
          { id: 'alipay',    label: 'Alipay',    icon: 'ti-credit-card' },
          { id: 'history',   label: 'ประวัติการทำรายการ', icon: 'ti-receipt' },
          { id: 'feedback',  label: 'ส่งความเห็น', icon: 'ti-mood-smile' },
        ]" :key="item.id">
          <button
            @click="selectItem(item.id)"
            class="flex items-center gap-3 px-3 py-3 active:scale-[0.99] transition-transform"
            style="background: var(--color-bg-surface); cursor: pointer; text-align: left"
          >
            <div
              class="flex-shrink-0 flex items-center justify-center"
              style="width: 28px; height: 28px; border-radius: 8px; background: var(--color-primary-tint)"
            >
              <i :class="`ti ${item.icon}`" style="font-size: 15px; color: var(--color-primary)" />
            </div>
            <div class="flex-1" style="font-size: 12px; font-weight: 500; color: var(--color-text-primary)">
              {{ item.label }}
            </div>
            <i class="ti ti-chevron-right" style="font-size: 14px; color: var(--color-text-tertiary)" />
          </button>
          <div v-if="idx < 3" style="height: 0.5px; background: var(--color-border-tertiary)" />
        </template>
      </div>

      <button @click="goBack" class="btn-lg btn-secondary w-full mt-4">
        <i class="ti ti-chevron-left" style="font-size: 14px" />
        ย้อนกลับ
      </button>
    </div>

    <!-- ══ AMOUNT (Screen 4) ══════════════════════════════════════════ -->
    <div v-else-if="phase === 'amount'" class="flex-1 flex flex-col pb-4">

      <!-- Display -->
      <div class="mx-5 mb-2 flex items-center justify-between px-5 py-4" style="border-radius: 8px; border: 0.5px solid var(--color-border-tertiary); background: var(--color-bg-surface)">
        <span class="font-bold tabular-nums leading-none" :style="numericAmount > 0 ? 'font-size: 22px; color: var(--color-primary)' : 'font-size: 22px; color: var(--color-text-tertiary)'">{{ displayAmount }}</span>
        <span style="font-size: 12px; color: var(--color-text-tertiary)">฿</span>
      </div>
      <p class="px-5 mb-3" style="font-size: 9px; color: var(--color-text-tertiary)">
        เติมเงินสูงสุด 5,000 บาท / ครั้ง
      </p>

      <!-- Quick chips -->
      <div class="flex gap-2 px-5 mb-3 overflow-x-auto scrollbar-none flex-shrink-0">
        <button
          v-for="q in QUICK"
          :key="q"
          @click="setQuick(q)"
          class="flex-shrink-0 px-4 h-9 rounded-full transition-colors"
          style="font-size: 13px; font-weight: 600"
          :style="numericAmount === q
            ? 'background: var(--color-primary); color: #fff; border: 1px solid var(--color-primary)'
            : 'background: transparent; color: var(--color-primary); border: 1px solid var(--color-primary)'"
        >{{ q }}</button>
      </div>

      <!-- Numpad -->
      <div class="flex-1 mx-5 overflow-hidden" style="border-radius: 8px; background: var(--color-bg-surface); border: 0.5px solid var(--color-border-tertiary); min-height: 200px">
        <template v-for="(row, ri) in [['7','8','9'],['4','5','6'],['1','2','3'],['0','00','C']]" :key="ri">
          <div class="flex" :style="ri > 0 ? 'border-top: 0.5px solid var(--color-border-tertiary)' : ''">
            <button
              v-for="(key, ki) in row"
              :key="key"
              @click="numpadPress(key)"
              class="flex-1 flex items-center justify-center py-[11px] transition-opacity active:opacity-50"
              :style="[
                ki > 0 ? 'border-left: 0.5px solid var(--color-border-tertiary)' : '',
                key === 'C' ? 'color: var(--color-danger)' : 'color: var(--color-text-primary)',
                'font-size: 17px; font-weight: 500; background: transparent; cursor: pointer;'
              ].join(';')"
            >{{ key }}</button>
          </div>
        </template>
      </div>

      <!-- Bottom bar -->
      <div class="flex items-center gap-3 px-5 pt-4">
        <button
          @click="goBack"
          class="flex items-center gap-1"
          style="font-size: 13px; font-weight: 500; color: var(--color-primary); background: none; border: none; cursor: pointer"
        >
          <i class="ti ti-chevron-left" style="font-size: 13px" />
          ย้อนกลับ
        </button>
        <button
          @click="confirmAmount"
          :disabled="!canConfirm"
          class="flex-1 transition-all"
          style="height: 44px; border-radius: 8px; font-size: 16px; font-weight: 500"
          :style="canConfirm
            ? 'background: var(--color-primary); color: #fff; border: none; cursor: pointer;'
            : 'background: var(--color-bg-secondary); color: var(--color-text-tertiary); border: none; cursor: not-allowed;'"
        >ยืนยัน</button>
      </div>
    </div>

    <!-- ══ QR (Screen 3) ══════════════════════════════════════════════ -->
    <div v-else-if="phase === 'qr'" class="flex-1 flex flex-col px-5 pb-6 gap-4">
      <div class="card flex flex-col items-center py-8 px-6 gap-3">
        <div style="font-size: 12px; font-weight: 500; color: var(--color-text-primary)">สแกน QR Code เพื่อชำระเงิน</div>

        <div
          class="w-[100px] h-[100px] flex flex-col items-center justify-center"
          style="border-radius: 8px; border: 2px solid var(--color-primary); background: #F8FAFF"
        >
          <i class="ti ti-qrcode" style="font-size: 48px; color: var(--color-primary)" />
        </div>

        <div class="text-center">
          <p style="font-size: 10px; color: var(--color-text-secondary)">สแกนด้วยพร้อมเพย์หรือแอปธนาคาร</p>
          <p class="font-medium" style="font-size: 18px; color: var(--color-primary)">
            ฿{{ numericAmount.toLocaleString() }}
          </p>
          <p class="mt-1" style="font-size: 9px; color: var(--color-text-tertiary)">
            <template v-if="!qrExpired">หมดอายุใน {{ qrMM }}:{{ qrSS }} นาที</template>
            <span v-else style="font-weight: 600; color: var(--color-danger)">QR หมดอายุ — กลับไปเลือกใหม่</span>
          </p>
        </div>

        <div class="w-full rounded-full overflow-hidden" style="height: 3px; background: var(--color-primary-tint)">
          <div class="h-full rounded-full transition-all duration-1000 ease-linear" :style="`width: ${(qrCountdown / 300) * 100}%; background: var(--color-primary)`" />
        </div>

        <p style="font-size: 9px; color: var(--color-text-tertiary)">
          {{ isProcessing ? 'กำลังดำเนินการ...' : 'รอการยืนยันจากธนาคาร...' }}
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
          กำลังดำเนินการ...
        </span>
        <span v-else>จำลองการชำระเงิน</span>
      </button>

      <!-- Demo triggers (no real payment gateway in this environment) -->
      <div class="flex items-center justify-center gap-4">
        <button style="font-size: 10px; color: var(--color-danger); text-decoration: underline" :disabled="isProcessing" @click="simulateNetworkError">จำลอง: ไม่มีอินเทอร์เน็ต</button>
        <button style="font-size: 10px; color: var(--color-danger); text-decoration: underline" :disabled="isProcessing" @click="simulateServiceError">จำลอง: 503</button>
      </div>
    </div>

    <!-- ══ SUCCESS (Screen 5) ══════════════════════════════════════════ -->
    <div v-else-if="phase === 'success'" class="flex-1 flex flex-col px-5 pb-6 gap-4">
      <div class="card flex flex-col items-center py-10 px-6 gap-3">
        <div class="rounded-full flex items-center justify-center" style="width: 48px; height: 48px; background: var(--color-success)">
          <i class="ti ti-circle-check" style="font-size: 24px; color: #fff" />
        </div>

        <h2 class="font-bold text-center" style="font-size: 16px; color: #0A4BAD">
          เติมเงินสำเร็จ
        </h2>

        <div class="w-full mt-2 space-y-2">
          <div class="flex justify-between items-baseline">
            <span style="font-size: 10px; color: var(--color-text-secondary)">วันที่และเวลาที่ทำรายการ:</span>
            <span class="font-medium" style="font-size: 10px; color: var(--color-text-primary)">{{ formattedSuccess }}</span>
          </div>
          <div class="flex justify-between items-baseline">
            <span style="font-size: 10px; color: var(--color-text-secondary)">วิธีการเติมเงิน:</span>
            <span class="font-medium" style="font-size: 10px; color: var(--color-text-primary)">{{ methodLabel }}</span>
          </div>
        </div>

        <p class="font-extrabold mt-3" style="font-size: 22px; color: var(--color-success)">
          ฿{{ paidAmount.toLocaleString() }}.00
        </p>
      </div>

      <button @click="backToMethod" class="btn-lg btn-primary w-full">
        กลับไปหน้าเติมเงิน
      </button>
    </div>

  </div>
</template>
