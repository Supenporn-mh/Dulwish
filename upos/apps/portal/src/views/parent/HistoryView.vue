<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import { useParentStore } from '@/stores/parent'
import api from '@/api/axios'
import {
  PhArrowUp, PhShoppingBag, PhForkKnife, PhArrowCounterClockwise,
  PhCalendarCheck, PhStar, PhX, PhCaretRight, PhCaretLeft,
  PhCalendarBlank, PhClock, PhReceipt, PhWallet, PhDeviceMobile,
  PhStorefront, PhCheckCircle, PhHourglass,
} from '@phosphor-icons/vue'
import type { Transaction, TxType, PurchaseItem, ApiLineItem } from '@/types/transaction'
import TopupModal    from './modals/TopupModal.vue'
import PurchaseModal from './modals/PurchaseModal.vue'
import BookingModal  from './modals/BookingModal.vue'
import BuffetModal   from './modals/BuffetModal.vue'

const locale      = useLocaleStore()
const parentStore = useParentStore()

// ── Types ─────────────────────────────────────────────────────────────────────
type FilterKey = 'all' | TxType

// ── Rating scale ──────────────────────────────────────────────────────────────
const RATING: Record<number, { th: string; en: string }> = {
  1: { th: 'ปรับปรุง', en: 'Needs Improvement' },
  2: { th: 'ปานกลาง', en: 'Fair'               },
  3: { th: 'พอใช้',   en: 'Acceptable'          },
  4: { th: 'ดี',      en: 'Good'                },
  5: { th: 'ดีมาก',  en: 'Excellent'            },
}
function rLabel(n: number) { const r = RATING[n]; return r ? (locale.lang === 'th' ? r.th : r.en) : '' }

// ── Month navigation ──────────────────────────────────────────────────────────
const today       = new Date()
const monthOffset = ref(0)

const selectedMonth = computed(() => {
  const d = new Date(today.getFullYear(), today.getMonth() + monthOffset.value, 1)
  return { year: d.getFullYear(), month: d.getMonth(), date: d }
})
const monthLabel = computed(() => {
  const d = selectedMonth.value.date
  return locale.lang === 'en'
    ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
})

// ── Date range filter ─────────────────────────────────────────────────────────
const showDateSheet = ref(false)
const dateFrom      = ref('')
const dateTo        = ref('')
const pendingFrom   = ref('')
const pendingTo     = ref('')

const hasDateFilter = computed(() => !!dateFrom.value || !!dateTo.value)
const dateFilterLabel = computed(() => {
  if (!hasDateFilter.value) return locale.t('เลือกวันที่','Select Date')
  if (dateFrom.value && dateTo.value) return `${fmtDateShort(dateFrom.value)} – ${fmtDateShort(dateTo.value)}`
  if (dateFrom.value) return `${locale.t('จาก','From')} ${fmtDateShort(dateFrom.value)}`
  return `${locale.t('ถึง','To')} ${fmtDateShort(dateTo.value)}`
})

function fmtDateShort(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return locale.lang === 'en'
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function openDateSheet() {
  pendingFrom.value = dateFrom.value
  pendingTo.value   = dateTo.value
  showDateSheet.value = true
}
function applyDate() {
  dateFrom.value = pendingFrom.value
  dateTo.value   = pendingTo.value
  showDateSheet.value = false
}
function clearDate() {
  pendingFrom.value = dateFrom.value = ''
  pendingTo.value   = dateTo.value   = ''
  showDateSheet.value = false
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all'      as FilterKey, th: 'ทั้งหมด',    en: 'All'      },
  { key: 'topup'    as FilterKey, th: 'เติมเงิน',   en: 'Top-up'   },
  { key: 'purchase' as FilterKey, th: 'ซื้อสินค้า', en: 'Paid' },
  { key: 'buffet'   as FilterKey, th: 'บุฟเฟต์',   en: 'Buffet'   },
  { key: 'booking'  as FilterKey, th: 'จองอาหาร',  en: 'Booking'  },
]
const activeFilter = ref<FilterKey>('all')
const modalTx = ref<Transaction | null>(null)
function openModal(tx: Transaction) { modalTx.value = tx }
function closeModal() { modalTx.value = null }

// ── Data ──────────────────────────────────────────────────────────────────────
const transactions = ref<Transaction[]>([])
const loading      = ref(true)

// ── Filtering pipeline ────────────────────────────────────────────────────────
const monthFiltered = computed(() => {
  const { year, month } = selectedMonth.value
  return transactions.value.filter(t => {
    const d = new Date(t.createdAt)
    return d.getFullYear() === year && d.getMonth() === month
  })
})

const dateFiltered = computed(() => {
  if (!hasDateFilter.value) return monthFiltered.value
  return monthFiltered.value.filter(t => {
    const d = t.createdAt.slice(0, 10)
    if (dateFrom.value && d < dateFrom.value) return false
    if (dateTo.value   && d > dateTo.value)   return false
    return true
  })
})

const typeFiltered = computed(() =>
  activeFilter.value === 'all'
    ? dateFiltered.value
    : dateFiltered.value.filter(t => t.type === activeFilter.value)
)

// ── Summary ───────────────────────────────────────────────────────────────────
const totalTopup = computed(() => dateFiltered.value.filter(t => t.amount > 0).reduce((s,t) => s+t.amount, 0))
const totalSpend = computed(() => Math.abs(dateFiltered.value.filter(t => t.amount < 0).reduce((s,t) => s+t.amount, 0)))

function fmtAmt(n: number) { return `฿${n.toLocaleString('th-TH', { minimumFractionDigits:2 })}` }

// ── Grouped by date ───────────────────────────────────────────────────────────
interface Group { label: string; items: Transaction[] }
const grouped = computed((): Group[] => {
  const todayStr = today.toDateString()
  const yestStr  = new Date(today.getTime() - 86400000).toDateString()
  const map: Record<string, Transaction[]> = {}
  for (const tx of typeFiltered.value) {
    const d = new Date(tx.createdAt)
    let key: string
    if (d.toDateString() === todayStr)     key = locale.t('วันนี้','Today')
    else if (d.toDateString() === yestStr) key = locale.t('เมื่อวาน','Yesterday')
    else key = locale.lang === 'en'
      ? d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
      : d.toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' })
    if (!map[key]) map[key] = []
    map[key].push(tx)
  }
  return Object.entries(map).map(([label, items]) => ({ label, items }))
})

// ── Tx meta ───────────────────────────────────────────────────────────────────
const DOT: Record<TxType, string> = {
  topup:'var(--color-success)', purchase:'var(--color-warning)',
  buffet:'var(--color-primary)', booking:'#3C3489', refund:'var(--color-text-tertiary)',
}
const TYPE_LABEL: Record<TxType, { th:string; en:string }> = {
  topup:   { th:'เติมเงิน',   en:'Top-Up'   },
  purchase:{ th:'ซื้อสินค้า', en:'Paid'     },
  buffet:  { th:'บุฟเฟต์',   en:'Buffet'   },
  booking: { th:'จองอาหาร',  en:'Booking'  },
  refund:  { th:'คืนเงิน',   en:'Refund'   },
}
const SESSION_LABEL: Record<string, { th:string; en:string }> = {
  breakfast:{ th:'เช้า',    en:'Breakfast' },
  lunch:    { th:'กลางวัน', en:'Lunch'     },
  dinner:   { th:'เย็น',   en:'Dinner'    },
}
const BOOKING_STATUS: Record<string, { th:string; en:string; color:string; bg:string }> = {
  confirmed: { th:'ยืนยันแล้ว',    en:'Confirmed',  color:'#028A60', bg:'var(--color-success-bg)' },
  consumed:  { th:'รับอาหารแล้ว',  en:'Consumed',   color:'var(--color-primary)', bg:'var(--color-primary-tint)' },
  cancelled: { th:'ยกเลิกแล้ว',   en:'Cancelled',  color:'#CC3333', bg:'var(--color-danger-bg)'  },
}
const CHANNEL_LABEL: Record<string, string> = {
  mobile_web:'Mobile App', kiosk:'Kiosk', pos:'POS', system:'System',
}
const PAYMENT_LABEL: Record<string, string> = {
  promptpay:   'PromptPay',
  scb_qr:      'SCB QR Code',
  credit_card: 'Credit / Debit Card',
  debit_card:  'Debit Card',
  wechat:      'WeChat Pay',
  alipay:      'Alipay',
  staff:       locale.t('เจ้าหน้าที่','Staff'),
  cash:        locale.t('เงินสด','Cash'),
  wallet:      locale.t('กระเป๋าเงิน','Wallet'),
  mobile_web:  'Mobile App',
}

function txLabel(t: TxType)     { return locale.lang==='th' ? TYPE_LABEL[t].th : TYPE_LABEL[t].en }
function txIcon(t: TxType)      { return t==='topup' ? PhArrowUp : t==='purchase' ? PhShoppingBag : t==='buffet' ? PhForkKnife : t==='booking' ? PhCalendarCheck : PhArrowCounterClockwise }
function txIconColor(t: TxType) { return t==='topup'?'#03BA81': t==='purchase'?'#FF9800': t==='buffet'?'#1264E3': t==='booking'?'#3C3489':'#999999' }
function txIconBg(t: TxType)    { return t==='topup'?'#E0FAF3': t==='purchase'?'#FFF3E0': t==='buffet'?'#EAF1FD': t==='booking'?'#EEEDFE':'#F5F5F5' }

// Derive purchase items — prefer structured items array, fall back to purchaseItems, then description parse
function derivePurchaseItems(tx: Transaction): PurchaseItem[] {
  // 1. Structured items array from API (purchase/buffet transactions)
  if (tx.items?.length) {
    return tx.items.map(i => ({ name: i.name, qty: i.qty, price: i.unitPrice ?? (i.lineTotal / (i.qty || 1)) }))
  }
  // 2. Legacy purchaseItems field
  if (tx.purchaseItems?.length) return tx.purchaseItems
  // 3. Fallback: derive from description string
  if (tx.type !== 'purchase' || !tx.amount) return []
  const desc = (tx.description ?? '')
    .replace(/^ซื้อ\s+/i, '')
    .replace(/^Buy\s+/i, '')
    .trim()
  const qty   = 1
  const price = Math.abs(tx.amount) / qty
  return desc ? [{ name: desc, qty, price }] : [{ name: locale.t('รายการสินค้า','Item'), qty:1, price: Math.abs(tx.amount) }]
}
function sessionLabel(s?: string) { if (!s) return ''; const l=SESSION_LABEL[s]; return l ? (locale.lang==='th'?l.th:l.en) : s }

// Derive buffet session from description when buffetSession field is missing (API data)
function deriveSession(tx: Transaction): string {
  if (tx.buffetSession) return sessionLabel(tx.buffetSession)
  if (tx.bookingMeal)   return sessionLabel(tx.bookingMeal)
  const d = tx.description ?? ''
  if (d.includes('เช้า')    || d.toLowerCase().includes('breakfast')) return sessionLabel('breakfast')
  if (d.includes('กลางวัน') || d.toLowerCase().includes('lunch'))     return sessionLabel('lunch')
  if (d.includes('เย็น')    || d.toLowerCase().includes('dinner'))    return sessionLabel('dinner')
  return '-'
}

// Derive venue from buffet description (strip session words)
function deriveVenue(tx: Transaction): string {
  return (tx.description ?? '')
    .replace(/^Buffet\s*/i,'')
    .replace(/เช้า|กลางวัน|เย็น/,'')
    .replace(/Breakfast|Lunch|Dinner/i,'')
    .trim() || '-'
}
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString(locale.lang==='th'?'th-TH':'en-GB', { hour:'2-digit', minute:'2-digit' }) }
function fmtDateTime(iso: string) {
  const d = new Date(iso), loc = locale.lang === 'en' ? 'en-GB' : 'th-TH'
  return d.toLocaleDateString(loc, { day:'2-digit', month:'2-digit', year:'numeric' }) + ', ' +
         d.toLocaleTimeString(loc, { hour:'2-digit', minute:'2-digit' })
}

function txStatusLabel(s: string) {
  const map: Record<string, { th:string; en:string }> = {
    complete:  { th:'สำเร็จ',        en:'Complete'  },
    completed: { th:'สำเร็จ',        en:'Complete'  },
    success:   { th:'สำเร็จ',        en:'Complete'  },
    pending:   { th:'รอดำเนินการ',   en:'Pending'   },
    failed:    { th:'ล้มเหลว',       en:'Failed'    },
  }
  const e = map[s.toLowerCase()]
  return e ? (locale.lang === 'th' ? e.th : e.en) : s
}
function txStatusColor(s: string) {
  const l = s.toLowerCase()
  if (['complete','completed','success'].includes(l)) return 'var(--color-success)'
  if (l === 'pending') return 'var(--color-warning)'
  return 'var(--color-danger)'
}
function txStatusBg(s: string) {
  const l = s.toLowerCase()
  if (['complete','completed','success'].includes(l)) return 'var(--color-success-bg)'
  if (l === 'pending') return 'var(--color-warning-bg)'
  return 'var(--color-danger-bg)'
}

const modalTxTitle = computed(() => {
  if (!modalTx.value) return ''
  const map: Record<TxType,{th:string;en:string}> = {
    topup:    { th:'รายละเอียดการเติมเงิน',  en:'Top-up Details'   },
    purchase: { th:'รายละเอียดการซื้อสินค้า', en:'Purchase Details' },
    buffet:   { th:'รายละเอียดบุฟเฟต์',      en:'Buffet Details'   },
    booking:  { th:'รายละเอียดการจอง',        en:'Booking Details'  },
    refund:   { th:'รายละเอียดการคืนเงิน',    en:'Refund Details'   },
  }
  const e = map[modalTx.value.type]
  return locale.lang === 'th' ? e.th : e.en
})
const modalTxSubtitle = computed(() => {
  if (!modalTx.value) return ''
  const map: Record<TxType,{th:string;en:string}> = {
    topup:    { th:'รายละเอียดการทำรายการเติมเงิน',  en:'Top-up transaction details'   },
    purchase: { th:'รายละเอียดการซื้อสินค้า',         en:'Purchase transaction details'  },
    buffet:   { th:'รายละเอียดการใช้บุฟเฟต์',         en:'Buffet session details'        },
    booking:  { th:'รายละเอียดการจองอาหาร',           en:'Food booking details'          },
    refund:   { th:'รายละเอียดการคืนเงิน',             en:'Refund details'               },
  }
  const e = map[modalTx.value.type]
  return locale.lang === 'th' ? e.th : e.en
})
function amtColor(a: number) { return a>0?'var(--color-success)':a<0?'var(--color-danger)':'var(--color-text-tertiary)' }
function amtText(a: number)  { return a===0 ? '–' : `${a>0?'+':''}฿${Math.abs(a).toLocaleString('th-TH',{minimumFractionDigits:2})}` }
function canReview(t: Transaction) { return t.type === 'buffet' || t.type === 'booking' }

function purchaseTotal(items: PurchaseItem[]) { return items.reduce((s,i)=>s+i.qty*i.price, 0) }

// ── Feedback ──────────────────────────────────────────────────────────────────
const ratings  = reactive<Record<string,number>>({})
const notes    = reactive<Record<string,string>>({})
const rated    = reactive<Set<string>>(new Set())
const reviewFor       = ref<Transaction | null>(null)
const reviewRating    = ref(0)
const reviewNote      = ref('')
const reviewBusy      = ref(false)
const reviewError     = ref<string | null>(null)
const showReviewSheet = ref(false)  // แยกออกจาก reviewFor เพื่อแก้ edit bug
const reviewStage     = ref<1 | 2>(1)  // 1=กรอกรีวิว, 2=ยืนยัน

function openReview(t: Transaction) {
  closeModal()
  reviewFor.value       = t
  reviewRating.value    = ratings[t.id] ?? 0
  reviewNote.value      = notes[t.id]   ?? ''
  reviewError.value     = null
  reviewStage.value     = 1
  showReviewSheet.value = true
}
function closeReview() {
  showReviewSheet.value = false
  reviewStage.value     = 1
  reviewError.value     = null
}
function goToConfirm() {
  if (reviewRating.value === 0) return
  reviewStage.value = 2
}
function backToEdit() {
  reviewStage.value = 1
}
async function submitReview() {
  if (!reviewFor.value || reviewRating.value === 0) return
  reviewBusy.value  = true
  reviewError.value = null
  const t = reviewFor.value
  const body: Record<string, unknown> = {
    channel: 'mobile',
    rating:  reviewRating.value,
    comment: reviewNote.value,
  }
  if (t.type === 'booking') body.order_id = t.id
  try {
    await api.post('/feedback', body)
    ratings[t.id] = reviewRating.value
    notes[t.id]   = reviewNote.value
    rated.add(t.id)
    closeReview()
  } catch (err: any) {
    reviewError.value = locale.t('ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่', 'Failed to submit review, please try again')
    reviewStage.value = 2
  } finally {
    reviewBusy.value = false
  }
}

const CODE_TO_MEAL: Record<string, 'breakfast' | 'lunch' | 'dinner'> = {
  BREAK: 'breakfast', LUNCH: 'lunch', DINNER: 'dinner',
}

// ── Fetch history for a specific child ────────────────────────────────────────
async function fetchHistory(childId: string) {
  if (!childId) return
  loading.value = true

  const [txRes, ordRes] = await Promise.allSettled([
    api.get(`/wallets/${childId}/transactions?page=1&limit=50`),
    api.get('/orders', { params: { student: childId } }),
  ])

  const walletTxns: Transaction[] = txRes.status === 'fulfilled'
    ? (txRes.value.data?.transactions ?? txRes.value.data ?? []).map((t: any) => ({
        ...t,
        id:            t.id ?? t._id,
        description:   t.description ?? t.note ?? '',
        items:         t.items ?? undefined,
        balanceBefore: t.balanceBefore ?? t.balance_before,
        balanceAfter:  t.balanceAfter  ?? t.balance_after,
        status:        t.status,
      }))
    : []

  function mapBookingStatus(apiStatus: string, serveDateStr?: string): Transaction['bookingStatus'] {
    if (apiStatus === 'redeemed') return 'collected'
    if (apiStatus === 'cancelled' || apiStatus === 'void') return 'cancelled'
    if (apiStatus === 'expired') return 'missed'
    if (serveDateStr && (apiStatus === 'confirmed' || apiStatus === 'complete')) {
      const [y, m, d] = serveDateStr.split('-').map(Number)
      const serve = new Date(y, m - 1, d)
      const now = new Date()
      if (serve.getFullYear() === now.getFullYear()
        && serve.getMonth() === now.getMonth()
        && serve.getDate() === now.getDate()) {
        return 'ready'
      }
    }
    return 'confirmed'
  }

  const bookingTxns: Transaction[] = ordRes.status === 'fulfilled'
    ? (ordRes.value.data?.orders ?? []).map((o: any) => ({
        id:            o.id ?? o._id,
        type:          'booking' as TxType,
        description:   locale.lang === 'th'
          ? `จองอาหาร ${o.mealPeriodName ?? ''}`.trim()
          : `Food Booking${o.mealPeriodName ? ` – ${o.mealPeriodName}` : ''}`.trim(),
        amount:        0,
        createdAt:     o.createdAt,
        refNo:         o.orderNo,
        bookingMeal:   CODE_TO_MEAL[o.mealPeriodCode ?? ''] ?? 'lunch',
        bookingStatus: mapBookingStatus(o.status, o.serveDate),
        mealDate:      o.serveDate,
        collectedAt:   o.redeemedAt,
        cancelledAt:   o.cancelledAt,
        items:         (o.items ?? []).map((i: any) => ({
          name: i.name ?? '-', qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal,
        })),
        bookingItems:  (o.items ?? []).map((i: any) => i.name ?? '-'),
        bookingNote:   o.note || undefined,
      }))
    : []

  transactions.value = [...walletTxns, ...bookingTxns]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  loading.value = false
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  const childId = parentStore.selectedChildId
  if (childId) fetchHistory(childId)
})

watch(() => parentStore.selectedChildId, (newId) => {
  if (newId) {
    transactions.value = []
    fetchHistory(newId)
  }
})
</script>

<template>
  <div style="background:var(--color-bg-page);min-height:100%">

    <!-- ── Sticky top block: title + month nav + tabs ─────────────────── -->
    <div class="sticky-top">
      <!-- Title row -->
      <div class="px-4 pt-4 pb-2 flex items-center justify-between md:px-6 lg:px-8">
        <p class="text-[22px] font-medium" style="color:var(--color-text-primary)">
          {{ locale.t('ประวัติรายการ','Transactions History') }}
        </p>
        <div class="month-nav">
          <button class="mth-btn" @click="monthOffset--"><PhCaretLeft :size="13" weight="bold"/></button>
          <span class="text-[12px] font-medium" style="color:var(--color-text-primary)">{{ monthLabel }}</span>
          <button class="mth-btn" @click="monthOffset++" :disabled="monthOffset>=0"><PhCaretRight :size="13" weight="bold"/></button>
        </div>
      </div>
      <!-- Tabs -->
      <div class="tab-bar">
        <button v-for="tab in TABS" :key="tab.key"
          @click="activeFilter=tab.key"
          :class="['tab-pill', activeFilter===tab.key&&'tab-on']">
          {{ locale.lang==='th' ? tab.th : tab.en }}
        </button>
      </div>
    </div>

    <!-- ── Sub-header: subtitle + date filter + summary ──────────────── -->
    <div class="px-4 pt-3 pb-4 md:px-6 lg:px-8" style="background:var(--color-bg-surface); border-bottom:0.5px solid var(--color-border-tertiary)">
      <!-- Summary cards -->
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div class="sum-card sum-topup">
          <p class="text-[12px] font-medium" style="color:var(--color-primary-dark)">
            {{ locale.t('ยอดเติมเงิน','Total Top-up') }}
          </p>
          <p class="text-[18px] font-medium mt-1" style="color:var(--color-primary-dark)">{{ fmtAmt(totalTopup) }}</p>
        </div>
        <div class="sum-card sum-spend">
          <p class="text-[12px] font-medium" style="color:var(--color-danger)">
            {{ locale.t('ยอดใช้จ่าย','Total Spending') }}
          </p>
          <p class="text-[18px] font-medium mt-1" style="color:var(--color-danger)">{{ fmtAmt(totalSpend) }}</p>
        </div>
      </div>
    </div>

    <!-- ── Skeleton ───────────────────────────────────────────────────── -->
    <div v-if="loading" class="px-4 pt-4 pb-8 space-y-4 md:px-6 lg:px-8">
      <div v-for="g in 2" :key="g">
        <div class="h-3 w-16 rounded animate-pulse mb-2" style="background:var(--color-border-tertiary)"/>
        <div class="card overflow-hidden">
          <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-4 py-[13px]"
            :style="i>1?'border-top:0.5px solid var(--color-border-tertiary)':''">
            <div class="w-9 h-9 rounded-full animate-pulse flex-shrink-0" style="background:var(--color-border-tertiary)"/>
            <div class="flex-1 space-y-1.5">
              <div class="h-3.5 rounded animate-pulse w-3/5" style="background:var(--color-border-tertiary)"/>
              <div class="h-3 rounded animate-pulse w-1/3" style="background:var(--color-border-tertiary)"/>
            </div>
            <div class="h-4 w-16 rounded animate-pulse" style="background:var(--color-border-tertiary)"/>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Grouped list ────────────────────────────────────────────────── -->
    <div v-else class="px-4 pt-3 pb-8 space-y-1 md:px-6 lg:px-8">
      <template v-for="group in grouped" :key="group.label">

        <!-- Date label (section header style) -->
        <p class="group-label">{{ group.label }}</p>

        <!-- Card with rows -->
        <div class="card overflow-hidden">
          <template v-for="(tx, ti) in group.items" :key="tx.id">

            <!-- Transaction row (dashboard style) -->
            <button @click="openModal(tx)" class="tx-row w-full"
              :style="ti>0?'border-top:0.5px solid var(--color-border-tertiary)':''">
              <!-- Icon circle -->
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                :style="`background:${txIconBg(tx.type)}`">
                <component :is="txIcon(tx.type)" :size="18" weight="fill" :color="txIconColor(tx.type)"/>
              </div>
              <!-- Description + meta -->
              <div class="flex-1 min-w-0 text-left">
                <p class="text-[15px] truncate font-medium" style="color:var(--color-text-primary)">
                  {{ (tx.description && tx.description !== tx.type) ? tx.description : txLabel(tx.type) }}
                </p>
                <p class="text-[12px] mt-0.5" style="color:var(--color-text-secondary)">
                  {{ CHANNEL_LABEL[tx.channel??''] ?? tx.channel ?? '' }}
                  {{ tx.channel ? '·' : '' }}
                  {{ fmtTime(tx.createdAt) }}
                  <template v-if="rated.has(tx.id)">
                    &nbsp;·&nbsp;<span style="color:var(--color-warning)">{{ ratings[tx.id] }}★ {{ rLabel(ratings[tx.id]) }}</span>
                  </template>
                </p>
              </div>
              <!-- Amount -->
              <span class="text-[15px] font-medium flex-shrink-0" :style="`color:${amtColor(tx.amount)}`">
                {{ amtText(tx.amount) }}
              </span>
            </button>

          </template>
        </div>
      </template>

      <!-- Empty -->
      <div v-if="grouped.length===0"
        class="flex flex-col items-center py-16 gap-2"
        style="color:var(--color-text-tertiary)">
        <span class="text-[40px]">📭</span>
        <p class="text-[14px]">{{ locale.t('ไม่มีรายการในเดือนนี้','No transactions this month') }}</p>
      </div>
    </div>
  </div>

  <!-- ── Transaction detail modal ────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="modalTx" class="modal-backdrop" @click="closeModal"/>
    </Transition>
    <Transition name="modal-card">
      <div v-if="modalTx" class="modal-outer" @click.self="closeModal">

        <TopupModal
          v-if="modalTx.type === 'topup'"
          :tx="modalTx"
          @close="closeModal"
        />

        <PurchaseModal
          v-if="modalTx.type === 'purchase'"
          :tx="modalTx"
          @close="closeModal"
        />

        <BookingModal
          v-if="modalTx.type === 'booking'"
          :tx="modalTx"
          :rated="rated.has(modalTx.id)"
          :ratingValue="ratings[modalTx.id] ?? 0"
          :ratingLabel="rLabel(ratings[modalTx.id] ?? 0)"
          @close="closeModal"
          @open-review="openReview"
        />

        <BuffetModal
          v-if="modalTx.type === 'buffet'"
          :tx="modalTx"
          :rated="rated.has(modalTx.id)"
          :ratingValue="ratings[modalTx.id] ?? 0"
          :ratingLabel="rLabel(ratings[modalTx.id] ?? 0)"
          @close="closeModal"
          @open-review="openReview"
        />

        <!-- ── REFUND (inline) ── -->
        <div v-if="modalTx.type === 'refund'" class="modal-card" role="dialog" aria-modal="true">
          <div class="modal-header">
            <div class="flex items-center gap-3">
              <div class="modal-icon-circle" style="background:#F5F5F5">
                <PhArrowCounterClockwise :size="18" weight="fill" color="#999"/>
              </div>
              <h3 class="modal-title">{{ locale.t('รายละเอียดการคืนเงิน','Refund Details') }}</h3>
            </div>
            <button class="modal-close" @click="closeModal" :aria-label="locale.t('ปิด','Close')">
              <PhX :size="14" weight="bold"/>
            </button>
          </div>
          <div class="modal-amount-card" style="background:var(--color-success-bg)">
            <p class="modal-amount-label" style="color:var(--color-success)">{{ locale.t('จำนวนที่คืน','Refunded') }}</p>
            <p class="modal-amount-value" style="color:var(--color-success)">{{ fmtAmt(modalTx.amount) }}</p>
          </div>
          <div class="modal-rows">
            <div class="modal-row">
              <span class="modal-row-label">{{ locale.t('วันที่ / เวลา','Date / Time') }}</span>
              <span class="modal-row-value">{{ fmtDateTime(modalTx.createdAt) }}</span>
            </div>
            <div v-if="modalTx.refundFor" class="modal-row">
              <span class="modal-row-label">{{ locale.t('อ้างอิงรายการ','Original Ref') }}</span>
              <span class="modal-row-value" style="font-family:monospace;font-size:12px">{{ modalTx.refundFor }}</span>
            </div>
          </div>
        </div>

      </div>
    </Transition>
  </Teleport>

  <!-- ── Date filter sheet ─────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="rs-bg">
      <div v-if="showDateSheet" class="rs-backdrop" @click="showDateSheet=false"/>
    </Transition>
    <Transition name="rs-sh">
      <div v-if="showDateSheet" class="rs-sheet">
        <div class="rs-handle"/>
        <button class="rs-close" @click="showDateSheet=false"><PhX :size="16" weight="bold"/></button>
        <div class="px-5 pb-10 flex flex-col gap-4">
          <p class="text-[18px] font-medium" style="color:var(--color-text-primary)">
            {{ locale.t('เลือกช่วงวันที่','Select Date Range') }}
          </p>
          <div class="card">
            <div class="card-body" style="border-bottom:0.5px solid var(--color-border-tertiary);padding-bottom:14px">
              <label class="text-caption mb-1 block" style="color:var(--color-text-secondary)">
                {{ locale.t('จากวันที่','From') }}
              </label>
              <input v-model="pendingFrom" type="date"
                class="w-full text-body-md bg-transparent outline-none" style="border:none;color:var(--color-text-primary)"/>
            </div>
            <div class="card-body">
              <label class="text-caption mb-1 block" style="color:var(--color-text-secondary)">
                {{ locale.t('ถึงวันที่','To') }}
              </label>
              <input v-model="pendingTo" type="date"
                class="w-full text-body-md bg-transparent outline-none" style="border:none;color:var(--color-text-primary)"/>
            </div>
          </div>
          <div class="flex gap-3">
            <button @click="clearDate" class="btn btn-ghost flex-1">{{ locale.t('ล้าง','Clear') }}</button>
            <button @click="applyDate"  class="btn btn-primary flex-1">{{ locale.t('ยืนยัน','Apply') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Review sheet ───────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="rs-bg">
      <div v-if="showReviewSheet" class="rs-backdrop" @click="closeReview"/>
    </Transition>
    <Transition name="rs-sh">
      <div v-if="showReviewSheet && reviewFor" class="rs-sheet">
        <div class="rs-handle"/>
        <button class="rs-close" @click="closeReview"><PhX :size="16" weight="bold"/></button>

        <!-- ── Stage 1: กรอกรีวิว ── -->
        <div v-if="reviewStage === 1" class="rs-stage1">
          <!-- Meal context (centered vertical) -->
          <div class="rs-meal-row">
            <div class="rs-meal-avatar">
              <PhCheckCircle :size="22" weight="fill"/>
            </div>
            <span class="rs-meal-label">{{ reviewFor.type === 'booking' ? locale.t('จองอาหาร','Booking') : locale.t('บุฟเฟต์','Buffet') }}</span>
            <p class="rs-meal-desc">{{ reviewFor.description }}</p>
            <div v-if="(reviewFor.buffetItems ?? reviewFor.bookingItems ?? []).length" class="flex flex-wrap justify-center gap-1">
              <span v-for="item in reviewFor.buffetItems ?? reviewFor.bookingItems" :key="item" class="item-chip">{{ item }}</span>
            </div>
          </div>

          <div class="rs-divider"/>

          <!-- Heading -->
          <h2 class="rs-main-heading">{{ locale.t('เป็นยังไงบ้าง?','How was your meal?') }}</h2>

          <!-- Stars -->
          <div class="rs-stars-block">
            <div class="rs-stars-row">
              <button v-for="n in 5" :key="n" @click="reviewRating=n"
                class="star-btn" :class="{active: n<=reviewRating}">
                <PhStar :size="44" :weight="n<=reviewRating?'fill':'regular'"/>
              </button>
            </div>
            <Transition name="fade-up">
              <div v-if="reviewRating" class="rating-result mt-3">
                {{ reviewRating }} / 5 &nbsp;·&nbsp; {{ rLabel(reviewRating) }}
              </div>
            </Transition>
          </div>

          <!-- Feedback -->
          <textarea v-model="reviewNote" class="rs-feedback-input" rows="2"
            :placeholder="locale.t('แสดงความคิดเห็น... (ไม่บังคับ)','Share your feedback... (optional)')"/>

          <!-- CTA -->
          <button @click="goToConfirm" :disabled="reviewRating===0"
            class="rs-cta-btn"
            :class="{'opacity-40 cursor-not-allowed': reviewRating===0}">
            {{ locale.t('ดำเนินการต่อ','Continue') }}
          </button>
        </div>

        <!-- ── Stage 2: ยืนยันรีวิว ── -->
        <div v-else class="rs-stage2">
          <div class="rs-heading-block">
            <h2 class="rs-main-heading">{{ locale.t('ยืนยันรีวิว','Confirm Review') }}</h2>
            <p class="rs-sub-heading">{{ locale.t('ตรวจสอบรีวิวก่อนส่ง','Review your rating before submitting') }}</p>
          </div>

          <!-- Summary card -->
          <div class="review-confirm-card">
            <p class="text-[12px] font-medium mb-3" style="color:var(--color-text-secondary)">{{ reviewFor.description }}</p>
            <div class="flex items-center gap-1 mb-1">
              <PhStar v-for="n in 5" :key="n" :size="24"
                :weight="n<=reviewRating?'fill':'regular'"
                :color="n<=reviewRating?'var(--color-warning)':'var(--color-border-secondary)'"/>
            </div>
            <p class="text-[13px] font-medium" style="color:var(--color-warning)">
              {{ reviewRating }} / 5 · {{ rLabel(reviewRating) }}
            </p>
            <p v-if="reviewNote.trim()" class="text-[13px] mt-3 pt-3 italic"
              style="color:var(--color-text-primary); border-top:0.5px solid var(--color-border-tertiary)">
              "{{ reviewNote.trim() }}"
            </p>
          </div>

          <p v-if="reviewError" class="text-[12px] font-medium text-center" style="color:var(--color-danger)">
            {{ reviewError }}
          </p>

          <div class="flex gap-3">
            <button @click="backToEdit" :disabled="reviewBusy"
              class="rs-ghost-btn flex-1">
              {{ locale.t('แก้ไข','Edit') }}
            </button>
            <button @click="submitReview" :disabled="reviewBusy"
              class="rs-cta-btn flex-1">
              <span v-if="reviewBusy" class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                {{ locale.t('กำลังส่ง...','Submitting...') }}
              </span>
              <span v-else>{{ locale.t('ส่งรีวิว','Submit Review') }}</span>
            </button>
          </div>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Sticky top (title + tabs combined — no gap) ─────────────────────────── */
/* top:0 เพราะ <main> ใน ParentLayout มี overflow-y:auto เป็น scroll container
   ของตัวเอง — navbar อยู่นอก scroll container แล้ว */
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg-surface);
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
.tab-bar {
  display:flex; overflow-x:auto; scrollbar-width:none;
  background:var(--color-bg-surface);
  border-top: 0.5px solid var(--color-border-tertiary);
}
.tab-bar::-webkit-scrollbar { display:none; }
.tab-pill {
  flex:1 0 auto; min-width:max-content;
  padding:10px 16px; font-size:13px; font-weight:500;
  background:none; border:none; border-bottom:2px solid transparent;
  color:var(--color-text-secondary); cursor:pointer;
  transition:color 0.15s, border-color 0.15s; white-space:nowrap;
  -webkit-tap-highlight-color:transparent;
}
.tab-pill:active { opacity:0.7; }
.tab-on { color:var(--color-primary); border-bottom-color:var(--color-primary); }

/* ── Month nav ────────────────────────────────────────────────────────────── */
.month-nav { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; background:var(--color-bg-secondary); }
.mth-btn { background:none; border:none; cursor:pointer; padding:2px 3px; color:var(--color-text-secondary); border-radius:4px; display:flex; align-items:center; }
.mth-btn:disabled { opacity:0.3; cursor:not-allowed; }
.mth-btn:not(:disabled):active { background:var(--color-border-tertiary); }

/* ── Group label ─────────────────────────────────────────────────────────── */
.group-label {
  font-size: 12px; font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 10px 0 4px;
}

/* ── Date filter button ───────────────────────────────────────────────────── */
.date-filter-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:6px 12px; border-radius:20px; font-size:13px; font-weight:500;
  background:var(--color-bg-secondary);
  border:1px solid var(--color-border-tertiary);
  color:var(--color-text-secondary); cursor:pointer;
  transition:all 0.15s;
}
.date-filter-btn.active { background:var(--color-primary-tint); border-color:var(--color-primary); color:var(--color-primary); }

/* ── Summary ──────────────────────────────────────────────────────────────── */
.sum-card { border-radius:var(--radius-lg); padding:14px 16px; }
.sum-topup { background:var(--color-primary-tint); }
.sum-spend { background:var(--color-danger-bg); }

/* ── Transaction row (dashboard card style) ──────────────────────────────── */
.tx-row {
  display:flex; align-items:center; gap:12px;
  padding:13px 16px;
  background:none; border:none; cursor:pointer;
  -webkit-tap-highlight-color:transparent;
  transition:background 0.1s;
  width: 100%;
}
.tx-row:active { background:var(--color-bg-page); }

/* ── Detail panel ─────────────────────────────────────────────────────────── */
.detail-pane { background:var(--color-bg-surface); border-top:0.5px solid var(--color-border-tertiary); }

.detail-section { padding:12px 16px; }
.detail-section + .detail-section { border-top:0.5px solid var(--color-border-tertiary); }

.detail-section-title {
  font-size:12px; font-weight:500; color:var(--color-text-tertiary);
  text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;
}
.detail-row { display:flex; align-items:center; gap:8px; padding:4px 0; }
.dl { font-size:13px; color:var(--color-text-secondary); flex:1; }
.dv { font-size:13px; color:var(--color-text-primary); text-align:right; }

/* ── Purchase rows ────────────────────────────────────────────────────────── */
.purchase-row { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:0.5px solid var(--color-border-tertiary); }
.purchase-total-row { display:flex; justify-content:space-between; align-items:center; padding-top:8px; }

/* ── Session + status badges ──────────────────────────────────────────────── */
.session-badge { font-size:12px; font-weight:500; padding:2px 10px; border-radius:20px; }
.session-buffet { background:var(--color-primary-tint); color:var(--color-primary); }
.session-booking { background:#EEEDFE; color:#3C3489; }
.status-badge { font-size:12px; font-weight:500; padding:3px 10px; border-radius:20px; }

/* ── Items chips ──────────────────────────────────────────────────────────── */
.items-grid { display:flex; flex-wrap:wrap; gap:6px; }
.item-chip { font-size:12px; font-weight:500; padding:3px 10px; border-radius:20px; background:var(--color-bg-surface); color:var(--color-text-secondary); border:0.5px solid var(--color-border-tertiary); }
.item-chip-booking { background:#EEEDFE; color:#3C3489; border-color:#EEEDFE; }

/* ── Review section ───────────────────────────────────────────────────────── */
.review-section { padding:12px 16px 14px; border-top:0.5px solid var(--color-border-tertiary); }
.rate-btn { display:flex; align-items:center; gap:5px; padding:7px 14px; border-radius:20px; font-size:13px; font-weight:500; background:var(--color-warning-bg); color:var(--color-warning); border:none; cursor:pointer; }
.rate-btn:active { opacity:0.7; }
.edit-btn { font-size:12px; font-weight:500; color:var(--color-primary); background:none; border:none; cursor:pointer; padding:4px 8px; border-radius:8px; flex-shrink:0; }

/* ── Sheets ───────────────────────────────────────────────────────────────── */
.rs-backdrop { position:fixed; inset:0; z-index:40; background:rgba(0,0,0,0.45); }
.rs-sheet { position:fixed; bottom:0; left:50%; z-index:50; transform:translateX(-50%); width:100%; max-width:430px; background:var(--color-bg-surface); border-radius:20px 20px 0 0; padding-top:12px; box-shadow:0 -4px 30px rgba(0,0,0,0.14); max-height:90vh; overflow-y:auto; }
.rs-handle { width:40px; height:4px; border-radius:2px; background:var(--color-border-secondary); margin:0 auto 14px; }
.rs-close { position:absolute; top:14px; right:16px; width:28px; height:28px; border-radius:50%; background:var(--color-bg-page); border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--color-text-secondary); }

/* ── Stars ────────────────────────────────────────────────────────────────── */
.star-btn { background:none; border:none; cursor:pointer; padding:2px; color:var(--color-border-secondary); transition:color 0.1s, transform 0.1s; -webkit-tap-highlight-color:transparent; }
.star-btn.active { color:var(--color-warning); }
.star-btn:active { transform:scale(1.15); }
.rating-result { font-size:15px; font-weight:500; color:var(--color-warning); background:var(--color-warning-bg); padding:6px 18px; border-radius:20px; }
.review-confirm-card { padding:16px; border-radius:var(--radius-lg); background:var(--color-bg-page); border:1px solid var(--color-border-tertiary); }

/* ── Stage 1 / 2 redesign ─────────────────────────────────────────────────── */
.rs-stage1, .rs-stage2 { display:flex; flex-direction:column; padding:8px 20px 32px; gap:20px; }

.rs-meal-row { display:flex; flex-direction:column; align-items:center; gap:6px; }
.rs-meal-avatar { width:48px; height:48px; border-radius:50%; background:var(--color-primary-tint); color:var(--color-primary); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rs-meal-label { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-primary); display:block; text-align:center; }
.rs-meal-desc { font-size:14px; font-weight:400; color:var(--color-text-secondary); line-height:1.3; text-align:center; margin:0; }

.rs-divider { height:0.5px; background:var(--color-border-tertiary); flex-shrink:0; }

.rs-main-heading { font-size:18px; font-weight:500; color:var(--color-text-primary); line-height:1.4; text-align:center; margin:0; }
.rs-heading-block { text-align:center; }
.rs-sub-heading { font-size:13px; color:var(--color-text-secondary); }

.rs-stars-block { display:flex; flex-direction:column; align-items:center; }
.rs-stars-row { display:flex; gap:6px; }

.rs-feedback-input { width:100%; padding:12px 16px; border-radius:var(--radius-md); border:1.5px solid var(--color-border-tertiary); background:var(--color-bg-page); font-size:14px; font-family:inherit; color:var(--color-text-primary); resize:none; outline:none; transition:border-color 0.15s; }
.rs-feedback-input:focus { border-color:var(--color-primary); }
.rs-feedback-input::placeholder { color:var(--color-text-tertiary); }

.rs-cta-btn { width:100%; height:44px; padding:0 20px; border-radius:var(--radius-pill); background:var(--color-primary); color:#fff; font-size:15px; font-weight:500; font-family:inherit; border:none; cursor:pointer; transition:opacity 0.15s; -webkit-tap-highlight-color:transparent; }
.rs-cta-btn:not(:disabled):active { opacity:0.85; }
.rs-ghost-btn { height:44px; padding:0 20px; border-radius:var(--radius-pill); background:var(--color-bg-page); color:var(--color-text-secondary); font-size:15px; font-weight:500; font-family:inherit; border:1.5px solid var(--color-border-tertiary); cursor:pointer; transition:opacity 0.15s; -webkit-tap-highlight-color:transparent; }
.rs-ghost-btn:active { opacity:0.7; }

/* fade-up for rating pill */
.fade-up-enter-active { transition:opacity 0.2s, transform 0.2s; }
.fade-up-enter-from { opacity:0; transform:translateY(6px); }

/* ── Transitions ──────────────────────────────────────────────────────────── */
.rs-bg-enter-active, .rs-bg-leave-active { transition:opacity 0.25s; }
.rs-bg-enter-from,  .rs-bg-leave-to      { opacity:0; }
.rs-sh-enter-active, .rs-sh-leave-active { transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.rs-sh-enter-from,  .rs-sh-leave-to      { transform:translateX(-50%) translateY(100%); }

/* ── Modal ────────────────────────────────────────────────────────────────── */
.modal-backdrop {
  position:fixed; inset:0; z-index:50;
  background:rgba(0,0,0,0.45);
}
.modal-outer {
  position:fixed; inset:0; z-index:51;
  display:flex; align-items:center; justify-content:center;
  padding:20px;
}
.modal-card {
  width:min(420px, 100%); max-height:85vh; overflow-y:auto;
  background:var(--color-bg-surface);
  border-radius:16px;
  box-shadow:0 8px 40px rgba(0,0,0,0.18);
  display:flex; flex-direction:column;
}

.modal-header {
  display:flex; align-items:flex-start; justify-content:space-between;
  gap:12px; padding:18px 18px 14px;
  border-bottom:0.5px solid var(--color-border-tertiary);
  flex-shrink:0;
}
.modal-icon-circle {
  width:40px; height:40px; border-radius:50%;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.modal-title {
  font-size:15px; font-weight:500; color:var(--color-text-primary); margin:0; line-height:1.3;
}
.modal-subtitle {
  font-size:12px; color:var(--color-text-secondary); margin:2px 0 0;
}
.modal-close {
  width:28px; height:28px; border-radius:6px;
  border:1.5px solid var(--color-warning);
  background:var(--color-bg-surface);
  color:var(--color-warning);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0;
  -webkit-tap-highlight-color:transparent;
}
.modal-close:active { opacity:0.7; }

.modal-amount-card {
  margin:14px 16px 0;
  border-radius:8px;
  padding:14px 16px; text-align:center;
}
.modal-amount-label { font-size:12px; font-weight:500; margin-bottom:4px; }
.modal-amount-value { font-size:26px; font-weight:500; line-height:1.2; }

.modal-rows {
  padding:4px 16px 14px;
}
.modal-row {
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; padding:8px 0;
}
.modal-row--sep {
  border-top:0.5px solid var(--color-border-secondary);
  margin-top:8px; padding-top:12px;
}
.modal-row-label { font-size:13px; color:var(--color-text-secondary); flex-shrink:0; }
.modal-row-value { font-size:13px; color:var(--color-text-primary); text-align:right; }

.modal-status-badge {
  display:inline-flex; align-items:center; gap:5px;
  font-size:12px; font-weight:500;
  padding:5px 12px; border-radius:20px;
  border:1.5px solid transparent;
}

.modal-section {
  padding:12px 16px;
  border-top:0.5px solid var(--color-border-tertiary);
}
.modal-section-title {
  font-size:12px; font-weight:500; color:var(--color-text-tertiary);
  text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;
}

/* ── Modal transitions ────────────────────────────────────────────────────── */
.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.22s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-card-enter-active { transition:opacity 0.22s, transform 0.22s; }
.modal-card-leave-active { transition:opacity 0.18s, transform 0.18s; }
.modal-card-enter-from, .modal-card-leave-to { opacity:0; transform:scale(0.94); }
</style>
