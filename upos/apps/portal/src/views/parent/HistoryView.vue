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

const locale      = useLocaleStore()
const parentStore = useParentStore()

// ── Types ─────────────────────────────────────────────────────────────────────
type TxType    = 'topup' | 'purchase' | 'buffet' | 'booking' | 'refund'
type FilterKey = 'all' | TxType

interface PurchaseItem { name: string; qty: number; price: number }

// Structured item from API (purchase/buffet orders)
interface ApiLineItem { name: string; qty: number; unitPrice: number; lineTotal: number }

interface Transaction {
  id: string; type: TxType; description: string
  amount: number; createdAt: string
  refNo?: string; channel?: string; paymentMethod?: string
  // structured items array from API (purchase/buffet)
  items?: ApiLineItem[]
  // topup
  topupSource?: string
  // purchase
  purchaseItems?: PurchaseItem[]
  // buffet
  buffetSession?: 'breakfast' | 'lunch' | 'dinner'
  buffetItems?: string[]
  // booking
  bookingMeal?: 'breakfast' | 'lunch' | 'dinner'
  bookingItems?: string[]
  bookingStatus?: 'confirmed' | 'consumed' | 'cancelled'
  // refund
  refundFor?: string
}

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
const expandedId   = ref<string | null>(null)

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
function amtColor(a: number) { return a>0?'var(--color-success)':a<0?'var(--color-danger)':'var(--color-text-tertiary)' }
function amtText(a: number)  { return a===0 ? '–' : `${a>0?'+':''}฿${Math.abs(a).toLocaleString('th-TH',{minimumFractionDigits:2})}` }
function canReview(t: Transaction) { return t.type === 'buffet' || t.type === 'booking' }
function toggleExpand(id: string)  { expandedId.value = expandedId.value===id ? null : id }

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
  BREAKFAST: 'breakfast', LUNCH: 'lunch', DINNER: 'dinner',
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
        id:          t.id ?? t._id,
        description: t.description ?? t.note ?? '',
        items:       t.items ?? undefined,
      }))
    : []

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
        bookingStatus: o.status === 'redeemed' ? 'consumed' : (o.status === 'cancelled' ? 'cancelled' : 'confirmed'),
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
      <div class="px-4 pt-4 pb-2 flex items-center justify-between">
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
          @click="activeFilter=tab.key; expandedId=null"
          :class="['tab-pill', activeFilter===tab.key&&'tab-on']">
          {{ locale.lang==='th' ? tab.th : tab.en }}
        </button>
      </div>
    </div>

    <!-- ── Sub-header: subtitle + date filter + summary ──────────────── -->
    <div class="px-4 pt-3 pb-4" style="background:var(--color-bg-surface); border-bottom:0.5px solid var(--color-border-tertiary)">
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
    <div v-if="loading" class="px-4 pt-4 pb-8 space-y-4">
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
    <div v-else class="px-4 pt-3 pb-8 space-y-1">
      <template v-for="group in grouped" :key="group.label">

        <!-- Date label (section header style) -->
        <p class="group-label">{{ group.label }}</p>

        <!-- Card with rows -->
        <div class="card overflow-hidden">
          <template v-for="(tx, ti) in group.items" :key="tx.id">

            <!-- Transaction row (dashboard style) -->
            <button @click="toggleExpand(tx.id)" class="tx-row w-full"
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

            <!-- Detail panel -->
            <div v-if="expandedId===tx.id" class="detail-pane">

              <!-- ── TOPUP detail ──────────────────────────────────── -->
              <template v-if="tx.type==='topup'">
                <div class="detail-section">
                  <p class="detail-section-title">{{ locale.t('รายละเอียดการเติมเงิน','Top-up Details') }}</p>
                  <div class="detail-row">
                    <PhWallet :size="14" style="color:var(--color-success)"/>
                    <span class="dl">{{ locale.t('จำนวนเงิน','Amount') }}</span>
                    <span class="dv font-medium" style="color:var(--color-success)">+{{ fmtAmt(tx.amount) }}</span>
                  </div>
                  <!-- ช่องทางการชำระ = payment method (ไม่แยก channel กับ payment) -->
                  <div class="detail-row">
                    <PhReceipt :size="14" style="color:var(--color-primary)"/>
                    <span class="dl">{{ locale.t('ช่องทางการชำระ','Payment Via') }}</span>
                    <span class="dv font-medium" style="color:var(--color-primary)">
                      {{ tx.topupSource
                          ?? PAYMENT_LABEL[tx.paymentMethod??'']
                          ?? tx.paymentMethod
                          ?? CHANNEL_LABEL[tx.channel??''] ?? '-' }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <PhClock :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('เวลา','Time') }}</span>
                    <span class="dv">{{ fmtTime(tx.createdAt) }}</span>
                  </div>
                  <div class="detail-row">
                    <PhReceipt :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('เลขอ้างอิง','Ref No.') }}</span>
                    <span class="dv font-mono text-[12px]">{{ tx.refNo ?? '-' }}</span>
                  </div>
                </div>
              </template>

              <!-- ── PURCHASE detail ──────────────────────────────── -->
              <template v-if="tx.type==='purchase'">
                <div class="detail-section">
                  <p class="detail-section-title">{{ locale.t('รายการสินค้า','Items Purchased') }}</p>
                  <div v-for="item in derivePurchaseItems(tx)" :key="item.name" class="purchase-row">
                    <span class="flex-1 text-[14px]" style="color:var(--color-text-primary)">{{ item.name }}</span>
                    <span class="text-[13px]" style="color:var(--color-text-secondary)">×{{ item.qty }}</span>
                    <span class="text-[14px] font-medium w-16 text-right" style="color:var(--color-text-primary)">{{ fmtAmt(item.qty*item.price) }}</span>
                  </div>
                  <div class="purchase-total-row">
                    <span class="text-[13px] font-medium" style="color:var(--color-text-secondary)">{{ locale.t('รวม','Total') }}</span>
                    <span class="text-[15px] font-medium" style="color:var(--color-danger)">{{ fmtAmt(purchaseTotal(derivePurchaseItems(tx))) }}</span>
                  </div>
                  <div class="detail-row mt-2">
                    <PhStorefront :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('จุดชำระ','Point') }}</span>
                    <span class="dv">{{ CHANNEL_LABEL[tx.channel??''] ?? tx.channel }}</span>
                  </div>
                  <div class="detail-row">
                    <PhClock :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('เวลา','Time') }}</span>
                    <span class="dv">{{ fmtTime(tx.createdAt) }}</span>
                  </div>
                </div>
              </template>

              <!-- ── BUFFET detail ────────────────────────────────── -->
              <template v-if="tx.type==='buffet'">
                <div class="detail-section">
                  <p class="detail-section-title">{{ locale.t('รายละเอียดบุฟเฟต์','Buffet Details') }}</p>
                  <div class="detail-row">
                    <PhForkKnife :size="14" style="color:var(--color-primary)"/>
                    <span class="dl">{{ locale.t('มื้อ','Meal') }}</span>
                    <span class="dv">
                      <span class="session-badge session-buffet">{{ deriveSession(tx) }}</span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <PhClock :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('เวลา','Time') }}</span>
                    <span class="dv">{{ fmtTime(tx.createdAt) }}</span>
                  </div>
                  <div class="detail-row">
                    <PhStorefront :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('ห้องอาหาร','Venue') }}</span>
                    <span class="dv">{{ deriveVenue(tx) }}</span>
                  </div>
                </div>
                <!-- Items: structured items array preferred, fall back to buffetItems strings -->
                <div class="detail-section" v-if="tx.items?.length || tx.buffetItems?.length">
                  <p class="detail-section-title">{{ locale.t('เมนูที่กินในมื้อนี้','Consumed Items') }}</p>
                  <template v-if="tx.items?.length">
                    <div v-for="item in tx.items" :key="item.name" class="purchase-row">
                      <span class="flex-1 text-[14px]" style="color:var(--color-text-primary)">{{ item.name }}</span>
                      <span class="text-[13px]" style="color:var(--color-text-secondary)">×{{ item.qty }}</span>
                      <span class="text-[14px] font-medium w-16 text-right" style="color:var(--color-text-primary)">{{ fmtAmt(item.lineTotal) }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="items-grid">
                      <span v-for="item in tx.buffetItems" :key="item" class="item-chip">{{ item }}</span>
                    </div>
                  </template>
                </div>
                <div class="review-section">
                  <div v-if="rated.has(tx.id)" class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <PhStar v-for="n in 5" :key="n" :size="16"
                        :weight="n<=ratings[tx.id]?'fill':'regular'"
                        :color="n<=ratings[tx.id]?'var(--color-warning)':'var(--color-border-secondary)'"/>
                      <span class="text-[12px] font-medium ml-1" style="color:var(--color-warning)">{{ ratings[tx.id] }}/5 · {{ rLabel(ratings[tx.id]) }}</span>
                    </div>
                    <button @click.stop="openReview(tx)" class="edit-btn">{{ locale.t('แก้ไข','Edit') }}</button>
                  </div>
                  <button v-else @click.stop="openReview(tx)" class="rate-btn">
                    <PhStar :size="14" weight="fill"/>{{ locale.t('รีวิวบุฟเฟต์','Rate Buffet') }}
                  </button>
                </div>
              </template>

              <!-- ── BOOKING detail ───────────────────────────────── -->
              <template v-if="tx.type==='booking'">
                <div class="detail-section">
                  <p class="detail-section-title">{{ locale.t('รายละเอียดการจอง','Booking Details') }}</p>
                  <div class="detail-row">
                    <PhCalendarCheck :size="14" style="color:#3C3489"/>
                    <span class="dl">{{ locale.t('มื้ออาหาร','Meal') }}</span>
                    <span class="dv">
                      <span class="session-badge session-booking">{{ deriveSession(tx) }}</span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="w-[14px] flex-shrink-0"/>
                    <span class="dl">{{ locale.t('สถานะ','Status') }}</span>
                    <span class="dv">
                      <span class="status-badge"
                        :style="`color:${BOOKING_STATUS[tx.bookingStatus??'confirmed'].color}; background:${BOOKING_STATUS[tx.bookingStatus??'confirmed'].bg}`">
                        {{ locale.lang==='th' ? BOOKING_STATUS[tx.bookingStatus??'confirmed'].th : BOOKING_STATUS[tx.bookingStatus??'confirmed'].en }}
                      </span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <PhClock :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('เวลาจอง','Booked At') }}</span>
                    <span class="dv">{{ fmtTime(tx.createdAt) }}</span>
                  </div>
                  <div class="detail-row">
                    <PhReceipt :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('เลขจอง','Ref') }}</span>
                    <span class="dv font-mono text-[12px]">{{ tx.refNo }}</span>
                  </div>
                </div>
                <!-- Ordered items -->
                <div class="detail-section" v-if="tx.bookingItems?.length">
                  <p class="detail-section-title">{{ locale.t('เมนูที่จองไว้','Ordered Items') }}</p>
                  <div class="items-grid">
                    <span v-for="item in tx.bookingItems" :key="item" class="item-chip item-chip-booking">{{ item }}</span>
                  </div>
                </div>
                <div class="review-section" v-if="tx.bookingStatus==='consumed'">
                  <div v-if="rated.has(tx.id)" class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <PhStar v-for="n in 5" :key="n" :size="16"
                        :weight="n<=ratings[tx.id]?'fill':'regular'"
                        :color="n<=ratings[tx.id]?'var(--color-warning)':'var(--color-border-secondary)'"/>
                      <span class="text-[12px] font-medium ml-1" style="color:var(--color-warning)">{{ ratings[tx.id] }}/5 · {{ rLabel(ratings[tx.id]) }}</span>
                    </div>
                    <button @click.stop="openReview(tx)" class="edit-btn">{{ locale.t('แก้ไข','Edit') }}</button>
                  </div>
                  <button v-else @click.stop="openReview(tx)" class="rate-btn">
                    <PhStar :size="14" weight="fill"/>{{ locale.t('รีวิวมื้ออาหาร','Rate Meal') }}
                  </button>
                </div>
              </template>

              <!-- ── REFUND detail ────────────────────────────────── -->
              <template v-if="tx.type==='refund'">
                <div class="detail-section">
                  <p class="detail-section-title">{{ locale.t('รายละเอียดการคืนเงิน','Refund Details') }}</p>
                  <div class="detail-row">
                    <PhWallet :size="14" style="color:var(--color-success)"/>
                    <span class="dl">{{ locale.t('จำนวนที่คืน','Refunded') }}</span>
                    <span class="dv" style="color:var(--color-success)">{{ fmtAmt(tx.amount) }}</span>
                  </div>
                  <div v-if="tx.refundFor" class="detail-row">
                    <PhReceipt :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('อ้างอิงรายการ','Original Ref') }}</span>
                    <span class="dv font-mono text-[12px]">{{ tx.refundFor }}</span>
                  </div>
                  <div class="detail-row">
                    <PhClock :size="14" style="color:var(--color-text-tertiary)"/>
                    <span class="dl">{{ locale.t('เวลา','Time') }}</span>
                    <span class="dv">{{ fmtTime(tx.createdAt) }}</span>
                  </div>
                </div>
              </template>

            </div>
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
          <!-- Meal context row (KIKI-style: flat, no card border) -->
          <div class="rs-meal-row">
            <div class="rs-meal-avatar">
              <PhCheckCircle :size="20" weight="fill"/>
            </div>
            <div class="flex-1 min-w-0">
              <span class="rs-meal-label">{{ reviewFor.type === 'booking' ? locale.t('จองอาหาร','Booking') : locale.t('บุฟเฟต์','Buffet') }}</span>
              <p class="rs-meal-desc">{{ reviewFor.description }}</p>
              <div v-if="(reviewFor.buffetItems ?? reviewFor.bookingItems ?? []).length" class="flex flex-wrap gap-1 mt-1.5">
                <span v-for="item in reviewFor.buffetItems ?? reviewFor.bookingItems" :key="item" class="item-chip">{{ item }}</span>
              </div>
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
                <PhStar :size="52" :weight="n<=reviewRating?'fill':'regular'"/>
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
            <h2 class="rs-main-heading" style="font-size:22px">{{ locale.t('ยืนยันรีวิว','Confirm Review') }}</h2>
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

.rs-meal-row { display:flex; align-items:flex-start; gap:12px; }
.rs-meal-avatar { width:42px; height:42px; border-radius:50%; background:var(--color-primary-tint); color:var(--color-primary); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rs-meal-label { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-primary); display:block; margin-bottom:3px; }
.rs-meal-desc { font-size:14px; font-weight:500; color:var(--color-text-primary); line-height:1.3; }

.rs-divider { height:0.5px; background:var(--color-border-tertiary); flex-shrink:0; }

.rs-main-heading { font-size:28px; font-weight:500; color:var(--color-text-primary); line-height:1.1; text-align:center; margin:0; }
.rs-heading-block { text-align:center; }
.rs-sub-heading { font-size:13px; color:var(--color-text-secondary); }

.rs-stars-block { display:flex; flex-direction:column; align-items:center; }
.rs-stars-row { display:flex; gap:6px; }

.rs-feedback-input { width:100%; padding:12px 16px; border-radius:var(--radius-md); border:1.5px solid var(--color-border-tertiary); background:var(--color-bg-page); font-size:14px; font-family:inherit; color:var(--color-text-primary); resize:none; outline:none; transition:border-color 0.15s; }
.rs-feedback-input:focus { border-color:var(--color-primary); }
.rs-feedback-input::placeholder { color:var(--color-text-tertiary); }

.rs-cta-btn { width:100%; padding:16px; border-radius:var(--radius-pill); background:var(--color-primary); color:#fff; font-size:16px; font-weight:500; font-family:inherit; border:none; cursor:pointer; transition:opacity 0.15s; -webkit-tap-highlight-color:transparent; }
.rs-cta-btn:not(:disabled):active { opacity:0.85; }
.rs-ghost-btn { padding:16px; border-radius:var(--radius-pill); background:var(--color-bg-page); color:var(--color-text-secondary); font-size:15px; font-weight:500; font-family:inherit; border:1.5px solid var(--color-border-tertiary); cursor:pointer; transition:opacity 0.15s; -webkit-tap-highlight-color:transparent; }
.rs-ghost-btn:active { opacity:0.7; }

/* fade-up for rating pill */
.fade-up-enter-active { transition:opacity 0.2s, transform 0.2s; }
.fade-up-enter-from { opacity:0; transform:translateY(6px); }

/* ── Transitions ──────────────────────────────────────────────────────────── */
.rs-bg-enter-active, .rs-bg-leave-active { transition:opacity 0.25s; }
.rs-bg-enter-from,  .rs-bg-leave-to      { opacity:0; }
.rs-sh-enter-active, .rs-sh-leave-active { transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.rs-sh-enter-from,  .rs-sh-leave-to      { transform:translateX(-50%) translateY(100%); }
</style>
