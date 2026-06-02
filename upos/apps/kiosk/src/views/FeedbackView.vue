<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import AutoLogout from '@/components/AutoLogout.vue'
import api from '@/api/axios'

const router = useRouter()
const store = useKioskStore()

type Phase = 'form' | 'submitting' | 'success'

const phase = ref<Phase>('form')
const rating = ref(0)
const selectedCategories = ref<string[]>([])
const comment = ref('')
const redirectTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const redirectCount = ref(3)
const redirectInterval = ref<ReturnType<typeof setInterval> | null>(null)

const CATEGORIES = [
  { key: 'food',      label: 'อาหาร',       icon: '🍽' },
  { key: 'service',   label: 'บริการ',       icon: '👋' },
  { key: 'hygiene',   label: 'ความสะอาด',   icon: '✨' },
]

const STARS = [1, 2, 3, 4, 5]
const STAR_LABELS = ['แย่มาก', 'แย่', 'พอใช้', 'ดี', 'ดีมาก']

const canSubmit = computed(() => rating.value > 0)

function toggleCategory(key: string) {
  const idx = selectedCategories.value.indexOf(key)
  if (idx === -1) {
    selectedCategories.value.push(key)
  } else {
    selectedCategories.value.splice(idx, 1)
  }
}

async function submitFeedback() {
  if (!canSubmit.value) return

  phase.value = 'submitting'

  try {
    await api.post('/feedback', {
      rating: rating.value,
      categories: selectedCategories.value,
      comment: comment.value.trim() || null,
      channel: 'kiosk',
      userId: store.currentUser?.id || null,
    })
  } catch {
    // Silently accept even on error — kiosk flow must not block
  }

  phase.value = 'success'
  startRedirectCountdown()
}

function startRedirectCountdown() {
  redirectCount.value = 3
  redirectInterval.value = setInterval(() => {
    redirectCount.value -= 1
    if (redirectCount.value <= 0) {
      clearRedirect()
      store.clearSession()
      router.push('/')
    }
  }, 1000)
}

function clearRedirect() {
  if (redirectTimer.value) clearTimeout(redirectTimer.value)
  if (redirectInterval.value) clearInterval(redirectInterval.value)
}

onUnmounted(() => {
  clearRedirect()
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
    <div v-if="phase !== 'success'" class="flex items-center gap-6 px-10 py-6 flex-shrink-0">
      <button
        class="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center
               justify-center text-white text-kiosk-xl hover:bg-white/20 active:scale-95
               transition-all"
        @click="router.push('/home')"
      >
        ←
      </button>
      <div>
        <div class="text-white font-black text-kiosk-2xl">แสดงความคิดเห็น</div>
        <div class="text-white/60 text-kiosk-base">Give Feedback</div>
      </div>
    </div>

    <!-- Phase: Form -->
    <div
      v-if="phase === 'form'"
      class="flex-1 overflow-y-auto px-10 pb-24 flex flex-col gap-8 min-h-0"
    >

      <!-- Star rating -->
      <div class="flex flex-col items-center gap-4">
        <div class="text-white/80 text-kiosk-lg font-medium">ให้คะแนนบริการวันนี้</div>
        <div class="flex gap-4">
          <button
            v-for="star in STARS"
            :key="star"
            class="transition-all duration-100 active:scale-90"
            :style="{ fontSize: '4rem', lineHeight: '1' }"
            @click="rating = star"
          >
            <span :class="star <= rating ? 'text-yellow-400' : 'text-white/30'">★</span>
          </button>
        </div>
        <div
          v-if="rating > 0"
          class="text-yellow-300 font-bold text-kiosk-lg"
        >
          {{ STAR_LABELS[rating - 1] }}
        </div>
      </div>

      <!-- Category chips -->
      <div class="flex flex-col gap-4">
        <div class="text-white/80 text-kiosk-base font-medium text-center">
          เลือกหมวดที่ต้องการให้ความเห็น (ไม่บังคับ)
        </div>
        <div class="flex gap-4 justify-center flex-wrap">
          <button
            v-for="cat in CATEGORIES"
            :key="cat.key"
            class="flex items-center gap-3 px-8 py-4 rounded-full border-2 font-bold
                   text-kiosk-base transition-all duration-150 active:scale-95"
            :class="selectedCategories.includes(cat.key)
              ? 'bg-yellow-400 border-yellow-400 text-dulwich-900'
              : 'bg-white/10 border-white/30 text-white hover:bg-white/20'"
            @click="toggleCategory(cat.key)"
          >
            <span class="text-2xl">{{ cat.icon }}</span>
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Comment textarea -->
      <div class="flex flex-col gap-3">
        <div class="text-white/80 text-kiosk-base font-medium">
          ความคิดเห็นเพิ่มเติม (ไม่บังคับ)
        </div>
        <textarea
          v-model="comment"
          placeholder="พิมพ์ความคิดเห็นที่นี่..."
          rows="4"
          class="w-full bg-white/10 border-2 border-white/30 rounded-kiosk p-5
                 text-white placeholder-white/40 text-kiosk-base resize-none
                 focus:outline-none focus:border-yellow-400 focus:bg-white/15 transition-all"
        />
      </div>

      <!-- Submit button -->
      <button
        class="w-full kiosk-btn py-6 text-kiosk-xl font-black transition-all duration-150
               active:scale-95 rounded-kiosk shadow-2xl"
        :class="canSubmit
          ? 'bg-yellow-400 text-dulwich-900 hover:bg-yellow-300'
          : 'bg-white/20 text-white/40 cursor-not-allowed'"
        :disabled="!canSubmit"
        @click="submitFeedback"
      >
        ส่งความคิดเห็น
      </button>
    </div>

    <!-- Phase: Submitting -->
    <div
      v-else-if="phase === 'submitting'"
      class="flex-1 flex flex-col items-center justify-center gap-8"
    >
      <div class="w-24 h-24 border-8 border-white/30 border-t-yellow-400 rounded-full animate-spin" />
      <div class="text-white font-black text-kiosk-2xl">กำลังส่งข้อมูล...</div>
    </div>

    <!-- Phase: Success / Thank you -->
    <div
      v-else-if="phase === 'success'"
      class="flex-1 flex flex-col items-center justify-center gap-10 px-10"
    >
      <div class="text-8xl" style="animation: bounce 1s ease infinite;">🙏</div>
      <div class="text-white font-black text-center" style="font-size: 4.5rem; line-height: 1.1;">
        ขอบคุณสำหรับ<br>ความคิดเห็น
      </div>
      <div class="text-white/70 text-kiosk-xl text-center">
        Thank you for your feedback!
      </div>

      <!-- Rating display -->
      <div class="flex gap-3">
        <span
          v-for="star in STARS"
          :key="star"
          class="text-5xl"
          :class="star <= rating ? 'text-yellow-400' : 'text-white/20'"
        >★</span>
      </div>

      <!-- Auto redirect countdown -->
      <div class="rounded-kiosk bg-white/10 border border-white/20 px-10 py-5 text-center">
        <div class="text-white/70 text-kiosk-base">กลับหน้าหลักใน</div>
        <div class="text-white font-black text-kiosk-3xl tabular-nums">{{ redirectCount }}</div>
        <div class="text-white/50 text-kiosk-sm">วินาที</div>
      </div>

      <button
        class="kiosk-btn-primary px-16 py-5 text-kiosk-lg"
        @click="() => { clearRedirect(); store.clearSession(); router.push('/') }"
      >
        กลับหน้าหลักเดี๋ยวนี้
      </button>
    </div>

    <!-- Auto logout bar (not on success) -->
    <AutoLogout v-if="phase === 'form'" />
  </div>
</template>
