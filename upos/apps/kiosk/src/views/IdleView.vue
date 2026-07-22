<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import Icon from '@/components/Icon.vue'

const router = useRouter()
const store = useKioskStore()

const isLoading = ref(false)
const errorMsg = ref('')
const currentScreen = ref<'tap' | 'manual'>('tap')
const cardInput = ref('')
const cardInputEl = ref<HTMLInputElement | null>(null)

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

  const success = await store.readCard(uid)

  isLoading.value = false

  if (success) {
    router.push('/home')
  } else {
    errorMsg.value = store.error ? t('ไม่พบข้อมูลบัตร', 'Card not found') : ''
    setTimeout(() => { errorMsg.value = '' }, 3000)
  }
}

function demoStudent() {
  handleCardRead('STD-K1-0001')
}

function demoTeacher() {
  handleCardRead('STF-ANNA-01')
}

const canSubmit = computed(() => cardInput.value.trim().length >= 4)

function goManual() {
  errorMsg.value = ''
  currentScreen.value = 'manual'
  nextTick(() => cardInputEl.value?.focus())
}

function goBack() {
  currentScreen.value = 'tap'
  cardInput.value = ''
  errorMsg.value = ''
}

function submitCard() {
  if (!canSubmit.value || isLoading.value) return
  handleCardRead(cardInput.value.trim())
}
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col" style="background: #F4F6FB">
    <!-- Top bar -->
    <div class="relative flex items-center justify-between px-6 pt-4 pb-3 flex-shrink-0 bg-white" style="border-bottom: 0.5px solid #E0E0E5">
      <span style="font-size: 11px; color: #9A9AB0; min-width: 60px">
        {{ currentScreen === 'tap' ? t('แตะบัตร', 'Tap Card') : t('กรอกเลขบัตร', 'Enter Card') }}
      </span>
      <h1 class="absolute left-1/2 -translate-x-1/2 font-semibold" style="font-size: 15px; color: #1264E3">{{ t('บัตรสมาชิก', 'Card') }}</h1>
      <div style="font-size: 13px; font-weight: 600; color: #1264E3; display: flex; align-items: center; gap: 6px; min-width: 60px; justify-content: flex-end">
        <span
          style="cursor: pointer; padding: 2px 6px; border-radius: 4px"
          :style="store.locale === 'th' ? 'font-weight: 700; background: #EAF1FD' : ''"
          @click="setLang('th')"
        >TH</span>
        <span style="color: #C8CEDF">|</span>
        <span
          style="cursor: pointer; padding: 2px 6px; border-radius: 4px"
          :style="store.locale === 'en' ? 'font-weight: 700; background: #EAF1FD' : ''"
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
          <div class="nfc-wrap">
            <div class="nfc-ring">
              <Icon name="nfc" :size="36" color="#1264E3" />
            </div>
          </div>

          <div class="font-bold text-gray-900" style="font-size: 20px; margin-bottom: 6px; text-align: center">{{ t('แตะการ์ด', 'Tap Card') }}</div>
          <div class="text-gray-500" style="font-size: 13px; text-align: center; line-height: 1.5; margin-bottom: 28px">{{ t('วางบัตรใกล้เครื่องอ่านเพื่อเติมเงินเข้าบัญชีของคุณ', 'Place your card near the reader to top up your account') }}</div>

          <!-- Error message -->
          <div
            v-if="errorMsg"
            class="w-full text-center px-4 py-2 rounded-lg bg-brand-danger text-white"
            style="font-size: 12px; font-weight: 600; margin-bottom: 16px"
          >
            {{ errorMsg }}
          </div>

          <div style="display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 16px">
            <div style="flex: 1; height: 1px; background: #E4E4EC"></div>
            <span class="text-gray-400" style="font-size: 13px; white-space: nowrap">{{ t('หรือ', 'or') }}</span>
            <div style="flex: 1; height: 1px; background: #E4E4EC"></div>
          </div>

          <button class="btn-manual" @click="goManual">
            <Icon name="card" :size="16" color="#1264E3" />
            {{ t('กรอกเลขบัตรด้วยตนเอง', 'Enter Card Number Manually') }}
          </button>

          <div class="text-gray-400" style="font-size: 11px; margin-bottom: 8px; text-align: center">{{ t('Demo — จำลองการแตะบัตร', 'Demo — Simulate Card Tap') }}</div>
          <div style="display: flex; gap: 8px; width: 100%">
            <button class="demo-btn" :disabled="isLoading" @click="demoStudent">
              <Icon name="person" :size="13" color="#1264E3" />
              Demo: {{ t('นักเรียน', 'Student') }}
            </button>
            <button class="demo-btn" :disabled="isLoading" @click="demoTeacher">
              <Icon name="person" :size="13" color="#1264E3" />
              Demo: {{ t('ครู', 'Teacher') }}
            </button>
          </div>
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
          <div class="font-bold text-gray-900" style="font-size: 18px; margin-bottom: 6px; text-align: center">{{ t('กรอกเลขบัตร', 'Enter Card Number') }}</div>
          <div class="text-gray-500" style="font-size: 13px; text-align: center; line-height: 1.5; margin-bottom: 24px">{{ t('กรณีแตะบัตรไม่ผ่าน กรอกเลขบัตรด้านล่างแล้วกดยืนยัน', 'If tapping fails, enter your card number below and confirm') }}</div>

          <div class="text-gray-500" style="font-size: 12px; font-weight: 600; align-self: flex-start; margin-bottom: 6px; width: 100%">{{ t('เลขบัตร / Card Number', 'Card Number') }}</div>
          <div class="card-input-wrap">
            <Icon name="card" :size="16" color="#9A9AB0" />
            <input
              ref="cardInputEl"
              v-model="cardInput"
              type="text"
              class="card-input"
              :placeholder="t('เช่น 1234567890', 'e.g. 1234567890')"
              maxlength="20"
              autocomplete="off"
              @keyup.enter="submitCard"
            />
          </div>
          <div class="text-gray-400" style="font-size: 11px; align-self: flex-start; margin-bottom: 16px">* {{ t('กรอกอย่างน้อย 4 ตัวอักษร', 'Enter at least 4 characters') }}</div>

          <!-- Error message -->
          <div
            v-if="errorMsg"
            class="w-full text-center px-4 py-2 rounded-lg bg-brand-danger text-white"
            style="font-size: 12px; font-weight: 600; margin-bottom: 12px"
          >
            {{ errorMsg }}
          </div>

          <button class="btn-submit" :disabled="!canSubmit || isLoading" @click="submitCard">
            <Icon name="check" :size="16" color="#fff" />
            {{ t('ยืนยันเลขบัตร', 'Confirm Card Number') }}
          </button>

          <button class="btn-manual" @click="goBack">
            <Icon name="chevronLeft" :size="14" color="#1264E3" />
            {{ t('ย้อนกลับ', 'Back') }}
          </button>
        </div>
      </div>

    </div>

    <!-- Version footer -->
    <div class="flex-shrink-0 text-center text-gray-400 pb-4 pt-2 bg-white" style="font-size: 10px; border-top: 0.5px solid #E4E4EC">
      {{ t('เวอร์ชั่น', 'Version') }}: 1.0.0 build 20260714
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
  background: #FFFFFF;
  border-radius: 20px;
  width: 100%; max-width: 400px;
  padding: 28px 28px 24px;
  display: flex; flex-direction: column; align-items: center;
  position: relative; z-index: 1;
}

/* NFC ring */
.nfc-wrap { display: flex; justify-content: center; margin-bottom: 20px; }
.nfc-ring {
  width: 72px; height: 72px; border-radius: 50%;
  background: #EAF1FD;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  animation: nfc-pulse 2.4s ease-in-out infinite;
}
.nfc-ring::before, .nfc-ring::after {
  content: ''; position: absolute; border-radius: 50%;
  border: 1.5px solid rgba(18,100,227,.18);
}
.nfc-ring::before { width: 92px; height: 92px; animation: nfc-ripple 2.4s ease-out infinite; }
.nfc-ring::after  { width: 112px; height: 112px; animation: nfc-ripple 2.4s ease-out infinite; animation-delay: 0.65s; }
@keyframes nfc-pulse  { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes nfc-ripple { 0% { opacity: 0.5; transform: scale(0.82); } 100% { opacity: 0; transform: scale(1.1); } }

/* Manual entry button */
.btn-manual {
  width: 100%; height: 44px; border-radius: 10px;
  background: #FFFFFF; color: #1264E3;
  border: 1.5px solid #1264E3;
  font-size: 13px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 14px; transition: background 0.15s;
}
.btn-manual:hover { background: #EAF1FD; }
.btn-manual:active { opacity: 0.8; }

/* Demo buttons */
.demo-btn {
  flex: 1; height: 34px; border-radius: 8px;
  background: #FFFFFF; color: #1264E3;
  border: 1px solid #1264E3; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: background 0.12s;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.demo-btn:hover:not(:disabled) { background: #EAF1FD; }
.demo-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Manual entry input */
.card-input-wrap {
  position: relative; width: 100%; margin-bottom: 6px;
  display: flex; align-items: center;
}
.card-input-wrap svg { position: absolute; left: 14px; }
.card-input {
  width: 100%; height: 48px;
  padding: 0 14px 0 42px;
  border: 1.5px solid #C8CEDF; border-radius: 10px;
  font-size: 15px; font-weight: 500; letter-spacing: 0.06em;
  color: #1A1A2E; background: #F4F6FB;
  outline: none; transition: border-color 0.15s, background 0.15s;
  font-family: monospace;
}
.card-input::placeholder { color: #9A9AB0; letter-spacing: 0; font-family: inherit; font-weight: 400; font-size: 13px; }
.card-input:focus { border-color: #1264E3; background: #FFFFFF; }

.btn-submit {
  width: 100%; height: 46px; border-radius: 10px;
  background: #1264E3; color: #fff;
  border: none; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: background 0.15s, opacity 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 10px;
}
.btn-submit:disabled { background: #DCDCDC !important; color: #A0A0A0 !important; cursor: not-allowed !important; }
</style>
