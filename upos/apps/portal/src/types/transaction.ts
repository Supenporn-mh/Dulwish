export type TxType = 'topup' | 'purchase' | 'buffet' | 'booking' | 'refund'

export interface PurchaseItem {
  name: string
  qty: number
  price: number
}

export interface ApiLineItem {
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export interface Transaction {
  id: string
  type: TxType
  description: string
  amount: number
  createdAt: string
  refNo?: string
  channel?: string
  paymentMethod?: string
  items?: ApiLineItem[]
  topupSource?: string
  purchaseItems?: PurchaseItem[]
  buffetSession?: 'breakfast' | 'lunch' | 'dinner'
  buffetItems?: string[]
  buffetRoundStart?: string
  buffetRoundEnd?: string
  buffetEntryDate?: string
  bookingMeal?: 'breakfast' | 'lunch' | 'dinner'
  bookingItems?: string[]
  bookingNote?: string
  bookingStatus?: 'confirmed' | 'ready' | 'collected' | 'missed' | 'cancelled'
  mealDate?: string
  collectedAt?: string
  cancelledAt?: string
  refundFor?: string
  balanceBefore?: number
  balanceAfter?: number
  status?: string
  reason?: string
  actionedAt?: string
  actionedByName?: string
}
