<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const currentTime = ref('')
const apiStatus = ref<'Online' | 'Offline'>('Online')
const cashierName = ref('แคชเชียร์ 1')

let clockInterval: ReturnType<typeof setInterval>

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function checkApi() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) })
    apiStatus.value = res.ok ? 'Online' : 'Offline'
  } catch {
    apiStatus.value = 'Offline'
  }
}

onMounted(() => {
  updateTime()
  clockInterval = setInterval(updateTime, 1000)
  checkApi()
  setInterval(checkApi, 30_000)
})

onUnmounted(() => clearInterval(clockInterval))

function logout() {
  if (confirm('ออกจากระบบ?')) router.push('/login')
}

const tabs = [
  { label: '🛒 ขายสินค้า', to: '/pos/sale' },
  { label: '🍽 Buffet',    to: '/pos/buffet' },
  { label: '📋 Pre-order', to: '/pos/preorders' },
  { label: '💳 เติมเงิน', to: '/pos/topup' },
]
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden select-none bg-[#F2F2F7]">

    <!-- Top bar -->
    <header class="bg-white border-b border-[#C6C6C8]/30 h-[60px] px-5 flex items-center justify-between shrink-0">
      <!-- Left: brand -->
      <span class="text-[17px] font-bold text-[#1264E3]">UPOS POS</span>

      <!-- Center: tab pills -->
      <nav class="flex items-center gap-1">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="px-4 py-2 rounded-full text-[15px] font-medium transition-all whitespace-nowrap"
          :class="$route.path.startsWith(tab.to)
            ? 'bg-[#1264E3] text-white shadow-sm'
            : 'text-[#6E6E73] hover:bg-[#F2F2F7]'"
        >
          {{ tab.label }}
        </RouterLink>
      </nav>

      <!-- Right: cashier + logout -->
      <div class="flex items-center gap-3">
        <span class="text-[15px] text-[#3C3C43]">{{ cashierName }}</span>
        <button
          class="text-[15px] font-medium text-[#FF3B30] hover:opacity-70 active:opacity-50 transition-opacity"
          @click="logout"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 overflow-hidden">
      <RouterView />
    </main>

    <!-- Bottom status bar -->
    <footer class="bg-[#F2F2F7] border-t border-[#C6C6C8]/30 h-[36px] px-5 flex items-center justify-between shrink-0">
      <span class="text-[12px] text-[#6E6E73]">แคชเชียร์: {{ cashierName }}</span>
      <span class="text-[12px] text-[#6E6E73]">{{ currentTime }}</span>
      <div class="flex items-center gap-1.5">
        <span
          class="inline-block w-[7px] h-[7px] rounded-full"
          :style="{ backgroundColor: apiStatus === 'Online' ? '#34C759' : '#FF3B30' }"
        />
        <span
          class="text-[12px]"
          :style="{ color: apiStatus === 'Online' ? '#34C759' : '#FF3B30' }"
        >
          {{ apiStatus }}
        </span>
      </div>
    </footer>

  </div>
</template>
