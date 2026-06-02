<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

const user = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

const displayName = computed(() =>
  user.value?.nameTh || user.value?.name || 'ผู้ใช้'
)

const isLowBalance = computed(() =>
  (wallet.value?.balance ?? 0) < 100
)

const formattedBalance = computed(() => {
  const bal = wallet.value?.balance ?? 0
  return bal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

const roleLabel = computed(() => {
  const role = user.value?.role
  if (role === 'student') return 'นักเรียน'
  if (role === 'teacher') return 'ครู'
  if (role === 'staff') return 'เจ้าหน้าที่'
  return ''
})

const gradeLabel = computed(() => {
  const u = user.value
  if (!u?.grade) return ''
  return u.class ? `${u.grade} – ${u.class}` : u.grade
})

function logout() {
  store.clearSession()
  router.push('/')
}

const menuItems = [
  {
    icon: '📋',
    label: 'ดูประวัติ',
    sublabel: 'Transaction History',
    to: '/balance',
    color: 'bg-white/15 hover:bg-white/25',
  },
  {
    icon: '💳',
    label: 'เติมเงิน QR',
    sublabel: 'Top-up via QR',
    to: '/topup',
    color: 'bg-white/15 hover:bg-white/25',
  },
  {
    icon: '😊',
    label: 'ส่งความเห็น',
    sublabel: 'Give Feedback',
    to: '/feedback',
    color: 'bg-white/15 hover:bg-white/25',
  },
]
</script>

<template>
  <div
    class="w-screen h-screen overflow-hidden flex flex-col
           bg-gradient-to-br from-dulwich-800 via-dulwich-700 to-dulwich-900"
  >
    <!-- Top accent bar -->
    <div class="w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 flex-shrink-0" />

    <!-- Header: greeting + user info -->
    <div class="flex items-center justify-between px-10 py-6 flex-shrink-0">
      <div class="flex flex-col">
        <div class="text-white/70 text-kiosk-base font-medium">สวัสดี / Hello</div>
        <div class="text-white font-black text-kiosk-2xl leading-tight">
          {{ displayName }}
        </div>
        <div class="flex items-center gap-3 mt-1">
          <span
            class="px-4 py-1 rounded-full text-kiosk-sm font-bold"
            :class="user?.role === 'student'
              ? 'bg-yellow-400 text-dulwich-900'
              : 'bg-green-400 text-green-900'"
          >
            {{ roleLabel }}
          </span>
          <span v-if="gradeLabel" class="text-white/70 text-kiosk-sm font-medium">
            {{ gradeLabel }}
          </span>
        </div>
      </div>

      <!-- Dulwich logo small -->
      <div
        class="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl
               border-4 border-yellow-400"
      >
        <div class="text-center">
          <div class="text-dulwich-700 font-black text-sm leading-tight tracking-wide">DULWICH</div>
        </div>
      </div>
    </div>

    <!-- Wallet balance card -->
    <div class="px-10 flex-shrink-0">
      <div
        class="rounded-kiosk p-8 flex items-center justify-between shadow-2xl border-2
               transition-colors"
        :class="isLowBalance
          ? 'bg-red-500/20 border-red-400/50'
          : 'bg-white/10 border-white/20'"
      >
        <div>
          <div class="text-white/70 text-kiosk-base font-medium">ยอดเงินคงเหลือ / Balance</div>
          <div
            class="font-black tabular-nums leading-none mt-1"
            :class="isLowBalance ? 'text-red-300' : 'text-white'"
            style="font-size: 5rem; line-height: 1;"
          >
            ฿{{ formattedBalance }}
          </div>
          <div
            v-if="isLowBalance"
            class="text-red-300 text-kiosk-base font-bold mt-2"
          >
            ⚠ ยอดเงินใกล้หมด — กรุณาเติมเงิน
          </div>
        </div>

        <!-- Quick topup arrow indicator -->
        <div class="text-white/30 text-kiosk-3xl">›</div>
      </div>
    </div>

    <!-- Main menu: 2x2 grid + logout -->
    <div class="flex-1 px-10 py-6 flex flex-col gap-6 min-h-0">
      <div class="grid grid-cols-2 gap-5 flex-1">
        <button
          v-for="item in menuItems"
          :key="item.to"
          class="rounded-kiosk border-2 border-white/20 flex flex-col items-center
                 justify-center gap-3 transition-all duration-150 active:scale-95 shadow-lg"
          :class="item.color"
          @click="router.push(item.to)"
        >
          <span style="font-size: 3.5rem; line-height: 1;">{{ item.icon }}</span>
          <div class="text-white font-bold text-kiosk-lg text-center">{{ item.label }}</div>
          <div class="text-white/60 text-kiosk-sm text-center">{{ item.sublabel }}</div>
        </button>

        <!-- Logout button (last cell) -->
        <button
          class="rounded-kiosk border-2 border-red-400/50 bg-red-500/20 flex flex-col
                 items-center justify-center gap-3 transition-all duration-150
                 active:scale-95 hover:bg-red-500/30 shadow-lg"
          @click="logout"
        >
          <span style="font-size: 3.5rem; line-height: 1;">🚪</span>
          <div class="text-red-300 font-bold text-kiosk-lg text-center">ออกจากระบบ</div>
          <div class="text-red-300/70 text-kiosk-sm text-center">Sign Out</div>
        </button>
      </div>
    </div>

    <!-- Auto logout bar -->
    <AutoLogout />
  </div>
</template>
