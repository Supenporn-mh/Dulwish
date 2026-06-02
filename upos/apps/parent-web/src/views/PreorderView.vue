<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white safe-top border-b border-gray-100">
      <div class="page-header">
        <button class="back-btn" @click="$router.back()">
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-bold text-gray-800">สั่งอาหารล่วงหน้า</h1>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 overflow-y-auto scroll-smooth-ios pb-32">
      <!-- Date Selector (horizontal scroll) -->
      <div class="bg-white border-b border-gray-100 px-4 py-3">
        <div class="flex gap-2 overflow-x-auto scroll-smooth-ios pb-1 -mx-1 px-1" style="scrollbar-width: none">
          <button
            v-for="d in dateRange"
            :key="d.iso"
            class="flex-shrink-0 flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl border-2 transition-colors min-w-[60px]"
            :class="
              selectedDate === d.iso
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-100 bg-gray-50 text-gray-600 active:bg-gray-100'
            "
            @click="selectDate(d.iso)"
          >
            <span class="text-xs font-medium">{{ d.dayName }}</span>
            <span class="text-lg font-bold leading-none">{{ d.day }}</span>
            <span class="text-xs">{{ d.month }}</span>
          </button>
        </div>
      </div>

      <!-- Meal Period Tabs -->
      <div class="bg-white border-b border-gray-100 px-4">
        <div class="flex">
          <button
            v-for="p in periods"
            :key="p.value"
            class="flex-1 py-3 text-sm font-semibold border-b-2 transition-colors"
            :class="
              mealPeriod === p.value
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-500 active:text-gray-700'
            "
            @click="selectPeriod(p.value)"
          >
            {{ p.emoji }} {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Menu section -->
      <div class="px-4 py-4">
        <!-- Loading -->
        <div v-if="ordersStore.loading" class="grid grid-cols-2 gap-3">
          <div v-for="i in 4" :key="i" class="bg-white rounded-3xl overflow-hidden animate-pulse">
            <div class="aspect-square bg-gray-100" />
            <div class="p-3 space-y-2">
              <div class="h-4 bg-gray-100 rounded w-3/4" />
              <div class="h-3 bg-gray-100 rounded w-1/2" />
              <div class="h-8 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-else-if="ordersStore.error" class="text-center py-10 text-gray-400">
          <p class="text-4xl mb-3">😕</p>
          <p class="text-sm">{{ ordersStore.error }}</p>
          <button class="mt-3 text-primary-500 font-medium text-sm" @click="loadMenu">ลองอีกครั้ง</button>
        </div>

        <!-- Empty -->
        <div v-else-if="ordersStore.menu.length === 0" class="text-center py-10 text-gray-400">
          <p class="text-4xl mb-3">🍽️</p>
          <p class="text-sm">ไม่มีเมนูสำหรับวันและมื้อที่เลือก</p>
        </div>

        <!-- Menu grid -->
        <div v-else class="grid grid-cols-2 gap-3">
          <div
            v-for="item in ordersStore.menu"
            :key="item._id"
            class="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
          >
            <!-- Image / placeholder -->
            <div class="aspect-square bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center relative overflow-hidden">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.name"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-5xl">🍱</span>

              <!-- Sold out overlay -->
              <div
                v-if="!item.isAvailable || item.quotaUsed >= item.quota"
                class="absolute inset-0 bg-black/50 flex items-center justify-center"
              >
                <span class="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">หมด</span>
              </div>
            </div>

            <div class="p-3 flex flex-col flex-1">
              <p class="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{{ item.name }}</p>
              <p class="text-xs text-gray-400 mt-0.5">เหลือ {{ Math.max(0, item.quota - item.quotaUsed) }} ชิ้น</p>

              <div class="mt-auto pt-2 flex items-center justify-between gap-2">
                <span class="font-bold text-primary-500 text-base">฿{{ item.price }}</span>

                <!-- Cart controls -->
                <div v-if="getCartQty(item._id) > 0" class="flex items-center gap-1.5">
                  <button
                    class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 font-bold text-gray-700"
                    @click="ordersStore.removeFromCart(item._id)"
                  >-</button>
                  <span class="text-sm font-bold w-4 text-center">{{ getCartQty(item._id) }}</span>
                  <button
                    class="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center active:bg-primary-700 font-bold text-white"
                    :disabled="!item.isAvailable || item.quotaUsed >= item.quota"
                    @click="ordersStore.addToCart(item)"
                  >+</button>
                </div>

                <button
                  v-else
                  class="px-3 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-semibold active:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="!item.isAvailable || item.quotaUsed >= item.quota"
                  @click="ordersStore.addToCart(item)"
                >
                  เพิ่ม
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Sticky Cart Bar -->
    <Transition name="slide-up">
      <div
        v-if="ordersStore.cart.length > 0"
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-4 safe-bottom shadow-2xl z-20"
      >
        <button class="btn-primary flex items-center justify-between px-5" @click="openConfirm">
          <div class="flex items-center gap-2">
            <span class="bg-white/30 rounded-lg px-2 py-0.5 text-sm font-bold">{{ ordersStore.cartCount() }}</span>
            <span>ดำเนินการชำระ</span>
          </div>
          <span class="font-bold">฿{{ ordersStore.cartTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}</span>
        </button>
      </div>
    </Transition>

    <!-- Confirm Modal -->
    <Transition name="modal">
      <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50" @click.self="showConfirm = false">
        <div class="bg-white w-full max-w-[430px] rounded-t-3xl p-6 space-y-4">
          <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />
          <h2 class="text-xl font-bold text-gray-800">สรุปคำสั่งซื้อ</h2>

          <div class="bg-gray-50 rounded-2xl p-4 space-y-1">
            <div class="flex justify-between text-sm text-gray-600">
              <span>วันที่</span>
              <span class="font-medium">{{ selectedDateDisplay }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
              <span>มื้อ</span>
              <span class="font-medium">{{ periodLabel }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
              <span>สำหรับ</span>
              <span class="font-medium">{{ auth.selectedChild?.name }}</span>
            </div>
          </div>

          <!-- Items -->
          <div class="space-y-2">
            <div v-for="item in ordersStore.cart" :key="item.menuItem._id" class="flex justify-between items-center text-sm">
              <span class="text-gray-700">{{ item.menuItem.name }} x{{ item.quantity }}</span>
              <span class="font-medium">฿{{ (item.menuItem.price * item.quantity).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>

          <div class="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span class="font-semibold text-gray-800">ยอดรวม</span>
            <span class="font-bold text-xl text-primary-500">฿{{ ordersStore.cartTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}</span>
          </div>

          <!-- Balance after -->
          <div class="bg-blue-50 rounded-2xl px-4 py-3 flex justify-between text-sm">
            <span class="text-gray-600">ยอดคงเหลือหลังสั่ง</span>
            <span
              class="font-bold"
              :class="balanceAfter < 0 ? 'text-red-500' : 'text-primary-500'"
            >
              ฿{{ formatAmount(balanceAfter) }}
            </span>
          </div>

          <div v-if="balanceAfter < 0" class="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
            ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อน
          </div>

          <div v-if="orderError" class="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
            {{ orderError }}
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button class="btn-secondary" @click="showConfirm = false">ยกเลิก</button>
            <button
              class="btn-primary"
              :disabled="balanceAfter < 0 || ordersStore.loading"
              @click="submitOrder"
            >
              <span v-if="ordersStore.loading">กำลังสั่ง...</span>
              <span v-else>ยืนยัน</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Success Toast -->
    <Transition name="slide-up">
      <div
        v-if="successMsg"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl z-50 font-medium text-sm"
      >
        {{ successMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useOrdersStore } from '@/stores/orders'

const auth = useAuthStore()
const walletStore = useWalletStore()
const ordersStore = useOrdersStore()

const showConfirm = ref(false)
const orderError = ref('')
const successMsg = ref('')

// Generate next 7 days
const dateRange = computed(() => {
  const days: Array<{ iso: string; day: string; dayName: string; month: string }> = []
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  for (let i = 1; i <= 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push({
      iso: d.toISOString().split('T')[0],
      day: String(d.getDate()),
      dayName: dayNames[d.getDay()],
      month: monthNames[d.getMonth()],
    })
  }
  return days
})

const selectedDate = ref(dateRange.value[0]?.iso ?? '')

const periods = [
  { value: 'breakfast' as const, label: 'เช้า', emoji: '🌅' },
  { value: 'lunch' as const, label: 'กลางวัน', emoji: '☀️' },
  { value: 'dinner' as const, label: 'เย็น', emoji: '🌙' },
]
const mealPeriod = ref<'breakfast' | 'lunch' | 'dinner'>('lunch')

const selectedDateDisplay = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value)
  return d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const periodLabel = computed(() => periods.find((p) => p.value === mealPeriod.value)?.label ?? '')

const balanceAfter = computed(
  () => (walletStore.wallet?.balance ?? 0) - ordersStore.cartTotal(),
)

function formatAmount(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getCartQty(itemId: string) {
  return ordersStore.cart.find((c) => c.menuItem._id === itemId)?.quantity ?? 0
}

function selectDate(iso: string) {
  selectedDate.value = iso
  ordersStore.clearCart()
}

function selectPeriod(p: 'breakfast' | 'lunch' | 'dinner') {
  mealPeriod.value = p
  ordersStore.clearCart()
}

function openConfirm() {
  orderError.value = ''
  showConfirm.value = true
}

async function submitOrder() {
  const child = auth.selectedChild
  if (!child) return

  orderError.value = ''

  try {
    await ordersStore.createOrder({
      studentId: child._id,
      schoolId: child.schoolId,
      items: ordersStore.cart.map((c) => ({
        menuItemId: c.menuItem._id,
        quantity: c.quantity,
      })),
      totalAmount: ordersStore.cartTotal(),
      orderDate: selectedDate.value,
      mealPeriod: mealPeriod.value,
    })

    showConfirm.value = false
    successMsg.value = 'สั่งอาหารสำเร็จ!'

    // Refresh wallet
    const userId = child.walletId ?? child._id
    walletStore.fetchWallet(userId)

    setTimeout(() => {
      successMsg.value = ''
    }, 3000)
  } catch (e: any) {
    orderError.value = e?.response?.data?.message ?? 'สั่งอาหารไม่สำเร็จ กรุณาลองใหม่'
  }
}

async function loadMenu() {
  const child = auth.selectedChild
  if (!child) return
  await ordersStore.fetchMenu({
    schoolId: child.schoolId,
    date: selectedDate.value,
    mealPeriod: mealPeriod.value,
  })
}

watch([selectedDate, mealPeriod], () => {
  loadMenu()
})

onMounted(() => {
  loadMenu()
  const child = auth.selectedChild
  if (child) {
    const userId = child.walletId ?? child._id
    walletStore.fetchWallet(userId)
  }
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
