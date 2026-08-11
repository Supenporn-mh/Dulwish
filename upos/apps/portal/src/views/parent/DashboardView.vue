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
  PhCaretRight, PhUserPlus, PhCalendarCheck, PhWarning,
} from '@phosphor-icons/vue'
import { useNotificationStore } from '@/stores/notifications'

const router      = useRouter()
const parentStore = useParentStore()
const locale      = useLocaleStore()
const notifStore  = useNotificationStore()

interface Transaction {
  id?: string; _id?: string
  type: 'topup' | 'purchase' | 'buffet' | 'refund'
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
let fetchSeq       = 0  // cancel stale wallet fetches

// computed: merge store bookings (real-time) + API bookings (already deduped in fetchBookings)
const bookings = computed(() => {
  const d = new Date()
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const childId    = selectedChildId.value
  // Only show store bookings that belong to the currently selected child
  const storeItems = parentStore.todayBookings.filter(
    b => b.serveDate === todayLocal && b.childId === childId
  )
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

const LOW_BALANCE_THRESHOLD = 200
const isLowBalance = computed(() => balance.value < LOW_BALANCE_THRESHOLD && balance.value >= 0)

const quickActions = computed(() => [
  { label: locale.t('เติมเงิน', 'Top Up'),        icon: PhCreditCard, color: '#EAF1FD', iconColor: '#1264E3', path: '/parent/topup'    },
  { label: locale.t('จองอาหาร', 'Meal Booking'),  icon: PhForkKnife,  color: '#E0FAF3', iconColor: '#03BA81', path: '/parent/preorder' },
  { label: locale.t('ประวัติ', 'History'),         icon: PhReceipt,    color: '#FFF3E0', iconColor: '#FF9800', path: '/parent/history'  },
  { label: locale.t('แจ้งเตือน', 'Notifications'), icon: PhBell,      color: '#EEEDFE', iconColor: '#3C3489', path: null, isNotif: true },
])

const BOOKING_STATUS_LABEL: Record<string, { th: string; en: string }> = {
  confirmed:       { th: 'ยืนยันแล้ว',  en: 'Confirmed' },
  cancelled:       { th: 'ยกเลิกแล้ว',  en: 'Cancelled' },
  redeemed:        { th: 'รับแล้ว',     en: 'Redeemed' },
  expired:         { th: 'หมดเวลา',     en: 'Expired' },
  pending_payment: { th: 'รอชำระเงิน',  en: 'Pending Payment' },
}
function bookingStatusLabel(status: string): string {
  const entry = BOOKING_STATUS_LABEL[status] ?? BOOKING_STATUS_LABEL.confirmed
  return locale.lang === 'th' ? entry.th : entry.en
}
function bookingStatusClass(status: string): string {
  if (status === 'cancelled') return 'booking-status--cancelled'
  if (status === 'expired')   return 'booking-status--cancelled'
  return ''
}

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
const CODE_TO_TH: Record<string, string> = { BREAKFAST: 'เช้า', LUNCH: 'กลางวัน', DINNER: 'เย็น' }
const CODE_TO_EN: Record<string, string> = { BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner' }

async function fetchBookings(childId: string) {
  try {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const res = await api.get(`/orders?from=${today}&to=${today}&student=${childId}`)
    const seenSessions = new Set<string>()
    apiBookings.value = (res.data?.orders ?? [])
      .filter((o: any) => o.status !== 'cancelled')
      .map((o: any) => ({
        ...o,
        id: o.id ?? o._id,
        sessionTh: CODE_TO_TH[o.mealPeriodCode] ?? o.mealPeriodName,
        sessionEn: CODE_TO_EN[o.mealPeriodCode] ?? o.mealPeriodName,
      }))
      .filter((o: any) => {
        const key = o.mealPeriodCode || o.sessionTh
        if (!key || seenSessions.has(key)) return false
        seenSessions.add(key)
        return true
      })
  } catch {
    apiBookings.value = []
  }
}

async function fetchChildData(childId: string) {
  if (!childId) return
  const mySeq = ++fetchSeq  // mark this fetch; discard if a newer one arrives first
  loading.value = true
  try {
    const [walletRes, txRes] = await Promise.all([
      api.get(`/wallets/${childId}`),
      api.get(`/wallets/${childId}/transactions?limit=5`),
    ])
    if (mySeq !== fetchSeq) return  // stale — a newer fetchChildData has started
    balance.value = walletRes.data?.wallet?.balance ?? walletRes.data?.balance ?? 0
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
    if (mySeq !== fetchSeq) return
    balance.value = selectedChild.value?.balance ?? 0
    transactions.value = []
  } finally {
    if (mySeq === fetchSeq) loading.value = false
  }
  fetchBookings(childId)
}

watch(selectedChildId, id => { if (id) fetchChildData(id) })

// ── Icons ─────────────────────────────────────────────────────────────────
function txPhIcon(type: Transaction['type']) {
  if (type === 'topup')    return PhArrowUp
  if (type === 'purchase') return PhShoppingBag
  if (type === 'refund')   return PhArrowUp
  return PhForkKnife
}
function txPhColor(type: Transaction['type']): string {
  if (type === 'topup')    return '#03BA81'
  if (type === 'purchase') return '#FF9800'
  if (type === 'refund')   return '#03BA81'
  return '#1264E3'
}
function txIconBg(type: Transaction['type']): string {
  if (type === 'topup')    return 'bg-[#E0FAF3]'
  if (type === 'purchase') return 'bg-[#FFF3E0]'
  if (type === 'refund')   return 'bg-[#E0FAF3]'
  return 'bg-[#EAF1FD]'
}
function txAmountClass(a: number): string { return a >= 0 ? 'text-[#03BA81]' : 'text-[#FF5252]' }
const TX_LABEL: Record<Transaction['type'], { th: string; en: string }> = {
  topup:   { th: 'เติมเงิน',  en: 'Top Up' },
  purchase:{ th: 'ชำระเงิน', en: 'Paid'   },
  buffet:  { th: 'บุฟเฟต์',  en: 'Buffet' },
  refund:  { th: 'คืนเงิน',  en: 'Refund' },
}
function txDisplayLabel(tx: Transaction): string {
  if (!tx.description || tx.description === tx.type) {
    const entry = TX_LABEL[tx.type]
    return entry ? (locale.lang === 'th' ? entry.th : entry.en) : tx.description
  }
  return tx.description
}
function formatAmount(a: number): string {
  return `${a >= 0 ? '+' : ''}฿${Math.abs(a).toFixed(2)}`
}
function formatDate(iso: string): string {
  const d = new Date(iso)
  const loc = locale.lang === 'th' ? 'th-TH' : 'en-GB'
  return d.toLocaleDateString(loc, { day: '2-digit', month: 'short' }) +
         ' · ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
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
      walletId:    c.wallet?._id ?? c.walletId,
      balance:     c.wallet?.balance ?? c.balance ?? 0,
      foodAllergy: c.foodAllergy ?? c.studentProfile?.foodAllergy ?? '',
    }))
    if (list.length > 0) parentStore.setChildren(list)
    else throw new Error('empty')
  } catch {
    if (children.value.length === 0) {
      parentStore.setChildren([])
    }
  }

  await fetchChildData(parentStore.selectedChildId)
  scrollToChild(parentStore.selectedChildId)
})
</script>

<template>
  <div class="page">

    <!-- Section 1: Greeting -->
    <div class="px-4 pt-4 pb-3 md:px-6 lg:px-8">
      <h1 class="text-[22px] font-medium" style="color: var(--color-text-primary)">
        {{ userName || locale.t('ผู้ปกครอง', 'Parent') }}
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
          :updated-at="new Date()"
          @click="parentStore.selectChild(child.id)"
        />
        <!-- Add-student last card -->
        <button class="carousel-card add-card" @click="router.push('/parent/add-student')">
          <div class="add-card-inner">
            <div class="add-icon-ring">
              <PhUserPlus :size="26" weight="bold" color="white" />
            </div>
            <span class="add-card-label">{{ locale.t('เพิ่มนักเรียน', 'Add Student') }}</span>
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

    <!-- Food allergy warning for selected child -->
    <div v-if="selectedChild?.foodAllergy" class="notif notif-warning mx-4 md:mx-6 lg:mx-8 mb-3">
      <div class="notif-icon"><PhWarning :size="16" /></div>
      <div class="notif-content">
        <p class="notif-title">{{ locale.t('ข้อมูลอาหารที่แพ้', 'Food Allergy') }}</p>
        <p class="notif-desc">{{ selectedChild.foodAllergy }}</p>
      </div>
    </div>

    <!-- Section 3: Quick actions ────────────────────────────────────── -->
    <p class="ios-section-header md:px-6 lg:px-8">{{ locale.t('การดำเนินการ', 'Quick Actions') }}</p>
    <div class="px-4 md:px-6 lg:px-8">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
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

    <!-- Sections 4+5: responsive 2-col on lg+ ───────────────────────── -->
    <div class="lg:grid lg:grid-cols-2 lg:gap-6 lg:px-8 lg:mt-2">

    <!-- Section 4b: Today's Booking ─────────────────────────────────── -->
    <div class="px-4 mt-4 md:px-6 lg:px-0 lg:mt-0">
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
            <span class="booking-status" :class="bookingStatusClass(bk.status)">
              {{ bookingStatusLabel(bk.status) }}
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

    <!-- Section 5: Recent transactions (right col on lg+) ────────────── -->
    <div>
    <div class="flex items-center justify-between px-4 pt-5 pb-2 md:px-6 lg:px-0 lg:pt-0 lg:mt-4">
      <p class="text-[13px] font-medium uppercase tracking-wide" style="color: var(--color-text-secondary)">
        {{ locale.t('รายการล่าสุด', 'Recent Transactions') }}
      </p>
      <button
        @click="router.push('/parent/history')"
        class="text-[14px] font-medium"
        style="color: var(--color-primary); background: none; border: none; cursor: pointer;"
      >{{ locale.t('ดูทั้งหมด', 'View All') }}</button>
    </div>

    <div class="px-4 pb-8 md:px-6 lg:px-0">
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
              {{ txDisplayLabel(tx) }}
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
        <p class="text-[14px] mt-2">{{ locale.t('ยังไม่มีรายการ', 'No transactions yet') }}</p>
      </div>
    </div>
    </div> <!-- /section 5 col wrapper -->
    </div> <!-- /sections 4+5 grid -->

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

@media (min-width: 640px) {
  .carousel-card {
    flex: 0 0 320px;
  }
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
.booking-status--cancelled {
  background: #FFE0E0;
  color: #C62828;
}

</style>
