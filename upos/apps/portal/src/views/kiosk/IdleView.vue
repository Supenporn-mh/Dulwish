<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import Icon from './Icon.vue'

const router = useRouter()
const store = useKioskStore()

const isLoading = ref(false)
const errorMsg = ref('')
const errorKind = ref<'' | 'notfound' | 'suspended'>('')
const currentScreen = ref<'tap' | 'manual'>('tap')
const cardInput = ref('')
const cardInputEl = ref<HTMLInputElement | null>(null)

const ERROR_SUB: Record<'notfound' | 'suspended', [string, string]> = {
  notfound: ['ตรวจสอบเลขบัตรอีกครั้ง หรือติดต่อเจ้าหน้าที่', 'Check the card number and try again, or contact staff for assistance.'],
  suspended: ['กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการต่อ', 'Please contact staff to resolve this issue.'],
}
const ERROR_FIELD_MSG: Record<'notfound' | 'suspended', [string, string]> = {
  notfound: ['ไม่พบบัตรเลขนี้ในระบบ', 'This card number was not found'],
  suspended: ['บัตรนี้ถูกระงับ ไม่สามารถใช้งานได้', 'This card has been suspended'],
}

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

onMounted(() => {
  store.clearSession()
})

function setLang(lang: 'th' | 'en') {
  if (store.locale !== lang) store.toggleLocale()
}

async function handleCardRead(uid: string) {
  if (isLoading.value) return
  isLoading.value = true
  errorMsg.value = ''
  errorKind.value = ''

  const success = await store.readCard(uid)

  isLoading.value = false

  if (success) {
    router.push('/kiosk/topup')
  } else {
    const kind = store.errorCode === 'CARD_002' ? 'suspended' : 'notfound'
    errorKind.value = kind
    errorMsg.value = t(...ERROR_FIELD_MSG[kind])
  }
}

const canSubmit = computed(() => cardInput.value.trim().length >= 4)
const errorSub = computed(() => {
  const kind = errorKind.value
  return kind ? t(...ERROR_SUB[kind]) : ''
})

function onCardInput() {
  errorMsg.value = ''
  errorKind.value = ''
}

function goManual() {
  errorMsg.value = ''
  errorKind.value = ''
  currentScreen.value = 'manual'
  nextTick(() => cardInputEl.value?.focus())
}

function goBack() {
  currentScreen.value = 'tap'
  cardInput.value = ''
  errorMsg.value = ''
  errorKind.value = ''
}

function submitCard() {
  if (!canSubmit.value || isLoading.value) return
  handleCardRead(cardInput.value.trim())
}
</script>

<template>
  <div class="w-full h-full overflow-hidden flex flex-col" style="background: var(--color-bg-page)">
    <!-- Top bar -->
    <div class="relative flex items-center justify-between px-6 pt-4 pb-3 flex-shrink-0" style="background: var(--color-bg-surface); border-bottom: 0.5px solid #E0E0E5">
      <span style="font-size: 11px; color: var(--color-text-tertiary); min-width: 60px">
        {{ currentScreen === 'tap' ? t('แตะบัตร', 'Tap Card') : t('กรอกเลขบัตร', 'Enter Card') }}
      </span>
      <h1 class="absolute left-1/2 -translate-x-1/2 font-semibold" style="font-size: 15px; color: var(--color-primary)">{{ t('บัตรสมาชิก', 'Card') }}</h1>
      <div style="font-size: 13px; font-weight: 600; color: var(--color-primary); display: flex; align-items: center; gap: 6px; min-width: 60px; justify-content: flex-end">
        <span
          style="cursor: pointer; padding: 2px 6px; border-radius: 4px"
          :style="store.locale === 'th' ? 'font-weight: 700; background: var(--color-primary-tint)' : ''"
          @click="setLang('th')"
        >TH</span>
        <span style="color: var(--color-border-secondary)">|</span>
        <span
          style="cursor: pointer; padding: 2px 6px; border-radius: 4px"
          :style="store.locale === 'en' ? 'font-weight: 700; background: var(--color-primary-tint)' : ''"
          @click="setLang('en')"
        >EN</span>
      </div>
    </div>

    <!-- Screens -->
    <div class="flex-1 relative overflow-hidden">

      <!-- Screen 1: Tap Card -->
      <div
        class="idle-screen"
        :class="currentScreen === 'tap' ? 'screen-active' : 'screen-hidden-left'"
      >
        <div class="bg-circle bg-circle-1"></div>
        <div class="bg-circle bg-circle-2"></div>

        <div class="idle-card">
          <div class="rfid-animation">
            <div class="card-icon">
              <img src="/images/decor-card.png" alt="Card icon" class="card-icon-img" />
            </div>
            <div class="rfid-waves">
              <div class="wave"></div>
              <div class="wave"></div>
              <div class="wave"></div>
            </div>
          </div>

          <div class="font-bold" style="font-size: 20px; color: var(--color-text-primary); margin-bottom: 6px; text-align: center">{{ t('แตะการ์ด', 'Tap Card') }}</div>
          <div class="text-breathe" style="font-size: 13px; color: var(--color-text-secondary); text-align: center; line-height: 1.5; margin-bottom: 28px">{{ t('วางบัตรใกล้เครื่องอ่านเพื่อเติมเงินเข้าบัญชีของคุณ', 'Place your card near the reader to top up your account') }}</div>

          <div style="display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 16px">
            <div style="flex: 1; height: 1px; background: var(--color-border-tertiary)"></div>
            <span style="font-size: 13px; color: var(--color-text-tertiary); white-space: nowrap">{{ t('หรือ', 'or') }}</span>
            <div style="flex: 1; height: 1px; background: var(--color-border-tertiary)"></div>
          </div>

          <button class="btn-manual" style="margin-bottom: 0" @click="goManual">
            <Icon name="card" :size="16" color="var(--color-primary)" />
            {{ t('กรอกเลขบัตรด้วยตนเอง', 'Enter Card Number Manually') }}
          </button>
        </div>
      </div>

      <!-- Screen 2: Manual entry -->
      <div
        class="idle-screen"
        :class="currentScreen === 'manual' ? 'screen-active' : 'screen-hidden-right'"
      >
        <div class="bg-circle bg-circle-1"></div>
        <div class="bg-circle bg-circle-2"></div>

        <div class="idle-card">
          <div class="font-bold" style="font-size: 18px; color: var(--color-text-primary); margin-bottom: 6px; text-align: center">{{ t('กรอกเลขบัตร', 'Enter Card Number') }}</div>
          <div style="font-size: 13px; color: var(--color-text-secondary); text-align: center; line-height: 1.5; margin-bottom: 24px">{{ t('กรณีแตะบัตรไม่ผ่าน กรอกเลขบัตรด้านล่างแล้วกดยืนยัน', 'If tapping fails, enter your card number below and confirm') }}</div>

          <div style="font-size: 12px; font-weight: 600; color: var(--color-text-secondary); align-self: flex-start; margin-bottom: 6px; width: 100%">{{ t('เลขบัตร / Card Number', 'Card Number') }}</div>
          <div class="card-input-wrap">
            <Icon
              name="card"
              :size="16"
              :color="errorKind === 'suspended' ? 'var(--color-danger)' : errorKind === 'notfound' ? 'var(--color-warning)' : 'var(--color-text-tertiary)'"
            />
            <input
              ref="cardInputEl"
              v-model="cardInput"
              type="text"
              class="card-input"
              :class="errorKind"
              :placeholder="t('เช่น 1234567890', 'e.g. 1234567890')"
              maxlength="20"
              autocomplete="off"
              @input="onCardInput"
              @keyup.enter="submitCard"
            />
          </div>

          <div v-if="errorKind" class="field-msg" :class="errorKind">
            <Icon
              :name="errorKind === 'suspended' ? 'circleX' : 'warning'"
              :size="13"
              :color="errorKind === 'suspended' ? 'var(--color-danger)' : 'var(--color-warning)'"
            />
            {{ errorMsg }}
          </div>
          <div v-else style="font-size: 11px; color: var(--color-text-tertiary); align-self: flex-start; margin-bottom: 16px">* {{ t('กรอกอย่างน้อย 4 ตัวอักษร', 'Enter at least 4 characters') }}</div>

          <div v-if="errorKind" class="err-sub">{{ errorSub }}</div>

          <button class="btn-submit" :disabled="!canSubmit || isLoading" @click="submitCard">
            <Icon name="check" :size="16" color="#fff" />
            {{ t('ยืนยันเลขบัตร', 'Confirm Card Number') }}
          </button>

          <button class="btn-manual" @click="goBack">
            <Icon name="chevronLeft" :size="14" color="var(--color-primary)" />
            {{ t('ย้อนกลับ', 'Back') }}
          </button>
        </div>
      </div>

    </div>

    <!-- Version footer -->
    <div class="flex-shrink-0 text-center pb-4 pt-2" style="font-size: 10px; color: var(--color-text-tertiary); background: var(--color-bg-surface); border-top: 0.5px solid var(--color-border-tertiary)">
      {{ t('เวอร์ชั่น', 'Version') }}: 1.0.0 build 20260715
    </div>
  </div>
</template>

<style scoped>
.idle-screen {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 32px 24px; overflow: hidden;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s;
}
.screen-hidden-left  { transform: translateX(-100%); opacity: 0; pointer-events: none; }
.screen-hidden-right { transform: translateX(100%);  opacity: 0; pointer-events: none; }
.screen-active { transform: translateX(0); opacity: 1; pointer-events: all; }

.bg-circle {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(18,100,227,.06) 0%, transparent 70%);
  pointer-events: none;
}
.bg-circle-1 { width: 420px; height: 420px; top: -140px; left: -140px; }
.bg-circle-2 { width: 300px; height: 300px; bottom: -100px; right: -80px; }

.idle-card {
  background: var(--color-bg-surface);
  border-radius: 20px;
  width: 100%; max-width: 400px;
  padding: 28px 28px 24px;
  display: flex; flex-direction: column; align-items: center;
  position: relative; z-index: 1;
}

/* RFID tap animation */
.rfid-animation {
  position: relative;
  width: 110px; height: 72px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}
.card-icon {
  position: relative; z-index: 1;
  width: 108px; border-radius: 10px;
  overflow: hidden;
  transform-origin: center bottom;
  animation: card-icon-animation 3s infinite ease-in-out;
  box-shadow: 0 6px 18px rgba(18,100,227,.22);
}
.card-icon-img { display: block; width: 100%; height: auto; }
.card-icon::after {
  content: '';
  position: absolute; top: 0; left: -150%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.5) 50%,
    rgba(255,255,255,0) 100%);
  transform: skewX(-25deg);
  animation: flash 3s infinite ease-in-out;
  animation-delay: 1.5s;
}
@keyframes card-icon-animation {
  0%   { transform: rotate(-10deg); }
  50%  { transform: rotate(0deg); }
  100% { transform: rotate(-10deg); }
}
@keyframes flash {
  0%, 70% { left: -150%; }
  100%    { left: 150%; }
}

.rfid-waves { position: absolute; top: 50%; left: 50%; }
.wave {
  position: absolute; top: 50%; left: 50%;
  width: 90px; height: 90px; margin: -45px 0 0 -45px;
  border-radius: 50%;
  animation: wave-animation 3s infinite linear;
}
.wave:nth-child(2) { animation-delay: 1s; }
.wave:nth-child(3) { animation-delay: 2s; }
@keyframes wave-animation {
  0%   { transform: scale(0.5); opacity: 0; background-color: var(--color-primary); }
  20%  { transform: scale(0.75); opacity: 0.3; }
  100% { transform: scale(1.5); opacity: 0; background-color: #EACB46; }
}

.text-breathe {
  animation: breathe 3s infinite linear;
}
@keyframes breathe {
  0%, 100% { opacity: 0.8; }
  50%      { opacity: 0.5; }
}

/* Manual entry button */
.btn-manual {
  width: 100%; height: 44px; border-radius: 10px;
  background: var(--color-bg-surface); color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  font-size: 13px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 14px; transition: background 0.15s;
}
.btn-manual:hover { background: var(--color-primary-tint); }
.btn-manual:active { opacity: 0.8; }

/* Manual entry input */
.card-input-wrap {
  position: relative; width: 100%; margin-bottom: 6px;
  display: flex; align-items: center;
}
.card-input-wrap svg { position: absolute; left: 14px; }
.card-input {
  width: 100%; height: 48px;
  padding: 0 14px 0 42px;
  border: 1.5px solid var(--color-border-secondary); border-radius: 10px;
  font-size: 15px; font-weight: 500; letter-spacing: 0.06em;
  color: var(--color-text-primary); background: var(--color-bg-page);
  outline: none; transition: border-color 0.15s, background 0.15s;
  font-family: monospace;
}
.card-input::placeholder { color: var(--color-text-tertiary); letter-spacing: 0; font-family: inherit; font-weight: 400; font-size: 13px; }
.card-input:focus { border-color: var(--color-primary); background: var(--color-bg-surface); }
.card-input.notfound { border-color: var(--color-warning) !important; background: var(--color-warning-bg) !important; }
.card-input.suspended { border-color: var(--color-danger) !important; background: var(--color-danger-bg) !important; }

.field-msg { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; align-self: flex-start; margin-bottom: 8px; }
.field-msg.notfound { color: var(--color-warning); }
.field-msg.suspended { color: var(--color-danger); }

.err-sub { font-size: 12px; color: var(--color-text-secondary); text-align: center; line-height: 1.5; margin-bottom: 16px; }

.btn-submit {
  width: 100%; height: 46px; border-radius: 10px;
  background: var(--color-primary); color: #fff;
  border: none; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: background 0.15s, opacity 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 10px;
}
.btn-submit:disabled { background: #DCDCDC !important; color: #A0A0A0 !important; cursor: not-allowed !important; }
</style>
