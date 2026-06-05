<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Side Drawer Overlay -->
    <Transition name="fade">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-40 bg-black/40"
        @click="drawerOpen = false"
      />
    </Transition>

    <!-- Side Drawer -->
    <Transition name="slide-left">
      <aside
        v-if="drawerOpen"
        class="fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col"
        style="max-width: 80vw"
      >
        <div class="bg-primary-500 px-6 py-8 safe-top">
          <div class="flex items-center gap-3 mb-1">
            <div
              class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg"
            >
              {{ userInitial }}
            </div>
            <div>
              <p class="text-white font-semibold text-base leading-tight">{{ auth.user?.name }}</p>
              <p class="text-blue-200 text-xs">{{ auth.user?.email }}</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 py-4">
          <DrawerLink icon="🏠" label="หน้าหลัก" to="/dashboard" @click="drawerOpen = false" />
          <DrawerLink icon="💰" label="เติมเงิน" to="/topup" @click="drawerOpen = false" />
          <DrawerLink icon="🍱" label="สั่งอาหารล่วงหน้า" to="/preorder" @click="drawerOpen = false" />
          <DrawerLink icon="📋" label="ประวัติธุรกรรม" to="/history" @click="drawerOpen = false" />
          <DrawerLink icon="⚙️" label="ตั้งค่า" to="/settings" @click="drawerOpen = false" />
        </nav>

        <div class="px-4 py-6 border-t border-gray-100">
          <button
            class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 font-medium active:bg-red-50 transition-colors"
            @click="handleLogout"
          >
            <span class="text-xl">🚪</span>
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </Transition>

    <!-- Top Bar -->
    <header class="bg-primary-500 safe-top shadow-md sticky top-0 z-30">
      <div class="flex items-center justify-between px-4 py-3">
        <button
          class="p-2 -ml-2 rounded-full text-white active:bg-white/20 transition-colors"
          @click="drawerOpen = true"
          aria-label="เมนู"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <span class="text-white font-bold text-sm">U</span>
          </div>
          <span class="text-white font-bold text-lg tracking-wide">UPOS</span>
        </div>

        <button
          class="p-2 -mr-2 rounded-full text-white active:bg-white/20 transition-colors relative"
          aria-label="การแจ้งเตือน"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full" />
        </button>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 px-4 pb-8 pt-5 space-y-5 overflow-y-auto scroll-smooth-ios">
      <!-- Greeting -->
      <div>
        <p class="text-gray-500 text-sm">วันนี้ {{ todayDisplay }}</p>
        <h2 class="text-xl font-bold text-gray-800 mt-0.5">
          สวัสดี คุณ{{ auth.user?.name?.split(' ')[0] ?? '' }} 👋
        </h2>
      </div>

      <!-- Child selector -->
      <div v-if="auth.children.length > 1" class="relative">
        <label class="block text-xs font-medium text-gray-500 mb-1">เลือกบุตรหลาน</label>
        <select
          :value="auth.selectedChildId"
          @change="onChildChange"
          class="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-primary-500 bg-white text-base font-medium appearance-none focus:outline-none"
        >
          <option v-for="child in auth.children" :key="child._id" :value="child._id">
            {{ child.name }} ({{ child.grade }})
          </option>
        </select>
        <div class="pointer-events-none absolute right-4 top-[calc(50%+6px)] -translate-y-1/2 text-gray-400">
          ▾
        </div>
      </div>

      <!-- Single child info -->
      <div v-else-if="auth.selectedChild" class="flex items-center gap-3 bg-blue-50 rounded-2xl px-4 py-3">
        <div class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
          {{ auth.selectedChild.name.charAt(0) }}
        </div>
        <div>
          <p class="font-semibold text-gray-800">{{ auth.selectedChild.name }}</p>
          <p class="text-xs text-gray-500">{{ auth.selectedChild.grade }} · {{ auth.selectedChild.studentId }}</p>
        </div>
      </div>

      <!-- Wallet Card -->
      <div
        class="rounded-3xl p-5 text-white shadow-lg"
        :class="walletLow ? 'bg-red-500' : 'bg-primary-500'"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-sm opacity-80">ยอดเงินคงเหลือ</p>
            <div v-if="walletStore.loading && !walletStore.wallet" class="mt-1">
              <div class="h-10 w-32 bg-white/20 rounded-xl animate-pulse" />
            </div>
            <p v-else class="text-4xl font-bold mt-1 leading-none">
              ฿{{ formatAmount(walletStore.wallet?.balance ?? 0) }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
            💳
          </div>
        </div>

        <div v-if="walletLow" class="text-xs bg-white/20 rounded-xl px-3 py-2 mb-4">
          ⚠️ ยอดเงินต่ำ กรุณาเติมเงินเพื่อสั่งอาหาร
        </div>

        <button
          class="w-full py-3 rounded-2xl bg-white font-semibold text-primary-500 active:bg-gray-100 transition-colors text-base"
          :class="walletLow ? 'text-red-500' : ''"
          @click="$router.push('/topup')"
        >
          + เติมเงิน
        </button>
      </div>

      <!-- Quick Actions -->
      <div>
        <h3 class="text-sm font-semibold text-gray-500 mb-3">เมนูด่วน</h3>
        <div class="grid grid-cols-4 gap-3">
          <QuickAction emoji="🍱" label="สั่งล่วงหน้า" to="/preorder" />
          <QuickAction emoji="📋" label="ประวัติ" to="/history" />
          <QuickAction emoji="🧾" label="ใบเสร็จ" to="/history" />
          <QuickAction emoji="⚙️" label="ตั้งค่า" to="/settings" />
        </div>
      </div>

      <!-- Recent Transactions -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-500">ธุรกรรมล่าสุด</h3>
          <button
            class="text-xs text-primary-500 font-medium"
            @click="$router.push('/history')"
          >
            ดูทั้งหมด
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="walletStore.loading && walletStore.transactions.length === 0" class="space-y-3">
          <div v-for="i in 3" :key="i" class="bg-white rounded-2xl p-4 animate-pulse">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gray-100" />
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-100 rounded w-3/4" />
                <div class="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div class="h-5 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="recentTransactions.length === 0"
          class="card text-center py-8 text-gray-400"
        >
          <p class="text-3xl mb-2">📭</p>
          <p class="text-sm">ยังไม่มีธุรกรรม</p>
        </div>

        <!-- Transaction list -->
        <div v-else class="space-y-2">
          <TransactionRow
            v-for="tx in recentTransactions"
            :key="tx._id"
            :transaction="tx"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore, type Transaction } from '@/stores/wallet'

const router = useRouter()
const auth = useAuthStore()
const walletStore = useWalletStore()

const drawerOpen = ref(false)

const todayDisplay = computed(() => {
  return new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const userInitial = computed(() => auth.user?.name?.charAt(0)?.toUpperCase() ?? 'U')

const walletLow = computed(() => (walletStore.wallet?.balance ?? 0) < 200)

const recentTransactions = computed(() => walletStore.transactions.slice(0, 5))

function formatAmount(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function onChildChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  auth.selectChild(val)
  loadWallet()
}

async function loadWallet() {
  const child = auth.selectedChild
  if (!child) return
  const userId = child._id
  await Promise.all([
    walletStore.fetchWallet(userId),
    walletStore.fetchTransactions(userId, true),
  ])
}

async function handleLogout() {
  drawerOpen.value = false
  await auth.logout()
  router.push('/login')
}

onMounted(() => {
  loadWallet()
})

// ---- Inline child components ----

const DrawerLink = defineComponent({
  props: { icon: String, label: String, to: String },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          class:
            'w-full flex items-center gap-4 px-6 py-4 active:bg-gray-50 transition-colors text-gray-700 font-medium',
          onClick: () => {
            emit('click')
            router.push(props.to as string)
          },
        },
        [
          h('span', { class: 'text-xl w-7 text-center' }, props.icon),
          h('span', { class: 'text-base' }, props.label),
        ],
      )
  },
})

const QuickAction = defineComponent({
  props: { emoji: String, label: String, to: String },
  setup(props) {
    return () =>
      h(
        'button',
        {
          class:
            'flex flex-col items-center gap-2 bg-white rounded-2xl py-4 px-2 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors',
          onClick: () => router.push(props.to as string),
        },
        [
          h('span', { class: 'text-2xl' }, props.emoji),
          h('span', { class: 'text-xs font-medium text-gray-600 text-center leading-tight' }, props.label),
        ],
      )
  },
})

const TransactionRow = defineComponent({
  props: { transaction: Object as () => Transaction },
  setup(props) {
    const txIcons: Record<string, string> = {
      topup: '💰',
      purchase: '🍱',
      refund: '↩️',
      buffet: '🍽️',
    }
    const txLabels: Record<string, string> = {
      topup: 'เติมเงิน',
      purchase: 'ซื้ออาหาร',
      refund: 'คืนเงิน',
      buffet: 'บุฟเฟต์',
    }
    return () => {
      const tx = props.transaction!
      const isCredit = tx.type === 'topup' || tx.type === 'refund'
      const amountStr = `${isCredit ? '+' : '-'}฿${Math.abs(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
      const dateStr = new Date(tx.createdAt).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
      return h('div', { class: 'bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm border border-gray-100' }, [
        h('div', { class: 'w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl flex-shrink-0' }, txIcons[tx.type] ?? '💸'),
        h('div', { class: 'flex-1 min-w-0' }, [
          h('p', { class: 'font-medium text-gray-800 text-sm truncate' }, tx.description || txLabels[tx.type] || tx.type),
          h('p', { class: 'text-xs text-gray-400 mt-0.5' }, dateStr),
        ]),
        h('p', {
          class: `font-semibold text-sm ${isCredit ? 'text-green-600' : 'text-red-500'}`,
        }, amountStr),
      ])
    }
  },
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.28s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
