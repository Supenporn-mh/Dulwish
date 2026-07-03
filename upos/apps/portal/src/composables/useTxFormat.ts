import { useLocaleStore } from '@/stores/locale'
import type { Transaction, PurchaseItem } from '@/types/transaction'
import {
  PhCheckCircle, PhClock, PhXCircle, PhArrowsClockwise, PhProhibit, PhLightning,
} from '@phosphor-icons/vue'

interface TxStatusEntry {
  th: string; en: string
  bg: string; text: string
  icon: any
}

const TX_STATUS_CONFIG: Record<string, TxStatusEntry> = {
  complete:  { th: 'สำเร็จ',      en: 'Complete', bg: 'var(--color-success-bg)', text: 'var(--color-success)', icon: PhCheckCircle },
  completed: { th: 'สำเร็จ',      en: 'Complete', bg: 'var(--color-success-bg)', text: 'var(--color-success)', icon: PhCheckCircle },
  success:   { th: 'สำเร็จ',      en: 'Complete', bg: 'var(--color-success-bg)', text: 'var(--color-success)', icon: PhCheckCircle },
  pending:   { th: 'รอดำเนินการ', en: 'Pending',  bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', icon: PhClock },
  wait:      { th: 'รอดำเนินการ', en: 'Pending',  bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', icon: PhClock },
  failed:    { th: 'ล้มเหลว',     en: 'Failed',   bg: 'var(--color-danger-bg)',  text: 'var(--color-danger)',  icon: PhXCircle },
  refunded:  { th: 'คืนเงินแล้ว', en: 'Refunded', bg: 'var(--color-muted-bg)',   text: 'var(--color-muted)',   icon: PhArrowsClockwise },
  voided:    { th: 'ยกเลิกแล้ว',  en: 'Voided',   bg: 'var(--color-muted-bg)',   text: 'var(--color-muted)',   icon: PhProhibit },
  active:    { th: 'กำลังใช้งาน', en: 'Active',   bg: 'var(--color-accent-bg)',  text: 'var(--color-accent)',  icon: PhLightning },
}

export function useTxFormat() {
  const locale = useLocaleStore()

  function fmtAmt(n: number): string {
    return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
  }

  function fmtDateTime(iso: string): string {
    const d = new Date(iso)
    const loc = locale.lang === 'en' ? 'en-GB' : 'th-TH'
    return (
      d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ', ' +
      d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
    )
  }

  const SESSION_LABEL: Record<string, { th: string; en: string }> = {
    breakfast: { th: 'เช้า',    en: 'Breakfast' },
    lunch:     { th: 'กลางวัน', en: 'Lunch'      },
    dinner:    { th: 'เย็น',   en: 'Dinner'     },
  }

  function sessionLabel(s?: string): string {
    if (!s) return ''
    const l = SESSION_LABEL[s]
    return l ? (locale.lang === 'th' ? l.th : l.en) : s
  }

  function paymentLabel(key?: string): string {
    if (!key) return '-'
    const STATIC: Record<string, string> = {
      promptpay:   'PromptPay',
      scb_qr:      'SCB QR Code',
      credit_card: 'Credit / Debit Card',
      debit_card:  'Debit Card',
      wechat:      'WeChat Pay',
      alipay:      'Alipay',
      mobile_web:  'Mobile App',
    }
    if (STATIC[key]) return STATIC[key]
    const LOCALIZED: Record<string, { th: string; en: string }> = {
      staff:  { th: 'เจ้าหน้าที่', en: 'Staff' },
      cash:   { th: 'เงินสด',      en: 'Cash'  },
      wallet: { th: 'กระเป๋าเงิน', en: 'Wallet' },
    }
    const l = LOCALIZED[key]
    return l ? (locale.lang === 'th' ? l.th : l.en) : key
  }

  function channelLabel(key?: string): string {
    const MAP: Record<string, string> = {
      mobile_web: 'Mobile App', kiosk: 'Kiosk', pos: 'POS', system: 'System',
    }
    return MAP[key ?? ''] ?? key ?? '-'
  }

  function txStatusLabel(s: string): string {
    const e = TX_STATUS_CONFIG[s.toLowerCase()]
    return e ? (locale.lang === 'th' ? e.th : e.en) : s
  }

  function txStatusColor(s: string): string {
    return TX_STATUS_CONFIG[s.toLowerCase()]?.text ?? 'var(--color-danger)'
  }

  function txStatusBg(s: string): string {
    return TX_STATUS_CONFIG[s.toLowerCase()]?.bg ?? 'var(--color-danger-bg)'
  }

  function txStatusIcon(s: string): any {
    return TX_STATUS_CONFIG[s.toLowerCase()]?.icon ?? PhCheckCircle
  }

  function derivePurchaseItems(tx: Transaction): PurchaseItem[] {
    if (tx.items?.length) {
      return tx.items.map(i => ({
        name:  i.name,
        qty:   i.qty,
        price: i.unitPrice ?? (i.lineTotal / (i.qty || 1)),
      }))
    }
    if (tx.purchaseItems?.length) return tx.purchaseItems
    if (tx.type !== 'purchase' || !tx.amount) return []
    const desc = (tx.description ?? '')
      .replace(/^ซื้อ\s+/i, '')
      .replace(/^Buy\s+/i, '')
      .trim()
    const price = Math.abs(tx.amount)
    return desc
      ? [{ name: desc, qty: 1, price }]
      : [{ name: locale.lang === 'th' ? 'รายการสินค้า' : 'Item', qty: 1, price }]
  }

  function deriveSession(tx: Transaction): string {
    if (tx.buffetSession) return sessionLabel(tx.buffetSession)
    if (tx.bookingMeal)   return sessionLabel(tx.bookingMeal)
    const d = tx.description ?? ''
    if (d.includes('เช้า')    || d.toLowerCase().includes('breakfast')) return sessionLabel('breakfast')
    if (d.includes('กลางวัน') || d.toLowerCase().includes('lunch'))     return sessionLabel('lunch')
    if (d.includes('เย็น')    || d.toLowerCase().includes('dinner'))    return sessionLabel('dinner')
    return '-'
  }

  function deriveVenue(tx: Transaction): string {
    return (tx.description ?? '')
      .replace(/^Buffet\s*/i, '')
      .replace(/เช้า|กลางวัน|เย็น/, '')
      .replace(/Breakfast|Lunch|Dinner/i, '')
      .trim() || '-'
  }

  function purchaseTotal(items: PurchaseItem[]): number {
    return items.reduce((s, i) => s + i.qty * i.price, 0)
  }

  return {
    fmtAmt, fmtDateTime, sessionLabel, paymentLabel, channelLabel,
    txStatusLabel, txStatusColor, txStatusBg, txStatusIcon,
    derivePurchaseItems, deriveSession, deriveVenue, purchaseTotal,
  }
}
