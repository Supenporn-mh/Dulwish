<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePosStore } from '@/stores/pos'
import type { MenuItem } from '@/stores/pos'
import VoidDialog from '@/components/VoidDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const pos = usePosStore()

// UI state
const showVoidDialog = ref(false)
const showReceipt = ref(false)
const activeCategory = ref('all')
const uidInput = ref('')
const cardLoading = ref(false)
const cardError = ref('')
const payError = ref('')
const apiStatus = ref<'online' | 'offline' | 'checking'>('checking')
const lastReceipt = ref<any>(null)

// Tenders: always starts with 1 wallet row
interface TenderRow {
  method: 'wallet' | 'cash'
  amount: number
}
const tenders = ref<TenderRow[]>([{ method: 'wallet', amount: 0 }])

// Sync first tender amount to cart total automatically
watch(
  () => pos.cartTotal,
  (total) => {
    if (tenders.value.length === 1 && tenders.value[0].method === 'wallet') {
      tenders.value[0].amount = total
    }
  }
)

// Categories derived from menu
const categories = computed(() => {
  const cats = new Set(pos.menuItems.map((m) => m.category))
  const labels: Record<string, string> = {
    rice: 'ข้าว',
    noodle: 'ก๋วยเตี๋ยว',
    salad: 'สลัด',
    drink: 'เครื่องดื่ม',
    snack: 'ของทานเล่น',
    western: 'อาหารตะวัน',
  }
  return [
    { key: 'all', label: 'ทั้งหมด' },
    ...[...cats].map((c) => ({ key: c, label: labels[c] ?? c })),
  ]
})

const filteredMenu = computed(() => {
  const items = pos.menuItems.filter((m) => m.available)
  if (activeCategory.value === 'all') return items
  return items.filter((m) => m.category === activeCategory.value)
})

const cashTotal = computed(() =>
  tenders.value.filter((t) => t.method === 'cash').reduce((s, t) => s + t.amount, 0)
)

const walletTotal = computed(() =>
  tenders.value.filter((t) => t.method === 'wallet').reduce((s, t) => s + t.amount, 0)
)

const tenderedTotal = computed(() => tenders.value.reduce((s, t) => s + t.amount, 0))
const changeAmount = computed(() => Math.max(0, cashTotal.value - (pos.cartTotal - walletTotal.value)))
const canPay = computed(() =>
  pos.cart.length > 0 &&
  pos.currentCard &&
  tenderedTotal.value >= pos.cartTotal
)

// Check API status
async function checkApi() {
  apiStatus.value = 'checking'
  try {
    const { default: api } = await import('@/api/axios')
    await api.get('/health')
    apiStatus.value = 'online'
  } catch {
    apiStatus.value = 'offline'
  }
}

async function handleReadCard() {
  const uid = uidInput.value.trim()
  if (!uid) return
  cardError.value = ''
  cardLoading.value = true
  try {
    await pos.readCard(uid)
    uidInput.value = ''
  } catch (e: any) {
    cardError.value = e.response?.data?.message || 'ไม่พบบัตรนี้ในระบบ'
    pos.currentCard = null
  } finally {
    cardLoading.value = false
  }
}

function demoTap(uid: string) {
  uidInput.value = uid
  handleReadCard()
}

function addSplitCash() {
  tenders.value.push({ method: 'cash', amount: 0 })
}

function removeTender(idx: number) {
  if (tenders.value.length <= 1) return
  tenders.value.splice(idx, 1)
}

async function handlePay() {
  if (!canPay.value) return
  payError.value = ''
  try {
    const result = await pos.submitSale(tenders.value)
    lastReceipt.value = result
    showReceipt.value = true
    pos.clearCart()
    tenders.value = [{ method: 'wallet', amount: 0 }]
  } catch (e: any) {
    payError.value = e.response?.data?.message || 'ชำระเงินไม่สำเร็จ กรุณาลองใหม่'
  }
}

function closeReceipt() {
  showReceipt.value = false
  lastReceipt.value = null
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(async () => {
  await pos.fetchMenu(pos.selectedShop.id)
  await checkApi()
})

watch(() => pos.selectedShop, async (shop) => {
  pos.clearCart()
  await pos.fetchMenu(shop.id)
})
</script>

<template>
  <div class="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden" style="min-width:1280px; min-height:800px;">
    <!-- Top nav bar -->
    <header class="flex-shrink-0 h-12 bg-dulwich flex items-center px-4 gap-4 shadow-lg z-10">
      <span class="font-bold text-white text-sm tracking-wide">UPOS POS</span>
      <div class="h-6 w-px bg-white/20"></div>
      <!-- Shop tabs -->
      <div class="flex gap-1">
        <button
          v-for="shop in pos.shops"
          :key="shop.id"
          @click="pos.selectedShop = shop"
          :class="[
            'px-4 py-1 rounded-md text-sm font-semibold transition-all',
            pos.selectedShop.id === shop.id
              ? 'bg-white text-dulwich'
              : 'text-white/80 hover:bg-white/10'
          ]"
        >
          {{ shop.name }}
        </button>
      </div>
      <div class="flex-1"></div>
      <!-- Nav links -->
      <nav class="flex gap-1">
        <router-link to="/buffet" class="px-3 py-1 rounded-md text-white/80 hover:bg-white/10 text-sm transition-colors">Buffet</router-link>
        <router-link to="/preorders" class="px-3 py-1 rounded-md text-white/80 hover:bg-white/10 text-sm transition-colors">Pre-orders</router-link>
        <router-link to="/topup" class="px-3 py-1 rounded-md text-white/80 hover:bg-white/10 text-sm transition-colors">Top-up</router-link>
      </nav>
      <div class="h-6 w-px bg-white/20"></div>
      <button @click="handleLogout" class="px-3 py-1 rounded-md text-white/70 hover:bg-white/10 text-sm transition-colors">ออกจากระบบ</button>
    </header>

    <!-- Main body: LEFT + RIGHT -->
    <div class="flex flex-1 overflow-hidden">
      <!-- LEFT PANEL: 60% -->
      <div class="flex flex-col w-[60%] overflow-hidden border-r border-slate-800">
        <!-- Category filter -->
        <div class="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800 overflow-x-auto scrollbar-thin">
          <button
            v-for="cat in categories"
            :key="cat.key"
            @click="activeCategory = cat.key"
            :class="[
              'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[38px]',
              activeCategory === cat.key
                ? 'bg-dulwich text-white shadow-md shadow-dulwich/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            ]"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Menu grid -->
        <div class="flex-1 overflow-y-auto scrollbar-thin p-4">
          <div v-if="pos.isLoadingMenu" class="flex items-center justify-center h-full text-slate-500">
            <svg class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <div v-else class="grid grid-cols-3 gap-3">
            <button
              v-for="item in filteredMenu"
              :key="item.id"
              @click="pos.addItem(item)"
              class="group relative flex flex-col items-start p-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-dulwich/50 transition-all text-left min-h-[80px] touch-target"
            >
              <span class="font-semibold text-white text-sm leading-tight">{{ item.name }}</span>
              <span v-if="item.nameEn" class="text-xs text-slate-400 mt-0.5">{{ item.nameEn }}</span>
              <span class="mt-2 text-dulwich-300 font-bold text-lg">฿{{ item.price }}</span>
              <!-- Cart badge -->
              <span
                v-if="pos.cart.find(c => c.menuItemId === item.id)"
                class="absolute top-2 right-2 w-6 h-6 rounded-full bg-dulwich text-white text-xs font-bold flex items-center justify-center"
              >
                {{ pos.cart.find(c => c.menuItemId === item.id)?.qty }}
              </span>
            </button>
          </div>
          <div v-if="!pos.isLoadingMenu && filteredMenu.length === 0" class="flex items-center justify-center h-40 text-slate-600 text-sm">
            ไม่มีสินค้าในหมวดนี้
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: 40% -->
      <div class="flex flex-col w-[40%] overflow-hidden">
        <!-- Cart header + customer info -->
        <div class="flex-shrink-0 px-4 pt-4 pb-3 bg-slate-900 border-b border-slate-800">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-bold text-white text-base">รายการสั่งซื้อ</h2>
            <button
              v-if="pos.cart.length > 0"
              @click="pos.clearCart()"
              class="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
            >
              ล้างทั้งหมด
            </button>
          </div>

          <!-- Customer info -->
          <div
            v-if="pos.currentCard"
            class="flex items-center gap-3 p-3 rounded-xl bg-dulwich/10 border border-dulwich/30"
          >
            <div class="w-9 h-9 rounded-full bg-dulwich/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-dulwich-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-white text-sm truncate">{{ pos.currentCard.name }}</p>
              <p class="text-xs text-slate-400">{{ pos.currentCard.role }} {{ pos.currentCard.group ? `| ${pos.currentCard.group}` : '' }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-400">ยอดเงิน</p>
              <p class="font-bold text-green-400 text-sm">฿{{ pos.currentCard.walletBalance.toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <!-- Cart items -->
        <div class="flex-1 overflow-y-auto scrollbar-thin px-4 py-2">
          <div v-if="pos.cart.length === 0" class="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
            <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p class="text-sm">ยังไม่มีสินค้าในตะกร้า</p>
          </div>

          <div v-else class="space-y-2 py-1">
            <div
              v-for="item in pos.cart"
              :key="item.menuItemId"
              class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700"
            >
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-white text-sm truncate">{{ item.name }}</p>
                <p class="text-xs text-slate-400">฿{{ item.price }} / ชิ้น</p>
              </div>
              <!-- Qty controls -->
              <div class="flex items-center gap-1">
                <button
                  @click="pos.changeQty(item.menuItemId, -1)"
                  class="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors"
                >-</button>
                <span class="w-8 text-center font-bold text-white text-sm">{{ item.qty }}</span>
                <button
                  @click="pos.changeQty(item.menuItemId, 1)"
                  class="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors"
                >+</button>
              </div>
              <span class="font-bold text-white text-sm w-16 text-right">฿{{ item.price * item.qty }}</span>
              <button
                @click="pos.removeItem(item.menuItemId)"
                class="w-7 h-7 rounded-lg hover:bg-red-900/50 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Total + Payment section -->
        <div class="flex-shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-3">
          <!-- Total -->
          <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium">รวมทั้งสิ้น</span>
            <span class="text-3xl font-black text-white">฿{{ pos.cartTotal.toFixed(2) }}</span>
          </div>

          <!-- Divider -->
          <div class="h-px bg-slate-800"></div>

          <!-- Card tap / UID section -->
          <div>
            <p class="text-xs font-semibold text-slate-400 mb-2">แตะบัตร / UID</p>
            <div class="flex gap-2">
              <input
                v-model="uidInput"
                type="text"
                placeholder="ใส่ UID หรือแตะบัตร"
                class="flex-1 h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/20 transition-all"
                @keydown.enter="handleReadCard"
              />
              <button
                @click="handleReadCard"
                :disabled="cardLoading"
                class="px-4 h-11 rounded-xl bg-dulwich hover:bg-dulwich-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <span v-if="cardLoading">...</span>
                <span v-else>อ่าน</span>
              </button>
            </div>
            <!-- Demo buttons -->
            <div class="flex gap-2 mt-2">
              <button
                @click="demoTap('STD-K1-0001')"
                class="flex-1 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700"
              >
                DEMO: STD-K1-0001
              </button>
              <button
                @click="demoTap('STF-ANNA-01')"
                class="flex-1 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700"
              >
                DEMO: Teacher
              </button>
            </div>
            <p v-if="cardError" class="text-xs text-red-400 mt-1">{{ cardError }}</p>
          </div>

          <!-- Tender rows -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-slate-400">วิธีชำระเงิน</p>
            <div v-for="(tender, idx) in tenders" :key="idx" class="flex items-center gap-2">
              <select
                v-model="tender.method"
                class="h-10 px-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-dulwich"
              >
                <option value="wallet">Card Wallet</option>
                <option value="cash">เงินสด</option>
              </select>
              <input
                v-model.number="tender.amount"
                type="number"
                min="0"
                class="flex-1 h-10 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-dulwich text-right font-bold"
              />
              <button
                v-if="tenders.length > 1"
                @click="removeTender(idx)"
                class="w-8 h-8 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors flex items-center justify-center"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              @click="addSplitCash"
              class="w-full h-9 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 text-xs font-semibold transition-colors"
            >
              + Split Payment (เพิ่มเงินสด)
            </button>

            <!-- Change calculation -->
            <div v-if="cashTotal > 0 && changeAmount >= 0" class="flex justify-between items-center text-sm">
              <span class="text-slate-400">เงินทอน</span>
              <span class="font-bold text-green-400 text-lg">฿{{ changeAmount.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Pay error -->
          <p v-if="payError" class="text-xs text-red-400">{{ payError }}</p>
        </div>
      </div>
    </div>

    <!-- BOTTOM BAR -->
    <footer class="flex-shrink-0 h-14 bg-slate-900 border-t border-slate-800 flex items-center px-4 gap-4 z-10">
      <!-- Status -->
      <div class="flex items-center gap-4 text-sm text-slate-400 flex-1">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-green-400"></span>
          Cashier: {{ auth.user?.name ?? '-' }}
        </span>
        <span>|</span>
        <span>Shift: Active</span>
        <span>|</span>
        <span class="flex items-center gap-1.5">
          <span
            :class="[
              'w-2 h-2 rounded-full',
              apiStatus === 'online' ? 'bg-green-400' : apiStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
            ]"
          ></span>
          API: {{ apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking...' }}
        </span>
        <span>|</span>
        <span>{{ pos.selectedShop.name }}</span>
        <span v-if="pos.cart.length > 0" class="text-dulwich-300 font-semibold">| {{ pos.cartCount }} items</span>
      </div>

      <!-- Void button -->
      <button
        @click="showVoidDialog = true"
        class="px-5 h-10 rounded-xl bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-bold text-sm transition-colors"
      >
        VOID
      </button>

      <!-- PAY button -->
      <button
        @click="handlePay"
        :disabled="!canPay || pos.isProcessing"
        :class="[
          'px-8 h-10 rounded-xl font-black text-sm transition-all flex items-center gap-2',
          canPay && !pos.isProcessing
            ? 'bg-green-600 hover:bg-green-500 active:bg-green-700 text-white shadow-lg shadow-green-900/30'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        ]"
      >
        <svg v-if="pos.isProcessing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        {{ pos.isProcessing ? 'กำลังชำระ...' : 'PAY ฿' + pos.cartTotal.toFixed(2) }}
      </button>
    </footer>

    <!-- Void Dialog -->
    <VoidDialog v-if="showVoidDialog" @close="showVoidDialog = false" @voided="showVoidDialog = false" />

    <!-- Receipt Modal -->
    <div v-if="showReceipt" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeReceipt"></div>
      <div class="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <!-- Receipt header -->
        <div class="bg-green-900/30 border-b border-slate-800 px-6 py-4 text-center">
          <div class="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-2">
            <svg class="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-white">ชำระเงินสำเร็จ</h3>
          <p class="text-slate-400 text-xs mt-1">{{ lastReceipt?.refNo ?? 'POS-' + Date.now() }}</p>
        </div>

        <!-- Receipt body -->
        <div class="px-6 py-4 space-y-3">
          <div v-if="lastReceipt?.items" class="space-y-1">
            <div v-for="item in lastReceipt.items" :key="item.menuItemId ?? item.name" class="flex justify-between text-sm text-slate-300">
              <span>{{ item.name }} x{{ item.qty }}</span>
              <span>฿{{ (item.unitPrice ?? item.price) * item.qty }}</span>
            </div>
          </div>
          <div class="h-px bg-slate-800"></div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">รวม</span>
            <span class="font-black text-white text-xl">฿{{ lastReceipt?.total?.toFixed(2) ?? pos.cartTotal.toFixed(2) }}</span>
          </div>
          <div v-if="changeAmount > 0" class="flex justify-between items-center">
            <span class="text-slate-400">เงินทอน</span>
            <span class="font-bold text-green-400">฿{{ changeAmount.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Receipt actions -->
        <div class="px-6 pb-5 flex gap-3">
          <button
            class="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
            @click="closeReceipt"
          >
            ปิด
          </button>
          <button
            class="flex-1 h-11 rounded-xl bg-dulwich hover:bg-dulwich-600 text-white font-bold text-sm transition-colors"
            @click="() => { window.print(); closeReceipt() }"
          >
            พิมพ์ใบเสร็จ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
