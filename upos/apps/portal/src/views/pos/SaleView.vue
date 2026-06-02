<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import UserProfileCard from '@/components/UserProfileCard.vue'

// --- Types ---
interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  emoji?: string
}

interface CartItem extends MenuItem {
  qty: number
}

interface Customer {
  userId: string
  name:   string
  balance: number
  role?:  string
}

interface Txn {
  id: string
  refNo: string
  time: string
  items: CartItem[]
  total: number
}

// --- Demo data ---
const DEMO_ITEMS: MenuItem[] = [
  { id: 1,  name: 'Latte',         price: 65,  category: 'เครื่องดื่ม', emoji: '☕' },
  { id: 2,  name: 'Espresso',      price: 55,  category: 'เครื่องดื่ม', emoji: '☕' },
  { id: 3,  name: 'Cappuccino',    price: 65,  category: 'เครื่องดื่ม', emoji: '☕' },
  { id: 4,  name: 'Green Tea',     price: 50,  category: 'เครื่องดื่ม', emoji: '🍵' },
  { id: 5,  name: 'Ham Sandwich',  price: 85,  category: 'อาหาร',       emoji: '🥪' },
  { id: 6,  name: 'Club Sandwich', price: 95,  category: 'อาหาร',       emoji: '🥪' },
  { id: 7,  name: 'Croissant',     price: 55,  category: 'เบเกอรี่',    emoji: '🥐' },
  { id: 8,  name: 'Muffin',        price: 45,  category: 'เบเกอรี่',    emoji: '🧁' },
]

const DEMO_CUSTOMERS = [
  { uid: 'STD-K1-0001', userId: 'u001', name: 'น้องมาย (K1)',   balance: 320 },
  { uid: 'STF-ANNA-01', userId: 'u002', name: 'ครู Anna',        balance: 1500 },
  { uid: 'VIS-001',     userId: 'u003', name: 'Visitor / Guest', balance: 200 },
]

// Supervisor flag (demo: always true so VOID is visible)
const isSupervisor = ref(true)

// --- State ---
const menuItems      = ref<MenuItem[]>([])
const activeCategory = ref('ทั้งหมด')
const cart           = ref<CartItem[]>([])
const cardUid        = ref('')
const customer       = ref<Customer | null>(null)
const loadingCard    = ref(false)
const loadingPay     = ref(false)
const errorMsg       = ref('')

const showReceipt = ref(false)
const lastTxn     = ref<Txn | null>(null)
const recentTxns  = ref<Txn[]>([])

// --- Computed ---
const categories = computed(() => ['ทั้งหมด', ...new Set(menuItems.value.map(m => m.category))])

const filteredMenu = computed(() =>
  activeCategory.value === 'ทั้งหมด'
    ? menuItems.value
    : menuItems.value.filter(m => m.category === activeCategory.value)
)

const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0))
const cartCount = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))

const canPay = computed(() => {
  if (cart.value.length === 0) return false
  const wallet = customer.value?.balance ?? 0
  return wallet >= cartTotal.value
})

// --- Menu load ---
onMounted(async () => {
  try {
    const res = await fetch('/api/menu', { signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error()
    menuItems.value = await res.json()
  } catch {
    menuItems.value = DEMO_ITEMS
  }
})

// --- Cart ---
function addToCart(item: MenuItem) {
  const existing = cart.value.find(c => c.id === item.id)
  if (existing) existing.qty++
  else cart.value.push({ ...item, qty: 1 })
}

function changeQty(item: CartItem, delta: number) {
  item.qty += delta
  if (item.qty <= 0) removeFromCart(item)
}

function removeFromCart(item: CartItem) {
  cart.value = cart.value.filter(c => c.id !== item.id)
}

function clearCart() { cart.value = [] }

function cartQty(itemId: number) {
  return cart.value.find(c => c.id === itemId)?.qty ?? 0
}

// --- Card read ---
async function readCard(uid?: string) {
  const targetUid = uid ?? cardUid.value.trim()
  if (!targetUid) return
  cardUid.value = targetUid
  loadingCard.value = true
  errorMsg.value = ''
  customer.value = null
  try {
    const res = await fetch('/api/pos/card-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_uid: targetUid }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error((await res.json()).message ?? 'ไม่พบข้อมูลบัตร')
    const data = await res.json()
    customer.value = { userId: data.userId, name: data.name, balance: data.balance, role: data.student?.role ?? data.role ?? 'student' }
  } catch {
    const demo = DEMO_CUSTOMERS.find(d => d.uid === targetUid)
    if (demo) customer.value = { userId: demo.userId, name: demo.name, balance: demo.balance }
    else errorMsg.value = 'ไม่สามารถอ่านบัตรได้'
  } finally {
    loadingCard.value = false
  }
}

// --- Pay ---
async function pay() {
  if (!canPay.value) return
  loadingPay.value = true
  errorMsg.value = ''
  const total = cartTotal.value

  const payload = {
    items: cart.value.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
    tenders: [{ type: 'wallet', amount: total, userId: customer.value?.userId }],
    total,
  }

  try {
    const res = await fetch('/api/pos/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error((await res.json()).message ?? 'การชำระเงินล้มเหลว')
    const data = await res.json()
    lastTxn.value = {
      id: data.id,
      refNo: data.refNo ?? `REF-${Date.now()}`,
      time: data.time ?? new Date().toLocaleString('th-TH'),
      items: [...cart.value],
      total,
    }
    if (customer.value) customer.value.balance = data.newBalance ?? (customer.value.balance - total)
    recentTxns.value.unshift(lastTxn.value)
    clearCart()
    cardUid.value = ''
    customer.value = null
    showReceipt.value = true
  } catch (e: unknown) {
    // Demo fallback
    lastTxn.value = {
      id: `demo-${Date.now()}`,
      refNo: `REF-${Date.now()}`,
      time: new Date().toLocaleString('th-TH'),
      items: [...cart.value],
      total,
    }
    recentTxns.value.unshift(lastTxn.value)
    clearCart()
    cardUid.value = ''
    customer.value = null
    showReceipt.value = true
  } finally {
    loadingPay.value = false
  }
}

function fmtPrice(n: number) {
  return `฿${n.toLocaleString()}`
}
</script>

<template>
  <div class="flex h-[calc(100vh-96px)] overflow-hidden">

    <!-- ===== LEFT: Menu ===== -->
    <section class="flex-1 bg-[#F2F2F7] flex flex-col overflow-hidden">

      <!-- Category pills -->
      <div class="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto shrink-0 scrollbar-none">
        <button
          v-for="cat in categories"
          :key="cat"
          class="px-4 py-[6px] rounded-full text-[15px] font-medium whitespace-nowrap transition-all active:scale-95"
          :class="activeCategory === cat
            ? 'bg-[#1264E3] text-white shadow-sm'
            : 'bg-white text-[#3C3C43] shadow-sm hover:bg-[#E8E8ED]'"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Menu grid -->
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        <div class="grid grid-cols-3 gap-3 mt-1">
          <button
            v-for="item in filteredMenu"
            :key="item.id"
            class="ios-card p-4 cursor-pointer active:scale-[0.97] transition-transform text-left relative"
            @click="addToCart(item)"
          >
            <!-- Cart badge -->
            <div
              v-if="cartQty(item.id) > 0"
              class="absolute top-2 right-2 w-5 h-5 bg-[#1264E3] text-white rounded-full text-[11px] font-bold flex items-center justify-center"
            >
              {{ cartQty(item.id) }}
            </div>
            <div class="text-[32px] text-center mb-2">{{ item.emoji ?? '🍽' }}</div>
            <div class="text-[15px] font-semibold text-[#000000] leading-snug mb-1">{{ item.name }}</div>
            <div class="text-[17px] font-bold text-[#1264E3]">{{ fmtPrice(item.price) }}</div>
          </button>
        </div>
      </div>
    </section>

    <!-- ===== RIGHT: Cart + Payment ===== -->
    <section class="w-[360px] bg-white border-l border-[#C6C6C8]/30 flex flex-col">

      <!-- Cart header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#C6C6C8]/30 shrink-0">
        <span class="text-[17px] font-semibold text-[#000000]">ตะกร้า</span>
        <span
          v-if="cartCount > 0"
          class="bg-[#1264E3] text-white text-[12px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center"
        >
          {{ cartCount }}
        </span>
      </div>

      <!-- Cart items -->
      <div class="flex-1 overflow-y-auto">
        <div
          v-if="cart.length === 0"
          class="flex items-center justify-center h-full text-[#AEAEB2] text-[15px]"
        >
          ยังไม่มีสินค้า
        </div>
        <div
          v-for="item in cart"
          :key="item.id"
          class="flex items-center gap-3 px-4 py-3 border-b border-[#C6C6C8]/30"
        >
          <div class="flex-1 min-w-0">
            <div class="text-[15px] font-medium text-[#000000] truncate">{{ item.name }}</div>
            <div class="text-[13px] text-[#6E6E73]">{{ fmtPrice(item.price) }}</div>
          </div>
          <!-- Qty stepper -->
          <div class="flex items-center gap-1">
            <button
              class="w-8 h-8 bg-[#F2F2F7] rounded-[8px] text-[#1264E3] font-bold text-[18px] flex items-center justify-center active:opacity-60 transition-opacity"
              @click="changeQty(item, -1)"
            >
              −
            </button>
            <span class="w-6 text-center text-[15px] font-semibold text-[#000000]">{{ item.qty }}</span>
            <button
              class="w-8 h-8 bg-[#F2F2F7] rounded-[8px] text-[#1264E3] font-bold text-[18px] flex items-center justify-center active:opacity-60 transition-opacity"
              @click="changeQty(item, 1)"
            >
              +
            </button>
          </div>
          <div class="text-[15px] font-semibold text-[#000000] w-14 text-right">
            {{ fmtPrice(item.price * item.qty) }}
          </div>
          <button
            class="text-[#FF3B30] text-[20px] leading-none active:opacity-50 transition-opacity ml-1"
            @click="removeFromCart(item)"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Card tap section -->
      <div class="px-4 py-3 border-t border-[#C6C6C8]/30 bg-[#F2F2F7] shrink-0">
        <div class="text-[13px] text-[#6E6E73] mb-2">แตะบัตรลูกค้า</div>
        <div class="flex gap-2 mb-2">
          <input
            v-model="cardUid"
            type="text"
            placeholder="UID บัตร..."
            class="ios-input flex-1 text-[15px]"
            @keydown.enter="readCard()"
          />
          <button
            class="ios-btn-secondary px-4 py-0 text-[15px] h-[44px] rounded-[10px]"
            :disabled="loadingCard"
            @click="readCard()"
          >
            {{ loadingCard ? '...' : 'อ่าน' }}
          </button>
        </div>
        <!-- Demo chips -->
        <div class="flex gap-2">
          <button
            v-for="d in [{ uid: 'STD-K1-0001', label: 'K1' }, { uid: 'STF-ANNA-01', label: 'ครู Anna' }, { uid: 'VIS-001', label: 'Visitor' }]"
            :key="d.uid"
            class="rounded-full bg-white text-[13px] px-3 py-1 text-[#3C3C43] shadow-sm border border-[#C6C6C8]/40 active:opacity-60 transition-opacity"
            @click="readCard(d.uid)"
          >
            {{ d.label }}
          </button>
        </div>
        <!-- Customer profile card after tap -->
        <div v-if="customer" class="mt-3">
          <UserProfileCard
            :name="customer.name"
            :uid="cardUid"
            :role="customer.role ?? 'student'"
            :balance="customer.balance"
            :updated-at="new Date()"
            :compact="true"
          />
        </div>
        <!-- Error -->
        <div v-if="errorMsg" class="mt-2 text-[#FF3B30] text-[13px]">{{ errorMsg }}</div>
      </div>

      <!-- Total + Pay -->
      <div class="px-4 py-3 border-t border-[#C6C6C8]/30 shrink-0">
        <div class="flex items-baseline justify-between mb-3">
          <span class="text-[17px] text-[#3C3C43] font-medium">ยอดรวม</span>
          <span class="text-[28px] font-black text-[#1264E3]">{{ fmtPrice(cartTotal) }}</span>
        </div>
        <button
          class="ios-btn-primary w-full text-[17px] mb-2"
          :disabled="!canPay || loadingPay"
          :class="(!canPay || loadingPay) ? 'opacity-40 cursor-not-allowed' : ''"
          @click="pay"
        >
          {{ loadingPay ? 'กำลังประมวล...' : 'ชำระเงิน' }}
        </button>
        <button
          v-if="isSupervisor"
          class="ios-btn-danger w-full text-[15px]"
          @click="() => {}"
        >
          VOID
        </button>
      </div>

    </section>

    <!-- ===== Receipt modal (bottom sheet) ===== -->
    <Teleport to="body">
      <Transition name="sheet">
        <div
          v-if="showReceipt && lastTxn"
          class="fixed inset-0 z-50 flex items-end justify-center"
          style="background: rgba(0,0,0,0.4)"
          @click.self="showReceipt = false"
        >
          <div class="bg-white w-full max-w-[480px] rounded-t-[24px] shadow-2xl pb-8">
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2">
              <div class="w-10 h-1 bg-[#C6C6C8] rounded-full" />
            </div>
            <!-- Header -->
            <div class="flex items-center justify-between px-5 pb-4 border-b border-[#C6C6C8]/30">
              <span class="text-[17px] font-semibold text-[#000000]">ใบเสร็จ</span>
              <button
                class="w-8 h-8 bg-[#F2F2F7] rounded-full flex items-center justify-center text-[#6E6E73] text-[18px] active:opacity-60"
                @click="showReceipt = false"
              >
                ✕
              </button>
            </div>
            <!-- Success icon -->
            <div class="text-center pt-5 pb-3">
              <div class="text-[48px] mb-1">✅</div>
              <div class="text-[17px] font-semibold text-[#000000]">ชำระเงินสำเร็จ</div>
              <div class="text-[13px] text-[#6E6E73]">{{ lastTxn.refNo }}</div>
            </div>
            <!-- Items -->
            <div class="px-5 border-t border-dashed border-[#C6C6C8]/50 pt-3 space-y-1.5">
              <div
                v-for="item in lastTxn.items"
                :key="item.id"
                class="flex justify-between text-[15px]"
              >
                <span class="text-[#3C3C43]">{{ item.name }} ×{{ item.qty }}</span>
                <span class="text-[#000000]">{{ fmtPrice(item.price * item.qty) }}</span>
              </div>
            </div>
            <!-- Total -->
            <div class="flex justify-between px-5 pt-3 border-t border-[#C6C6C8]/30 mt-3">
              <span class="text-[17px] font-semibold">รวม</span>
              <span class="text-[17px] font-bold text-[#1264E3]">{{ fmtPrice(lastTxn.total) }}</span>
            </div>
            <div class="text-center text-[12px] text-[#AEAEB2] mt-1">{{ lastTxn.time }}</div>
            <!-- Actions -->
            <div class="flex gap-3 px-5 mt-4">
              <button
                class="ios-btn-secondary flex-1 text-[17px]"
                @click="() => window.print()"
              >
                พิมพ์
              </button>
              <button
                class="ios-btn-primary flex-1 text-[17px]"
                @click="showReceipt = false"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .bg-white,
.sheet-leave-active .bg-white {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
