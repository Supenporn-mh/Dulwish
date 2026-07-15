<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import Icon from '@/components/Icon.vue'

const router = useRouter()
const store = useKioskStore()

const isLoading = ref(false)
const errorMsg = ref('')

function t(th: string, en: string) {
  return store.locale === 'en' ? en : th
}

onMounted(() => {
  store.clearSession()
})

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
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col bg-white">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0 bg-white" style="border-bottom: 0.5px solid #E0E0E5">
      <span class="absolute" style="left: 20px; font-size: 11px; color: #9A9AB0">{{ t('แตะบัตร', 'Tap Card') }}</span>
      <h1 class="font-semibold" style="font-size: 15px; color: #1264E3">{{ t('เติมเงิน', 'Top Up') }}</h1>
      <button
        class="absolute right-5"
        style="font-size: 11px; font-weight: 500; color: #1264E3; background: none; border: none; cursor: pointer"
        @click="store.toggleLocale()"
      >
        <span :style="store.locale === 'th' ? 'font-weight: 700' : ''">TH</span> | <span :style="store.locale === 'en' ? 'font-weight: 700' : ''">EN</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 flex flex-col items-center justify-center gap-3 px-8">
      <div class="font-bold text-gray-900" style="font-size: 20px">{{ t('แตะการ์ด', 'Tap Card') }}</div>
      <div class="text-gray-500" style="font-size: 11px">{{ t('เพื่อดำเนินการเติมเงินเข้าบัญชี', 'To top up your account') }}</div>

      <div
        class="mt-2 flex items-center justify-center rounded-lg bg-brand-tint"
        style="width: 36px; height: 26px"
      >
        <Icon name="wifi" :size="16" color="#1264E3" />
      </div>

      <div class="mt-4">
        <Icon name="monitor" :size="52" color="#1264E3" />
      </div>

      <!-- Error message -->
      <div
        v-if="errorMsg"
        class="mt-4 rounded-lg bg-brand-danger text-white text-center px-4 py-2"
        style="font-size: 12px; font-weight: 600"
      >
        {{ errorMsg }}
      </div>

      <!-- Demo login (no real card reader in this environment) -->
      <div class="flex gap-3 mt-6">
        <button
          class="rounded-lg border text-brand-primary px-4 py-2 disabled:opacity-40"
          style="font-size: 11px; border-color: #1264E3"
          :disabled="isLoading"
          @click="demoStudent"
        >
          Demo: {{ t('นักเรียน', 'Student') }}
        </button>
        <button
          class="rounded-lg border text-brand-primary px-4 py-2 disabled:opacity-40"
          style="font-size: 11px; border-color: #1264E3"
          :disabled="isLoading"
          @click="demoTeacher"
        >
          Demo: {{ t('ครู', 'Teacher') }}
        </button>
      </div>
    </div>

    <!-- Version footer -->
    <div class="flex-shrink-0 text-center text-gray-400 pb-4" style="font-size: 10px">
      {{ t('เวอร์ชั่น', 'Version') }}: 1.0.0 build 20260714
    </div>
  </div>
</template>
