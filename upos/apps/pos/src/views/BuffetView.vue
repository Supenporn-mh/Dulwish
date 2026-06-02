<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'

const router = useRouter()
const auth = useAuthStore()

type ScreenState = 'idle' | 'loading' | 'confirm' | 'success' | 'already' | 'error'

const screen = ref<ScreenState>('idle')
const uidInput = ref('')
const cardData = ref<any>(null)
const errorMsg = ref('')

const mealPeriod = computed(() => {
  const h = new Date().getHours()
  if (h >= 6 && h < 10) return { label: 'อาหารเช้า', icon: '🌅' }
  if (h >= 10 && h < 14) return { label: 'อาหารกลางวัน', icon: '☀️' }
  if (h >= 14 && h < 17) return { label: 'อาหารว่าง', icon: '🍪' }
  return { label: 'นอกเวลา', icon: '🌙' }
})

async function readCard(uid: string) {
  const trimmed = uid.trim()
  if (!trimmed) return
  uidInput.value = trimmed
  screen.value = 'loading'
  cardData.value = null
  errorMsg.value = ''

  try {
    const res = await api.get(`/pos/card/${trimmed}`)
    cardData.value = res.data
    screen.value = 'confirm'
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || 'ไม่พบบัตรในระบบ'
    screen.value = 'error'
  }
}

async function checkIn() {
  if (!cardData.value) return
  screen.value = 'loading'
  try {
    const res = await api.post('/buffet/checkin', {
      uid: uidInput.value,
      userId: cardData.value.userId,
      walletId: cardData.value.walletId,
    })
    if (res.data.alreadyCheckedIn) {
      screen.value = 'already'
    } else {
      cardData.value = { ...cardData.value, ...res.data }
      screen.value = 'success'
    }
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || 'เกิดข้อผิดพลาด'
    screen.value = 'error'
  }
}

function reset() {
  screen.value = 'idle'
  uidInput.value = ''
  cardData.value = null
  errorMsg.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') readCard(uidInput.value)
}

// Auto-focus on input
onMounted(() => {
  (document.getElementById('uid-input') as HTMLInputElement)?.focus()
})
</script>

<template>
  <div class="fixed inset-0 bg-slate-950 flex flex-col" style="min-width:1280px; min-height:800px;">
    <!-- Top bar -->
    <header class="flex-shrink-0 h-12 bg-dulwich flex items-center px-6 gap-4 shadow-lg">
      <router-link to="/pos" class="text-white/70 hover:text-white transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </router-link>
      <h1 class="font-bold text-white text-sm">Buffet Check-in Mode</h1>
      <div class="flex-1"></div>
      <span class="text-white/80 text-sm">{{ mealPeriod.icon }} {{ mealPeriod.label }}</span>
      <div class="h-6 w-px bg-white/20"></div>
      <span class="text-white/70 text-sm">{{ auth.user?.name }}</span>
    </header>

    <!-- Main content -->
    <div class="flex-1 flex flex-col items-center justify-center px-8 gap-8">

      <!-- IDLE / INPUT STATE -->
      <template v-if="screen === 'idle' || screen === 'loading'">
        <!-- Illustration -->
        <div class="relative">
          <div class="w-40 h-40 rounded-3xl bg-dulwich/10 border-2 border-dulwich/30 flex items-center justify-center">
            <svg class="w-20 h-20 text-dulwich-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div v-if="screen === 'loading'" class="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-3xl">
            <svg class="w-10 h-10 animate-spin text-dulwich" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        </div>

        <div class="text-center">
          <h2 class="text-2xl font-bold text-white mb-2">แตะบัตรหรือใส่ UID</h2>
          <p class="text-slate-400 text-sm">เพื่อเช็คอินเข้าใช้บริการ Buffet</p>
        </div>

        <!-- UID input -->
        <div class="w-full max-w-md space-y-3">
          <input
            id="uid-input"
            v-model="uidInput"
            type="text"
            placeholder="UID บัตร..."
            :disabled="screen === 'loading'"
            class="w-full h-16 px-6 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xl text-center placeholder-slate-500 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/30 transition-all disabled:opacity-50"
            @keydown="handleKeydown"
          />
          <button
            @click="readCard(uidInput)"
            :disabled="screen === 'loading' || !uidInput.trim()"
            class="w-full h-14 rounded-2xl bg-dulwich hover:bg-dulwich-600 text-white text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ screen === 'loading' ? 'กำลังค้นหา...' : 'ตรวจสอบบัตร' }}
          </button>
        </div>

        <!-- Demo quick buttons -->
        <div class="flex gap-3">
          <button @click="readCard('STD-K1-0001')" class="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors">
            K1-Student (STD-K1-0001)
          </button>
          <button @click="readCard('STF-ANNA-01')" class="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors">
            Teacher (STF-ANNA-01)
          </button>
          <button @click="readCard('VIS-001')" class="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors">
            Visitor (VIS-001)
          </button>
        </div>
      </template>

      <!-- CONFIRM STATE -->
      <template v-else-if="screen === 'confirm'">
        <div class="w-full max-w-md space-y-5">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-white">ยืนยันการเข้าใช้บริการ</h2>
          </div>

          <div class="p-5 rounded-2xl bg-slate-800 border border-slate-700 space-y-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-dulwich/20 flex items-center justify-center flex-shrink-0">
                <svg class="w-8 h-8 text-dulwich-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p class="text-xl font-bold text-white">{{ cardData?.name }}</p>
                <p class="text-slate-400 text-sm">{{ cardData?.role }} {{ cardData?.group ? `| ${cardData.group}` : '' }}</p>
              </div>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-700">
              <span class="text-slate-400">ยอดเงินในบัตร</span>
              <span class="text-green-400 font-bold text-xl">฿{{ cardData?.walletBalance?.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">ค่าบริการ Buffet</span>
              <span class="text-white font-bold text-xl">฿{{ cardData?.buffetPrice ?? '100.00' }}</span>
            </div>
          </div>

          <button
            @click="checkIn"
            class="w-full h-16 rounded-2xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-xl font-black transition-all shadow-lg shadow-green-900/30"
          >
            CHECK-IN ยืนยัน
          </button>
          <button @click="reset" class="w-full h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors">
            ยกเลิก
          </button>
        </div>
      </template>

      <!-- SUCCESS STATE -->
      <template v-else-if="screen === 'success'">
        <div class="w-full max-w-md space-y-5 text-center">
          <div class="w-24 h-24 rounded-full bg-green-600/20 flex items-center justify-center mx-auto">
            <svg class="w-14 h-14 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 class="text-3xl font-black text-green-400">เข้าได้</h2>
          <p class="text-xl font-bold text-white">{{ cardData?.name }}</p>
          <div class="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-400">ราคา Buffet</span>
              <span class="text-white font-bold">฿{{ cardData?.buffetPrice ?? '100.00' }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-400">ยอดเงินคงเหลือ</span>
              <span class="text-green-400 font-bold">฿{{ cardData?.walletBalance?.toFixed(2) ?? '—' }}</span>
            </div>
          </div>
          <button @click="reset" class="w-full h-14 rounded-2xl bg-dulwich hover:bg-dulwich-600 text-white font-bold text-lg transition-colors">
            เช็คอินรายการถัดไป
          </button>
        </div>
      </template>

      <!-- ALREADY CHECKED IN -->
      <template v-else-if="screen === 'already'">
        <div class="w-full max-w-md space-y-5 text-center">
          <div class="w-24 h-24 rounded-full bg-orange-600/20 flex items-center justify-center mx-auto">
            <svg class="w-14 h-14 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 class="text-2xl font-black text-orange-400">เข้าใช้แล้ว ✓</h2>
          <p class="text-slate-400">บัตรนี้ได้เช็คอินสำหรับรอบนี้แล้ว</p>
          <button @click="reset" class="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg transition-colors">
            กลับ
          </button>
        </div>
      </template>

      <!-- ERROR STATE -->
      <template v-else-if="screen === 'error'">
        <div class="w-full max-w-md space-y-5 text-center">
          <div class="w-24 h-24 rounded-full bg-red-600/20 flex items-center justify-center mx-auto">
            <svg class="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-2xl font-black text-red-400">เกิดข้อผิดพลาด</h2>
          <p class="text-slate-300">{{ errorMsg }}</p>
          <button @click="reset" class="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg transition-colors">
            ลองใหม่
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
