<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white safe-top border-b border-gray-100 sticky top-0 z-10">
      <div class="page-header">
        <button class="back-btn" @click="$router.back()">
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-bold text-gray-800">ประวัติธุรกรรม</h1>
      </div>

      <!-- Filter tabs -->
      <div class="px-4 pb-3">
        <div class="flex gap-2 overflow-x-auto scroll-smooth-ios" style="scrollbar-width: none">
          <button
            v-for="f in filters"
            :key="f.value"
            class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
            :class="
              activeFilter === f.value
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-white border-gray-200 text-gray-600 active:bg-gray-50'
            "
            @click="setFilter(f.value)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
    </header>

    <!-- Body -->
    <main ref="scrollContainer" class="flex-1 overflow-y-auto scroll-smooth-ios pb-8 px-4 pt-4" @scroll="onScroll">
      <!-- Loading (initial) -->
      <div v-if="walletStore.loading && walletStore.transactions.length === 0" class="space-y-3">
        <div v-for="i in 6" :key="i" class="bg-white rounded-2xl p-4 animate-pulse flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-gray-100 flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-100 rounded w-2/3" />
            <div class="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div class="h-5 w-20 bg-gray-100 rounded" />
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredTransactions.length === 0 && !walletStore.loading"
        class="text-center py-16 text-gray-400"
      >
        <p class="text-5xl mb-3">📭</p>
        <p class="font-medium">ไม่พบธุรกรรม</p>
        <p class="text-sm mt-1">ยังไม่มีรายการในหมวด "{{ activeFilterLabel }}"</p>
      </div>

      <!-- Transaction list -->
      <div v-else class="space-y-2">
        <!-- Group by date -->
        <template v-for="group in groupedTransactions" :key="group.date">
          <div class="text-xs font-semibold text-gray-400 px-1 pt-3 pb-1">{{ group.dateLabel }}</div>

          <div
            v-for="tx in group.items"
            :key="tx._id"
            class="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
          >
            <!-- Icon -->
            <div
              class="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              :class="txBg(tx.type)"
            >
              {{ txIcon(tx.type) }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-800 text-sm truncate">
                {{ tx.description || txLabel(tx.type) }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ formatTime(tx.createdAt) }}
                <span
                  v-if="tx.status !== 'completed'"
                  class="ml-1 px-1.5 py-0.5 rounded text-xs"
                  :class="tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'"
                >
                  {{ tx.status === 'pending' ? 'รอดำเนินการ' : 'ล้มเหลว' }}
                </span>
              </p>
            </div>

            <!-- Amount -->
            <div class="text-right flex-shrink-0">
              <p
                class="font-semibold text-sm"
                :class="isCredit(tx.type) ? 'text-green-600' : 'text-red-500'"
              >
                {{ isCredit(tx.type) ? '+' : '-' }}฿{{ Math.abs(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}
              </p>
              <p class="text-xs text-gray-400">฿{{ tx.balanceAfter?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}</p>
            </div>
          </div>
        </template>

        <!-- Load more indicator -->
        <div v-if="walletStore.loading" class="py-4 text-center">
          <svg class="animate-spin h-6 w-6 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <!-- End of list -->
        <div
          v-else-if="!walletStore.hasMore && filteredTransactions.length > 0"
          class="text-center text-xs text-gray-400 py-4"
        >
          แสดงทั้งหมด {{ filteredTransactions.length }} รายการ
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore, type Transaction } from '@/stores/wallet'

const auth = useAuthStore()
const walletStore = useWalletStore()

const scrollContainer = ref<HTMLElement | null>(null)

const filters = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'topup', label: '💰 เติมเงิน' },
  { value: 'purchase', label: '🍱 ซื้ออาหาร' },
  { value: 'buffet', label: '🍽️ บุฟเฟต์' },
  { value: 'refund', label: '↩️ คืนเงิน' },
]

const activeFilter = ref('all')

const activeFilterLabel = computed(() => filters.find((f) => f.value === activeFilter.value)?.label ?? '')

const filteredTransactions = computed(() => {
  if (activeFilter.value === 'all') return walletStore.transactions
  return walletStore.transactions.filter((t) => t.type === activeFilter.value)
})

const groupedTransactions = computed(() => {
  const groups: Record<string, { date: string; dateLabel: string; items: Transaction[] }> = {}

  for (const tx of filteredTransactions.value) {
    const d = new Date(tx.createdAt)
    const key = d.toISOString().split('T')[0]
    if (!groups[key]) {
      groups[key] = {
        date: key,
        dateLabel: d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        items: [],
      }
    }
    groups[key].items.push(tx)
  }

  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
})

function txIcon(type: string) {
  const m: Record<string, string> = {
    topup: '💰',
    purchase: '🍱',
    refund: '↩️',
    buffet: '🍽️',
  }
  return m[type] ?? '💸'
}

function txLabel(type: string) {
  const m: Record<string, string> = {
    topup: 'เติมเงิน',
    purchase: 'ซื้ออาหาร',
    refund: 'คืนเงิน',
    buffet: 'บุฟเฟต์',
  }
  return m[type] ?? type
}

function txBg(type: string) {
  const m: Record<string, string> = {
    topup: 'bg-green-50',
    purchase: 'bg-orange-50',
    refund: 'bg-blue-50',
    buffet: 'bg-purple-50',
  }
  return m[type] ?? 'bg-gray-50'
}

function isCredit(type: string) {
  return type === 'topup' || type === 'refund'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

async function setFilter(f: string) {
  activeFilter.value = f
}

async function loadMore() {
  const child = auth.selectedChild
  if (!child) return
  const userId = child.walletId ?? child._id
  await walletStore.fetchTransactions(userId, false)
}

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  const threshold = 100
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
    if (!walletStore.loading && walletStore.hasMore) {
      loadMore()
    }
  }
}

onMounted(async () => {
  const child = auth.selectedChild
  if (!child) return
  const userId = child.walletId ?? child._id
  await walletStore.fetchTransactions(userId, true)
})
</script>
