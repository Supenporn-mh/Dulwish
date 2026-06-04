<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import { useParentStore } from '@/stores/parent'
import { useLocaleStore } from '@/stores/locale'
import ChildCard from '@/components/ChildCard.vue'
import {
  PhCreditCard, PhForkKnife, PhReceipt, PhBell,
  PhArrowUp, PhShoppingBag,
  PhCaretRight, PhUserPlus, PhCalendarCheck,
} from '@phosphor-icons/vue'
import { useNotificationStore } from '@/stores/notifications'

const router      = useRouter()
const parentStore = useParentStore()
const locale      = useLocaleStore()
const notifStore  = useNotificationStore()

interface Transaction {
  id?: string; _id?: string
  type: 'topup' | 'purchase' | 'buffet'
  description: string
  amount: number
  createdAt: string
}

interface BookingItem { name: string; qty: number; lineTotal: number }
interface Booking {
  id: string; orderNo: string; status: string
  totalAmount: number; items: BookingItem[]
}

const userName     = ref('')
const balance      = ref(0)
const transactions = ref<Transaction[]>([])
const loading      = ref(true)
const apiBookings  = ref<Booking[]>([])  // จาก API

// computed: merge store bookings (real-time) + API bookings
const bookings = computed(() => {
  const d = new Date()
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const storeItems = parentStore.todayBookings.filter(b => b.serveDate === todayLocal)
  const storeIds   = new Set(storeItems.map(b => b.id))
  return [...storeItems, ...apiBookings.value.filter(b => !storeIds.has(b.id))]
})

// ── Carousel ────────────────────────────────────────────────────────────────
const carouselRef    = ref<HTMLElement | null>(null)
const cardWidth      = ref(0)
const currentCardIdx = ref(0)
const isOnAddCard    = computed(() => currentCardIdx.value >= children.value.length)

const selectedChild   = computed(() => parentStore.selectedChild)
const selectedChildId = computed(() => parentStore.selectedChildId)
const children        = computed(() => parentStore.children)

const demoTransactions: Transaction[] = [
  { id: '1', type: 'topup',    description: 'เติมเงินผ่าน PromptPay', amount:  500, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', type: 'purchase', description: 'ซื้อ Ham Sandwich',      amount: -85,  createdAt: new Date(Date.now() - 86400000).toISOString()    },
  { id: '3', type: 'buffet',   description: 'Buffet กลางวัน',         amount: -120, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
]

const LOW_BALANCE_THRESHOLD = 200
const isLowBalance = computed(() => balance.value < LOW_BALANCE_THRESHOLD && balance.value >= 0)

const quickActions = computed(() => [
  { label: locale.t('เติมเงิน', 'Top Up'),        icon: PhCreditCard, color: '#EAF1FD', iconColor: '#1264E3', path: '/parent/topup'    },
  { label: locale.t('จองอาหาร', 'Meal Booking'),  icon: PhForkKnife,  color: '#E0FAF3', iconColor: '#03BA81', path: '/parent/preorder' },
  { label: locale.t('ประวัติ', 'History'),         icon: PhReceipt,    color: '#FFF3E0', iconColor: '#FF9800', path: '/parent/history'  },
  { label: locale.t('แจ้งเตือน', 'Notifications'), icon: PhBell,      color: '#EEEDFE', iconColor: '#3C3489', path: null, isNotif: true },
])

const todayLabel = computed(() => {
  const d = new Date()
  if (locale.lang === 'en') {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

// ── Carousel: scroll → detect active card ──────────────────────────────────
function getCardStep(el: HTMLElement): number {
  const firstCard = el.querySelector('.carousel-card') as HTMLElement | null
  if (firstCard) return firstCard.offsetWidth + 12 // card + gap
  return el.clientWidth - 68 + 12
}

function onCarouselScroll() {
  const el = carouselRef.value
  if (!el) return
  const step = getCardStep(el)
  const idx  = Math.round(el.scrollLeft / step)
  currentCardIdx.value = idx
  if (idx < children.value.length) {
    const child = children.value[idx]
    if (child && child.id !== selectedChildId.value) {
      parentStore.selectChild(child.id)
    }
  }
}

// Scroll carousel to currently selected child
function scrollToChild(id: string) {
  nextTick(() => {
    const el = carouselRef.value
    if (!el) return
    const idx  = children.value.findIndex(c => c.id === id)
    if (idx < 0) return
    const step = getCardStep(el)
    el.scrollTo({ left: idx * step, behavior: 'smooth' })
  })
}

// ── Data fetching ────────────────────────────────────────────────────────────
async function fetchBookings(_childId: string) {
  try {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const res = await api.get(`/orders?from=${today}&to=${today}`)
    apiBookings.value = (res.data?.orders ?? []) as Booking[]
  } catch {
    apiBookings.value = []
  }
  // bookings computed จะ merge store+API อัตโนมัติ
}

async function fetchChildData(childId: string) {
  if (!childId) return
  loading.value = true
  try {
    const [walletRes, txRes] = await Promise.all([
      api.get(`/wallets/${childId}`),
      api.get(`/wallets/${childId}/transactions?limit=5`),
    ])
    balance.value = walletRes.data?.balance ?? 850
    parentStore.updateBalance(childId, balance.value)

    // Push low-balance notification
    if (balance.value < LOW_BALANCE_THRESHOLD) {
      const child = children.value.find(c => c.id === childId)
      const name  = child?.name ?? locale.t('นักเรียน','Student')
      notifStore.add({
        type:    'warning',
        title:   'ยอดเงินคงเหลือต่ำ',
        titleEn: 'Low Balance',
        body:    `${name}: ยอดเงินคงเหลือ ฿${balance.value.toFixed(2)} ต่ำกว่า ฿${LOW_BALANCE_THRESHOLD} กรุณาเติมเงิน`,
        bodyEn:  `${name}: Balance ฿${balance.value.toFixed(2)} is below ฿${LOW_BALANCE_THRESHOLD}. Please top up.`,
        action:  '/parent/topup',
      })
    }

    const txns = txRes.data?.transactions ?? txRes.data ?? []
    transactions.value = txns.map((t: any) => ({
      ...t,
      description: t.description ?? t.note ?? t.type,
    }))
  } catch {
    balance.value = selectedChild.value?.balance ?? 850
    transactions.value = demoTransactions
  } finally {
    loading.value = false
  }
  fetchBookings(childId)
}

watch(selectedChildId, id => { if (id) fetchChildData(id) })

// ── Icons ─────────────────────────────────────────────────────────────────
function txPhIcon(type: Transaction['type']) {
  if (type === 'topup')    return PhArrowUp
  if (type === 'purchase') return PhShoppingBag
  return PhForkKnife
}
function txPhColor(type: Transaction['type']): string {
  if (type === 'topup')    return '#03BA81'
  if (type === 'purchase') return '#FF9800'
  return '#1264E3'
}
function txIconBg(type: Transaction['type']): string {
  if (type === 'topup')    return 'bg-[#E0FAF3]'
  if (type === 'purchase') return 'bg-[#FFF3E0]'
  return 'bg-[#EAF1FD]'
}
function txAmountClass(a: number): string { return a >= 0 ? 'text-[#03BA81]' : 'text-[#FF5252]' }
function formatAmount(a: number): string {
  return `${a >= 0 ? '+' : ''}฿${Math.abs(a).toFixed(2)}`
}
function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) +
         ' · ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// ── Mount ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  // Restore parent name from localStorage
  const raw = localStorage.getItem('upos_user')
  if (raw) {
    try {
      const u = JSON.parse(raw)
      userName.value = [u.firstName, u.lastName].filter(Boolean).join(' ')
    } catch { userName.value = '' }
  }

  // Always fetch children on mount to ensure fresh data
  try {
    const res  = await api.get('/users/me/children')
    const list = (res.data?.children ?? res.data ?? []).map((c: any) => ({
      id:          c.id ?? c._id,
      name:        c.name ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
      studentCode: c.studentCode ?? c.uid ?? '',
      grade:       c.grade ?? c.gradeLevel,
      className:   c.className,
      walletId:    c.walletId,
      balance:     c.balance ?? 0,
    }))
    if (list.length > 0) parentStore.setChildren(list)
    else throw new Error('empty')
  } catch {
    if (children.value.length === 0) {
      parentStore.setChildren([
        { id: 'std001', name: 'สมหญิง ใจดี', studentCode: 'STD-K1-0001', grade: 'K1', className: 'K1-A', balance: 850 },
        { id: 'std002', name: 'สมชาย ใจดี',  studentCode: 'STD-P3-0015', grade: 'P3', className: 'P3-B', balance: 320 },
      ])
    }
  }

  await fetchChildData(parentStore.selectedChildId)
  scrollToChild(parentStore.selectedChildId)
})
</script>

<template>
  <div class="page">

    <!-- Section 1: Greeting -->
    <div class="px-4 pt-4 pb-3">
      <h1 class="text-[22px] font-medium" style="color: var(--color-text-primary)">
        {{ userName || 'ผู้ปกครอง' }}
      </h1>
      <p class="text-[14px] mt-0.5" style="color: var(--color-text-secondary)">{{ todayLabel }}</p>
    </div>

    <!-- Section 2: Child card carousel ──────────────────────────────── -->
    <div class="relative mt-1">
      <!-- Scroll container -->
      <div
        ref="carouselRef"
        class="carousel-track"
        @scroll.passive="onCarouselScroll"
      >
        <!-- left spacer guarantees visible margin regardless of browser padding behavior -->
        <div class="carousel-left-spacer" aria-hidden="true" />
        <ChildCard
          v-for="child in children"
          :key="child.id"
          class="carousel-card"
          :name="child.name"
          :student-code="child.studentCode"
          role="student"
          :balance="child.id === selectedChildId ? balance : child.balance"
          :grade="child.grade"
          :class-name="child.className"
          :updated-at="new Date()"
        />
        <!-- Add-student last card -->
        <button class="carousel-card add-card" @click="router.push('/parent/add-student')">
          <div class="add-card-inner">
            <div class="add-icon-ring">
              <PhUserPlus :size="26" weight="bold" color="white" />
            </div>
            <span class="add-card-label">เพิ่มนักเรียน</span>
          </div>
        </button>

        <!-- spacer so last card can snap -->
        <div class="carousel-spacer" />
      </div>

      <!-- Dot indicators -->
      <div v-if="children.length >= 1" class="flex justify-center gap-1.5 mt-1 pb-2">
        <div
          v-for="(c, i) in children"
          :key="c.id"
          class="rounded-full transition-all"
          :style="!isOnAddCard && c.id === selectedChildId
            ? 'width:20px; height:6px; background: var(--color-primary)'
            : 'width:6px;  height:6px; background: var(--color-border-secondary)'"
        />
        <!-- dot for add card -->
        <div
          class="rounded-full transition-all"
          :style="isOnAddCard
            ? 'width:20px; height:6px; background: var(--color-primary)'
            : 'width:6px;  height:6px; background: var(--color-border-secondary)'"
        />
      </div>
    </div>

    <!-- Section 3: Quick actions ────────────────────────────────────── -->
    <p class="ios-section-header">การดำเนินการ</p>
    <div class="px-4">
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="action in quickActions"
          :key="action.label"
          @click="action.isNotif ? notifStore.showSheet = true : action.path ? router.push(action.path) : undefined"
          class="card flex items-center gap-3 px-4 py-[14px] active:opacity-70 transition-opacity"
          style="cursor: pointer; text-align: left; border: none;"
        >
          <div class="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
               :style="{ background: action.color }">
            <component :is="action.icon" :size="20" weight="fill" :color="action.iconColor" />
          </div>
          <span class="text-[15px] font-medium flex-1 text-left" style="color: var(--color-text-primary)">
            {{ action.label }}
          </span>
          <PhCaretRight :size="14" weight="bold" style="color: var(--color-border-secondary); flex-shrink:0" />
        </button>
      </div>
    </div>

    <!-- Section 4b: Today's Booking ─────────────────────────────────── -->
    <div class="px-4 mt-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[13px] font-medium uppercase tracking-wide" style="color: var(--color-text-secondary)">
          {{ locale.t('การจองวันนี้', "Today's Booking") }}
        </p>
        <button
          @click="router.push('/parent/preorder')"
          class="text-[13px] font-medium"
          style="color: var(--color-primary); background: none; border: none; cursor: pointer;"
        >{{ locale.t('จองเพิ่ม', 'Book More') }}</button>
      </div>

      <!-- Booking cards -->
      <div v-if="bookings.length > 0" class="card overflow-hidden">
        <div
          v-for="(bk, bi) in bookings"
          :key="bk.id"
          :style="bi > 0 ? 'border-top: 0.5px solid var(--color-border-tertiary)' : ''"
        >
          <!-- Order header -->
          <div class="flex items-center justify-between px-4 pt-3 pb-1">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full flex items-center justify-center"
                   style="background: #EAF1FD">
                <PhCalendarCheck :size="15" weight="fill" style="color: var(--color-primary)" />
              </div>
              <div>
                <span class="text-[14px] font-medium" style="color: var(--color-text-primary)">
                  {{ (bk as any).sessionTh ? locale.t((bk as any).sessionTh, (bk as any).sessionEn) : bk.orderNo }}
                </span>
                <span v-if="(bk as any).sessionTh" class="text-[11px] ml-1" style="color: var(--color-text-tertiary)">
                  {{ bk.orderNo }}
                </span>
              </div>
            </div>
            <span class="booking-status">
              {{ locale.t('ยืนยันแล้ว', 'Confirmed') }}
            </span>
          </div>
          <!-- Items -->
          <div
            v-for="(item, ii) in bk.items"
            :key="ii"
            class="flex items-center justify-between px-4 py-1.5"
          >
            <span class="text-[14px]" style="color: var(--color-text-primary)">
              {{ item.name }}
              <span class="text-[12px]" style="color: var(--color-text-tertiary)"> ×{{ item.qty }}</span>
            </span>
            <span class="text-[13px] font-medium" style="color: var(--color-text-secondary)">
              ฿{{ item.lineTotal }}
            </span>
          </div>
          <!-- Total -->
          <div class="flex justify-between px-4 pt-1 pb-3">
            <span class="text-[13px]" style="color: var(--color-text-tertiary)">
              {{ locale.t('รวม', 'Total') }}
            </span>
            <span class="text-[14px] font-medium" style="color: var(--color-primary)">
              ฿{{ bk.totalAmount }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="card flex items-center gap-3 px-4 py-4">
        <PhCalendarCheck :size="28" weight="thin" style="color: var(--color-text-tertiary)" />
        <p class="text-[13px]" style="color: var(--color-text-tertiary)">
          {{ locale.t('ยังไม่มีการจองวันนี้', 'No bookings for today') }}
        </p>
      </div>
    </div>

    <!-- Section 5: Recent transactions ──────────────────────────────── -->
    <div class="flex items-center justify-between px-4 pt-5 pb-2">
      <p class="text-[13px] font-medium uppercase tracking-wide" style="color: var(--color-text-secondary)">
        {{ locale.t('รายการล่าสุด', 'Recent Transactions') }}
      </p>
      <button
        @click="router.push('/parent/history')"
        class="text-[14px] font-medium"
        style="color: var(--color-primary); background: none; border: none; cursor: pointer;"
      >ดูทั้งหมด</button>
    </div>

    <div class="px-4 pb-8">
      <!-- Skeleton -->
      <div v-if="loading" class="card overflow-hidden">
        <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-4 py-[13px]"
             :style="i > 1 ? 'border-top: 0.5px solid var(--color-border-tertiary)' : ''">
          <div class="w-9 h-9 rounded-full animate-pulse" style="background: var(--color-border-tertiary)" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 rounded animate-pulse w-3/4" style="background: var(--color-border-tertiary)" />
            <div class="h-3 rounded animate-pulse w-1/2" style="background: var(--color-border-tertiary)" />
          </div>
        </div>
      </div>

      <!-- Transaction list -->
      <div v-else-if="transactions.length > 0" class="card overflow-hidden">
        <div
          v-for="(tx, i) in transactions.slice(0,5)"
          :key="tx.id ?? tx._id ?? i"
          class="flex items-center gap-3 px-4 py-[13px]"
          :style="i > 0 ? 'border-top: 0.5px solid var(--color-border-tertiary)' : ''"
        >
          <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
               :class="txIconBg(tx.type)">
            <component :is="txPhIcon(tx.type)" :size="18" weight="fill" :color="txPhColor(tx.type)" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[15px] truncate font-medium" style="color: var(--color-text-primary)">
              {{ tx.description }}
            </p>
            <p class="text-[12px] mt-0.5" style="color: var(--color-text-secondary)">
              {{ formatDate(tx.createdAt) }}
            </p>
          </div>
          <span :class="['text-[15px] font-medium flex-shrink-0', txAmountClass(tx.amount)]">
            {{ formatAmount(tx.amount) }}
          </span>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="card flex flex-col items-center py-10" style="color: var(--color-text-tertiary)">
        <PhReceipt :size="40" weight="thin" />
        <p class="text-[14px] mt-2">ยังไม่มีรายการ</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Horizontal scroll carousel */
.carousel-track {
  display: flex;
  gap: 12px;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  scroll-padding-left: 16px;  /* snap offset for 2nd+ cards */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 8px 0 4px;         /* no horizontal padding — spacer handles it */
}
.carousel-track::-webkit-scrollbar { display: none; }

/* left spacer: reliable cross-browser left margin */
.carousel-left-spacer {
  flex: 0 0 16px;
  scroll-snap-align: none;
  pointer-events: none;
}

.carousel-card {
  flex: 0 0 calc(100% - 68px); /* leaves ~40px peek for next card */
  scroll-snap-align: start;
  cursor: default;
}

.carousel-spacer {
  flex: 0 0 16px;  /* right spacer matches left */
  scroll-snap-align: none;
}

/* Add-student card */
.add-card {
  border: 2px dashed rgba(18,100,227,0.35);
  border-radius: 16px;
  background: rgba(18,100,227,0.06);
  min-height: 148px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s;
}
.add-card:active { opacity: 0.6; }
.add-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.add-icon-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-card-label {
  font-size: 14px;      /* body-md */
  font-weight: 500;
  color: var(--color-primary);
}
.booking-status {
  font-size: 12px;      /* label */
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
  background: #E0FAF3;
  color: #028A60;
}

</style>
