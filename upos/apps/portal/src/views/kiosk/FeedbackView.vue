<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type Phase = 'form' | 'submitting' | 'success'

const phase = ref<Phase>('form')
const rating = ref<number>(0)
const selectedCategory = ref<string>('')
const comment = ref('')

const categories = [
  { key: 'food', label: '🍜 อาหาร' },
  { key: 'service', label: '🤝 บริการ' },
  { key: 'cleanliness', label: '✨ ความสะอาด' },
]

const ratingLabels = ['', 'แย่มาก', 'แย่', 'ปานกลาง', 'ดี', 'ดีมาก']

function setRating(val: number) {
  rating.value = val
}

function toggleCategory(key: string) {
  selectedCategory.value = selectedCategory.value === key ? '' : key
}

async function submitFeedback() {
  if (rating.value === 0 || phase.value === 'submitting') return
  phase.value = 'submitting'

  try {
    await fetch('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel:  'kiosk',
        rating:   rating.value,
        category: selectedCategory.value || undefined,
        comment:  comment.value.trim() || undefined,
      }),
    })
  } catch {
    // Ignore network errors — still show success to user
  }

  phase.value = 'success'

  setTimeout(() => {
    router.push('/kiosk/topup')
  }, 3000)
}

function goBack() {
  router.push('/kiosk/topup')
}
</script>

<template>
  <div class="w-full h-full flex flex-col bg-[#F2F2F7] overflow-hidden">
    <!-- Top bar -->
    <div class="bg-white flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0">
      <button
        v-if="phase !== 'success'"
        @click="goBack"
        class="ios-btn-ghost flex items-center gap-1 text-[17px]"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path d="M8.5 1L1.5 8l7 7" stroke="#1264E3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        กลับ
      </button>
      <h1 class="ios-navbar-title flex-1 text-center">ความคิดเห็น</h1>
      <div class="w-[60px]" />
    </div>

    <!-- Form phase -->
    <div v-if="phase === 'form'" class="flex-1 overflow-y-auto pb-6">
      <!-- Star rating -->
      <div class="ios-section-header">ให้คะแนน</div>
      <div class="px-4">
        <div class="flex gap-4 justify-center py-4">
          <button
            v-for="star in 5"
            :key="star"
            @click="setRating(star)"
            class="text-[56px] leading-none transition-transform active:scale-90 select-none"
            :aria-label="`ให้คะแนน ${star} ดาว`"
          >
            {{ star <= rating ? '⭐' : '☆' }}
          </button>
        </div>
        <p v-if="rating > 0" class="text-center text-[15px] text-[#6E6E73] -mt-1">
          {{ ratingLabels[rating] }}
        </p>
      </div>

      <!-- Category chips -->
      <div class="ios-section-header mt-2">หัวข้อ</div>
      <div class="flex gap-3 px-4 flex-wrap">
        <button
          v-for="cat in categories"
          :key="cat.key"
          @click="toggleCategory(cat.key)"
          class="rounded-full px-6 py-3 text-[17px] font-medium active:scale-95 transition-all"
          :class="
            selectedCategory === cat.key
              ? 'bg-[#1264E3] text-white'
              : 'bg-white text-[#3C3C43] shadow-sm'
          "
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Comment textarea -->
      <div class="ios-section-header mt-2">ความคิดเห็น (ไม่บังคับ)</div>
      <div class="ios-card mx-4">
        <textarea
          v-model="comment"
          placeholder="พิมพ์ความคิดเห็น..."
          class="bg-transparent outline-none w-full text-[17px] text-[#000000] placeholder-[#AEAEB2] resize-none min-h-[100px]"
        />
      </div>

      <!-- Submit button -->
      <button
        @click="submitFeedback"
        :disabled="rating === 0"
        class="ios-btn-primary mx-4 mt-4 w-[calc(100%-32px)] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ส่งความคิดเห็น
      </button>
    </div>

    <!-- Submitting phase -->
    <div v-else-if="phase === 'submitting'" class="flex-1 flex items-center justify-center gap-3 text-[17px] text-[#6E6E73]">
      <span class="animate-spin text-[24px]">⏳</span>
      <span>กำลังส่ง...</span>
    </div>

    <!-- Success overlay -->
    <div
      v-else-if="phase === 'success'"
      class="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <span class="text-[80px] leading-none">🙏</span>
      <p class="text-[28px] font-black text-[#000000]">ขอบคุณ!</p>
      <p class="text-[17px] text-[#6E6E73]">ขอบคุณสำหรับความคิดเห็นของคุณ</p>
      <p class="text-[15px] text-[#AEAEB2]">กำลังกลับอัตโนมัติ...</p>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  display: none;
}
</style>
